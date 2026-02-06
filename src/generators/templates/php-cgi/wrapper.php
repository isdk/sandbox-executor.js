<?php
// === Sandbox Executor PHP Inline Wrapper ===

const START_MARKER = "__SANDBOX_RESULT_START__";
const END_MARKER = "__SANDBOX_RESULT_END__";

function __sandbox_serialize($obj) {
    if (is_object($obj)) {
        return (array)$obj;
    }
    return $obj;
}

try {
    @require_once '/workspace/user_code.php';
    
    // Inline arguments
    $args = {{ARGS}};
    $kwargs = {{KWARGS}};
    $funcName = "{{FUNCTION_NAME}}";
    
    if (!function_exists($funcName)) {
        throw new Exception("Function '$funcName' not found.");
    }

    if (!empty($kwargs)) {
        $result = call_user_func_array($funcName, array_merge($args, [$kwargs]));
    } else {
        $result = call_user_func_array($funcName, $args);
    }

    $output = [
        "success" => true,
        "result" => __sandbox_serialize($result)
    ];
} catch (Throwable $e) {
    $output = [
        "success" => false,
        "error" => [
            "message" => $e->getMessage(),
            "type" => get_class($e),
            "stack" => $e->getTraceAsString()
        ]
    ];
}

echo START_MARKER . "
";
echo json_encode($output) . "
";
echo END_MARKER . "
";
