// === Sandbox Executor JavaScript Proxy for QuickJS ===
import * as std from 'std';

const START_MARKER = "__SANDBOX_RESULT_START__";
const END_MARKER = "__SANDBOX_RESULT_END__";

async function executeRequest(request) {
  try {
    const filePath = request.filePath || './user_code.js';
    const funcName = request.functionName;
    const args = request.args || [];
    const kwargs = request.kwargs || {};

    const userModule = await import(filePath);
    const func = userModule[funcName];
    if (typeof func !== 'function') {
      throw new Error(`Function '${funcName}' not found in ${filePath}`);
    }

    let result;
    if (Object.keys(kwargs).length > 0) {
      result = await func(...args, kwargs);
    } else {
      result = await func(...args);
    }

    return {
      success: true,
      result: result
    };
  } catch (e) {
    return {
      success: false,
      error: {
        message: e.message || String(e),
        type: e.name || 'Error',
        stack: e.stack
      }
    };
  }
}

async function main() {
  // Robust way to get stdin in different QuickJS/WASI environments
  const stdin = std.stdin || std.in || std.fdopen(0, "r");
  if (!stdin) return;

  const mByte = stdin.getByte();
  if (mByte < 0) return;
  const mode = String.fromCharCode(mByte);
  
  const b1 = stdin.getByte();
  const b2 = stdin.getByte();
  const b3 = stdin.getByte();
  const b4 = stdin.getByte();
  const length = ((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) >>> 0;

  if (mode === 'A') {
    let payload = '';
    for (let i = 0; i < length; i++) {
      const byte = stdin.getByte();
      if (byte < 0) break;
      payload += String.fromCharCode(byte);
    }

    const request = JSON.parse(payload);
    const output = await executeRequest(request);
    
    console.log(START_MARKER);
    console.log(JSON.stringify(output));
    console.log(END_MARKER);
  }
}

main().catch(err => {
  console.log(START_MARKER);
  console.log(JSON.stringify({
    success: false,
    error: { message: "Fatal: " + (err.message || String(err)), type: 'FatalError' }
  }));
  console.log(END_MARKER);
});
