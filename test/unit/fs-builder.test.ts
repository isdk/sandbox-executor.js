// tests/unit/fs-builder.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FSBuilder } from '../../src/fs/fs-builder';

// Mock fs/promises 和 path
vi.mock('fs/promises');
vi.mock('path');

describe('FSBuilder', () => {
  let builder: FSBuilder;

  beforeEach(() => {
    builder = new FSBuilder({ workdir: '/workspace' });
    vi.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该接受 workdir 选项', () => {
      const b = new FSBuilder({ workdir: '/custom' });
      expect(b).toBeDefined();
    });

    it('应该创建空的文件系统', () => {
      const fs = builder.build();
      expect(Object.keys(fs)).toHaveLength(0);
    });
  });

  describe('addEntryFile', () => {
    it('应该添加入口文件到工作目录', () => {
      builder.addEntryFile('main.py', 'print("hello")');
      const fs = builder.build();

      expect(fs['/workspace/main.py']).toBeDefined();
      expect(fs['/workspace/main.py'].content).toBe('print("hello")');
    });

    it('应该设置正确的文件路径', () => {
      builder.addEntryFile('script.rb', 'puts "hello"');
      const fs = builder.build();

      expect(fs['/workspace/script.rb'].path).toBe('/workspace/script.rb');
    });

    it('应该设置 mode 为 string', () => {
      builder.addEntryFile('main.js', 'console.log("hi")');
      const fs = builder.build();

      expect(fs['/workspace/main.js'].mode).toBe('string');
    });

    it('应该设置时间戳', () => {
      const before = new Date();
      builder.addEntryFile('main.py', 'code');
      const after = new Date();
      const fs = builder.build();

      const timestamps = fs['/workspace/main.py'].timestamps;
      expect(timestamps.access.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamps.access.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(timestamps.modification.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamps.change.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('应该返回 this 以支持链式调用', () => {
      const result = builder.addEntryFile('main.py', 'code');
      expect(result).toBe(builder);
    });

    it('应该支持空内容', () => {
      builder.addEntryFile('empty.py', '');
      const fs = builder.build();

      expect(fs['/workspace/empty.py'].content).toBe('');
    });

    it('应该支持多行内容', () => {
      const code = `
def hello():
    print("Hello")

def world():
    print("World")
      `.trim();

      builder.addEntryFile('multi.py', code);
      const fs = builder.build();

      expect(fs['/workspace/multi.py'].content).toBe(code);
    });

    it('应该覆盖同名文件', () => {
      builder.addEntryFile('main.py', 'first');
      builder.addEntryFile('main.py', 'second');
      const fs = builder.build();

      expect(fs['/workspace/main.py'].content).toBe('second');
    });
  });

  describe('addFiles', () => {
    it('应该添加单个字符串文件', () => {
      builder.addFiles({
        'data.txt': 'hello world',
      });
      const fs = builder.build();

      expect(fs['/workspace/data.txt']).toBeDefined();
      expect(fs['/workspace/data.txt'].content).toBe('hello world');
    });

    it('应该添加多个文件', () => {
      builder.addFiles({
        'file1.txt': 'content1',
        'file2.txt': 'content2',
        'file3.txt': 'content3',
      });
      const fs = builder.build();

      expect(Object.keys(fs)).toHaveLength(3);
      expect(fs['/workspace/file1.txt'].content).toBe('content1');
      expect(fs['/workspace/file2.txt'].content).toBe('content2');
      expect(fs['/workspace/file3.txt'].content).toBe('content3');
    });

    it('应该添加二进制文件', () => {
      const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0xff]);
      builder.addFiles({
        'data.bin': binaryData,
      });
      const fs = builder.build();

      expect(fs['/workspace/data.bin'].mode).toBe('binary');
      expect(fs['/workspace/data.bin'].content).toEqual(binaryData);
    });

    it('应该混合添加字符串和二进制文件', () => {
      const binaryData = new Uint8Array([1, 2, 3]);
      builder.addFiles({
        'text.txt': 'hello',
        'binary.bin': binaryData,
      });
      const fs = builder.build();

      expect(fs['/workspace/text.txt'].mode).toBe('string');
      expect(fs['/workspace/binary.bin'].mode).toBe('binary');
    });

    it('应该处理相对路径', () => {
      builder.addFiles({
        'subdir/file.txt': 'content',
      });
      const fs = builder.build();

      expect(fs['/workspace/subdir/file.txt']).toBeDefined();
    });

    it('应该处理深层嵌套路径', () => {
      builder.addFiles({
        'a/b/c/d/e/file.txt': 'deep',
      });
      const fs = builder.build();

      expect(fs['/workspace/a/b/c/d/e/file.txt'].content).toBe('deep');
    });

    it('应该处理绝对路径', () => {
      builder.addFiles({
        '/absolute/path/file.txt': 'absolute',
      });
      const fs = builder.build();

      expect(fs['/absolute/path/file.txt']).toBeDefined();
      expect(fs['/absolute/path/file.txt'].content).toBe('absolute');
    });

    it('应该返回 this 以支持链式调用', () => {
      const result = builder.addFiles({ 'a.txt': 'a' });
      expect(result).toBe(builder);
    });

    it('应该处理空对象', () => {
      builder.addFiles({});
      const fs = builder.build();

      expect(Object.keys(fs)).toHaveLength(0);
    });

    it('应该处理包含特殊字符的文件名', () => {
      builder.addFiles({
        'file-with-dash.txt': 'a',
        'file_with_underscore.txt': 'b',
        'file.multiple.dots.txt': 'c',
        'file with spaces.txt': 'd',
      });
      const fs = builder.build();

      expect(fs['/workspace/file-with-dash.txt']).toBeDefined();
      expect(fs['/workspace/file_with_underscore.txt']).toBeDefined();
      expect(fs['/workspace/file.multiple.dots.txt']).toBeDefined();
      expect(fs['/workspace/file with spaces.txt']).toBeDefined();
    });

    it('应该处理中文文件名', () => {
      builder.addFiles({
        '数据.txt': '内容',
      });
      const fs = builder.build();

      expect(fs['/workspace/数据.txt'].content).toBe('内容');
    });

    it('应该正确设置二进制文件的时间戳', () => {
      const before = new Date();
      builder.addFiles({
        'data.bin': new Uint8Array([1, 2, 3]),
      });
      const after = new Date();
      const fs = builder.build();

      const timestamps = fs['/workspace/data.bin'].timestamps;
      expect(timestamps.access.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamps.access.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('链式调用', () => {
    it('应该支持多次链式调用', () => {
      const fs = builder
        .addEntryFile('main.py', 'print("main")')
        .addFiles({ 'data.txt': 'data' })
        .addFiles({ 'config.json': '{}' })
        .build();

      expect(Object.keys(fs)).toHaveLength(3);
    });

    it('应该支持复杂的链式调用', () => {
      const fs = builder
        .addEntryFile('main.py', 'code')
        .addFiles({
          'input/data1.txt': 'data1',
          'input/data2.txt': 'data2',
        })
        .addFiles({
          'config/settings.json': '{"debug": true}',
        })
        .addEntryFile('lib.py', 'helper code')
        .build();

      expect(fs['/workspace/main.py']).toBeDefined();
      expect(fs['/workspace/lib.py']).toBeDefined();
      expect(fs['/workspace/input/data1.txt']).toBeDefined();
      expect(fs['/workspace/input/data2.txt']).toBeDefined();
      expect(fs['/workspace/config/settings.json']).toBeDefined();
    });
  });

  describe('build', () => {
    it('应该返回 WASIFS 对象', () => {
      builder.addEntryFile('main.py', 'code');
      const fs = builder.build();

      expect(typeof fs).toBe('object');
    });

    it('多次调用 build 应该返回相同结果', () => {
      builder.addFiles({ 'a.txt': 'a' });

      const fs1 = builder.build();
      const fs2 = builder.build();

      expect(Object.keys(fs1)).toEqual(Object.keys(fs2));
    });

    it('build 后添加文件应该影响后续 build', () => {
      builder.addFiles({ 'a.txt': 'a' });
      const fs1 = builder.build();

      builder.addFiles({ 'b.txt': 'b' });
      const fs2 = builder.build();

      expect(Object.keys(fs1)).toHaveLength(1);
      expect(Object.keys(fs2)).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('应该清空所有文件', () => {
      builder
        .addEntryFile('main.py', 'code')
        .addFiles({ 'data.txt': 'data' });

      expect(Object.keys(builder.build())).toHaveLength(2);

      builder.clear();

      expect(Object.keys(builder.build())).toHaveLength(0);
    });

    it('应该返回 this 以支持链式调用', () => {
      const result = builder.clear();
      expect(result).toBe(builder);
    });

    it('clear 后可以继续添加文件', () => {
      builder.addFiles({ 'old.txt': 'old' });
      builder.clear();
      builder.addFiles({ 'new.txt': 'new' });

      const fs = builder.build();
      expect(fs['/workspace/old.txt']).toBeUndefined();
      expect(fs['/workspace/new.txt']).toBeDefined();
    });
  });

  describe('不同工作目录', () => {
    it('应该使用自定义工作目录', () => {
      const customBuilder = new FSBuilder({ workdir: '/app' });
      customBuilder.addEntryFile('main.py', 'code');
      const fs = customBuilder.build();

      expect(fs['/app/main.py']).toBeDefined();
      expect(fs['/workspace/main.py']).toBeUndefined();
    });

    it('应该支持根目录作为工作目录', () => {
      const rootBuilder = new FSBuilder({ workdir: '/' });
      rootBuilder.addEntryFile('main.py', 'code');
      const fs = rootBuilder.build();

      expect(fs['/main.py']).toBeDefined();
    });

    it('应该支持深层嵌套工作目录', () => {
      const deepBuilder = new FSBuilder({ workdir: '/home/user/projects/myapp' });
      deepBuilder.addEntryFile('main.py', 'code');
      const fs = deepBuilder.build();

      expect(fs['/home/user/projects/myapp/main.py']).toBeDefined();
    });

    it('应该处理带尾部斜杠的工作目录', () => {
      const b = new FSBuilder({ workdir: '/workspace/' });
      b.addEntryFile('main.py', 'code');
      const fs = b.build();

      // 应该规范化为 /workspace/main.py，而不是 /workspace//main.py
      expect(fs['/workspace/main.py']).toBeDefined();
      expect(fs['/workspace//main.py']).toBeUndefined();
    });

    it('根目录下添加子目录文件', () => {
      const rootBuilder = new FSBuilder({ workdir: '/' });
      rootBuilder.addFiles({
        'app/main.py': 'code',
        'lib/utils.py': 'utils',
      });
      const fs = rootBuilder.build();

      expect(fs['/app/main.py']).toBeDefined();
      expect(fs['/lib/utils.py']).toBeDefined();
    });
  });

  describe('路径处理', () => {
    it('应该正确处理相对路径', () => {
      builder.addFiles({ 'subdir/file.txt': 'content' });
      const fs = builder.build();

      expect(fs['/workspace/subdir/file.txt']).toBeDefined();
    });

    it('应该正确处理绝对路径（不使用 workdir）', () => {
      builder.addFiles({ '/absolute/path/file.txt': 'content' });
      const fs = builder.build();

      expect(fs['/absolute/path/file.txt']).toBeDefined();
      expect(fs['/workspace/absolute/path/file.txt']).toBeUndefined();
    });

    it('应该正确处理当前目录引用', () => {
      builder.addFiles({ './file.txt': 'content' });
      const fs = builder.build();

      // ./file.txt 不以 / 开头，会被加上 workdir
      expect(fs['/workspace/./file.txt']).toBeDefined();
    });

    it('应该保留深层路径结构', () => {
      builder.addFiles({
        'a/b/c/d/e/f.txt': 'deep',
      });
      const fs = builder.build();

      expect(fs['/workspace/a/b/c/d/e/f.txt'].content).toBe('deep');
    });

    it('应该正确处理混合的绝对和相对路径', () => {
      builder
        .addEntryFile('main.py', 'main')
        .addFiles({
          'relative.txt': 'relative content',
          '/absolute/file.txt': 'absolute content',
          'nested/deep/file.txt': 'nested content',
        });

      const fs = builder.build();

      expect(fs['/workspace/main.py']).toBeDefined();
      expect(fs['/workspace/relative.txt']).toBeDefined();
      expect(fs['/absolute/file.txt']).toBeDefined();
      expect(fs['/workspace/nested/deep/file.txt']).toBeDefined();
    });
  });

  describe('loadFromDisk', () => {
    let mockFs: any;
    let mockPath: any;

    beforeEach(async () => {
      mockFs = await import('fs/promises');
      mockPath = await import('path');

      // Mock path.join
      vi.mocked(mockPath.join).mockImplementation((...parts: string[]) => {
        return parts.join('/').replace(/\/+/g, '/');
      });

      // Mock path.dirname
      vi.mocked(mockPath.dirname).mockImplementation((p: string) => {
        const parts = p.split('/');
        parts.pop();
        return parts.join('/') || '/';
      });
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    it('应该从磁盘加载文件', async () => {
      // Mock readdir 返回文件列表
      vi.mocked(mockFs.readdir).mockResolvedValue([
        { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
        { name: 'file2.txt', isDirectory: () => false, isFile: () => true },
      ]);

      // Mock stat 返回文件大小
      vi.mocked(mockFs.stat).mockResolvedValue({ size: 100 });

      // Mock readFile 返回内容
      vi.mocked(mockFs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('file1')) return Buffer.from('content1');
        if (path.includes('file2')) return Buffer.from('content2');
        throw new Error('File not found');
      });

      await builder.loadFromDisk('/virtual', '/real/path');
      const fs = builder.build();

      expect(fs['/virtual/file1.txt']).toBeDefined();
      expect(fs['/virtual/file2.txt']).toBeDefined();
    });

    it('应该递归加载子目录', async () => {
      // 第一次调用 - 根目录
      vi.mocked(mockFs.readdir)
        .mockResolvedValueOnce([
          { name: 'subdir', isDirectory: () => true, isFile: () => false },
          { name: 'root.txt', isDirectory: () => false, isFile: () => true },
        ])
        // 第二次调用 - 子目录
        .mockResolvedValueOnce([
          { name: 'nested.txt', isDirectory: () => false, isFile: () => true },
        ]);

      vi.mocked(mockFs.stat).mockResolvedValue({ size: 50 });
      vi.mocked(mockFs.readFile).mockResolvedValue(Buffer.from('content'));

      await builder.loadFromDisk('/virtual', '/real');
      const fs = builder.build();

      expect(fs['/virtual/root.txt']).toBeDefined();
      expect(fs['/virtual/subdir/nested.txt']).toBeDefined();
    });

    it('应该跳过超过 maxFileSize 的文件', async () => {
      vi.mocked(mockFs.readdir).mockResolvedValue([
        { name: 'small.txt', isDirectory: () => false, isFile: () => true },
        { name: 'large.txt', isDirectory: () => false, isFile: () => true },
      ]);

      vi.mocked(mockFs.stat)
        .mockResolvedValueOnce({ size: 100 })   // small.txt
        .mockResolvedValueOnce({ size: 10000 }); // large.txt

      vi.mocked(mockFs.readFile).mockResolvedValue(Buffer.from('content'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await builder.loadFromDisk('/virtual', '/real', {
        maxFileSize: 1000,
      });

      const fs = builder.build();

      expect(fs['/virtual/small.txt']).toBeDefined();
      expect(fs['/virtual/large.txt']).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('maxFileSize')
      );

      consoleSpy.mockRestore();
    });

    it('应该在达到 maxTotalSize 后停止加载', async () => {
      vi.mocked(mockFs.readdir).mockResolvedValue([
        { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
        { name: 'file2.txt', isDirectory: () => false, isFile: () => true },
        { name: 'file3.txt', isDirectory: () => false, isFile: () => true },
      ]);

      vi.mocked(mockFs.stat).mockResolvedValue({ size: 500 });
      vi.mocked(mockFs.readFile).mockResolvedValue(Buffer.from('x'.repeat(500)));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await builder.loadFromDisk('/virtual', '/real', {
        maxTotalSize: 800, // 只够加载1个文件
      });

      const fs = builder.build();
      const fileCount = Object.keys(fs).length;

      expect(fileCount).toBeLessThan(3);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('maxTotalSize')
      );

      consoleSpy.mockRestore();
    });

    it('应该根据 exclude 跳过匹配的文件', async () => {
      vi.mocked(mockFs.readdir).mockResolvedValue([
        { name: 'app.js', isDirectory: () => false, isFile: () => true },
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: '.git', isDirectory: () => true, isFile: () => false },
        { name: 'data.txt', isDirectory: () => false, isFile: () => true },
      ]);

      vi.mocked(mockFs.stat).mockResolvedValue({ size: 100 });
      vi.mocked(mockFs.readFile).mockResolvedValue(Buffer.from('content'));

      await builder.loadFromDisk('/virtual', '/real', {
        exclude: ['node_modules', '.git'],
      });

      const fs = builder.build();

      expect(fs['/virtual/app.js']).toBeDefined();
      expect(fs['/virtual/data.txt']).toBeDefined();
      // node_modules 和 .git 不应该被递归进入
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);
    });

    it('应该跳过符号链接和特殊文件', async () => {
      vi.mocked(mockFs.readdir).mockResolvedValue([
        { name: 'regular.txt', isDirectory: () => false, isFile: () => true },
        { name: 'symlink', isDirectory: () => false, isFile: () => false }, // symlink
        { name: 'socket', isDirectory: () => false, isFile: () => false },  // socket
      ]);

      vi.mocked(mockFs.stat).mockResolvedValue({ size: 100 });
      vi.mocked(mockFs.readFile).mockResolvedValue(Buffer.from('content'));

      await builder.loadFromDisk('/virtual', '/real');
      const fs = builder.build();

      expect(fs['/virtual/regular.txt']).toBeDefined();
      expect(fs['/virtual/symlink']).toBeUndefined();
      expect(fs['/virtual/socket']).toBeUndefined();
    });

    it('应该返回 this 以支持链式调用', async () => {
      vi.mocked(mockFs.readdir).mockResolvedValue([]);

      const result = await builder.loadFromDisk('/virtual', '/real');
      expect(result).toBe(builder);
    });

    it('在浏览器环境应该警告并返回', async () => {
      // 模拟浏览器环境
      const originalProcess = global.process;
      // @ts-ignore
      global.process = undefined;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await builder.loadFromDisk('/virtual', '/real');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Node.js')
      );

      consoleSpy.mockRestore();
      global.process = originalProcess;
    });

    it('应该处理空目录', async () => {
      vi.mocked(mockFs.readdir).mockResolvedValue([]);

      await builder.loadFromDisk('/virtual', '/real');
      const fs = builder.build();

      expect(Object.keys(fs)).toHaveLength(0);
    });

    it('应该正确处理读取错误', async () => {
      vi.mocked(mockFs.readdir).mockResolvedValue([
        { name: 'file.txt', isDirectory: () => false, isFile: () => true },
      ]);

      vi.mocked(mockFs.stat).mockResolvedValue({ size: 100 });
      vi.mocked(mockFs.readFile).mockRejectedValue(new Error('Read error'));

      // 不应该抛出异常，只是跳过该文件
      await expect(builder.loadFromDisk('/virtual', '/real')).resolves.not.toThrow();
    });
  });

  describe('文件内容完整性', () => {
    it('应该保持 UTF-8 内容完整', () => {
      const content = '你好世界 🌍 Привет мир';
      builder.addFiles({ 'unicode.txt': content });
      const fs = builder.build();

      expect(fs['/workspace/unicode.txt'].content).toBe(content);
    });

    it('应该保持二进制内容完整', () => {
      const binary = new Uint8Array([0, 1, 2, 255, 254, 253]);
      builder.addFiles({ 'data.bin': binary });
      const fs = builder.build();

      expect(fs['/workspace/data.bin'].content).toEqual(binary);
    });

    it('应该保持大文本内容完整', () => {
      const largeContent = 'x'.repeat(100000);
      builder.addFiles({ 'large.txt': largeContent });
      const fs = builder.build();

      expect(fs['/workspace/large.txt'].content).toBe(largeContent);
      expect((fs['/workspace/large.txt'].content as string).length).toBe(100000);
    });

    it('应该处理包含 null 字符的内容', () => {
      const content = 'before\0after';
      builder.addFiles({ 'null.txt': content });
      const fs = builder.build();

      expect(fs['/workspace/null.txt'].content).toBe(content);
    });
  });

  describe('WASIFile 结构', () => {
    it('应该生成符合 WASIFile 结构的对象', () => {
      builder.addEntryFile('main.py', 'code');
      const fs = builder.build();
      const file = fs['/workspace/main.py'];

      // 验证必需的属性
      expect(file).toHaveProperty('path');
      expect(file).toHaveProperty('content');
      expect(file).toHaveProperty('mode');
      expect(file).toHaveProperty('timestamps');
      expect(file.timestamps).toHaveProperty('access');
      expect(file.timestamps).toHaveProperty('modification');
      expect(file.timestamps).toHaveProperty('change');
    });

    it('字符串文件的 mode 应该是 string', () => {
      builder.addFiles({ 'text.txt': 'content' });
      const fs = builder.build();

      expect(fs['/workspace/text.txt'].mode).toBe('string');
    });

    it('二进制文件的 mode 应该是 binary', () => {
      builder.addFiles({ 'data.bin': new Uint8Array([1, 2, 3]) });
      const fs = builder.build();

      expect(fs['/workspace/data.bin'].mode).toBe('binary');
    });

    it('时间戳应该是 Date 对象', () => {
      builder.addEntryFile('main.py', 'code');
      const fs = builder.build();
      const timestamps = fs['/workspace/main.py'].timestamps;

      expect(timestamps.access).toBeInstanceOf(Date);
      expect(timestamps.modification).toBeInstanceOf(Date);
      expect(timestamps.change).toBeInstanceOf(Date);
    });
  });
});
