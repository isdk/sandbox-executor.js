// === Sandbox Executor JavaScript Inline Wrapper for QuickJS ===
const START_MARKER = "__SANDBOX_RESULT_START__";
const END_MARKER = "__SANDBOX_RESULT_END__";

async function run() {
  let output;
  try {
    const userCode = await import('./user_code.js');
    
    // Inline arguments
    const args = {{ARGS}};
    const kwargs = {{KWARGS}};
    const funcName = "{{FUNCTION_NAME}}";
    
    const func = userCode[funcName];
    if (typeof func !== 'function') {
      throw new Error(`Function '${funcName}' not found`);
    }

    let result;
    if (Object.keys(kwargs).length > 0) {
      result = await func(...args, kwargs);
    } else {
      result = await func(...args);
    }

    output = {
      success: true,
      result: result
    };
  } catch (e) {
    output = {
      success: false,
      error: {
        message: e.message || String(e),
        type: e.name || 'Error',
        stack: e.stack
      }
    };
  }

  console.log(START_MARKER);
  console.log(JSON.stringify(output));
  console.log(END_MARKER);
}

run();