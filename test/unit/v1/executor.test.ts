import { describe, it, expect, vi } from 'vitest';
import { SandboxExecutorV1 } from '../../../src/v1/core/executor';
import { PythonProvider } from '../../../src/v1/languages/python';
import { 
  LanguageProvider, 
  SandboxDriver, 
  DriverCapabilities, 
  ExecutionBundle, 
  RawOutput,
  ExecutionRequest,
  NormalizedArguments
} from '../../../src/v1/types/provider';
import { InferredSignature } from '../../../src/inference/engine';

// 1. 创建一个 Mock 驱动，用于测试能力协商
class MockDriver implements SandboxDriver {
  id = 'mock-driver';
  constructor(public capabilities: DriverCapabilities) {}
  
  async run(bundle: ExecutionBundle): Promise<RawOutput> {
    return {
      stdout: '__SANDBOX_RESULT_START__' + JSON.stringify({
        ver: '1.0',
        id: 'test-id',
        type: 'result',
        status: 'ok',
        data: { result: 'mocked-value' }
      }) + '__SANDBOX_RESULT_END__',
      stderr: '',
      exitCode: 0
    };
  }
}

describe('SandboxExecutorV1 (Decoupled Architecture)', () => {
  it('应该能够正确协调 Provider 和 Driver 之间的流转', async () => {
    const pythonProvider = new PythonProvider();
    const mockDriver = new MockDriver({
      transports: { fd: false, ipc: false, stdio: true },
      persistent: false,
      features: { network: false, fs: 'virtual' }
    });

    const executor = new SandboxExecutorV1({
      providers: [pythonProvider],
      drivers: [mockDriver]
    });

    const request: ExecutionRequest = {
      code: 'def test(): return 1',
      functionName: 'test',
      args: []
    };

    const result = await executor.execute('python', request);

    expect(result.success).toBe(true);
    expect(result.result).toBe('mocked-value');
  });

  it('当驱动支持 FD 时，PythonProvider 应该在 Bundle 中注入 FD 环境变量', async () => {
    const pythonProvider = new PythonProvider();
    const spy = vi.spyOn(pythonProvider, 'generate');
    
    const fdDriver = new MockDriver({
      transports: { fd: true, ipc: false, stdio: true },
      persistent: false,
      features: { network: false, fs: 'virtual' }
    });

    const executor = new SandboxExecutorV1({
      providers: [pythonProvider],
      drivers: [fdDriver]
    });

    await executor.execute('python', {
      code: 'def f(): pass',
      functionName: 'f',
      args: []
    });

    const capsSentToProvider = spy.mock.calls[0][1];
    expect(capsSentToProvider.transports.fd).toBe(true);

    const bundle = spy.mock.results[0].value as ExecutionBundle;
    expect(bundle.envs['SB_RESULT_FD']).toBe('3');
  });

  it('当没有结果通道时，parseResult 应该能正确从 stdout 解析结果', () => {
    const pythonProvider = new PythonProvider();
    const rawOutput: RawOutput = {
      stdout: 'some user print\n__SANDBOX_RESULT_START__' + JSON.stringify({
        ver: '1.0',
        id: 'msg-1',
        type: 'result',
        status: 'ok',
        data: { result: 42 }
      }) + '__SANDBOX_RESULT_END__\nmore print',
      stderr: '',
      exitCode: 0
    };

    const result = pythonProvider.parseResult(rawOutput);
    expect(result.success).toBe(true);
    expect(result.result).toBe(42);
  });
});