# === Sandbox Executor Ruby Proxy (File Mode) ===
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

    if kwargs && !kwargs.empty?
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

begin
  request_file = '/workspace/.sandbox_request.json'
  if File.exist?(request_file)
    payload = File.read(request_file)
    request = JSON.parse(payload)
    output = execute_request(request)
    puts START_MARKER
    puts JSON.generate(output)
    puts END_MARKER
  else
    raise "Request file not found: #{request_file}"
  end
rescue => e
  output = {
    "success" => false,
    "error" => {
      "message" => "Fatal: " + e.message,
      "type" => e.class.name,
      "stack" => e.backtrace&.join("
")
    }
  }
  puts START_MARKER
  puts JSON.generate(output)
  puts END_MARKER
end
