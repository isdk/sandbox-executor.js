<?php
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

        require_once $filePath;

        if (!function_exists($funcName)) {
            throw new Exception("Function '$funcName' not found.");
        }

        // PHP handles kwargs via associative arrays if the function is designed for it,
        // or we can use reflection to map kwargs to positional params.
        // For simplicity, we just pass args and if kwargs exists, append it.
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
    }
}

// Read protocol header from php://input (standard for CGI)
$input = file_get_contents('php://input');
if (!$input) {
    exit;
}

$mode = $input[0];
$data = substr($input, 1);

if ($mode === 'A') {
    $request = json_decode($data, true);
    $output = execute_request($request);

    echo START_MARKER . "
";
    echo json_encode($output) . "
";
    echo END_MARKER . "
";
}
