import { runFS} from '@runno/sandbox';
import {
  SandboxDriver,
  DriverCapabilities,
  ExecutionBundle,
  RawOutput
} from '../../types';

export class RunnoDriver implements SandboxDriver {
  id = 'runno';

  // 声明 Runno 的能力
  capabilities: DriverCapabilities = {
    transports: {
      fd: false,    // Runno 目前在标准 runFS 下较难直接配置自定义 FD
      ipc: false,
      stdio: true
    },
    persistent: false,
    features: {
      network: false,
      fs: 'virtual'
    }
  };

  async run(bundle: ExecutionBundle): Promise<RawOutput> {
    const { entryPoint, files, stdin } = bundle;

    // 映射运行时名称
    const runtime = this.mapRuntime(entryPoint);

    // 调用底层 Runno 引擎
    try {
      const runResult = await runFS(runtime, entryPoint, files as any, {
        stdin: stdin as any,
      }) as any;

      let stdout = runResult.stdout || '';
      const stderr = runResult.stderr || runResult.message || '';

      // 如果没有协议标记且运行失败，注入伪造的协议消息
      if (runResult.resultType !== 'complete' && !stdout.includes('__SANDBOX_RESULT_START__')) {
        const errorResponse = {
          ver: '1.0',
          id: 'driver-error',
          type: 'result',
          status: 'fail',
          data: {
            error: {
              message: stderr || `Execution failed: ${runResult.resultType}`,
              type: 'RuntimeError'
            }
          }
        };
        stdout = `\n__SANDBOX_RESULT_START__${JSON.stringify(errorResponse)}__SANDBOX_RESULT_END__\n`;
      }

      return {
        stdout,
        stderr,
        exitCode: runResult.exitCode ?? (runResult.resultType === 'complete' ? 0 : -1),
        fs: runResult.fs
      };
    } catch (e: any) {
      // 捕获编译错误 (PrepareError) 或其他启动异常
      const errorData = e.data || {};
      const stderr = (errorData.stderr || '') + (e.message ? '\n' + e.message : '') + (e.stderr ? '\n' + e.stderr : '');

      const errorResponse = {
        ver: '1.0',
        id: 'driver-error',
        type: 'result',
        status: 'fail',
        data: {
          error: {
            message: stderr || e.message || 'Unknown driver error',
            type: e.name || 'DriverError'
          }
        }
      };

      const fakeStdout = `\n__SANDBOX_RESULT_START__${JSON.stringify(errorResponse)}__SANDBOX_RESULT_END__\n`;

      return {
        stdout: fakeStdout,
        stderr: stderr,
        exitCode: errorData.exitCode ?? -1,
      };
    }
  }

  private mapRuntime(entryPoint: string) {
    if (entryPoint.endsWith('.py')) return 'python';
    if (entryPoint.endsWith('.js')) return 'quickjs';
    if (entryPoint.endsWith('.rb')) return 'ruby';
    if (entryPoint.endsWith('.php')) return 'php-cgi';
    if (entryPoint.endsWith('.c')) return 'clang';
    if (entryPoint.endsWith('.cpp')) return 'clangpp';
    return 'python'; // default
  }
}
