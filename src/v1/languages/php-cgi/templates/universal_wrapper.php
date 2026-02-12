<?php
// === Sandbox-Link PHP Wrapper ===

const START_MARKER = "__SANDBOX_RESULT_START__";
const END_MARKER = "__SANDBOX_RESULT_END__";

function send_result($msg) {
    echo START_MARKER . json_encode($msg) . END_MARKER . "
";
}

function execute_call($call_msg) {
    try {
        $method = $call_msg['method'];
        $params = $call_msg['params'] ?? [];
        $args = $params['args'] ?? [];
        $kwargs = $params['kwargs'] ?? [];

        $filePath = '/workspace/user_code.php';
        if (file_exists($filePath)) {
            require_once $filePath;
        }

        if (!function_exists($method)) {
            throw new Exception("Function '$method' not found.");
        }

        if (!empty($kwargs)) {
            $result = call_user_func_array($method, array_merge($args, [$kwargs]));
        } else {
            $result = call_user_func_array($method, $args);
        }

        return [
            "status" => "ok",
            "data" => ["result" => $result]
        ];
    } catch (Throwable $e) {
        return [
            "status" => "fail",
            "data" => [
                "error" => [
                    "message" => $e->getMessage(),
                    "type" => get_class($e),
                    "stack" => $e->getTraceAsString()
                ]
            ]
        ];
    }
}

// Pseudo-stdin: Decode from embedded base64 data
$input = base64_decode('{{STDIN_DATA}}');

if (strlen($input) < 9) {
    exit;
}

$mode = $input[0];
$lenHex = substr($input, 1, 8);
$length = hexdec($lenHex);

if ($mode === 'A') {
    $payload = substr($input, 9, $length);
    $call_msg = json_decode($payload, true);
    $id = $call_msg['id'];
    
    $res = execute_call($call_msg);
    $res['ver'] = "1.0";
    $res['id'] = $id;
    $res['type'] = "result";

    send_result($res);
}
