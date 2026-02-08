# === Sandbox-Link Universal Python Wrapper v1.0 ===
import sys, os, json, traceback, importlib.util

# 结果通道抽象
class ResultChannel:
    def __init__(self):
        self.fd = None
        self.socket = None
        self.use_stdout = False
        
        # 1. 尝试获取专用 FD (环境变量优先，占位符作为默认值)
        res_fd = os.environ.get('SB_RESULT_FD', '{{SB_RESULT_FD}}')
        if res_fd and res_fd.isdigit():
            try:
                self.fd = int(res_fd)
            except: pass
            
        # 2. 尝试获取 IPC (Socket/Pipe) - 预留
        ipc_addr = os.environ.get('SB_IPC', '{{SB_IPC}}')
        # if ipc_addr: ...

        # 3. 保底方案：Stdout 标记位
        if not self.fd and not self.socket:
            self.use_stdout = True
            self.start_marker = "__SANDBOX_RESULT_START__"
            self.end_marker = "__SANDBOX_RESULT_END__"

    def write(self, message):
        payload = json.dumps(message, ensure_ascii=False)
        if self.fd:
            try:
                os.write(self.fd, (payload + "\n").encode('utf-8'))
            except:
                # 如果 FD 写入失败，回退到 stdout
                self._write_stdout(payload)
        elif self.use_stdout:
            self._write_stdout(payload)

    def _write_stdout(self, payload):
        sys.__stdout__.write(f"\n{self.start_marker}{payload}{self.end_marker}\n")
        sys.__stdout__.flush()

# 日志拦截器
class LogInterceptor:
    def __init__(self, channel, stream_name):
        self.channel = channel
        self.stream_name = stream_name
        self.original = getattr(sys, stream_name)

    def write(self, data):
        if data.strip():
            self.channel.write({
                "ver": "1.0",
                "id": "log-evt",
                "type": "log",
                "stream": self.stream_name,
                "content": data
            })
        self.original.write(data)

    def flush(self):
        self.original.flush()

def execute_call(msg, channel):
    method_name = msg.get('method')
    params = msg.get('params', {})
    args = params.get('args', [])
    kwargs = params.get('kwargs', {})
    
    try:
        # 加载用户代码
        spec = importlib.util.spec_from_file_location("user_code", "/workspace/user_code.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        func = getattr(module, method_name)
        result = func(*args, **kwargs)
        
        channel.write({
            "ver": "1.0",
            "id": msg.get('id'),
            "type": "result",
            "status": "ok",
            "data": {"result": result}
        })
    except Exception as e:
        channel.write({
            "ver": "1.0",
            "id": msg.get('id'),
            "type": "result",
            "status": "fail",
            "data": {
                "error": {
                    "message": str(e),
                    "type": type(e).__name__,
                    "stack": traceback.format_exc()
                }
            }
        })

def main():
    channel = ResultChannel()
    
    # 日志上报配置 (环境变量优先)
    report_io = os.environ.get('SB_REPORT_IO', '{{SB_REPORT_IO}}')
    if report_io == '1':
        sys.stdout = LogInterceptor(channel, 'stdout')
        sys.stderr = LogInterceptor(channel, 'stderr')

    try:
        # 实现 SIP (Sandbox Input Protocol) 解析
        header = sys.stdin.buffer.read(9)
        if len(header) < 9:
            return

        mode = chr(header[0])
        length = int(header[1:9].decode('ascii'), 16)

        if mode == 'A': # Atomic JSON mode
            payload = sys.stdin.buffer.read(length)
            if not payload:
                raise ValueError("Empty SIP payload")
            
            msg = json.loads(payload.decode('utf-8'))
            if msg.get('type') == 'call':
                execute_call(msg, channel)
            
    except Exception as e:
        channel.write({
            "ver": "1.0",
            "id": "init-error",
            "type": "error",
            "code": "INIT_FAIL",
            "message": str(e)
        })

if __name__ == "__main__":
    main()
