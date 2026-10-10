# frozen_string_literal: true
require "net/http"
require "uri"
require "fileutils"
require "tempfile"
require "thread"

module Ruby
  # Generic disk cache for public model assets. Never forwards user credentials,
  # application state, prompts, cookies, or arbitrary remote URLs.
  class ModelAssets
    class NotFound < StandardError; end
    MAX_BYTES = 1536 * 1024 * 1024

    def initialize(root:, repository:)
      raise ArgumentError, "Invalid model repository" unless %r{\A[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\z}.match?(repository)
      @root = File.expand_path(root)
      @repository = repository
      @locks = {}
      @mutex = Mutex.new
      FileUtils.mkdir_p(@root)
    end

    def get(file)
      validate_file!(file)
      destination = File.expand_path(file, @root)
      raise ArgumentError, "Invalid cache target" unless destination.start_with?(@root + File::SEPARATOR)
      lock = @mutex.synchronize { @locks[file] ||= Mutex.new }
      lock.synchronize do
        return destination if File.file?(destination)
        FileUtils.mkdir_p(File.dirname(destination))
        unless File.realpath(File.dirname(destination)).start_with?(File.realpath(@root) + File::SEPARATOR) || File.realpath(File.dirname(destination)) == File.realpath(@root)
          raise ArgumentError, "Cache directory escapes model root"
        end
        escaped = file.split("/").map { |part| URI.encode_www_form_component(part).gsub("+", "%20") }.join("/")
        remote = URI("https://huggingface.co/#{@repository}/resolve/main/#{escaped}")
        Tempfile.create(["model-", ".download"], File.dirname(destination)) do |temporary|
          temporary.binmode
          download(remote, temporary)
          temporary.flush
          temporary.fsync
          temporary.close
          File.rename(temporary.path, destination)
        end
        destination
      end
    end

    private

    def validate_file!(file)
      raise ArgumentError, "Invalid model file" unless %r{\A[A-Za-z0-9_./-]+\.(?:json|onnx|onnx_data|model|txt)\z}.match?(file)
      raise ArgumentError, "Invalid model path" if file.split("/").any? { |part| part.empty? || part == "." || part == ".." }
    end

    def download(uri, output, redirects = 0)
      raise "Model redirect limit exceeded" if redirects > 5
      host = uri.host.to_s.downcase
      allowed = host == "huggingface.co" || host.end_with?(".huggingface.co", ".hf.co")
      raise "Untrusted model redirect" unless uri.scheme == "https" && allowed && uri.port == 443 && uri.userinfo.nil?
      Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 15, read_timeout: 60) do |http|
        http.request(Net::HTTP::Get.new(uri.request_uri, {"User-Agent" => "Glauco-ModelAssets/1", "Accept-Encoding" => "identity"})) do |response|
          case response
          when Net::HTTPRedirection
            raise "Model redirect has no location" unless response["location"]
            download(URI.join(uri, response["location"]), output, redirects + 1)
          when Net::HTTPSuccess
            raise "Model file is too large" if response["content-length"].to_i > MAX_BYTES
            bytes = 0
            response.read_body do |chunk|
              bytes += chunk.bytesize
              raise "Model file is too large" if bytes > MAX_BYTES
              output.write(chunk)
            end
            raise "Empty model asset" if bytes.zero?
          when Net::HTTPNotFound
            raise NotFound, "Model asset not found"
          else
            raise "Model download returned HTTP #{response.code}"
          end
        end
      end
    end
  end
end
