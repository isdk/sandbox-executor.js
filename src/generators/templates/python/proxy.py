# === Sandbox Executor Python Proxy (Stdin Mode) ===
import sys, json, traceback, importlib.util

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
            return
        
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
