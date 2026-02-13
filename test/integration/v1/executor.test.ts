import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runFS } from '@runno/sandbox';
import { SandboxExecutorV1 } from '../../../src/v1/core/executor';
import { PythonProvider } from '../../../src/v1/languages/python';
import { RunnoDriver } from '../../../src/v1/drivers/runno';
import { TemplateManager } from '../../../src/v1/core/template-manager';
import {
  mockCompleteResult,
  mockTimeoutResult,
  createSuccessOutput,
} from '../../mocks/runno';

vi.mock('@runno/sandbox');
const mockRunFS = vi.mocked(runFS);

describe('SandboxExecutorV1 Integration (with Mocks)', () => {
  let executor: SandboxExecutorV1;

  beforeEach(() => {
    vi.clearAllMocks();
    const tm = new TemplateManager();
    const providers = [new PythonProvider(tm)];
    const runnoDriver = new RunnoDriver();
    executor = new SandboxExecutorV1({
      providers,
      drivers: [runnoDriver]
    });
  });

  describe('超时控制', () => {
    it('不应该将超时时间传递给 runFS', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      await executor.execute('python', {
        code: 'def func(): pass',
        functionName: 'func',
        options: { timeout: 5 }
      });

      expect(mockRunFS).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.not.objectContaining({ timeout: 5000 })
      );
    });

    it('应该在超时后返回 timeout 状态', async () => {
      // 模拟 runFS 永远不返回
      mockRunFS.mockReturnValue(new Promise(() => {}));

      const result = await executor.execute('python', {
        code: 'def func(): pass',
        functionName: 'func',
        options: { timeout: 0.01 } // 10ms
      });

      expect(result.status).toBe('timeout');
      expect(result.exitCode).toBe(124);
    });

    it('应该在快速返回后清理定时器', async () => {
      vi.useFakeTimers();
      const spyClearTimeout = vi.spyOn(global, 'clearTimeout');

      mockRunFS.mockResolvedValue(mockCompleteResult(createSuccessOutput('ok')));

      await executor.execute('python', {
        code: 'def func(): pass',
        functionName: 'func',
        options: { timeout: 100 }
      });

      expect(spyClearTimeout).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('应该在执行出错后清理定时器', async () => {
      vi.useFakeTimers();
      const spyClearTimeout = vi.spyOn(global, 'clearTimeout');

      mockRunFS.mockRejectedValue(new Error('Unexpected error'));

      await executor.execute('python', {
        code: 'def func(): pass',
        functionName: 'func',
        options: { timeout: 100 }
      });

      expect(spyClearTimeout).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
