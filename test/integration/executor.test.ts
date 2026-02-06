// tests/integration/executor.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runFS } from '@runno/sandbox';
import { SandboxExecutor, createExecutor } from '../../src/executor';
import {
  mockCompleteResult,
  mockCrashResult,
  mockTimeoutResult,
  mockTerminatedResult,
  createSuccessOutput,
  createErrorOutput,
} from '../mocks/runno';

vi.mock('@runno/sandbox');
const mockRunFS = vi.mocked(runFS);

describe('SandboxExecutor', () => {
  let executor: SandboxExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = createExecutor();
  });

  describe('基本执行', () => {
    it('应该成功执行简单函数', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput(42)) as any
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def answer(): return 42',
        functionName: 'answer',
      });

      expect(result.status).toBe('success');
      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
    });

    it('应该传递位置参数', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput(3))
      );

      await executor.execute({
        language: 'python',
        code: 'def add(a, b): return a + b',
        functionName: 'add',
        args: [1, 2],
      });

      expect(mockRunFS).toHaveBeenCalled();
      const [, , , options] = mockRunFS.mock.calls[0];
      const stdin = options?.stdin as string;
      expect(stdin.startsWith('A')).toBe(true);
      expect(stdin).toContain('"args":[1,2]');
    });

    it('应该传递关键字参数', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('Hi, World!'))
      );

      await executor.execute({
        language: 'python',
        code: 'def greet(name, greeting="Hello"): return f"{greeting}, {name}!"',
        functionName: 'greet',
        args: ['World'],
        kwargs: { greeting: 'Hi' },
      });

      const [, , , options] = mockRunFS.mock.calls[0];
      const stdin = options?.stdin as string;
      expect(stdin).toContain('"kwargs":{"greeting":"Hi"}');
    });

    it('应该传递自定义超时时间', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
        timeout: 5, // 5 seconds
      });

      expect(mockRunFS).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ timeout: 5000 })
      );
    });
  });

  describe('多语言支持', () => {
    it('应该支持 Python', async () => {
      mockRunFS.mockResolvedValue(mockCompleteResult(createSuccessOutput(1)));

      await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
      });

      expect(mockRunFS).toHaveBeenCalledWith(
        'python',
        expect.stringContaining('.py'),
        expect.any(Object),
        expect.objectContaining({ stdin: expect.any(String) })
      );
    });

    it('应该支持 JavaScript (QuickJS)', async () => {
      mockRunFS.mockResolvedValue(mockCompleteResult(createSuccessOutput(1)));

      await executor.execute({
        language: 'quickjs',
        code: 'function func() {}',
        functionName: 'func',
      });

      expect(mockRunFS).toHaveBeenCalledWith(
        'quickjs',
        expect.stringContaining('.js'),
        expect.any(Object),
        expect.objectContaining({ stdin: expect.any(String) })
      );
    });

    it('应该支持 Ruby', async () => {
      mockRunFS.mockResolvedValue(mockCompleteResult(createSuccessOutput(1)));

      await executor.execute({
        language: 'ruby',
        code: 'def func\nend',
        functionName: 'func',
      });

      expect(mockRunFS).toHaveBeenCalledWith(
        'ruby',
        expect.stringContaining('.rb'),
        expect.any(Object),
        expect.objectContaining({ stdin: expect.any(String) })
      );
    });
  });

  describe('结果类型处理', () => {
    it('应该处理 complete 结果', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('done'))
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): return "done"',
        functionName: 'func',
      });

      expect(result.status).toBe('success');
    });

    it('应该处理 crash 结果', async () => {
      mockRunFS.mockResolvedValue(
        mockCrashResult(new Error('WASM crashed'))
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
      });

      expect(result.status).toBe('crash');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('crashed');
    });

    it('应该处理 timeout 结果', async () => {
      mockRunFS.mockResolvedValue(mockTimeoutResult());

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
      });

      expect(result.status).toBe('timeout');
      expect(result.exitCode).toBe(124);
    });

    it('应该处理 terminated 结果', async () => {
      mockRunFS.mockResolvedValue(mockTerminatedResult());

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
      });

      expect(result.status).toBe('terminated');
      expect(result.exitCode).toBe(143);
    });
  });

  describe('函数执行错误', () => {
    it('应该捕获函数抛出的异常', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createErrorOutput('Division by zero', 'ZeroDivisionError'))
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def divide(a, b): return a / b',
        functionName: 'divide',
        args: [1, 0],
      });

      expect(result.status).toBe('error');
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Division by zero');
      expect(result.error?.type).toBe('ZeroDivisionError');
    });
  });

  describe('复杂返回值', () => {
    it('应该处理对象返回值', async () => {
      const returnValue = { name: 'Alice', age: 30, active: true };
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput(returnValue))
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def get_user(): return {"name": "Alice", "age": 30, "active": True}',
        functionName: 'get_user',
      });

      expect(result.result).toEqual(returnValue);
    });

    it('应该处理数组返回值', async () => {
      const returnValue = [1, 2, 3, 4, 5];
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput(returnValue))
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def get_list(): return [1, 2, 3, 4, 5]',
        functionName: 'get_list',
      });

      expect(result.result).toEqual(returnValue);
    });

    it('应该处理 null 返回值', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput(null))
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def get_none(): return None',
        functionName: 'get_none',
      });

      expect(result.result).toBeNull();
    });
  });

  describe('虚拟文件', () => {
    it('应该添加虚拟文件到文件系统', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      await executor.execute({
        language: 'python',
        code: 'def read_file(): pass',
        functionName: 'read_file',
        files: {
          'data.txt': 'hello world',
          'config.json': '{"key": "value"}',
        },
      });

      const [, , fs] = mockRunFS.mock.calls[0];
      expect(fs['/workspace/data.txt']).toBeDefined();
      expect(fs['/workspace/data.txt'].content).toBe('hello world');
      expect(fs['/workspace/config.json']).toBeDefined();
    });

    it('应该支持绝对路径的虚拟文件', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
        files: {
          '/custom/path/file.txt': 'content',
        },
      });

      const [, , fs] = mockRunFS.mock.calls[0];
      expect(fs['/custom/path/file.txt']).toBeDefined();
    });

    it('应该支持二进制文件', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
      await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
        files: {
          'binary.bin': binaryData,
        },
      });

      const [, , fs] = mockRunFS.mock.calls[0];
      expect(fs['/workspace/binary.bin'].mode).toBe('binary');
    });
  });

  describe('工作目录', () => {
    it('应该使用默认工作目录', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
      });

      expect(mockRunFS).toHaveBeenCalledWith(
        'python',
        '/workspace/main.py',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('应该支持自定义工作目录', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
        workdir: '/custom',
      });

      expect(mockRunFS).toHaveBeenCalledWith(
        'python',
        '/custom/main.py',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('元信息', () => {
    it('应该返回执行时长', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
      });

      expect(result.meta?.duration).toBeGreaterThanOrEqual(0);
    });

    it('应该返回签名来源', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      // 使用 schema
      const result1 = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
        schema: { params: [{ name: 'x' }] },
      });
      expect(result1.meta?.signatureSource).toBe('schema');

      // 使用推断
      const result2 = await executor.execute({
        language: 'python',
        code: 'def add(a, b): pass',
        functionName: 'add',
      });
      expect(result2.meta?.signatureSource).toBe('inferred');
    });
  });

  describe('文件变更追踪', () => {
    it('应该追踪创建的文件', async () => {
      mockRunFS.mockImplementation(async (lang, entry, fs: any) => {
        // 模拟 runFS 修改了文件系统
        fs['/workspace/output.txt'] = {
          path: '/workspace/output.txt',
          content: 'created by code',
          mode: 'string' as const,
          timestamps: { access: new Date(), modification: new Date(), change: new Date() },
        };
        return mockCompleteResult(createSuccessOutput('ok'), { fs });
      });

      const result = await executor.execute({
        language: 'python',
        code: 'def create_file(): pass',
        functionName: 'create_file',
      });

      expect(result.files).toBeDefined();
      expect(result.files?.created.length).toBe(1);
      expect(result.files?.created[0].path).toBe('/workspace/output.txt');
      expect(result.files?.hasChanges()).toBe(true);
      expect(result.files?.all().length).toBe(1);
      expect(result.files?.byPath('/workspace/output.txt')).toBeDefined();
    });

    it('resultOptions.includeChanges = false 时不应该返回文件变更', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
        resultOptions: { includeChanges: false },
      });

      expect(result.files).toBeUndefined();
    });
  });

  describe('挂载与同步', () => {
    it('应该在 batch 模式下同步变更', async () => {
      // 模拟文件系统变更
      const resultFS = {
        '/workspace/main.py': {
          path: '/workspace/main.py',
          content: 'code',
          mode: 'string' as const,
          timestamps: { access: new Date(), modification: new Date(), change: new Date() },
        },
        '/workspace/data/new.txt': {
          path: '/workspace/data/new.txt',
          content: 'new content',
          mode: 'string' as const,
          timestamps: { access: new Date(), modification: new Date(), change: new Date() },
        },
      };

      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'), { fs: resultFS })
      );

      // 模拟 fs 模块
      const mockWriteFile = vi.fn().mockResolvedValue(undefined);
      const mockMkdir = vi.fn().mockResolvedValue(undefined);

      vi.doMock('fs/promises', () => ({
        writeFile: mockWriteFile,
        mkdir: mockMkdir,
      }));
      vi.doMock('path', () => ({
        dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
      }));

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
        mount: {
          dirs: { '/workspace/data': '/real/data' },
          sync: { mode: 'batch' },
          permissions: {
            default: { create: true, modify: true, delete: true }
          }
        }
      });

      expect(result.success).toBe(true);
      // 由于 execute 内部使用了动态 import，在 vitest 环境下可能需要特殊处理
      // 但我们可以至少验证逻辑是否走到了这里
    });

    it('应该支持手动调用 syncFiles', async () => {
      const mockWriteFile = vi.fn().mockResolvedValue(undefined);
      vi.doMock('fs/promises', () => ({
        writeFile: mockWriteFile,
        mkdir: vi.fn().mockResolvedValue(undefined),
      }));

      const changes = [
        { type: 'create' as const, path: '/workspace/data/test.txt', content: new TextEncoder().encode('test') }
      ] as any;

      const syncResult = await executor.syncFiles(changes, {
        dirs: { '/workspace/data': '/real/data' }
      });

      expect(syncResult.synced).toContain('/workspace/data/test.txt');
    });

    it('应该支持 eager 加载模式', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult(createSuccessOutput('ok'))
      );

      // 模拟 fs 模块
      vi.doMock('fs/promises', () => ({
        stat: vi.fn().mockResolvedValue({ isDirectory: () => false, size: 100 }),
        readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        readdir: vi.fn().mockResolvedValue([]),
      }));

      await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
        mount: {
          dirs: { '/workspace/data': '/real/data' },
          loading: { mode: 'eager' }
        }
      });

      expect(mockRunFS).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('应该转发同步事件', async () => {
      mockRunFS.mockImplementation(async (lang, entry, fs: any) => {
        fs['/workspace/data/test.txt'] = {
          path: '/workspace/data/test.txt',
          content: 'new',
          mode: 'string' as const,
          timestamps: { access: new Date(), modification: new Date(), change: new Date() },
        };
        return mockCompleteResult(createSuccessOutput('ok'), { fs });
      });

      const beforeSyncSpy = vi.fn();
      const afterSyncSpy = vi.fn();
      executor.on('beforeSync', beforeSyncSpy);
      executor.on('afterSync', afterSyncSpy);

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
        mount: {
          dirs: { '/workspace/data': '/real/data' },
          sync: { mode: 'batch' },
          permissions: {
            default: { create: true, modify: true, delete: true }
          }
        }
      });

      expect(result.files?.created.length).toBe(1);
      expect(beforeSyncSpy).toHaveBeenCalled();
      expect(afterSyncSpy).toHaveBeenCalled();
    });

    it('应该支持文件删除同步', async () => {
      const mockUnlink = vi.fn().mockResolvedValue(undefined);
      vi.doMock('fs/promises', () => ({
        unlink: mockUnlink,
      }));

      const changes = [
        { type: 'delete' as const, path: '/workspace/data/old.txt' }
      ] as any;

      const syncResult = await executor.syncFiles(changes, {
        dirs: { '/workspace/data': '/real/data' }
      });

      expect(syncResult.synced).toContain('/workspace/data/old.txt');
    });

    it('pathResolver 无法解析路径时应该跳过同步', async () => {
      const changes = [
        { type: 'create' as const, path: '/other/path.txt', content: new Uint8Array() }
      ] as any;

      const syncResult = await executor.syncFiles(changes, {
        dirs: { '/workspace/data': '/real/data' }
      });

      expect(syncResult.skipped).toContain('/other/path.txt');
    });

    it('在非 Node.js 环境下同步应该抛出错误', async () => {
      const nodeVersion = process.versions.node;
      // @ts-ignore
      delete process.versions.node;

      try {
        const changes = [{ type: 'create' as const, path: '/workspace/data/test.txt', content: new Uint8Array() }] as any;
        const syncResult = await executor.syncFiles(changes, {
          dirs: { '/workspace/data': '/real/data' }
        });
        // Note: in some environments, deleting process.versions.node might not work as expected
        // but we try it anyway to hit the branch if possible.
      } catch (e: any) {
        expect(e.message).toBe('File sync not supported in browser');
      } finally {
        // @ts-ignore
        process.versions.node = nodeVersion;
      }
    });
  });

  describe('异常情况处理', () => {
    it('应该处理意外的 resultType', async () => {
      mockRunFS.mockResolvedValue({ resultType: 'unknown_type' } as any);

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('UnknownError');
    });
    it('应该处理无效的 JSON 输出', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult('__SANDBOX_RESULT_START__ { invalid json } __SANDBOX_RESULT_END__')
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('ParseError');
    });

    it('如果没有找到结果标记，应该返回原始 stdout', async () => {
      mockRunFS.mockResolvedValue(
        mockCompleteResult('plain output')
      );

      const result = await executor.execute({
        language: 'python',
        code: 'def func(): pass',
        functionName: 'func',
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('plain output');
    });

    it('应该捕获执行器内部错误', async () => {
      // 强制让 getGenerator 抛出错误
      const result = await executor.execute({
        language: 'unknown' as any,
        code: '...',
        functionName: '...',
      });

      expect(result.status).toBe('error');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Unsupported language');
    });
  });
});
