# === Sandbox-Link Ruby Wrapper ===
require 'json'

START_MARKER = "__SANDBOX_RESULT_START__"
END_MARKER = "__SANDBOX_RESULT_END__"

def send_result(msg)
  STDOUT.write "#{START_MARKER}#{JSON.generate(msg)}#{END_MARKER}\n"
  STDOUT.flush
end

# Log Interception for Ruby
class LogInterceptor
  def initialize(original, stream_name)
    @original = original
    @stream_name = stream_name
  end

  def write(content)
    if content && content.strip.length > 0
      STDOUT.write "__SANDBOX_RESULT_START__#{JSON.generate({
        "ver" => "1.0",
        "id" => "log-evt",
        "type" => "log",
        "stream" => @stream_name,
        "content" => content
      })}__SANDBOX_RESULT_END__\n"
    end
    @original.write(content)
  end

  def puts(content)
    write(content.to_s + "\n")
  end

  def flush
    @original.flush
  end

  def method_missing(m, *args, &block)
    @original.send(m, *args, &block)
  end
end

$stdout = LogInterceptor.new(STDOUT, "stdout")
$stderr = LogInterceptor.new(STDERR, "stderr")

begin
  header = STDIN.read(9)
  if header && header.length == 9
    mode = header[0]
    length = header[1..8].to_i(16)

    if mode == 'A'
      payload = STDIN.read(length)
      call_msg = JSON.parse(payload)
      id = call_msg['id']
      method = call_msg['method']
      params = call_msg['params'] || {}
      args = params['args'] || []
      kwargs = params['kwargs'] || {}

      require_relative 'user_code'

      begin
        if kwargs && !kwargs.empty?
          symbol_kwargs = kwargs.transform_keys(&:to_sym)
          result = send(method, *args, **symbol_kwargs)
        else
          result = send(method, *args)
        end

        send_result({
          "ver" => "1.0",
          "id" => id,
          "type" => "result",
          "status" => "ok",
          "data" => { "result" => result }
        })
      rescue => e
        send_result({
          "ver" => "1.0",
          "id" => id,
          "type" => "result",
          "status" => "fail",
          "data" => {
            "error" => {
              "message" => e.message,
              "type" => e.class.name,
              "stack" => e.backtrace&.join("
")
            }
          }
        })
      end
    end
  end
rescue => e
  send_result({
    "ver" => "1.0",
    "type" => "result",
    "status" => "fail",
    "data" => {
      "error" => {
        "message" => "Fatal: " + e.message,
        "type" => e.class.name
      }
    }
  })
end
