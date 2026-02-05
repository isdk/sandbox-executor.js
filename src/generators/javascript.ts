// src/generators/javascript.ts

import { CodeGenerator, RESULT_MARKERS } from './base';
import type { InferredSignature } from '../inference/engine';

export class JavaScriptGenerator extends CodeGenerator {
  readonly language = 'quickjs';
  readonly fileExtension = '.js';

  protected generateWrapper(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string {
    const callExpr = this.buildCallExpression(functionName, args, kwargs, signature);

    return `
// === Sandbox Executor Wrapper ===
(async () => {
  try {
    const __result__ = await (${callExpr});
    console.log("${RESULT_MARKERS.START}");
    console.log(JSON.stringify({ success: true, result: __result__ }));
    console.log("${RESULT_MARKERS.END}");
  } catch (e) {
    console.log("${RESULT_MARKERS.START}");
    console.log(JSON.stringify({
      success: false,
      error: { message: e.message || String(e), type: e.name || 'Error', stack: e.stack }
    }));
    console.log("${RESULT_MARKERS.END}");
  }
})();
`;
  }

  private buildCallExpression(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string {
    const hasKwargs = Object.keys(kwargs).length > 0;

    if (signature.hasOptionsParam && hasKwargs) {
      const argsStr = args.map(a => this.serialize(a)).join(', ');
      const optsStr = this.serialize(kwargs);
      return argsStr
        ? `${functionName}(${argsStr}, ${optsStr})`
        : `${functionName}(${optsStr})`;
    }

    if (signature.params.length > 0 && hasKwargs) {
      return this.buildMappedCall(functionName, args, kwargs, signature);
    }

    return `${functionName}(${args.map(a => this.serialize(a)).join(', ')})`;
  }

  private buildMappedCall(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string {
    const finalArgs = [...args];

    signature.params.forEach((param, idx) => {
      if (finalArgs[idx] === undefined && param.name in kwargs) {
        finalArgs[idx] = kwargs[param.name];
      }
    });

    return `${functionName}(${finalArgs.map(a => this.serialize(a)).join(', ')})`;
  }

  protected serialize(value: unknown): string {
    return JSON.stringify(value);
  }
}
