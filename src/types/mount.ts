// src/types/mount.ts

import type { PermissionConfig } from './permissions';

export type LoadingMode = 'eager' | 'lazy' | 'explicit';
export type SyncMode = 'batch' | 'manual';
export type SyncErrorBehavior = 'rollback' | 'continue' | 'abort';
export type SymlinkBehavior = boolean | 'restricted';
export type PermissionDeniedBehavior = 'throw' | 'ignore' | 'virtual';

export interface LoadingConfig {
  mode: LoadingMode;
  include?: string[];
  maxFileSize?: number;
  maxTotalSize?: number;
}

export interface SyncConfig {
  mode: SyncMode;
  onError?: SyncErrorBehavior;
}

export interface SecurityConfig {
  followSymlinks?: SymlinkBehavior;
}

export interface MountConfig {
  dirs: Record<string, string>;
  permissions?: PermissionConfig;
  loading?: LoadingConfig;
  sync?: SyncConfig;
  security?: SecurityConfig;
  onPermissionDenied?: PermissionDeniedBehavior;
}
