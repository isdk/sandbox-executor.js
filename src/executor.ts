import { EventEmitter } from 'events-ex';
import { runFS } from '@runno/sandbox';
import type { WASIFS } from './types';

import type {
  FunctionCallRequest,
  ExecutionResult,
  ExecutionError,
  FileChange,
  FileChangeSummary,
  SyncResult,
  MountConfig,
  SyncEventConfig,
  PermissionDeniedRecord,
  AfterSyncEventData,
} from './types';

import { PermissionResolver } from './fs/permission-resolver';
import { TrackedFileSystem } from './fs/tracked-fs';
import { FSBuilder } from './fs/fs-builder';
import { SyncManager } from './fs/sync-manager';
import { SignatureInferenceEngine } from './inference/engine';
import { getGenerator, RESULT_MARKERS } from './generators';

// Runno 结果类型
interface RunResultBase {
  resultType: string;
}

interface RunResultComplete extends RunResultBase {
  resultType: 'complete';
  stdin: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  fs: WASIFS;
}

interface RunResultCrash extends RunResultBase {
  resultType: 'crash';
  error: Error;
}

interface RunResultTerminated extends RunResultBase {
  resultType: 'terminated';
}

interface RunResultTimeout extends RunResultBase {
  resultType: 'timeout';
}

type RunResult = RunResultComplete | RunResultCrash | RunResultTerminated | RunResultTimeout;

export interface ExecutorOptions {
  defaultWorkdir?: string;
  syncEventConfig?: SyncEventConfig;
}

export class SandboxExecutor extends EventEmitter {
  private inferenceEngine = new SignatureInferenceEngine();
  private options: Required<ExecutorOptions>;

  constructor(options: ExecutorOptions = {}) {
    super();
    this.options = {
      defaultWorkdir: options.defaultWorkdir ?? '/workspace',
      syncEventConfig: options.syncEventConfig ?? { allowAbort: true },
    };
  }

  /**
   * 执行函数调用
   */
  async execute<T = unknown>(request: FunctionCallRequest): Promise<ExecutionResult<T>> {
    const startTime = Date.now();
    const workdir = request.workdir ?? this.options.defaultWorkdir;
    const hasMount = this.hasValidMount(request.mount);

    try {
      // 1. 推断函数签名
      const signature = this.inferenceEngine.resolve(
        request.code,
        request.functionName,
        request.language,
        request.schema
      );

      // 2. 生成执行代码
      const generator = getGenerator(request.language);
      const fullCode = generator.generateExecutionCode(
        request.code,
        request.functionName,
        request.args ?? [],
        request.kwargs ?? {},
        signature
      );

      // 3. 构建文件系统
      const { fs: proxyFS, tracker } = await this.buildFileSystem(
        fullCode,
        generator.fileExtension,
        workdir,
        request.files,
        request.mount
      );

      // 4. 执行代码
      const entryPath = `${workdir}/main${generator.fileExtension}`;
      const runResult = await runFS(request.language, entryPath, proxyFS) as RunResult;

      // 5. 检查执行结果类型
      if (runResult.resultType !== 'complete') {
        return this.handleNonCompleteResult<T>(runResult, startTime, signature.source);
      }

      // 6. 执行成功，继续处理
      const completeResult = runResult as RunResultComplete;

      // 7. 检测文件变更
      tracker?.diffWithOriginal();
      const changes = tracker?.getChanges() ?? {
        created: [],
        modified: [],
        deleted: [],
        denied: [],
      };

      // 8. 处理同步（仅当有挂载且配置为 batch 模式）
      let syncResult: SyncResult | undefined;
      if (hasMount && request.mount!.sync?.mode === 'batch') {
        syncResult = await this.performSync(
          [...changes.created, ...changes.modified, ...changes.deleted],
          request.mount!
        );
      }

      // 9. 解析函数返回值
      const parsed = this.parseOutput<T>(completeResult.stdout);

      // 10. 返回结果
      return {
        status: parsed.success ? 'success' : 'error',
        success: parsed.success,
        result: parsed.result,
        error: parsed.error,
        stdout: completeResult.stdout,
        stderr: completeResult.stderr,
        exitCode: completeResult.exitCode,
        files: request.resultOptions?.includeChanges !== false
          ? this.buildChangeSummary(changes, syncResult)
          : undefined,
        meta: {
          duration: Date.now() - startTime,
          signatureSource: signature.source,
        },
      };

    } catch (error) {
      // 执行器内部错误
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        status: 'error',
        success: false,
        error: {
          message: err.message,
          type: err.name,
          stack: err.stack,
        },
        stdout: '',
        stderr: err.message,
        exitCode: 1,
        meta: {
          duration: Date.now() - startTime,
          signatureSource: 'convention',
        },
      };
    }
  }

  /**
   * 处理非完成状态的执行结果
   */
  private handleNonCompleteResult<T>(
    runResult: RunResult,
    startTime: number,
    signatureSource: 'schema' | 'inferred' | 'convention'
  ): ExecutionResult<T> {
    const baseMeta = {
      duration: Date.now() - startTime,
      signatureSource,
    };

    switch (runResult.resultType) {
      case 'crash':
        return {
          status: 'crash',
          success: false,
          error: {
            message: runResult.error?.message ?? 'Runtime crashed',
            type: 'CrashError',
            stack: runResult.error?.stack,
          },
          stdout: '',
          stderr: runResult.error?.message ?? 'Runtime crashed',
          exitCode: 1,
          meta: baseMeta,
        };

      case 'terminated':
        return {
          status: 'terminated',
          success: false,
          error: {
            message: 'The program was terminated.',
            type: 'TerminatedError',
          },
          stdout: '',
          stderr: 'The program was terminated.',
          exitCode: 143,  // SIGTERM
          meta: baseMeta,
        };

      case 'timeout':
        return {
          status: 'timeout',
          success: false,
          error: {
            message: 'Execution timed out.',
            type: 'TimeoutError',
          },
          stdout: '',
          stderr: 'Execution timed out.',
          exitCode: 124,  // timeout 命令的退出码
          meta: baseMeta,
        };

      default:
        return {
          status: 'error',
          success: false,
          error: {
            message: `Unexpected result type: ${(runResult as RunResultBase).resultType}`,
            type: 'UnknownError',
          },
          stdout: '',
          stderr: `Unexpected result type: ${(runResult as RunResultBase).resultType}`,
          exitCode: 1,
          meta: baseMeta,
        };
    }
  }

  /**
   * 手动同步文件变更
   */
  async syncFiles(
    changes: FileChange[],
    mount: MountConfig,
    options?: { onError?: 'rollback' | 'continue' | 'abort' }
  ): Promise<SyncResult> {
    const syncManager = this.createSyncManager({
      ...mount,
      sync: {
        mode: 'batch',
        onError: options?.onError ?? 'continue',
      },
    });
    return syncManager.syncBatch(changes);
  }

  /**
   * 检查是否有有效的挂载配置
   */
  private hasValidMount(mount?: MountConfig): boolean {
    return !!(mount && mount.dirs && Object.keys(mount.dirs).length > 0);
  }

  /**
   * 构建文件系统
   */
  private async buildFileSystem(
    code: string,
    extension: string,
    workdir: string,
    files?: Record<string, string | Uint8Array>,
    mount?: MountConfig
  ): Promise<{ fs: WASIFS; tracker: TrackedFileSystem | null }> {
    const fsBuilder = new FSBuilder({ workdir });

    // 添加入口文件
    fsBuilder.addEntryFile(`main${extension}`, code);

    // 添加虚拟文件
    if (files) {
      fsBuilder.addFiles(files);
    }

    const hasMount = this.hasValidMount(mount);

    // 加载挂载目录（仅 Node.js 环境 + eager 模式）
    if (hasMount && mount!.loading?.mode === 'eager') {
      for (const [vPath, rPath] of Object.entries(mount!.dirs)) {
        await fsBuilder.loadFromDisk(vPath, rPath, {
          maxFileSize: mount!.loading?.maxFileSize,
          maxTotalSize: mount!.loading?.maxTotalSize,
          exclude: mount!.permissions?.exclude,
        });
      }
    }

    const baseFS = fsBuilder.build();

    // 权限策略
    const permissionResolver = hasMount
      ? new PermissionResolver(mount!.permissions)
      : PermissionResolver.allowAll();

    const onPermissionDenied = hasMount
      ? (mount!.onPermissionDenied ?? 'throw')
      : 'ignore';

    // 创建追踪文件系统
    const tracker = new TrackedFileSystem(baseFS, permissionResolver, onPermissionDenied);
    const proxyFS = tracker.getProxy();

    return { fs: proxyFS, tracker };
  }

  /**
   * 执行同步
   */
  private async performSync(
    changes: FileChange[],
    mount: MountConfig
  ): Promise<SyncResult> {
    const syncManager = this.createSyncManager(mount);

    // 转发事件
    syncManager.on('beforeSync', (change: FileChange) => {
      return this.emit('beforeSync', change);
    });
    syncManager.on('afterSync', (data: AfterSyncEventData) => {
      this.emit('afterSync', data);
    });
    syncManager.on('syncError', (change: FileChange, error: Error) => {
      this.emit('syncError', change, error);
    });

    return syncManager.syncBatch(changes);
  }

  /**
   * 创建同步管理器
   */
  private createSyncManager(mount: MountConfig): SyncManager {
    const pathResolver = (virtualPath: string): string | null => {
      for (const [vPath, rPath] of Object.entries(mount.dirs)) {
        if (virtualPath.startsWith(vPath)) {
          return virtualPath.replace(vPath, rPath);
        }
      }
      return null;
    };

    const fileWriter = async (realPath: string, content: Uint8Array): Promise<void> => {
      if (typeof process === 'undefined' || !process.versions?.node) {
        throw new Error('File sync not supported in browser');
      }
      const fs = await import('fs/promises');
      const path = await import('path');
      await fs.mkdir(path.dirname(realPath), { recursive: true });
      await fs.writeFile(realPath, content);
    };

    const fileDeleter = async (realPath: string): Promise<void> => {
      if (typeof process === 'undefined' || !process.versions?.node) {
        throw new Error('File sync not supported in browser');
      }
      const fs = await import('fs/promises');
      await fs.unlink(realPath);
    };

    return new SyncManager({
      config: mount.sync ?? { mode: 'batch', onError: 'continue' },
      eventConfig: this.options.syncEventConfig,
      pathResolver,
      fileWriter,
      fileDeleter,
    });
  }

  /**
   * 解析输出结果
   */
  private parseOutput<T>(stdout: string): {
    success: boolean;
    result?: T;
    error?: ExecutionError;
  } {
    const startIdx = stdout.indexOf(RESULT_MARKERS.START);
    const endIdx = stdout.indexOf(RESULT_MARKERS.END);

    if (startIdx === -1 || endIdx === -1) {
      // 没有找到标记，可能是代码没有正确执行包装器
      // 尝试检查是否有错误输出
      return {
        success: true,
        result: stdout.trim() as unknown as T,
      };
    }

    const jsonStr = stdout
      .slice(startIdx + RESULT_MARKERS.START.length, endIdx)
      .trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        success: parsed.success,
        result: parsed.result,
        error: parsed.error,
      };
    } catch (e) {
      return {
        success: false,
        error: {
          message: 'Failed to parse execution result',
          type: 'ParseError',
        },
      };
    }
  }

  /**
   * 构建文件变更摘要
   */
  private buildChangeSummary(
    changes: {
      created: FileChange[];
      modified: FileChange[];
      deleted: FileChange[];
      denied: PermissionDeniedRecord[];
    },
    syncResult?: SyncResult
  ): FileChangeSummary {
    return {
      created: changes.created,
      modified: changes.modified,
      deleted: changes.deleted,
      denied: changes.denied,

      hasChanges() {
        return this.created.length + this.modified.length + this.deleted.length > 0;
      },

      all() {
        return [...this.created, ...this.modified, ...this.deleted];
      },

      byPath(path: string) {
        return this.all().find(c => c.path === path);
      },
    };
  }
}

export function createExecutor(options?: ExecutorOptions): SandboxExecutor {
  return new SandboxExecutor(options);
}
