import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runFS } from '@runno/sandbox';
import { RunnoDriver } from '../../../src/v1/drivers/runno';
import { ExecutionBundle } from '../../../src/v1/types/provider';

vi.mock('@runno/sandbox');
const mockRunFS = vi.mocked(runFS);

describe('RunnoDriver (v1)', () => {
  let driver: RunnoDriver;

  beforeEach(() => {
    vi.clearAllMocks();
    driver = new RunnoDriver();
  });

  it('应该能正常执行并返回结果', async () => {
    mockRunFS.mockResolvedValue({
      resultType: 'complete',
      stdout: 'hello',
      stderr: '',
      exitCode: 0,
      fs: {}
    } as any);

    const bundle: ExecutionBundle = {
      entryPoint: 'main.py',
      files: {},
      stdin: ''
    };

    const result = await driver.run(bundle);
    expect(result.stdout).toBe('hello');
    expect(result.exitCode).toBe(0);
    expect(mockRunFS).toHaveBeenCalledWith('python', 'main.py', expect.any(Object), expect.any(Object));
  });

  it('应该在超时后手动返回 timeout 结果', async () => {
    // 模拟 runFS 永远不返回
    mockRunFS.mockReturnValue(new Promise(() => {}));

    const bundle: ExecutionBundle = {
      entryPoint: 'main.py',
      files: {},
      timeout: 0.01 // 10ms
    };

    const result = await driver.run(bundle);
    expect(result.stdout).toContain('"status":"timeout"');
    expect(result.exitCode).toBe(124);
  });

  it('应该在快速返回后清理定时器', async () => {
    vi.useFakeTimers();
    const spyClearTimeout = vi.spyOn(global, 'clearTimeout');

    mockRunFS.mockResolvedValue({
      resultType: 'complete',
      stdout: 'ok',
      stderr: '',
      exitCode: 0,
      fs: {}
    } as any);

    const bundle: ExecutionBundle = {
      entryPoint: 'main.py',
      files: {},
      timeout: 100
    };

    await driver.run(bundle);

    expect(spyClearTimeout).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('应该在执行出错后清理定时器', async () => {
    vi.useFakeTimers();
    const spyClearTimeout = vi.spyOn(global, 'clearTimeout');

    mockRunFS.mockRejectedValue(new Error('Unexpected error'));

    const bundle: ExecutionBundle = {
      entryPoint: 'main.py',
      files: {},
      timeout: 100
    };

    await driver.run(bundle);

    expect(spyClearTimeout).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('不应该将超时参数传递给底层 runFS', async () => {
    mockRunFS.mockResolvedValue({
      resultType: 'complete',
      stdout: 'ok',
      stderr: '',
      exitCode: 0,
      fs: {}
    } as any);

    const bundle: ExecutionBundle = {
      entryPoint: 'main.py',
      files: {},
      timeout: 10
    };

    await driver.run(bundle);

    const lastCall = mockRunFS.mock.calls[0];
    const options = lastCall[3] as any;
    expect(options.timeout).toBeUndefined();
  });
});
