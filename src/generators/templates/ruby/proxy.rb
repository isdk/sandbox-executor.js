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

    # Ruby 2.7+ handles kwargs explicitly
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
  header = STDIN.read(5)
  if header && header.length == 5
    mode = header[0]
    length = header[1..4].unpack1('N') # Big-endian 32-bit unsigned

    if mode == 'A'
      payload = STDIN.read(length)
      if payload
        request = JSON.parse(payload)
        output = execute_request(request)
        puts START_MARKER
        puts JSON.generate(output)
        puts END_MARKER
      else
        raise "Empty payload"
      end
    end
  else
    raise "Header too short or stdin empty"
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
