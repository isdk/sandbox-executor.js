import { CodeGenerator } from './base';
import type { InferredSignature } from '../inference/engine';

const RUBY_PROXY = `
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

    require_relative file_path.sub(/\\.rb$/, '')

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
        "stack" => e.backtrace.join("\\n")
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
      "stack" => e.backtrace&.join("\\n")
    }
  }
  puts START_MARKER
  puts JSON.generate(output)
  puts END_MARKER
end
`;

export class RubyGenerator extends CodeGenerator {
  readonly language = 'ruby';
  readonly fileExtension = '.rb';

  generateFiles(
    userCode: string,
    _functionName: string,
    _args: unknown[],
    _kwargs: Record<string, unknown>,
    _signature: InferredSignature
  ): Record<string, string | Uint8Array> {
    return {
      [`main${this.fileExtension}`]: RUBY_PROXY,
      [`user_code${this.fileExtension}`]: userCode,
    };
  }

  generateStdin(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>
  ): string | Uint8Array {
    return this.buildAtomicStdin({
      functionName,
      args,
      kwargs,
      filePath: `/workspace/user_code${this.fileExtension}`
    });
  }

  protected generateWrapper(
    _functionName: string,
    _args: unknown[],
    _kwargs: Record<string, unknown>,
    _signature: InferredSignature
  ): string {
    return '';
  }

  protected serialize(value: unknown): string {
    if (value === null || value === undefined) return 'nil';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) {
      return `[${value.map(v => this.serialize(v)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `"${k}" => ${this.serialize(v)}`);
      return `{${entries.join(', ')}}`;
    }
    return String(value);
  }
}