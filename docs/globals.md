[**@isdk/sandbox-executor**](README.md)

***

# @isdk/sandbox-executor

`@isdk/sandbox-executor` is a secure, multi-language function execution engine 
based on WASM sandboxing (Runno).

Key Features:
- **Multi-language**: Support for Python, Ruby, and JavaScript (QuickJS).
- **Security**: Fine-grained, path-based file system permissions.
- **Change Tracking**: Real-time monitoring and reporting of file system modifications.
- **Host Sync**: Seamless bidirectional synchronization between host and sandbox directories.
- **Signature Inference**: Automatically detect function arguments from source code.

## Classes

- [CodeGenerator](classes/CodeGenerator.md)
- [FSBuilder](classes/FSBuilder.md)
- [PermissionDeniedError](classes/PermissionDeniedError.md)
- [PermissionResolver](classes/PermissionResolver.md)
- [SandboxExecutor](classes/SandboxExecutor.md)
- [SignatureInferenceEngine](classes/SignatureInferenceEngine.md)
- [SyncManager](classes/SyncManager.md)
- [TrackedFileSystem](classes/TrackedFileSystem.md)

## Interfaces

- [AfterSyncEventData](interfaces/AfterSyncEventData.md)
- [BeforeSyncEventResult](interfaces/BeforeSyncEventResult.md)
- [ExecutionError](interfaces/ExecutionError.md)
- [ExecutionMeta](interfaces/ExecutionMeta.md)
- [ExecutionResult](interfaces/ExecutionResult.md)
- [ExecutorOptions](interfaces/ExecutorOptions.md)
- [FileChange](interfaces/FileChange.md)
- [FileChangeSummary](interfaces/FileChangeSummary.md)
- [FunctionCallRequest](interfaces/FunctionCallRequest.md)
- [FunctionSchema](interfaces/FunctionSchema.md)
- [LoadingConfig](interfaces/LoadingConfig.md)
- [MountConfig](interfaces/MountConfig.md)
- [ParamSchema](interfaces/ParamSchema.md)
- [PermissionConfig](interfaces/PermissionConfig.md)
- [PermissionDeniedRecord](interfaces/PermissionDeniedRecord.md)
- [PermissionRule](interfaces/PermissionRule.md)
- [PermissionSet](interfaces/PermissionSet.md)
- [ResultOptions](interfaces/ResultOptions.md)
- [SecurityConfig](interfaces/SecurityConfig.md)
- [SyncConfig](interfaces/SyncConfig.md)
- [SyncEventConfig](interfaces/SyncEventConfig.md)
- [SyncResult](interfaces/SyncResult.md)

## Type Aliases

- [ExecutionStatus](type-aliases/ExecutionStatus.md)
- [LoadingMode](type-aliases/LoadingMode.md)
- [Permission](type-aliases/Permission.md)
- [PermissionDeniedBehavior](type-aliases/PermissionDeniedBehavior.md)
- [SupportedLanguage](type-aliases/SupportedLanguage.md)
- [SymlinkBehavior](type-aliases/SymlinkBehavior.md)
- [SyncErrorBehavior](type-aliases/SyncErrorBehavior.md)
- [SyncMode](type-aliases/SyncMode.md)
- [SyncState](type-aliases/SyncState.md)
- [WASIFile](type-aliases/WASIFile.md)
- [WASIFS](type-aliases/WASIFS.md)

## Variables

- [ALL\_PERMISSIONS](variables/ALL_PERMISSIONS.md)
- [RESULT\_MARKERS](variables/RESULT_MARKERS.md)
- [SyncStates](variables/SyncStates.md)

## Functions

- [createExecutor](functions/createExecutor.md)
- [getGenerator](functions/getGenerator.md)
