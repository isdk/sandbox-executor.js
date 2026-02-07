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
  ArgsMode,
  InvokeOptions,
  ReportingOptions,
} from './types';

import { PermissionResolver } from './fs/permission-resolver';
import { FileSystemDiffer } from './fs/fs-differ';
import { FSBuilder } from './fs/fs-builder';
import { SyncManager } from './fs/sync-manager';
import { SignatureInferenceEngine } from './inference/engine';
import { getGenerator, getRuntime, RESULT_MARKERS } from './generators';

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

/**
 * Options for configuring the SandboxExecutor.
 */
export interface ExecutorOptions {
  /**
   * The default working directory within the sandbox.
   * Defaults to '/workspace'.
   */
  defaultWorkdir?: string;
  /**
   * Configuration for synchronization events.
   */
  syncEventConfig?: SyncEventConfig;
}

/**
 * SandboxExecutor handles the execution of code within a secure WASM-based sandbox.
 */
export class SandboxExecutor extends EventEmitter {
  private inferenceEngine = new SignatureInferenceEngine();
  private options: Required<ExecutorOptions>;

  /**
   * Creates a new SandboxExecutor instance.
   * @param options - Configuration options for the executor.
   */
  constructor(options: ExecutorOptions = {}) {
    super();
    this.options = {
      defaultWorkdir: options.defaultWorkdir ?? '/workspace',
      syncEventConfig: options.syncEventConfig ?? { allowAbort: true },
    };
  }

  /**
   * Executes a function call in the sandbox.
   */
  async execute<T = unknown>(request: FunctionCallRequest): Promise<ExecutionResult<T>> {
    const startTime = Date.now();
    const workdir = request.options?.workdir ?? this.options.defaultWorkdir;
    const mount = request.options?.mount;
    const files = request.options?.files;
    const hasMount = this.hasValidMount(mount);

    try {
      // 1. 推断函数签名
      const signature = this.inferenceEngine.resolve(
        request.code,
        request.functionName,
        request.language,
        request.schema
      );

      // 2. 规范化选项
      const normalizedRequest = this.normalizeOptions(request);
      
      // 3. 规范化参数
      const { args, kwargs } = this.normalizeArguments(request, signature);

      // 4. 确定参数传递模式
      const generator = getGenerator(request.language);
      const finalArgsMode = this.resolveArgsMode(generator, args, kwargs, normalizedRequest);

      // 创建一个临时的 options 对象供 generator 使用 (兼容旧接口)
      const genOptions = {
        argsMode: finalArgsMode,
        autoModeThreshold: normalizedRequest.autoModeThreshold,
        timeout: normalizedRequest.timeout,
      };

      // 5. 生成执行代码
      const executionFiles = generator.generateFiles(
        request.code,
        request.functionName,
        args,
        kwargs,
        signature,
        genOptions as any
      );
      const stdin = generator.generateStdin(
        request.functionName,
        args,
        kwargs,
        genOptions as any
      );

      // 6. 构建文件系统
      const { fs, snapshot, differ } = await this.buildFileSystem(
        executionFiles,
        workdir,
        files,
        mount
      );

      // 7. 执行代码
      const entryPath = `${workdir}/main${generator.fileExtension}`;
      const runtime = getRuntime(request.language);
      const runResult = await runFS(runtime as any, entryPath, fs, {
        stdin: stdin as any,
        timeout: normalizedRequest.timeout ? normalizedRequest.timeout * 1000 : undefined,
      }) as RunResult;

      // 8. 检查执行结果类型
      if (runResult.resultType !== 'complete') {
        return this.handleNonCompleteResult<T>(runResult, startTime, signature.source);
      }

      // 9. 执行成功，继续处理
      const completeResult = runResult as RunResultComplete;

      // 10. 检测文件变更
      const changes = differ
        ? differ.diff(snapshot!, completeResult.fs)
        : {
            created: [],
            modified: [],
            deleted: [],
            denied: [],
          };

      // 11. 处理同步（仅当有挂载且配置为 batch 模式）
      let syncResult: SyncResult | undefined;
      if (hasMount && mount!.sync?.mode === 'batch') {
        syncResult = await this.performSync(
          [...changes.created, ...changes.modified, ...changes.deleted],
          mount!
        );
      }

      // 12. 解析函数返回值
      const parsed = this.parseOutput<T>(completeResult.stdout);

      // 13. 返回结果
      const reporting = normalizedRequest.options?.reporting;
      return {
        status: parsed.success ? 'success' : 'error',
        success: parsed.success,
        result: parsed.result,
        error: parsed.error,
        stdout: completeResult.stdout,
        stderr: completeResult.stderr,
        exitCode: completeResult.exitCode,
        files: reporting?.includeChanges !== false
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
   * 规范化选项，合并弃用字段和根路径字段
   */
  private normalizeOptions(request: FunctionCallRequest): FunctionCallRequest {
    const normalized = { ...request };
    
    // 兼容逻辑：处理弃用字段和层级迁移
    normalized.timeout = request.timeout ?? request.options?.timeout;
    normalized.argsMode = request.argsMode ?? request.options?.argsMode ?? 'auto';
    normalized.autoModeThreshold = request.autoModeThreshold ?? request.options?.autoModeThreshold ?? 102400;

    const options: InvokeOptions = { ...request.options };
    options.reporting = options.reporting ?? (request.resultOptions as any);
    
    normalized.options = options;
    return normalized;
  }

  /**
   * 规范化参数，支持混合格式和旧版 kwargs
   */
  private normalizeArguments(
    request: FunctionCallRequest,
    signature?: any
  ): { args: any[]; kwargs: Record<string, any> } {
    let args: any[] = [];
    let kwargs: Record<string, any> = { ...request.kwargs };

    if (Array.isArray(request.args)) {
      request.args.forEach((item, idx) => {
        if (item && typeof item === 'object' && 'index' in item && 'value' in item) {
          args[item.index] = item.value;
        } else {
          args[idx] = item;
        }
      });
    } else if (request.args && typeof request.args === 'object') {
      for (const [key, item] of Object.entries(request.args)) {
        if (item && typeof item === 'object' && 'index' in item && 'value' in item) {
          args[item.index] = item.value;
        } else {
          kwargs[key] = item;
        }
      }
    }

    // 智能填补 args 中的孔洞
    if (signature && signature.input) {
      const inputSchema = signature.input;
      if (Array.isArray(inputSchema)) {
        // 位置参数数组格式
        inputSchema.forEach((schema, idx) => {
          if (args[idx] === undefined && schema.name && schema.name in kwargs) {
            args[idx] = kwargs[schema.name];
            delete kwargs[schema.name];
          }
        });
      } else {
        // 对象格式 Record<string, JsonSchema & { index?: number }>
        for (const [name, schema] of Object.entries(inputSchema)) {
          const idx = (schema as any).index;
          if (idx !== undefined && args[idx] === undefined && name in kwargs) {
            args[idx] = kwargs[name];
            delete kwargs[name];
          }
        }
      }
    }

    // 转换为真正的数组（处理稀疏数组）
    args = Array.from(args);

    return { args, kwargs };
  }

  /**
   * 决定最终的参数传递模式
   */
  private resolveArgsMode(
    generator: any,
    args: any[],
    kwargs: Record<string, any>,
    request: FunctionCallRequest
  ): ArgsMode {
    const supported = generator.supportedArgsModes();
    const mode = request.argsMode || 'auto';
    
    if (mode === 'inline' && supported.includes('inline')) return 'inline';
    if (mode === 'file' && supported.includes('file')) return 'file';
    if (mode === 'stdin' && supported.includes('stdin')) return 'stdin';
    
    if (mode === 'auto') {
      const size = this.calculateDataSize(args) + this.calculateDataSize(kwargs);
      
      // 1. Very small data -> inline (fastest)
      if (size < 4096 && supported.includes('inline')) {
        return 'inline';
      }
      
      // 2. Medium data -> stdin (standard)
      if (size < 8192 && supported.includes('stdin')) {
        return 'stdin';
      }
      
      // 3. Large data -> file (safe and robust via VFS)
      if (supported.includes('file')) {
        return 'file';
      }
      
      // Fallback to whatever is supported
      if (supported.includes('stdin')) return 'stdin';
      if (supported.includes('inline')) return 'inline';
    }
    
    return 'stdin';
  }

  /**
   * 估算数据大小（用于 auto 模式阈值判断）
   */
  private calculateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1024; // 序列化失败时保守估计
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
   * Manually synchronize file changes from the sandbox to the host file system.
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
    executionFiles: Record<string, string | Uint8Array>,
    workdir: string,
    files?: Record<string, string | Uint8Array>,
    mount?: MountConfig
  ): Promise<{ fs: WASIFS; snapshot?: WASIFS; differ?: FileSystemDiffer }> {
    const fsBuilder = new FSBuilder({ workdir });

    // 添加入口文件和相关代理文件
    fsBuilder.addFiles(executionFiles);

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

    const fs = fsBuilder.build();

    // 权限策略
    const permissionResolver = hasMount
      ? new PermissionResolver(mount!.permissions)
      : PermissionResolver.allowAll();

    // 创建差异比较器和初始快照
    const differ = new FileSystemDiffer(permissionResolver);
    const snapshot = FileSystemDiffer.snapshot(fs);

    return { fs, snapshot, differ };
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
    // 移除可能存在的 HTTP 头部 (比如 php-cgi 输出的)
    let cleanStdout = stdout;
    const headerEndIdx = stdout.indexOf('\r\n\r\n');
    if (headerEndIdx !== -1 && (stdout.startsWith('X-Powered-By:') || stdout.startsWith('Status:'))) {
      cleanStdout = stdout.slice(headerEndIdx + 4);
    }

    const startIdx = cleanStdout.indexOf(RESULT_MARKERS.START);
    const endIdx = cleanStdout.indexOf(RESULT_MARKERS.END);

    if (startIdx === -1 || endIdx === -1) {
      // 没有找到标记，可能是代码没有正确执行包装器
      // 尝试检查是否有错误输出
      return {
        success: true,
        result: cleanStdout.trim() as unknown as T,
      };
    }

    const jsonStr = cleanStdout
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