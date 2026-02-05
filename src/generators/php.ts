// src/generators/php.ts

import { CodeGenerator, RESULT_MARKERS } from './base';
import type { InferredSignature } from '../inference/engine';

export class PHPGenerator extends CodeGenerator {
  readonly language = 'php';
  readonly fileExtension = '.php';

  override generateExecutionCode(
    userCode: string,
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string {
    const wrapper = this.generateWrapper(functionName, args, kwargs, signature);
    let code = userCode.trim();
    if (!code.startsWith('<?php')) {
      code = '<?php\n' + code;
    }
    return `${code}\n\n${wrapper}`;
  }

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
// === Sandbox Executor Wrapper ===
if (!function_exists('__sandbox_serialize__')) {
    function __sandbox_serialize__($obj) {
        if (is_array($obj)) {
            return array_map('__sandbox_serialize__', $obj);
        }
        if (is_object($obj)) {
            if (method_exists($obj, 'to_dict')) {
                return __sandbox_serialize__($obj->to_dict());
            }
            return array_map('__sandbox_serialize__', (array)$obj);
        }
        return $obj;
    }
}

try {
    $__sandbox_result__ = ${functionName}(${callArgs});
    $__sandbox_output__ = [
        "success" => true,
        "result" => __sandbox_serialize__($__sandbox_result__)
    ];
} catch (Throwable $__e__) {
    $__sandbox_output__ = [
        "success" => false,
        "error" => [
            "message" => $__e__->getMessage(),
            "type" => get_class($__e__),
            "stack" => $__e__->getTraceAsString()
        ]
    ];
}

echo "${RESULT_MARKERS.START}\\n";
echo json_encode($__sandbox_output__, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
echo "\\n${RESULT_MARKERS.END}\\n";
`;
  }

  protected serialize(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) {
      return '[' + value.map(v => this.serialize(v)).join(', ') + ']';
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `${JSON.stringify(k)} => ${this.serialize(v)}`);
      return '[' + entries.join(', ') + ']';
    }
    return String(value);
  }
}