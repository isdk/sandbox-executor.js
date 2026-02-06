import { CodeGenerator } from './base';
import type { InferredSignature } from '../inference/engine';

const PHP_PROXY = `<?php
// === Sandbox Executor PHP Proxy ===

const START_MARKER = "__SANDBOX_RESULT_START__";
const END_MARKER = "__SANDBOX_RESULT_END__";

function __sandbox_serialize($obj) {
    if (is_object($obj)) {
        return (array)$obj;
    }
    return $obj;
}

function execute_request($request) {
    try {
        $filePath = $request['filePath'] ?? '/workspace/user_code.php';
        $funcName = $request['functionName'];
        $args = $request['args'] ?? [];
        $kwargs = $request['kwargs'] ?? [];

        if (file_exists($filePath)) {
            require_once $filePath;
        }

        if (!function_exists($funcName)) {
            throw new Exception("Function '$funcName' not found.");
        }

        // PHP handles kwargs via associative arrays if the function is designed for it.
        if (!empty($kwargs)) {
            $result = call_user_func_array($funcName, array_merge($args, [$kwargs]));
        } else {
            $result = call_user_func_array($funcName, $args);
        }

        return [
            "success" => true,
            "result" => __sandbox_serialize($result)
        ];
    } catch (Exception $e) {
        return [
            "success" => false,
            "error" => [
                "message" => $e->getMessage(),
                "type" => get_class($e),
                "stack" => $e->getTraceAsString()
            ]
        ];
    } catch (Throwable $e) {
        return [
            "success" => false,
            "error" => [
                "message" => $e->getMessage(),
                "type" => get_class($e),
                "stack" => $e->getTraceAsString()
            ]
        ];
    }
}

// Pseudo-stdin: Decode from embedded base64 data to avoid stdin issues in php-cgi WASM
$input = base64_decode('{{STDIN_DATA}}');

if (strlen($input) < 5) {
    error_log("DEBUG: Invalid pseudo-stdin data");
    exit;
}

$mode = $input[0];
$lenData = substr($input, 1, 4);
$length = unpack('N', $lenData)[1];

if ($mode === 'A') {
    $payload = substr($input, 5, $length);
    $request = json_decode($payload, true);
    $output = execute_request($request);

    echo START_MARKER . "\\n";
    echo json_encode($output) . "\\n";
    echo END_MARKER . "\\n";
}
`;

export class PHPCgiGenerator extends CodeGenerator {
  readonly language = 'php';
  readonly fileExtension = '.php';

  generateFiles(
    userCode: string,
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    _signature: InferredSignature
  ): Record<string, string | Uint8Array> {
    let code = userCode.trim();
    if (!code.startsWith('<?php')) {
      code = '<?php\n' + code;
    }

    const stdinData = this.buildAtomicStdin({
      functionName,
      args,
      kwargs,
      filePath: `/workspace/user_code${this.fileExtension}`
    });

    // Convert binary string to base64
    const encodedStdin = Buffer.from(stdinData, 'binary').toString('base64');
    const proxyWithData = PHP_PROXY.replace('{{STDIN_DATA}}', encodedStdin);

    return {
      [`main${this.fileExtension}`]: proxyWithData,
      [`user_code${this.fileExtension}`]: code,
    };
  }

  generateStdin(
    _functionName: string,
    _args: unknown[],
    _kwargs: Record<string, unknown>
  ): string | Uint8Array {
    // We use pseudo-stdin embedded in the files for PHP
    return '';
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