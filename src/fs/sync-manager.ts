import { EventEmitter } from 'events-ex';
import type {
  FileChange,
  SyncResult,
  SyncConfig,
  SyncEventConfig,
  AfterSyncEventData,
  BeforeSyncEventResult,
} from '../types';

/**
 * Resolves a virtual sandbox path to a real host file system path.
 */
export type PathResolver = (virtualPath: string) => string | null;

/**
 * Function to write content to a real host path.
 */
export type FileWriter = (realPath: string, content: Uint8Array) => Promise<void>;

/**
 * Function to delete a file at a real host path.
 */
export type FileDeleter = (realPath: string) => Promise<void>;

/**
 * Configuration for initializing a SyncManager.
 */
export interface SyncManagerOptions {
  /** Sync policy configuration. */
  config: SyncConfig;
  /** Configuration for sync events. */
  eventConfig?: SyncEventConfig;
  /** Logic to map virtual paths to host paths. */
  pathResolver: PathResolver;
  /** IO function for writing files. */
  fileWriter: FileWriter;
  /** IO function for deleting files. */
  fileDeleter: FileDeleter;
}

/**
 * SyncManager coordinates the synchronization of file changes from the virtual sandbox
 * file system back to the real host file system.
 * 
 * It supports:
 * - Batch synchronization of multiple changes.
 * - Event-based hooks (beforeSync, afterSync, syncError).
 * - Error handling strategies: continue, abort, or rollback.
 * - Path resolution through custom resolvers.
 * 
 * @fires beforeSync - Emitted before a file is synced. Can be used to skip or abort.
 * @fires afterSync - Emitted after a file is synced (successfully or with error).
 * @fires syncError - Emitted when a specific file sync fails.
 */
export class SyncManager extends EventEmitter {
  private config: SyncConfig;
  private eventConfig: SyncEventConfig;
  private pathResolver: PathResolver;
  private fileWriter: FileWriter;
  private fileDeleter: FileDeleter;

  /**
   * Creates a new SyncManager instance.
   * @param options - Configuration and IO providers.
   */
  constructor(options: SyncManagerOptions) {
    super();
    this.config = options.config;
    this.eventConfig = options.eventConfig ?? { allowAbort: true };
    this.pathResolver = options.pathResolver;
    this.fileWriter = options.fileWriter;
    this.fileDeleter = options.fileDeleter;
  }

  /**
   * Synchronizes a batch of file changes to the host.
   * 
   * @param changes - Array of file changes to apply.
   * @returns A promise resolving to the synchronization summary.
   */
  async syncBatch(changes: FileChange[]): Promise<SyncResult> {
    const result: SyncResult = {
      synced: [],
      failed: [],
      skipped: [],
    };

    const rollbackStack: RollbackInfo[] = [];
    let aborted = false;

    for (const change of changes) {
      if (aborted) break;

      // Emit beforeSync event
      const eventResult = this.emit('beforeSync', change) as BeforeSyncEventResult | undefined;

      if (eventResult) {
        if (eventResult.state === 'skip') {
          result.skipped.push(change.path);
          continue;
        }
        if (eventResult.state === 'abort' && this.eventConfig.allowAbort) {
          aborted = true;
          if (this.config.onError === 'rollback') {
            await this.rollback(rollbackStack);
          }
          break;
        }
      }

      // Resolve real path
      const realPath = this.pathResolver(change.path);
      if (!realPath) {
        result.skipped.push(change.path);
        continue;
      }

      // Execute sync
      try {
        await this.syncOne(change, realPath, rollbackStack);
        result.synced.push(change.path);

        this.emit('afterSync', {
          ...change,
          realPath,
          success: true,
        } as AfterSyncEventData);

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        result.failed.push({ path: change.path, error: err });

        this.emit('syncError', change, err);
        this.emit('afterSync', {
          ...change,
          realPath,
          success: false,
          error: err,
        } as AfterSyncEventData);

        switch (this.config.onError) {
          case 'abort':
            aborted = true;
            break;
          case 'rollback':
            await this.rollback(rollbackStack);
            aborted = true;
            break;
          case 'continue':
          default:
            continue;
        }
      }
    }

    return result;
  }

  private async syncOne(
    change: FileChange,
    realPath: string,
    rollbackStack: RollbackInfo[]
  ): Promise<void> {
    switch (change.type) {
      case 'create':
        rollbackStack.push({ path: realPath, type: 'created' });
        if (change.content) {
          await this.fileWriter(realPath, change.content);
        }
        break;

      case 'modify':
        rollbackStack.push({
          path: realPath,
          type: 'modified',
          originalContent: change.oldContent,
        });
        if (change.content) {
          await this.fileWriter(realPath, change.content);
        }
        break;

      case 'delete':
        await this.fileDeleter(realPath);
        break;
    }
  }

  private async rollback(stack: RollbackInfo[]): Promise<void> {
    for (const info of stack.reverse()) {
      try {
        if (info.type === 'created') {
          await this.fileDeleter(info.path);
        } else if (info.type === 'modified' && info.originalContent) {
          await this.fileWriter(info.path, info.originalContent);
        }
      } catch (e) {
        console.error(`Rollback failed for ${info.path}:`, e);
      }
    }
  }
}
