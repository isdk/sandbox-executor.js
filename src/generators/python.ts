import { CodeGenerator } from './base';
import type { InferredSignature } from '../inference/engine';

const PYTHON_PROXY = `
# === Sandbox Executor Python Proxy ===
import sys, json, traceback, importlib.util, types

# Result markers
START_MARKER = "__SANDBOX_RESULT_START__"
END_MARKER = "__SANDBOX_RESULT_END__"

# Module cache for potential persistent execution
_USER_MODULE_CACHE = {}

def __sandbox_serialize__(obj):
    if hasattr(obj, '__dict__'):
        return {k: __sandbox_serialize__(v) for k, v in obj.__dict__.items() if not k.startswith('_')}
    if hasattr(obj, 'to_dict'):
        return obj.to_dict()
    if isinstance(obj, (set, frozenset)):
        return list(obj)
    if isinstance(obj, bytes):
        return obj.decode('utf-8', errors='replace')
    if hasattr(obj, '__iter__') and not isinstance(obj, (str, dict, list, tuple)):
        return list(obj)
    return obj

def execute_request(request):
    try:
        file_path = request.get('filePath', '/workspace/user_code.py')
        func_name = request['functionName']
        args = request.get('args', [])
        kwargs = request.get('kwargs', {})

        if file_path not in _USER_MODULE_CACHE:
            spec = importlib.util.spec_from_file_location("user_code", file_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            _USER_MODULE_CACHE[file_path] = module
        
        module = _USER_MODULE_CACHE[file_path]
        func = getattr(module, func_name)
        
        result = func(*args, **kwargs)
        return {
            "success": True,
            "result": __sandbox_serialize__(result)
        }
    except Exception as e:
        return {
            "success": False,
            "error": {
                "message": str(e),
                "type": type(e).__name__,
                "stack": traceback.format_exc()
            }
        }

def main():
    try:
        # Read protocol header: [Mode(1b)][Length(4b)]
        header = sys.stdin.buffer.read(5)
        if len(header) < 5:
            # We still want to return a result even if stdin is empty/broken
            raise ValueError(f"Header too short: {len(header)}")
        
        mode = chr(header[0])
        length = int.from_bytes(header[1:5], 'big')
        
        if mode == 'A': # Atomic mode
            payload = sys.stdin.buffer.read(length)
            if not payload:
                raise ValueError("Empty payload")
            request = json.loads(payload.decode('utf-8'))
            output = execute_request(request)
            
            print(START_MARKER)
            print(json.dumps(output, ensure_ascii=False))
            print(END_MARKER)
            sys.stdout.flush()
    except Exception as e:
        output = {
            "success": False,
            "error": {
                "message": "Fatal: " + str(e),
                "type": type(e).__name__,
                "stack": traceback.format_exc()
            }
        }
        print(START_MARKER)
        print(json.dumps(output, ensure_ascii=False))
        print(END_MARKER)

if __name__ == "__main__":
    main()
`;

export class PythonGenerator extends CodeGenerator {
  readonly language = 'python';
  readonly fileExtension = '.py';

  generateFiles(
    userCode: string,
    _functionName: string,
    _args: unknown[],
    _kwargs: Record<string, unknown>,
    _signature: InferredSignature
  ): Record<string, string | Uint8Array> {
    return {
      [`main${this.fileExtension}`]: PYTHON_PROXY,
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
    // No longer used but must be implemented due to abstract base class
    return '';
  }

  protected serialize(value: unknown): string {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) {
      return `[${value.map(v => this.serialize(v).trim()).join(', ')}]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${JSON.stringify(k)}: ${this.serialize(v)}`);
      return `{${entries.join(', ')}}`;
    }
    return String(value);
  }
}
