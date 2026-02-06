# === Sandbox Executor Ruby Inline Wrapper ===
require 'json'

START_MARKER = "__SANDBOX_RESULT_START__"
END_MARKER = "__SANDBOX_RESULT_END__"

begin
  require_relative 'user_code'
  
  # Inline arguments
  args = {{ARGS}}
  kwargs = {{KWARGS}}
  func_name = "{{FUNCTION_NAME}}"
  
  if kwargs && !kwargs.empty?
    symbol_kwargs = kwargs.transform_keys(&:to_sym)
    result = send(func_name, *args, **symbol_kwargs)
  else
    result = send(func_name, *args)
  end

  output = {
    "success" => true,
    "result" => result
  }
rescue => e
  output = {
    "success" => false,
    "error" => {
      "message" => e.message,
      "type" => e.class.name,
      "stack" => e.backtrace.join("
")
    }
  }
end

puts START_MARKER
puts JSON.generate(output)
puts END_MARKER
