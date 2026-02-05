// src/generators/ruby.ts

import { CodeGenerator, RESULT_MARKERS } from './base';
import type { InferredSignature } from '../inference/engine';

export class RubyGenerator extends CodeGenerator {
  readonly language = 'ruby';
  readonly fileExtension = '.rb';

  protected generateWrapper(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string {
    const argsCode = args.map(a => this.serialize(a)).join(', ');
    const kwargsCode = Object.entries(kwargs)
      .map(([k, v]) => `${k}: ${this.serialize(v)}`)
      .join(', ');

    const callArgs = [argsCode, kwargsCode].filter(Boolean).join(', ');

    return `
# === Sandbox Executor Wrapper ===
require 'json'

begin
  __result__ = ${functionName}(${callArgs})
  __output__ = { success: true, result: __result__ }
rescue => e
  __output__ = {
    success: false,
    error: { message: e.message, type: e.class.name, stack: e.backtrace&.join("\\n") }
  }
end

puts "${RESULT_MARKERS.START}"
puts __output__.to_json
puts "${RESULT_MARKERS.END}"
`;
  }

  protected serialize(value: unknown): string {
    if (value === null || value === undefined) return 'nil';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) {
      return `[${value.map(v => this.serialize(v)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `"${k}" => ${this.serialize(v)}`);
      return `{${entries.join(', ')}}`;
    }
    return String(value);
  }
}
