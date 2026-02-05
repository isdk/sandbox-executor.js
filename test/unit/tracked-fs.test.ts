// tests/unit/tracked-fs.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrackedFileSystem, PermissionDeniedError, PermissionResolver } from '../../src';
import { createMockWASIFS, createMockWASIFile } from '../setupVitest';
import type { WASIFS, WASIFile } from '../../src';

describe('TrackedFileSystem', () => {
  let baseFS: WASIFS;
  let permissionResolver: PermissionResolver;

  beforeEach(() => {
    baseFS = createMockWASIFS({
      '/workspace/existing.txt': 'original content',
      '/workspace/readonly.txt': 'readonly content',
    });
    permissionResolver = PermissionResolver.allowAll();
  });

  describe('构造函数', () => {
    it('应该接受基础文件系统和权限解析器', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      expect(tracker).toBeDefined();
    });
  });

  describe('getProxy', () => {
    it('应该返回代理对象', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      const proxy = tracker.getProxy();
      expect(proxy).toBeDefined();
    });

    it('代理对象应该可以读取文件', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      const proxy = tracker.getProxy();

      const file = proxy['/workspace/existing.txt'];
      expect(file).toBeDefined();
      expect(file.content).toBe('original content');
    });
  });

  describe('文件创建追踪', () => {
    it('应该追踪新创建的文件', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      const proxy = tracker.getProxy();

      // 创建新文件
      proxy['/workspace/new.txt'] = createMockWASIFile('/workspace/new.txt', 'new content');

      const changes = tracker.getChanges();
      expect(changes.created).toHaveLength(1);
      expect(changes.created[0].path).toBe('/workspace/new.txt');
      expect(changes.created[0].type).toBe('create');
    });

    it('新文件应该包含内容', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      const proxy = tracker.getProxy();

      proxy['/workspace/new.txt'] = createMockWASIFile('/workspace/new.txt', 'hello world');

      const changes = tracker.getChanges();
      const content = new TextDecoder().decode(changes.created[0].content);
      expect(content).toBe('hello world');
    });
  });

  describe('文件修改追踪', () => {
    it('应该追踪已存在文件的修改', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      const proxy = tracker.getProxy();

      // 修改已存在的文件
      proxy['/workspace/existing.txt'] = createMockWASIFile(
        '/workspace/existing.txt',
        'modified content'
      );

      const changes = tracker.getChanges();
      expect(changes.modified).toHaveLength(1);
      expect(changes.modified[0].path).toBe('/workspace/existing.txt');
      expect(changes.modified[0].type).toBe('modify');
    });
  });

  describe('文件删除追踪', () => {
    it('应该追踪文件删除', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      const proxy = tracker.getProxy();

      delete proxy['/workspace/existing.txt'];

      const changes = tracker.getChanges();
      expect(changes.deleted).toHaveLength(1);
      expect(changes.deleted[0].path).toBe('/workspace/existing.txt');
      expect(changes.deleted[0].type).toBe('delete');
    });

    it('删除不存在的文件不应该记录变更', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      const proxy = tracker.getProxy();

      delete proxy['/workspace/nonexistent.txt'];

      const changes = tracker.getChanges();
      expect(changes.deleted).toHaveLength(0);
    });
  });

  describe('diffWithOriginal', () => {
    it('应该检测未被 Proxy 捕获的变更', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);

      // 直接修改 baseFS（绕过 Proxy）
      baseFS['/workspace/sneaky.txt'] = createMockWASIFile(
        '/workspace/sneaky.txt',
        'sneaky content'
      );

      // 调用 diff 检测
      tracker.diffWithOriginal();

      const changes = tracker.getChanges();
      expect(changes.created).toHaveLength(1);
      expect(changes.created[0].path).toBe('/workspace/sneaky.txt');
    });

    it('应该检测内容变更', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);

      // 直接修改内容
      baseFS['/workspace/existing.txt'].content = 'changed directly';

      tracker.diffWithOriginal();

      const changes = tracker.getChanges();
      expect(changes.modified).toHaveLength(1);
    });
  });

  describe('权限检查', () => {
    beforeEach(() => {
      permissionResolver = new PermissionResolver({
        default: { read: true, list: true },
        rules: [
          { pattern: 'output/**', allow: ['create', 'modify'] },
        ],
      });
    });

    it('创建无权限文件时应该抛出 PermissionDeniedError', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver, 'throw');
      const proxy = tracker.getProxy();

      expect(() => {
        proxy['/workspace/forbidden.txt'] = createMockWASIFile(
          '/workspace/forbidden.txt',
          'content'
        );
      }).toThrow(PermissionDeniedError);
    });

    it('有权限的目录应该允许创建', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver, 'throw');
      const proxy = tracker.getProxy();

      expect(() => {
        proxy['/output/allowed.txt'] = createMockWASIFile(
          '/output/allowed.txt',
          'content'
        );
      }).not.toThrow();
    });

    it('ignore 模式应该静默拒绝', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver, 'ignore');
      const proxy = tracker.getProxy();

      // 不应该抛出异常
      proxy['/workspace/forbidden.txt'] = createMockWASIFile(
        '/workspace/forbidden.txt',
        'content'
      );

      // 文件不应该被创建
      expect(proxy['/workspace/forbidden.txt']).toBeUndefined();

      // 应该记录拒绝
      const changes = tracker.getChanges();
      expect(changes.denied).toHaveLength(1);
    });

    it('virtual 模式应该允许虚拟写入', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver, 'virtual');
      const proxy = tracker.getProxy();

      proxy['/workspace/virtual.txt'] = createMockWASIFile(
        '/workspace/virtual.txt',
        'content'
      );

      // 文件应该在虚拟 FS 中存在
      expect(proxy['/workspace/virtual.txt']).toBeDefined();

      // 但也应该记录拒绝
      const changes = tracker.getChanges();
      expect(changes.denied).toHaveLength(1);
    });
  });

  describe('getChanges 结果结构', () => {
    it('应该返回正确的结构', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      const changes = tracker.getChanges();

      expect(changes).toHaveProperty('created');
      expect(changes).toHaveProperty('modified');
      expect(changes).toHaveProperty('deleted');
      expect(changes).toHaveProperty('denied');
      expect(Array.isArray(changes.created)).toBe(true);
      expect(Array.isArray(changes.modified)).toBe(true);
      expect(Array.isArray(changes.deleted)).toBe(true);
      expect(Array.isArray(changes.denied)).toBe(true);
    });

    it('变更记录应该包含时间戳', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      const proxy = tracker.getProxy();

      proxy['/workspace/new.txt'] = createMockWASIFile('/workspace/new.txt', 'content');

      const changes = tracker.getChanges();
      expect(changes.created[0].timestamp).toBeInstanceOf(Date);
    });

    it('变更记录应该包含大小', () => {
      const tracker = new TrackedFileSystem(baseFS, permissionResolver);
      const proxy = tracker.getProxy();

      proxy['/workspace/new.txt'] = createMockWASIFile('/workspace/new.txt', 'hello');

      const changes = tracker.getChanges();
      expect(changes.created[0].size).toBe(5);
    });
  });
});
