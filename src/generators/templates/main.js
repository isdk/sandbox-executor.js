// === Sandbox Executor JavaScript Proxy ===
const fs = require('fs');

const START_MARKER = "__SANDBOX_RESULT_START__";
const END_MARKER = "__SANDBOX_RESULT_END__";

const _USER_MODULE_CACHE = new Map();

async function executeRequest(request) {
  try {
    const filePath = request.filePath || '/workspace/user_code.js';
    const funcName = request.functionName;
    const args = request.args || [];
    const kwargs = request.kwargs || {};

    let userModule;
    if (_USER_MODULE_CACHE.has(filePath)) {
      userModule = _USER_MODULE_CACHE.get(filePath);
    } else {
      // In some environments (like QuickJS), we might need to use require or eval
      // but dynamic import is the most modern way if supported.
      try {
        userModule = await import(filePath);
      } catch (e) {
        // Fallback for environments where dynamic import is not available
        userModule = require(filePath);
      }
      _USER_MODULE_CACHE.set(filePath, userModule);
    }

    const func = userModule[funcName];
    if (typeof func !== 'function') {
      throw new Error(`Function '${funcName}' not found in ${filePath}`);
    }

    // Handle JS kwargs by checking if the last argument should be an options object
    // For simplicity, we assume the generator/executor handled the mapping or 
    // we pass args and kwargs as is if needed. 
    // Here we follow the convention of passing args, then kwargs if not empty.
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
  const stdinBuffer = fs.readFileSync(0); // Read all from fd 0 (stdin)
  if (stdinBuffer.length === 0) return;

  const mode = String.fromCharCode(stdinBuffer[0]);
  
  if (mode === 'A') { // Atomic mode
    const inputData = stdinBuffer.slice(1).toString('utf8');
    const request = JSON.parse(inputData);
    const output = await executeRequest(request);
    
    console.log(START_MARKER);
    console.log(JSON.stringify(output));
    console.log(END_MARKER);
  } else if (mode === 'P') {
    // Persistent mode implementation would go here
    // Requires refactoring to read chunks from stdin stream
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
