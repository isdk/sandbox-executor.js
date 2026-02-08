import { runFS } from '@runno/sandbox';
import { 
  SandboxDriver, 
  DriverCapabilities, 
  ExecutionBundle, 
  RawOutput 
} from '../../types/provider';

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
    const runResult = await runFS(runtime, entryPoint, files as any, {
      stdin: stdin as any,
    }) as any;

    // 转换结果为 RawOutput
    if (runResult.resultType === 'complete') {
      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        fs: runResult.fs
      };
    } else {
      // 处理 crash/timeout 等非正常退出
      throw new Error(`Execution failed: ${runResult.resultType}`);
    }
  }

  private mapRuntime(entryPoint: string): string {
    if (entryPoint.endsWith('.py')) return 'python';
    if (entryPoint.endsWith('.js')) return 'quickjs';
    if (entryPoint.endsWith('.rb')) return 'ruby';
    if (entryPoint.endsWith('.php')) return 'php-cgi';
    return 'python'; // default
  }
}
