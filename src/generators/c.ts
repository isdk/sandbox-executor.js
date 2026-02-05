// src/generators/c.ts

import { CodeGenerator, RESULT_MARKERS } from './base';
import type { InferredSignature } from '../inference/engine';

export class CGenerator extends CodeGenerator {
  readonly language = 'clang';
  readonly fileExtension = '.c';

  protected generateWrapper(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string {
    const argsCode = args.map(a => this.serialize(a)).join(', ');

    // For C, we need to handle different return types.
    // We'll try to guess based on the returnType if present, or assume int.
    const returnType = (signature as any).returnType || 'int';

    let printResultCode = '';
    if (returnType === 'void') {
      printResultCode = `
    ${functionName}(${argsCode});
    printf("{\\"success\\": true, \\"result\\": null}");
`;
    } else if (returnType === 'int' || returnType === 'long' || returnType === 'short') {
      printResultCode = `
    ${returnType} __result__ = ${functionName}(${argsCode});
    printf("{\\"success\\": true, \\"result\\": %ld}", (long)__result__);
`;
    } else if (returnType === 'float' || returnType === 'double') {
      printResultCode = `
    ${returnType} __result__ = ${functionName}(${argsCode});
    printf("{\\"success\\": true, \\"result\\": %g}", (double)__result__);
`;
    } else if (returnType === 'char*' || returnType === 'const char*') {
      printResultCode = `
    ${returnType} __result__ = ${functionName}(${argsCode});
    printf("{\\"success\\": true, \\"result\\": \\"%s\\"}", __result__);
`;
    } else if (returnType === 'bool' || returnType === '_Bool') {
      printResultCode = `
    bool __result__ = ${functionName}(${argsCode});
    printf("{\\"success\\": true, \\"result\\": %s}", __result__ ? "true" : "false");
`;
    } else {
      // Fallback for unknown types - might work for numbers
      printResultCode = `
    long __result__ = (long)${functionName}(${argsCode});
    printf("{\\"success\\": true, \\"result\\": %ld}", __result__);
`;
    }

    return `
#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>

// === Sandbox Executor Wrapper ===
int main() {
    printf("%s\\n", "${RESULT_MARKERS.START}");
    ${printResultCode}
    printf("\\n%s\\n", "${RESULT_MARKERS.END}");
    return 0;
}
`;
  }

  protected serialize(value: unknown): string {
    if (value === null || value === undefined) return '0';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return String(value);
    // Arrays and objects are hard in C without a library
    return '0';
  }
}