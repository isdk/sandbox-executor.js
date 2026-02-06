<?php
// === Sandbox Executor PHP Proxy (File Mode) ===

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

        if (!empty($kwargs)) {
            $result = call_user_func_array($funcName, array_merge($args, [$kwargs]));
        } else {
            $result = call_user_func_array($funcName, $args);
        }

        return [
            "success" => true,
            "result" => __sandbox_serialize($result)
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

$requestFile = '/workspace/.sandbox_request.json';
if (file_exists($requestFile)) {
    $payload = file_get_contents($requestFile);
    $request = json_decode($payload, true);
    $output = execute_request($request);

    echo START_MARKER . "
";
    echo json_encode($output) . "
";
    echo END_MARKER . "
";
} else {
    error_log("Request file not found: $requestFile");
}
