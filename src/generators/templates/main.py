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
    # Read protocol header
    mode = sys.stdin.read(1)
    
    if mode == 'A': # Atomic mode
        input_data = sys.stdin.read()
        if not input_data:
            return
        request = json.loads(input_data)
        output = execute_request(request)
        
        print(START_MARKER)
        print(json.dumps(output, ensure_ascii=False))
        print(END_MARKER)
        
    elif mode == 'P': # Persistent mode (future)
        while True:
            header = sys.stdin.read(4)
            if not header:
                break
            length = int.from_bytes(header.encode('latin-1'), 'big')
            input_data = sys.stdin.read(length)
            request = json.loads(input_data)
            output = execute_request(request)
            
            print(START_MARKER)
            print(json.dumps(output, ensure_ascii=False))
            print(END_MARKER)
            sys.stdout.flush()

if __name__ == "__main__":
    main()
