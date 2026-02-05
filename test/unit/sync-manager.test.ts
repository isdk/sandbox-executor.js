// tests/unit/sync-manager.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager } from '../../src/fs/sync-manager';
import type { FileChange, SyncConfig } from '../../src/types';

describe('SyncManager', () => {
  let mockPathResolver: ReturnType<typeof vi.fn>;
  let mockFileWriter: ReturnType<typeof vi.fn>;
  let mockFileDeleter: ReturnType<typeof vi.fn>;

  const createChange = (
    type: 'create' | 'modify' | 'delete',
    path: string,
    content?: string
  ): FileChange => ({
    type,
    path,
    content: content ? new TextEncoder().encode(content) : undefined,
    size: content?.length ?? 0,
    timestamp: new Date(),
  });

  beforeEach(() => {
    mockPathResolver = vi.fn((path: string) => `/real${path}`);
    mockFileWriter = vi.fn().mockResolvedValue(undefined);
    mockFileDeleter = vi.fn().mockResolvedValue(undefined);
  });

  const createManager = (
    config: Partial<SyncConfig> = {},
    eventConfig = { allowAbort: true }
  ) => {
    return new SyncManager({
      config: { mode: 'batch', onError: 'continue', ...config },
      eventConfig,
      pathResolver: mockPathResolver as any,
      fileWriter: mockFileWriter as any,
      fileDeleter: mockFileDeleter as any,
    });
  };

  describe('syncBatch', () => {
    it('应该同步所有变更', async () => {
      const manager = createManager();
      const changes = [
        createChange('create', '/file1.txt', 'content1'),
        createChange('modify', '/file2.txt', 'content2'),
      ];

      const result = await manager.syncBatch(changes);

      expect(result.synced).toHaveLength(2);
      expect(mockFileWriter).toHaveBeenCalledTimes(2);
    });

    it('应该正确处理删除操作', async () => {
      const manager = createManager();
      const changes = [createChange('delete', '/file.txt')];

      await manager.syncBatch(changes);

      expect(mockFileDeleter).toHaveBeenCalledWith('/real/file.txt');
    });

    it('路径无法解析时应该跳过', async () => {
      mockPathResolver.mockReturnValue(null);
      const manager = createManager();
      const changes = [createChange('create', '/unmapped.txt', 'content')];

      const result = await manager.syncBatch(changes);

      expect(result.skipped).toContain('/unmapped.txt');
      expect(mockFileWriter).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('onError: continue 应该继续处理其他文件', async () => {
      mockFileWriter
        .mockRejectedValueOnce(new Error('Write failed'))
        .mockResolvedValue(undefined);

      const manager = createManager({ onError: 'continue' });
      const changes = [
        createChange('create', '/fail.txt', 'content'),
        createChange('create', '/success.txt', 'content'),
      ];

      const result = await manager.syncBatch(changes);

      expect(result.failed).toHaveLength(1);
      expect(result.synced).toHaveLength(1);
    });

    it('onError: abort 应该立即停止', async () => {
      mockFileWriter.mockRejectedValueOnce(new Error('Write failed'));

      const manager = createManager({ onError: 'abort' });
      const changes = [
        createChange('create', '/fail.txt', 'content'),
        createChange('create', '/never.txt', 'content'),
      ];

      const result = await manager.syncBatch(changes);

      expect(result.failed).toHaveLength(1);
      expect(result.synced).toHaveLength(0);
      expect(mockFileWriter).toHaveBeenCalledTimes(1);
    });

    it('onError: rollback 应该回滚已同步的文件', async () => {
      mockFileWriter
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Write failed'));

      const manager = createManager({ onError: 'rollback' });
      const changes = [
        createChange('create', '/first.txt', 'content'),
        createChange('create', '/fail.txt', 'content'),
      ];

      await manager.syncBatch(changes);

      // 应该尝试删除已创建的文件
      expect(mockFileDeleter).toHaveBeenCalledWith('/real/first.txt');
    });
  });

  describe('事件', () => {
    it('应该触发 beforeSync 事件', async () => {
      const manager = createManager();
      const beforeSyncHandler = vi.fn();
      manager.on('beforeSync', beforeSyncHandler);

      const changes = [createChange('create', '/file.txt', 'content')];
      await manager.syncBatch(changes);

      expect(beforeSyncHandler).toHaveBeenCalledWith(changes[0]);
    });

    it('应该触发 afterSync 事件', async () => {
      const manager = createManager();
      const afterSyncHandler = vi.fn();
      manager.on('afterSync', afterSyncHandler);

      const changes = [createChange('create', '/file.txt', 'content')];
      await manager.syncBatch(changes);

      expect(afterSyncHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/file.txt',
          success: true,
        })
      );
    });

    it('beforeSync 返回 skip 应该跳过该文件', async () => {
      const manager = createManager();
      manager.on('beforeSync', function(this: any) {
        this.result = { state: 'skip', reason: 'test' };
      });

      const changes = [createChange('create', '/file.txt', 'content')];
      const result = await manager.syncBatch(changes);

      expect(result.skipped).toContain('/file.txt');
      expect(mockFileWriter).not.toHaveBeenCalled();
    });

    it('beforeSync 返回 abort 应该中止整个同步', async () => {
      const manager = createManager({}, { allowAbort: true });
      manager.on('beforeSync', function(this:any, change: any) {
        if (change.path === '/abort.txt') {
          this.result = { state: 'abort' };
          this.stopped = true;
        }
      });

      const changes = [
        createChange('create', '/first.txt', 'content'),
        createChange('create', '/abort.txt', 'content'),
        createChange('create', '/never.txt', 'content'),
      ];

      const result = await manager.syncBatch(changes);

      expect(result.synced).toContain('/first.txt');
      expect(mockFileWriter).toHaveBeenCalledTimes(1);
    });

    it('allowAbort: false 时应该忽略 abort', async () => {
      const manager = createManager({}, { allowAbort: false });
      manager.on('beforeSync', function(this: any) {
        this.result = { state: 'abort' };
      });

      const changes = [
        createChange('create', '/file1.txt', 'content'),
        createChange('create', '/file2.txt', 'content'),
      ];

      const result = await manager.syncBatch(changes);

      // abort 被忽略，两个文件都应该被同步
      expect(result.synced).toHaveLength(2);
    });
  });
});
