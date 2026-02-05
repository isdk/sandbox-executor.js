import type { FileChange } from './request';

export const SyncStates = {
  CONTINUE: 'continue',
  SKIP: 'skip',
  ABORT: 'abort',
} as const;

export type SyncState = typeof SyncStates[keyof typeof SyncStates];

export interface BeforeSyncEventResult {
  state: SyncState;
  reason?: string;
}

export interface AfterSyncEventData extends FileChange {
  success: boolean;
  error?: Error;
}

export interface SyncEventConfig {
  allowAbort?: boolean;
}
