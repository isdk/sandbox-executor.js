# === Sandbox Executor Ruby Proxy ===
require 'json'

START_MARKER = "__SANDBOX_RESULT_START__"
END_MARKER = "__SANDBOX_RESULT_END__"

def execute_request(request)
  begin
    file_path = request['filePath'] || '/workspace/user_code.rb'
    func_name = request['functionName']
    args = request['args'] || []
    kwargs = request['kwargs'] || {}

    require_relative file_path.sub(/\.rb$/, '')

    if !respond_to?(func_name, true) && !Object.respond_to?(func_name, true)
      # Check if it's defined in Object or as a top-level method
      # In many Ruby scripts, methods defined at top level are added to Object
    end

    # Ruby 2.7+ handles kwargs explicitly
    if kwargs && !kwargs.empty?
      # Convert string keys to symbols for kwargs
      symbol_kwargs = kwargs.transform_keys(&:to_sym)
      result = send(func_name, *args, **symbol_kwargs)
    else
      result = send(func_name, *args)
    end

    {
      "success" => true,
      "result" => result
    }
  rescue => e
    {
      "success" => false,
      "error" => {
        "message" => e.message,
        "type" => e.class.name,
        "stack" => e.backtrace.join("
")
      }
    }
  end
end

# Read protocol header
mode = STDIN.read(1)

if mode == 'A'
  input_data = STDIN.read
  if input_data && !input_data.empty?
    request = JSON.parse(input_data)
    output = execute_request(request)

    puts START_MARKER
    puts JSON.generate(output)
    puts END_MARKER
  end
end
