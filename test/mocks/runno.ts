import { vi } from 'vitest';
import type { WASIFS } from '../../src/types';

export interface MockRunResult {
  resultType: 'complete' | 'crash' | 'terminated' | 'timeout';
  stdin?: string;
  tty?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  fs?: WASIFS;
  error?: Error;
}

export function createMockRunFS() {
  return vi.fn();
}

export function mockCompleteResult(
  stdout: string,
  options: { stdin?: string, tty?: string, stderr?: string; exitCode?: number; fs?: WASIFS } = {}
) {
  return {
    resultType: 'complete',
    stdin: options.stdin ?? '',
    tty: options.tty ?? '',
    stdout,
    stderr: options.stderr ?? '',
    exitCode: options.exitCode ?? 0,
    fs: options.fs ?? {},
  } as any;
}

export function mockCrashResult(error: Error) {
  return {
    resultType: 'crash',
    error,
  } as any;
}

export function mockTimeoutResult() {
  return { resultType: 'timeout' } as any;
}

export function mockTerminatedResult() {
  return { resultType: 'terminated' } as any;
}

/**
 * 创建模拟的成功执行输出
 */
export function createSuccessOutput<T>(result: T): string {
  return [
    'Some debug output',
    '__SANDBOX_RESULT_START__',
    JSON.stringify({ success: true, result }),
    '__SANDBOX_RESULT_END__',
  ].join('\n');
}

/**
 * 创建模拟的错误执行输出
 */
export function createErrorOutput(message: string, type = 'Error'): string {
  return [
    '__SANDBOX_RESULT_START__',
    JSON.stringify({
      success: false,
      error: { message, type },
    }),
    '__SANDBOX_RESULT_END__',
  ].join('\n');
}