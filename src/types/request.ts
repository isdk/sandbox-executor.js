import type { MountConfig } from './mount';
import { PermissionRule } from './permissions';

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
 * Schema definition for a function.
 */
export interface FunctionSchema {
  /** Parameter schemas */
  params?: ParamSchema[];
  /** Whether the function accepts variable positional arguments */
  variadic?: boolean;
  /** Whether the function accepts keyword arguments */
  acceptsKwargs?: boolean;
}

/**
 * Supported programming languages for the sandbox.
 */
export type SupportedLanguage = 'python' | 'ruby' | 'quickjs' | 'php' | 'js' | 'javascript';

/**
 * Options for customizing the execution result.
 */
export interface ResultOptions {
  /** Whether to include file changes in the result. Defaults to true. */
  includeChanges?: boolean;
  /** Whether to include file contents in the changes. Defaults to true. */
  includeContents?: boolean;
  /** Whether to include permission denied records. Defaults to true. */
  includeDenied?: boolean;
}

/**
 * Request object for executing a function call in the sandbox.
 * @template TArgs - Type of positional arguments.
 * @template TKwargs - Type of keyword arguments.
 */
export interface FunctionCallRequest<
  TArgs extends unknown[] = unknown[],
  TKwargs extends Record<string, unknown> = Record<string, unknown>
> {
  /** The programming language of the code. */
  language: SupportedLanguage;
  /** The source code containing the function. */
  code: string;
  /** The name of the function to call. */
  functionName: string;
  /** Positional arguments to pass to the function. */
  args?: TArgs;
  /** Keyword arguments to pass to the function. */
  kwargs?: TKwargs;
  /** Optional schema for the function. If not provided, it will be inferred. */
  schema?: FunctionSchema;
  /** Optional configuration for mounting host directories. */
  mount?: MountConfig;
  /** Optional virtual files to seed in the sandbox. */
  files?: Record<string, string | Uint8Array>;
  /** Initial working directory in the sandbox. */
  workdir?: string;
  /** Options for the result output. */
  resultOptions?: ResultOptions;
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
