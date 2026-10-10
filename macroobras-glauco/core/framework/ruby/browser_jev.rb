# frozen_string_literal: true

module Ruby
  module Platform
    module_function

    def browser_jev(id)
      GenericBrowserController.new(bridge[:browserJev], id)
    end

    # Only generic browser commands; no provider-specific application workflows.
    class GenericBrowserController
      def initialize(bridge, id)
        @bridge = bridge
        @id = id.to_s
      end

      def command(text, max_steps: 8, settle_ms: 650, decision_timeout_ms: 30_000, on_error: nil, &block)
        text = text.to_s.strip
        raise ArgumentError, "browser semantic command cannot be empty" if text.empty?
        promise = @bridge.call(:command, @id, text, JSON.generate(
          maxSteps: max_steps, settleMs: settle_ms, decisionTimeoutMs: decision_timeout_ms
        ))
        handled = promise.then do |raw|
          result = JSON.parse(raw.to_s)
          block.call(result) if block
          raw
        end
        return handled unless on_error
        handled.catch { |error| on_error.call(error.to_s); nil }
      end

      def status
        JSON.parse(@bridge.call(:status, @id).to_s)
      end
    end
  end

end

class Frontend::Component
  def browser_jev(id) = Ruby::Platform.browser_jev(id)
end
