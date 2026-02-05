// tests/unit/fs-differ.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { FileSystemDiffer } from '../../src/fs/fs-differ';
import { PermissionResolver } from '../../src/fs/permission-resolver';
import { createMockWASIFS, createMockWASIFile } from '../setupVitest';
import type { WASIFS } from '../../src/';

describe('FileSystemDiffer', () => {
  describe('snapshot', () => {
    it('应该创建文件系统的深拷贝', () => {
      const original = createMockWASIFS({
        '/file.txt': 'content',
      });

      const snapshot = FileSystemDiffer.snapshot(original);

      // 修改原始对象
      original['/file.txt'].content = 'modified';

      // 快照不应该受影响
      expect(snapshot['/file.txt'].content).toBe('content');
    });

    it('应该深拷贝二进制内容', () => {
      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
      const original: WASIFS = {
        '/data.bin': createMockWASIFile('/data.bin', binaryData),
      };

      const snapshot = FileSystemDiffer.snapshot(original);

      // 修改原始数据
      binaryData[0] = 99;

      // 快照不应该受影响
      expect((snapshot['/data.bin'].content as Uint8Array)[0]).toBe(1);
    });

    it('应该深拷贝时间戳', () => {
      const original = createMockWASIFS({ '/file.txt': 'content' });
      const snapshot = FileSystemDiffer.snapshot(original);

      // 修改原始时间戳
      original['/file.txt'].timestamps.access = new Date(0);

      // 快照不应该受影响
      expect(snapshot['/file.txt'].timestamps.access.getTime()).not.toBe(0);
    });

    it('应该处理空文件系统', () => {
      const snapshot = FileSystemDiffer.snapshot({});
      expect(Object.keys(snapshot)).toHaveLength(0);
    });
  });

  describe('diff', () => {
    let differ: FileSystemDiffer;

    beforeEach(() => {
      differ = new FileSystemDiffer();
    });

    describe('创建检测', () => {
      it('应该检测新创建的文件', () => {
        const original = createMockWASIFS({});
        const current = createMockWASIFS({
          '/new.txt': 'new content',
        });

        const result = differ.diff(original, current);

        expect(result.created).toHaveLength(1);
        expect(result.created[0].path).toBe('/new.txt');
        expect(result.created[0].type).toBe('create');
      });

      it('应该检测多个新文件', () => {
        const original = createMockWASIFS({});
        const current = createMockWASIFS({
          '/file1.txt': 'content1',
          '/file2.txt': 'content2',
          '/dir/file3.txt': 'content3',
        });

        const result = differ.diff(original, current);

        expect(result.created).toHaveLength(3);
      });

      it('创建的文件应该包含内容', () => {
        const original = createMockWASIFS({});
        const current = createMockWASIFS({
          '/new.txt': 'hello world',
        });

        const result = differ.diff(original, current);

        const content = new TextDecoder().decode(result.created[0].content);
        expect(content).toBe('hello world');
      });
    });

    describe('修改检测', () => {
      it('应该检测内容变化', () => {
        const original = createMockWASIFS({
          '/file.txt': 'original',
        });
        const current = createMockWASIFS({
          '/file.txt': 'modified',
        });

        const result = differ.diff(original, current);

        expect(result.modified).toHaveLength(1);
        expect(result.modified[0].path).toBe('/file.txt');
        expect(result.modified[0].type).toBe('modify');
      });

      it('内容相同时不应该报告修改', () => {
        const original = createMockWASIFS({
          '/file.txt': 'same content',
        });
        const current = createMockWASIFS({
          '/file.txt': 'same content',
        });

        const result = differ.diff(original, current);

        expect(result.modified).toHaveLength(0);
      });

      it('应该检测二进制内容变化', () => {
        const original: WASIFS = {
          '/data.bin': createMockWASIFile('/data.bin', new Uint8Array([1, 2, 3])),
        };
        const current: WASIFS = {
          '/data.bin': createMockWASIFile('/data.bin', new Uint8Array([1, 2, 4])),
        };

        const result = differ.diff(original, current);

        expect(result.modified).toHaveLength(1);
      });

      it('二进制内容相同时不应该报告修改', () => {
        const original: WASIFS = {
          '/data.bin': createMockWASIFile('/data.bin', new Uint8Array([1, 2, 3])),
        };
        const current: WASIFS = {
          '/data.bin': createMockWASIFile('/data.bin', new Uint8Array([1, 2, 3])),
        };

        const result = differ.diff(original, current);

        expect(result.modified).toHaveLength(0);
      });
    });

    describe('删除检测', () => {
      it('应该检测删除的文件', () => {
        const original = createMockWASIFS({
          '/file.txt': 'content',
        });
        const current = createMockWASIFS({});

        const result = differ.diff(original, current);

        expect(result.deleted).toHaveLength(1);
        expect(result.deleted[0].path).toBe('/file.txt');
        expect(result.deleted[0].type).toBe('delete');
      });

      it('应该检测多个删除', () => {
        const original = createMockWASIFS({
          '/file1.txt': 'content1',
          '/file2.txt': 'content2',
        });
        const current = createMockWASIFS({});

        const result = differ.diff(original, current);

        expect(result.deleted).toHaveLength(2);
      });
    });

    describe('混合变更', () => {
      it('应该同时检测创建、修改和删除', () => {
        const original = createMockWASIFS({
          '/unchanged.txt': 'same',
          '/modified.txt': 'original',
          '/deleted.txt': 'to be deleted',
        });
        const current = createMockWASIFS({
          '/unchanged.txt': 'same',
          '/modified.txt': 'changed',
          '/created.txt': 'new file',
        });

        const result = differ.diff(original, current);

        expect(result.created).toHaveLength(1);
        expect(result.created[0].path).toBe('/created.txt');

        expect(result.modified).toHaveLength(1);
        expect(result.modified[0].path).toBe('/modified.txt');

        expect(result.deleted).toHaveLength(1);
        expect(result.deleted[0].path).toBe('/deleted.txt');
      });
    });

    describe('权限检查', () => {
      it('应该根据权限过滤创建操作', () => {
        const permResolver = new PermissionResolver({
          default: { create: false },
          rules: [
            { pattern: 'allowed/**', allow: ['create'] },
          ],
        });

        const differ = new FileSystemDiffer(permResolver);
        const original = createMockWASIFS({});
        const current = createMockWASIFS({
          '/allowed/file.txt': 'content',
          '/denied/file.txt': 'content',
        });

        const result = differ.diff(original, current);

        expect(result.created).toHaveLength(1);
        expect(result.created[0].path).toBe('/allowed/file.txt');

        expect(result.denied).toHaveLength(1);
        expect(result.denied[0].path).toBe('/denied/file.txt');
        expect(result.denied[0].operation).toBe('create');
      });

      it('应该根据权限过滤修改操作', () => {
        const permResolver = new PermissionResolver({
          default: { modify: false },
        });

        const differ = new FileSystemDiffer(permResolver);
        const original = createMockWASIFS({
          '/file.txt': 'original',
        });
        const current = createMockWASIFS({
          '/file.txt': 'modified',
        });

        const result = differ.diff(original, current);

        expect(result.modified).toHaveLength(0);
        expect(result.denied).toHaveLength(1);
        expect(result.denied[0].operation).toBe('modify');
      });

      it('应该根据权限过滤删除操作', () => {
        const permResolver = new PermissionResolver({
          default: { delete: false },
        });

        const differ = new FileSystemDiffer(permResolver);
        const original = createMockWASIFS({
          '/file.txt': 'content',
        });
        const current = createMockWASIFS({});

        const result = differ.diff(original, current);

        expect(result.deleted).toHaveLength(0);
        expect(result.denied).toHaveLength(1);
        expect(result.denied[0].operation).toBe('delete');
      });
    });

    describe('变更记录属性', () => {
      it('应该包含时间戳', () => {
        const differ = new FileSystemDiffer();
        const original = createMockWASIFS({});
        const current = createMockWASIFS({
          '/file.txt': 'content',
        });

        const before = new Date();
        const result = differ.diff(original, current);
        const after = new Date();

        expect(result.created[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.created[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('应该包含文件大小', () => {
        const differ = new FileSystemDiffer();
        const original = createMockWASIFS({});
        const current = createMockWASIFS({
          '/file.txt': 'hello',  // 5 bytes
        });

        const result = differ.diff(original, current);

        expect(result.created[0].size).toBe(5);
      });

      it('修改记录应该包含新旧内容', () => {
        const differ = new FileSystemDiffer();
        const original = createMockWASIFS({
          '/file.txt': 'old',
        });
        const current = createMockWASIFS({
          '/file.txt': 'new',
        });

        const result = differ.diff(original, current);

        expect(result.modified[0].content).toBeDefined();
        expect(result.modified[0].oldContent).toBeDefined();
        expect(new TextDecoder().decode(result.modified[0].content)).toBe('new');
        expect(new TextDecoder().decode(result.modified[0].oldContent)).toBe('old');
      });
    });
  });
});
