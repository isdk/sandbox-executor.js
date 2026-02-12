// === Sandbox-Link JavaScript Wrapper for QuickJS ===
import * as std from 'std';

const START_MARKER = "__SANDBOX_RESULT_START__";
const END_MARKER = "__SANDBOX_RESULT_END__";

function sendResult(msg) {
  const out = JSON.stringify(msg);
  // Default to stdout with markers
  std.out.puts(START_MARKER + out + END_MARKER + "\n");
  std.out.flush();
}

// Simple Log Interceptor for QuickJS
function setupLogInterception() {
  const originalLog = console.log;
  console.log = function(...args) {
    const content = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    sendResult({
      ver: '1.0',
      id: 'log-evt',
      type: 'log',
      stream: 'stdout',
      content: content + "\n"
    });
    originalLog.apply(console, args);
  };
}

async function main() {
  setupLogInterception();
  const stdin = std.stdin || std.in || std.fdopen(0, "r");
  if (!stdin) return;

  const mByte = stdin.getByte();
  if (mByte < 0) return;
  const mode = String.fromCharCode(mByte);
  
  let lenStr = '';
  for (let i = 0; i < 8; i++) {
    const b = stdin.getByte();
    if (b < 0) break;
    lenStr += String.fromCharCode(b);
  }
  const length = parseInt(lenStr, 16);

  if (mode === 'A') {
    let payload = '';
    for (let i = 0; i < length; i++) {
      const byte = stdin.getByte();
      if (byte < 0) break;
      payload += String.fromCharCode(byte);
    }

    const callMsg = JSON.parse(payload);
    const { id, method, params } = callMsg;
    
    let result;
    try {
      const userModule = await import('./user_code.js');
      const func = userModule[method];
      if (typeof func !== 'function') {
        throw new Error(`Function '${method}' not found`);
      }

      const { args = [], kwargs = {} } = params || {};
      if (Object.keys(kwargs).length > 0) {
        result = await func(...args, kwargs);
      } else {
        result = await func(...args);
      }

      sendResult({
        ver: '1.0',
        id: id,
        type: 'result',
        status: 'ok',
        data: { result }
      });
    } catch (e) {
      sendResult({
        ver: '1.0',
        id: id,
        type: 'result',
        status: 'fail',
        data: {
          error: {
            message: e.message || String(e),
            type: e.name || 'Error',
            stack: e.stack
          }
        }
      });
    }
  }
}

main().catch(err => {
  sendResult({
    ver: '1.0',
    type: 'result',
    status: 'fail',
    data: {
      error: { message: "Fatal: " + (err.message || String(err)), type: 'FatalError' }
    }
  });
});
