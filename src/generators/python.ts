// src/generators/python.ts

import { CodeGenerator, RESULT_MARKERS } from './base';
import type { InferredSignature } from '../inference/engine';

export class PythonGenerator extends CodeGenerator {
  readonly language = 'python';
  readonly fileExtension = '.py';

  protected generateWrapper(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string {
    const argsCode = args.map(a => this.serialize(a)).join(', ');
    const kwargsCode = Object.entries(kwargs)
      .map(([k, v]) => `${k}=${this.serialize(v)}`)
      .join(', ');

    const callArgs = [argsCode, kwargsCode].filter(Boolean).join(', ');

    return `
# === Sandbox Executor Wrapper ===
import json
import sys
import traceback

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
    __sandbox_result__ = ${functionName}(${callArgs})
    __sandbox_output__ = {
        "success": True,
        "result": __sandbox_serialize__(__sandbox_result__)
    }
except Exception as __e__:
    __sandbox_output__ = {
        "success": False,
        "error": {
            "message": str(__e__),
            "type": type(__e__).__name__,
            "stack": traceback.format_exc()
        }
    }

print("${RESULT_MARKERS.START}")
print(json.dumps(__sandbox_output__, ensure_ascii=False, default=str))
print("${RESULT_MARKERS.END}")
`;
  }

  protected serialize(value: unknown): string {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) {
      return `[${value.map(v => this.serialize(v)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${JSON.stringify(k)}: ${this.serialize(v)}`);
      return `{${entries.join(', ')}}`;
    }
    return String(value);
  }
}
