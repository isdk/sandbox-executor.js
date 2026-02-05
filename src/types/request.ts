import type { MountConfig } from './mount';
import { PermissionRule } from './permissions';

export type ExecutionStatus = 'success' | 'error' | 'crash' | 'timeout' | 'terminated';

export interface ExecutionError {
  message: string;
  type?: string;
  stack?: string;
}

export interface ExecutionResult<T = unknown> {
  /**
   * 执行状态
   * - success: 函数执行成功
   * - error: 函数执行抛出异常
   * - crash: 沙盒运行时崩溃
   * - timeout: 执行超时
   * - terminated: 执行被终止
   */
  status: ExecutionStatus;

  /**
   * 函数执行是否成功（status === 'success' 且函数没有抛出异常）
   */
  success: boolean;

  /**
   * 函数返回值
   */
  result?: T;

  /**
   * 错误信息
   */
  error?: ExecutionError;

  /**
   * 标准输出
   */
  stdout: string;

  /**
   * 标准错误
   */
  stderr: string;

  /**
   * 退出码
   */
  exitCode: number;

  /**
   * 文件变更
   */
  files?: FileChangeSummary;

  /**
   * 执行元信息
   */
  meta?: ExecutionMeta;
}

export interface ParamSchema {
  name: string;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  default?: unknown;
  description?: string;
}

export interface FunctionSchema {
  params?: ParamSchema[];
  variadic?: boolean;
  acceptsKwargs?: boolean;
}

export type SupportedLanguage = 'python' | 'ruby' | 'quickjs';

export interface ResultOptions {
  includeChanges?: boolean;
  includeContents?: boolean;
  includeDenied?: boolean;
}

export interface FunctionCallRequest<
  TArgs extends unknown[] = unknown[],
  TKwargs extends Record<string, unknown> = Record<string, unknown>
> {
  language: SupportedLanguage;
  code: string;
  functionName: string;
  args?: TArgs;
  kwargs?: TKwargs;
  schema?: FunctionSchema;
  mount?: MountConfig;
  files?: Record<string, string | Uint8Array>;
  workdir?: string;
  resultOptions?: ResultOptions;
}

export interface FileChange {
  type: 'create' | 'modify' | 'delete';
  path: string;
  realPath?: string;
  content?: Uint8Array;
  oldContent?: Uint8Array;
  size: number;
  timestamp: Date;
}

export interface PermissionDeniedRecord {
  path: string;
  operation: string;
  rule?: PermissionRule;
  timestamp: Date;
}

export interface FileChangeSummary {
  created: FileChange[];
  modified: FileChange[];
  deleted: FileChange[];
  denied: PermissionDeniedRecord[];
  hasChanges(): boolean;
  all(): FileChange[];
  byPath(path: string): FileChange | undefined;
}

export interface ExecutionError {
  message: string;
  stack?: string;
  type?: string;
}

export interface ExecutionMeta {
  duration: number;
  signatureSource: 'schema' | 'inferred' | 'convention';
}

export interface ExecutionResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: ExecutionError;
  stdout: string;
  stderr: string;
  exitCode: number;
  files?: FileChangeSummary;
  meta?: ExecutionMeta;
}

export interface SyncResult {
  synced: string[];
  failed: Array<{ path: string; error: Error }>;
  skipped: string[];
}
