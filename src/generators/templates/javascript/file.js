// === Sandbox Executor JavaScript Proxy (File Mode for QuickJS) ===
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
  try {
    const requestFile = '/workspace/.sandbox_request.json';
    const content = std.loadFile(requestFile);
    if (!content) {
      throw new Error(`Request file not found: ${requestFile}`);
    }

    const request = JSON.parse(content);
    const output = await executeRequest(request);
    
    console.log(START_MARKER);
    console.log(JSON.stringify(output));
    console.log(END_MARKER);
  } catch (err) {
    console.log(START_MARKER);
    console.log(JSON.stringify({
      success: false,
      error: { message: "Fatal: " + (err.message || String(err)), type: 'FatalError' }
    }));
    console.log(END_MARKER);
  }
}

main();
