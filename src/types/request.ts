import type { MountConfig } from './mount';
import { PermissionRule } from './permissions';

/**
 * Protocol headers for stdin communication.
 */
export const InputProtocol = {
  /** Atomic mode: read entire stdin until EOF. */
  ATOMIC: 'A',
  /** Stream mode: read length-prefixed blocks. */
  STREAM: 'S',
  /** Persistent mode: continuous loop with length-prefixed blocks. */
  PERSISTENT: 'P',
} as const;

export type InputProtocolType = typeof InputProtocol[keyof typeof InputProtocol];

/**
 * Status of the code execution.
 */
export type ExecutionStatus = 'success' | 'error' | 'crash' | 'timeout' | 'terminated';

/**
 * Detailed error information from execution.
 */
export interface ExecutionError {
  /** Error message */
  message: string;
  /** Type of the error (e.g., 'ZeroDivisionError', 'ValueError') */
  type?: string;
  /** Stack trace if available */
  stack?: string;
}

/**
 * Result of the function call execution.
 * @template T - The expected type of the function's return value.
 */
export interface ExecutionResult<T = unknown> {
  /**
   * Execution status.
   * - `success`: Function executed and returned successfully.
   * - `error`: Function execution threw an exception.
   * - `crash`: The sandbox environment crashed.
   * - `timeout`: Execution exceeded the time limit.
   * - `terminated`: Execution was manually terminated.
   */
  status: ExecutionStatus;

  /**
   * Whether the execution was successful (status is 'success').
   */
  success: boolean;

  /**
   * The value returned by the function.
   */
  result?: T;

  /**
   * Error details if success is false.
   */
  error?: ExecutionError;

  /**
   * Standard output (stdout) captured during execution.
   */
  stdout: string;

  /**
   * Standard error (stderr) captured during execution.
   */
  stderr: string;

  /**
   * Process exit code.
   */
  exitCode: number;

  /**
   * Summary of file changes if tracked.
   */
  files?: FileChangeSummary;

  /**
   * Metadata about the execution.
   */
  meta?: ExecutionMeta;
}

/**
 * Schema definition for a single function parameter.
 * @deprecated Use JsonSchema instead.
 */
export interface ParamSchema {
  /** Parameter name */
  name: string;
  /** Expected parameter type */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  /** Whether the parameter is required */
  required?: boolean;
  /** Default value if not provided */
  default?: unknown;
  /** Description for documentation or AI hints */
  description?: string;
}

/**
 * Supported programming languages for the sandbox.
 */
export type SupportedLanguage =
  | 'python'
  | 'ruby'
  | 'quickjs'
  | 'php'
  | 'js'
  | 'javascript'
  | 'c'
  | 'cpp'
  | 'clang'
  | 'clangpp';

/**
 * Options for customizing the reporting of execution results.
 */
export interface ReportingOptions {
  /** Whether to include file changes in the result. Defaults to true. */
  includeChanges?: boolean;
  /** Whether to include file contents in the changes. Defaults to true. */
  includeContents?: boolean;
  /** Whether to include permission denied records. Defaults to true. */
  includeDenied?: boolean;
}

/**
 * Argument passing mode.
 */
export type ArgsMode = 'stdin' | 'inline' | 'file' | 'auto';

/**
 * Schema definition for a single parameter (JSON Schema like).
 */
export interface JsonSchema extends Record<string, any> {
  type?: string;
  description?: string;
  default?: any;
  required?: boolean;
}

/**
 * Input schema can be an array of schemas for positional arguments,
 * or an object mapping parameter names to schemas.
 */
export type InputSchema =
  | JsonSchema[]
  | Record<string, JsonSchema & { index?: number }>;

/**
 * Schema definition for a function interface.
 */
export interface FunctionSchema {
  /** Input parameter schemas. */
  input?: InputSchema;
  /** Schema for the function return value. */
  output?: JsonSchema;
  /** Whether to enforce strict schema validation. */
  strict?: boolean;
  /** Whether the function accepts variable positional arguments. */
  variadic?: boolean;
  /** Whether the function accepts keyword arguments. */
  acceptsKwargs?: boolean;
}

/**
 * Options for customizing the runtime environment and behavior.
 */
export interface InvokeOptions {
  /** Optional configuration for mounting host directories. */
  mount?: MountConfig;
  /** Optional virtual files to seed in the sandbox. */
  files?: Record<string, string | Uint8Array>;
  /** Initial working directory in the sandbox. */
  workdir?: string;
  /** Options for reporting results. */
  reporting?: ReportingOptions;
}

/**
 * Argument item can be a plain value or a structured object with an index.
 */
export type ArgumentItem = any | { index: number; value: any };

/**
 * Request object for executing a function call in the sandbox.
 */
export interface FunctionCallRequest {
  /** The programming language of the code. */
  language: SupportedLanguage;
  /** The source code containing the function. */
  code: string;
  /** The name of the function to call. */
  functionName: string;
  /**
   * Arguments to pass to the function.
   * Can be an array (positional) or an object (keyword/mixed).
   */
  args?: ArgumentItem[] | Record<string, ArgumentItem>;
  /**
   * Execution timeout in seconds.
   */
  timeout?: number;
  /**
   * Argument passing mode.
   * - `stdin`: Pass arguments via standard input (safe for large data).
   * - `inline`: Embed arguments directly in the generated code (faster for small data).
   * - `file`: Pass arguments via a temporary file (safe for large data).
   * - `auto`: Automatically choose based on data size. Defaults to 'auto'.
   */
  argsMode?: ArgsMode;
  /**
   * Threshold in bytes for switching from 'inline' to 'stdin' in 'auto' mode.
   * Defaults to 102400 (100KB).
   */
  autoModeThreshold?: number;
  /** Optional schema for the function. If not provided, it will be inferred. */
  schema?: FunctionSchema;
  /** Execution options. */
  options?: InvokeOptions;

  /**
   * Keyword arguments to pass to the function.
   * @deprecated Use `args` as an object instead.
   */
  kwargs?: Record<string, any>;
  /**
   * Options for the result output.
   * @deprecated Use `options.reporting` instead.
   */
  resultOptions?: ReportingOptions;
}

/**
 * Represents a single file system change.
 */
export interface FileChange {
  /** Type of change */
  type: 'create' | 'modify' | 'delete';
  /** Virtual path in the sandbox */
  path: string;
  /** Real path on the host (if synced) */
  realPath?: string;
  /** New content of the file */
  content?: Uint8Array;
  /** Original content before modification (if applicable) */
  oldContent?: Uint8Array;
  /** Size of the file in bytes */
  size: number;
  /** Timestamp of the change */
  timestamp: Date;
}

/**
 * Record of a permission denial event.
 */
export interface PermissionDeniedRecord {
  /** Path where permission was denied */
  path: string;
  /** Operation that was attempted (read, create, etc.) */
  operation: string;
  /** The rule that triggered the denial, if any */
  rule?: PermissionRule;
  /** Timestamp of the event */
  timestamp: Date;
}

/**
 * Collection of all file system changes and denials.
 */
export interface FileChangeSummary {
  /** Files that were created */
  created: FileChange[];
  /** Files that were modified */
  modified: FileChange[];
  /** Files that were deleted */
  deleted: FileChange[];
  /** Permission denial events */
  denied: PermissionDeniedRecord[];
  /** Returns true if there are any created, modified, or deleted files. */
  hasChanges(): boolean;
  /** Returns a flattened list of all successful changes. */
  all(): FileChange[];
  /** Finds a change by its virtual path. */
  byPath(path: string): FileChange | undefined;
}

/**
 * Execution metadata.
 */
export interface ExecutionMeta {
  /** Execution duration in milliseconds. */
  duration: number;
  /** How the function signature was determined. */
  signatureSource: 'schema' | 'inferred' | 'convention';
}

/**
 * Result of a file synchronization operation.
 */
export interface SyncResult {
  /** Paths that were successfully synced. */
  synced: string[];
  /** Paths that failed to sync with their respective errors. */
  failed: Array<{ path: string; error: Error }>;
  /** Paths that were skipped (e.g., due to configuration or events). */
  skipped: string[];
}