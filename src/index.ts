// src/index.ts

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
