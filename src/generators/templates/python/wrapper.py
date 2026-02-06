# === Sandbox Executor Python Inline Wrapper ===
import json, traceback, sys

# Result markers
START_MARKER = "__SANDBOX_RESULT_START__"
END_MARKER = "__SANDBOX_RESULT_END__"

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

try:
    import user_code
    
    # Inline arguments
    args = {{ARGS}}
    kwargs = {{KWARGS}}
    func_name = "{{FUNCTION_NAME}}"
    
    func = getattr(user_code, func_name)
    result = func(*args, **kwargs)
    
    output = {
        "success": True,
        "result": __sandbox_serialize__(result)
    }
except Exception as e:
    output = {
        "success": False,
        "error": {
            "message": str(e),
            "type": type(e).__name__,
            "stack": traceback.format_exc()
        }
    }

print(START_MARKER)
print(json.dumps(output, ensure_ascii=False))
print(END_MARKER)
sys.stdout.flush()
