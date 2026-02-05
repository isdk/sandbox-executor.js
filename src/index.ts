/**
 * @packageDocumentation
 * 
 * `@isdk/sandbox-executor` is a secure, multi-language function execution engine 
 * based on WASM sandboxing (Runno).
 * 
 * Key Features:
 * - **Multi-language**: Support for Python, Ruby, and JavaScript (QuickJS).
 * - **Security**: Fine-grained, path-based file system permissions.
 * - **Change Tracking**: Real-time monitoring and reporting of file system modifications.
 * - **Host Sync**: Seamless bidirectional synchronization between host and sandbox directories.
 * - **Signature Inference**: Automatically detect function arguments from source code.
 */

export { SandboxExecutor, createExecutor } from './executor';
export type { ExecutorOptions } from './executor';

// Types
export * from './types';

// Components
export { PermissionResolver } from './fs/permission-resolver';
export { TrackedFileSystem, PermissionDeniedError } from './fs/tracked-fs';
export { FSBuilder } from './fs/fs-builder';
export { SyncManager } from './fs/sync-manager';
export { SignatureInferenceEngine } from './inference/engine';
export { getGenerator, CodeGenerator, RESULT_MARKERS } from './generators';
