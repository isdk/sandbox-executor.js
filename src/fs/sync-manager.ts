import { EventEmitter } from 'events-ex';
import type {
  FileChange,
  SyncResult,
  SyncConfig,
  SyncEventConfig,
  AfterSyncEventData,
  BeforeSyncEventResult,
} from '../types';

export type PathResolver = (virtualPath: string) => string | null;
export type FileWriter = (realPath: string, content: Uint8Array) => Promise<void>;
export type FileDeleter = (realPath: string) => Promise<void>;

export interface SyncManagerOptions {
  config: SyncConfig;
  eventConfig?: SyncEventConfig;
  pathResolver: PathResolver;
  fileWriter: FileWriter;
  fileDeleter: FileDeleter;
}

interface RollbackInfo {
  path: string;
  type: 'created' | 'modified';
  originalContent?: Uint8Array;
}

export class SyncManager extends EventEmitter {
  private config: SyncConfig;
  private eventConfig: SyncEventConfig;
  private pathResolver: PathResolver;
  private fileWriter: FileWriter;
  private fileDeleter: FileDeleter;

  constructor(options: SyncManagerOptions) {
    super();
    this.config = options.config;
    this.eventConfig = options.eventConfig ?? { allowAbort: true };
    this.pathResolver = options.pathResolver;
    this.fileWriter = options.fileWriter;
    this.fileDeleter = options.fileDeleter;
  }

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
