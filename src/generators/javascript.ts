import { CodeGenerator } from './base';
import type { InferredSignature } from '../inference/engine';

const JS_PROXY = `
// === Sandbox Executor JavaScript Proxy for QuickJS ===
import * as std from 'std';

const START_MARKER = "__SANDBOX_RESULT_START__";
const END_MARKER = "__SANDBOX_RESULT_END__";

async function main() {
  // Robust way to get stdin in different QuickJS/WASI environments
  const stdin = std.stdin || std.in || std.fdopen(0, "r");
  
  if (!stdin) {
    std.err.printf("DEBUG: Error: Stdin not found\\n");
    return;
  }

  // Read protocol header: [Mode(1b)][Length(4b)]
  const mByte = stdin.getByte();
  if (mByte < 0) {
    std.err.printf("DEBUG: Stdin empty\\n");
    return;
  }
  const mode = String.fromCharCode(mByte);
  
  const b1 = stdin.getByte();
  const b2 = stdin.getByte();
  const b3 = stdin.getByte();
  const b4 = stdin.getByte();
  const length = ((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) >>> 0;
  std.err.printf("DEBUG: Mode=%s, Length=%u\\n", mode, length);

  if (mode === 'A') {
    let payload = '';
    for (let i = 0; i < length; i++) {
      const byte = stdin.getByte();
      if (byte < 0) break;
      payload += String.fromCharCode(byte);
    }
    
    if (payload.length < length) {
      std.err.printf("DEBUG: Error: Expected %u bytes, got %u\\n", length, payload.length);
    }

    const request = JSON.parse(payload);
    const filePath = request.filePath || './user_code.js';
    const funcName = request.functionName;
    const args = request.args || [];
    const kwargs = request.kwargs || {};

    try {
      std.err.printf("DEBUG: Importing %s\\n", filePath);
      const userModule = await import(filePath);
      const func = userModule[funcName];
      if (typeof func !== 'function') {
        throw new Error(\`Function '\${funcName}' not found in \${filePath}\`);
      }

      let result;
      if (Object.keys(kwargs).length > 0) {
        result = await func(...args, kwargs);
      } else {
        result = await func(...args);
      }

      console.log(START_MARKER);
      console.log(JSON.stringify({ success: true, result: result }));
      console.log(END_MARKER);
    } catch (e) {
      const errOutput = {
        success: false,
        error: { message: e.message || String(e), type: e.name || 'Error', stack: e.stack }
      };
      console.log(START_MARKER);
      console.log(JSON.stringify(errOutput));
      console.log(END_MARKER);
    }
  }
}

main().catch(e => {
  const fatalOutput = {
    success: false,
    error: { message: "Fatal: " + (e.message || String(e)), type: 'FatalError', stack: e.stack }
  };
  console.log(START_MARKER);
  console.log(JSON.stringify(fatalOutput));
  console.log(END_MARKER);
});
`;

export class JavaScriptGenerator extends CodeGenerator {
  readonly language = 'quickjs';
  readonly fileExtension = '.js';

  generateFiles(
    userCode: string,
    _functionName: string,
    _args: unknown[],
    _kwargs: Record<string, unknown>,
    _signature: InferredSignature
  ): Record<string, string | Uint8Array> {
    // Ensure user code has exports if it's using ESM
    let processedCode = userCode;
    if (!userCode.includes('export ') && !userCode.includes('module.exports')) {
      // Very simple heuristic: if it looks like a function definition, add export
      processedCode = userCode.replace(/function\s+(\w+)/g, 'export function $1');
      // Also for arrow functions assigned to const/let
      processedCode = processedCode.replace(/(const|let|var)\s+(\w+)\s*=\s*(async\s*)?\(/g, 'export $1 $2 = $3(');
    }

    return {
      [`main${this.fileExtension}`]: JS_PROXY,
      [`user_code${this.fileExtension}`]: processedCode,
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
      filePath: `./user_code${this.fileExtension}`
    });
  }

  protected generateWrapper(
    _functionName: string,
    _args: unknown[],
    _kwargs: Record<string, unknown>,
    _signature: InferredSignature
  ): string {
    return '';
  }

  protected serialize(value: unknown): string {
    return JSON.stringify(value);
  }
}