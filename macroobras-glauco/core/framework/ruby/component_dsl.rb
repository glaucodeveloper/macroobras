# frozen_string_literal: true

# Browser-safe reusable components. Application definitions stay outside core.
module Frontend
    class ComponentDefinition
      attr_reader :name, :defaults, :host_tag_name, :template_block
      attr_reader :host_class_name, :after_render_block
      attr_reader :controller_class

      def initialize(name)
        @name = name.to_sym
        @defaults = {}
        @exact_dom = false
      end

      def property(name, default: nil)
        @defaults[name.to_sym] = default
        self
      end
      alias prop property

      def host_tag(name = nil)
        @host_tag_name = (name || @name.to_s.tr("_", "-")).to_s
        raise ArgumentError, "component tag must contain a hyphen" unless @host_tag_name.include?("-")
        self
      end
      alias tag host_tag

      def host_class(value)
        @host_class_name = value.to_s
      end

      def observe_attributes
        @observe_attributes = true
      end

      def observes_attributes? = !!@observe_attributes

      def after_render(&block)
        @after_render_block = block
      end

      def controller(klass)
        @controller_class = klass
      end

      def exact_dom(value = true)
        @exact_dom = !!value
        self
      end

      def exact_dom? = !!@exact_dom

      def template(&block)
        raise ArgumentError, "template requires a block" unless block
        @template_block = block
        self
      end
    end

  class << self
    def component_registry = (@component_registry ||= {})
    def component_tag_registry = (@component_tag_registry ||= {})

    def define_component(name, tag: nil, &block)
      definition = ComponentDefinition.new(name)
      definition.host_tag(tag) if tag
      definition.instance_eval(&block) if block
      raise ArgumentError, "component requires a Ruby template or controller" unless definition.template_block || definition.controller_class
      raise ArgumentError, "controller requires a custom element tag" if definition.controller_class && !definition.host_tag_name
      if definition.host_tag_name && defined?(JS)
        JS.global[:RubyComponentHosts].call(:register, definition.host_tag_name, JSON.generate(definition.defaults.keys.map(&:to_s)))
      end
      component_registry[name.to_sym] = definition
      component_tag_registry[definition.host_tag_name] = definition if definition.host_tag_name
      definition
    end

    def component_definition(name) = component_registry[name.to_sym]
    def component_definition_for_tag(tag) = component_tag_registry[tag.to_s.downcase]
  end

  class Component
    %i[select option table thead tbody tfoot tr th td details summary dialog
       figure figcaption time output meter hr br picture source video audio
       iframe fieldset legend dl dt dd em i].each do |tag|
      define_method(tag) { |*children, **attrs, &block| element(tag, *children, **attrs, &block) }
    end

    def component(name, *children, **attrs, &block)
      definition = Frontend.component_definition(name)
      raise ArgumentError, "unknown component: #{name}" unless definition
      props = definition.defaults.merge(attrs.transform_keys(&:to_sym))
      props[:children] = children
      props[:slot] = block
      if definition.controller_class
        host = element(definition.host_tag_name, **attrs)
        controller = definition.controller_class.new(root: host, owner: self, props: props)
        (@web_components ||= []) << controller
          lifecycle = { connected: false }
          (@web_component_lifecycles ||= {})[controller.object_id] = lifecycle
        host.addEventListener("ruby:component-host") do |event|
          next unless event[:target] == host
          case event[:detail][:phase].to_s
            when "connected"
              unless lifecycle[:connected]
                lifecycle[:connected] = true
                controller.connected_callback
              end
            when "disconnected"
              if lifecycle[:connected]
                lifecycle[:connected] = false
                controller.disconnected_callback
              end
          when "attribute" then controller.attribute_changed_callback(event[:detail][:name].to_s)
          end
        end
        controller.connected_callback
          lifecycle[:connected] = true
        return host
      end
      if definition.host_tag_name
        # Props belong to the Ruby template, not to arbitrary HTML attributes.
        host_attrs = attrs.reject { |key, _| definition.defaults.key?(key.to_sym) }
        if definition.host_class_name
          host_attrs[:class] = [host_attrs[:class] || host_attrs[:class_name], definition.host_class_name].compact.join(" ").split.uniq.join(" ")
          host_attrs.delete(:class_name)
        end
        if definition.observes_attributes?
          # Match Custom Elements: observed attributes are opt-in inputs, not
          # serialized defaults. Missing attributes stay absent on the host;
          # the render/update path applies the declared default as needed.
          definition.defaults.each_key do |key|
            host_attrs[key] = props[key] if attrs.key?(key) || attrs.key?(key.to_s)
          end
        end
        host = element(definition.host_tag_name, **host_attrs) do
          instance_exec(props, &definition.template_block)
        end
        instance_exec(&definition.after_render_block) if definition.after_render_block
        if definition.host_class_name && defined?(JS)
          host.addEventListener("ruby:component-host") do |event|
            if event[:target] == host && event[:detail][:phase].to_s == "connected"
              definition.host_class_name.split.each { |name| host[:classList].call(:add, name) }
            end
          end
        end
        if definition.observes_attributes? && defined?(JS)
          host.addEventListener("ruby:component-host") do |event|
            next unless event[:target] == host && %w[attribute connected].include?(event[:detail][:phase].to_s)
            updated = props.dup
            definition.defaults.each do |key, fallback|
              value = host.getAttribute(key.to_s)
              updated[key] = host.hasAttribute(key.to_s).to_s != "true" || value.to_s.empty? ? fallback : value.to_s
            end
            host[:innerHTML] = ""
            @node_stack << host
            begin
              instance_exec(updated, &definition.template_block)
              instance_exec(&definition.after_render_block) if definition.after_render_block
            ensure
              @node_stack.pop
            end
          end
        end
        host
      else
        instance_exec(props, &definition.template_block)
      end
    end

    def slot(props)
      instance_eval(&props[:slot]) if props[:slot]
      props.fetch(:children, []).each { |child| text(child) }
    end

    def dispose_web_components!
      (@web_components || []).each do |controller|
        lifecycle = (@web_component_lifecycles || {})[controller.object_id]
        next if lifecycle && !lifecycle[:connected]
        lifecycle[:connected] = false if lifecycle
        controller.disconnected_callback
      end
      @web_components = []
      @web_component_lifecycles = {}
    end

    # Controllers belong to their Ruby owner, while callers commonly retain the
    # host custom element.  This bridge keeps component-to-component calls in
    # Ruby instead of falling back to the JavaScript source implementation.
    def component_controller_for(host)
      return nil if host.nil?
      (@web_components || []).find { |controller| controller.root == host }
    end
  end

  # Each custom element owns its Ruby instance, DOM root and subscriptions.
  # No application-specific methods or services belong in this base class.
  class WebComponent < Component
    attr_reader :owner, :props, :root

    def initialize(root:, owner:, props: {})
      super(root: root)
      @owner, @props, @root = owner, props, root
    end

    def connected_callback = rerender!
    def disconnected_callback = dispose_web_components!
    def attribute_changed_callback(_name) = rerender!

    def draw(&block)
      dispose_web_components!
      root[:innerHTML] = ""
      @node_stack = [root]
      instance_eval(&block)
      self
    ensure
      @node_stack = []
    end
  end
end

module Kernel
  private

  def component(name, tag: nil, &block)
    Frontend.define_component(name, tag: tag, &block)
  end
end
