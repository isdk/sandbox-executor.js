import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionResolver } from '../../src';
import type { PermissionConfig } from '../../src';

describe('PermissionResolver', () => {
  describe('默认权限', () => {
    it('应该使用默认权限（只读）', () => {
      const resolver = new PermissionResolver();
      const perms = resolver.resolve('/any/path.txt');

      expect(perms.read).toBe(true);
      expect(perms.list).toBe(true);
      expect(perms.create).toBe(false);
      expect(perms.modify).toBe(false);
      expect(perms.delete).toBe(false);
    });

    it('应该支持自定义默认权限', () => {
      const resolver = new PermissionResolver({
        default: {
          read: true,
          list: true,
          create: true,
          modify: false,
          delete: false,
        },
      });

      const perms = resolver.resolve('/any/path.txt');
      expect(perms.create).toBe(true);
      expect(perms.modify).toBe(false);
    });
  });

  describe('allowAll 静态方法', () => {
    it('应该创建全开放权限解析器', () => {
      const resolver = PermissionResolver.allowAll();
      const perms = resolver.resolve('/any/path.txt');

      expect(perms.read).toBe(true);
      expect(perms.list).toBe(true);
      expect(perms.create).toBe(true);
      expect(perms.modify).toBe(true);
      expect(perms.delete).toBe(true);
    });

    it('全开放模式应该忽略所有规则', () => {
      const resolver = PermissionResolver.allowAll();

      // 即使是通常被拒绝的路径也应该允许
      expect(resolver.check('/secret/file.txt', 'read')).toBe(true);
      expect(resolver.check('/secret/file.txt', 'delete')).toBe(true);
    });
  });

  describe('readOnly 静态方法', () => {
    it('应该创建只读权限解析器', () => {
      const resolver = PermissionResolver.readOnly();
      const perms = resolver.resolve('/any/path.txt');

      expect(perms.read).toBe(true);
      expect(perms.list).toBe(true);
      expect(perms.create).toBe(false);
      expect(perms.modify).toBe(false);
      expect(perms.delete).toBe(false);
    });
  });

  describe('规则匹配', () => {
    it('应该按 pattern 匹配并应用 allow 规则', () => {
      const resolver = new PermissionResolver({
        default: { read: true, list: true },
        rules: [
          { pattern: 'output/**', allow: ['create', 'modify'] },
        ],
      });

      const perms = resolver.resolve('/output/result.txt');
      expect(perms.create).toBe(true);
      expect(perms.modify).toBe(true);
      expect(perms.delete).toBe(false);
    });

    it('应该按 pattern 匹配并应用 deny 规则', () => {
      const resolver = new PermissionResolver({
        default: { read: true, list: true, create: true },
        rules: [
          { pattern: 'readonly/**', deny: ['create', 'modify', 'delete'] },
        ],
      });

      const perms = resolver.resolve('/readonly/file.txt');
      expect(perms.read).toBe(true);
      expect(perms.create).toBe(false);
      expect(perms.modify).toBe(false);
    });

    it('应该支持 allow: "*" 全部允许', () => {
      const resolver = new PermissionResolver({
        default: {},
        rules: [
          { pattern: 'full-access/**', allow: '*' },
        ],
      });

      const perms = resolver.resolve('/full-access/file.txt');
      expect(perms.read).toBe(true);
      expect(perms.create).toBe(true);
      expect(perms.modify).toBe(true);
      expect(perms.delete).toBe(true);
    });

    it('应该支持 deny: "*" 全部拒绝', () => {
      const resolver = new PermissionResolver({
        default: { read: true, list: true, create: true, modify: true, delete: true },
        rules: [
          { pattern: 'blocked/**', deny: '*' },
        ],
      });

      const perms = resolver.resolve('/blocked/file.txt');
      expect(perms.read).toBe(false);
      expect(perms.create).toBe(false);
      expect(perms.delete).toBe(false);
    });
  });

  describe('规则优先级', () => {
    it('应该优先匹配高优先级规则', () => {
      const resolver = new PermissionResolver({
        rules: [
          { pattern: '**/*.txt', allow: ['create'], priority: 1 },
          { pattern: 'output/**', deny: '*', priority: 10 },  // 更高优先级
        ],
      });

      // output 下的 .txt 文件应该被拒绝，因为 output/** 优先级更高
      const perms = resolver.resolve('/output/file.txt');
      expect(perms.create).toBe(false);
    });

    it('默认优先级应该是 0', () => {
      const resolver = new PermissionResolver({
        rules: [
          { pattern: '**/*', allow: ['read'] },  // priority: 0
          { pattern: 'special/**', allow: ['create'], priority: 1 },
        ],
      });

      const perms = resolver.resolve('/special/file.txt');
      expect(perms.create).toBe(true);
    });
  });

  describe('exclude 语法糖', () => {
    it('应该将 exclude 转换为高优先级 deny 规则', () => {
      const resolver = new PermissionResolver({
        default: { read: true, list: true, create: true },
        exclude: ['node_modules', '.git'],
      });

      expect(resolver.check('/node_modules/package/index.js', 'read')).toBe(false);
      expect(resolver.check('/project/.git/config', 'read')).toBe(false);
      expect(resolver.check('/project/src/index.ts', 'read')).toBe(true);
    });

    it('exclude 应该具有非常高的优先级', () => {
      const resolver = new PermissionResolver({
        rules: [
          { pattern: '**/*', allow: '*', priority: 50 },
        ],
        exclude: ['secret'],  // 转换为 priority: 1000
      });

      expect(resolver.check('/secret/password.txt', 'read')).toBe(false);
    });
  });

  describe('check 方法', () => {
    it('应该检查单个权限', () => {
      const resolver = new PermissionResolver({
        default: { read: true, create: false },
      });

      expect(resolver.check('/file.txt', 'read')).toBe(true);
      expect(resolver.check('/file.txt', 'create')).toBe(false);
    });
  });

  describe('路径规范化', () => {
    it('应该处理带前导斜杠的路径', () => {
      const resolver = new PermissionResolver({
        rules: [{ pattern: 'output/**', allow: ['create'] }],
      });

      expect(resolver.check('/output/file.txt', 'create')).toBe(true);
      expect(resolver.check('output/file.txt', 'create')).toBe(true);
    });

    it('应该匹配深层嵌套路径', () => {
      const resolver = new PermissionResolver({
        rules: [{ pattern: 'src/**', allow: ['read'] }],
      });

      expect(resolver.check('/src/deep/nested/file.ts', 'read')).toBe(true);
    });
  });

  describe('Simple glob 模式', () => {
    it('应该支持 * 通配符', () => {
      const resolver = new PermissionResolver({
        rules: [{ pattern: '*.log', allow: ['create', 'modify'] }],
      });

      expect(resolver.check('/app.log', 'create')).toBe(true);
      expect(resolver.check('/app.txt', 'create')).toBe(false);
    });

    it('应该支持 ** 递归通配符', () => {
      const resolver = new PermissionResolver({
        rules: [{ pattern: 'logs/**/*.log', allow: ['create'] }],
      });

      expect(resolver.check('/logs/2024/01/app.log', 'create')).toBe(true);
      expect(resolver.check('/logs/app.log', 'create')).toBe(true);
    });

    it('应该支持 ? 单字符通配符', () => {
      const resolver = new PermissionResolver({
        rules: [{ pattern: 'file?.txt', allow: ['read', 'modify'] }],
      });

      expect(resolver.check('/file1.txt', 'read')).toBe(true);
      expect(resolver.check('/file12.txt', 'modify')).toBe(false);
    });
  });

  describe('glob 模式', () => {
    /**
     * 辅助函数：创建一个只允许匹配规则的解析器
     * 默认所有权限为 false，只有匹配规则的才为 true
     */
    function createPatternResolver(pattern: string, permission: 'read' | 'create' | 'modify' | 'delete' = 'read') {
      return new PermissionResolver({
        default: { read: false, list: false, create: false, modify: false, delete: false },
        rules: [{ pattern, allow: [permission] }],
      });
    }

    describe('* 通配符', () => {
      it('应该匹配任意字符序列', () => {
        const resolver = createPatternResolver('*.log');

        expect(resolver.check('/app.log', 'read')).toBe(true);
        expect(resolver.check('/error.log', 'read')).toBe(true);
        expect(resolver.check('/.log', 'read')).toBe(true);  // 零个字符也匹配
      });

      it('不应该匹配不符合的扩展名', () => {
        const resolver = createPatternResolver('*.log');

        expect(resolver.check('/app.txt', 'read')).toBe(false);
        expect(resolver.check('/app.log.bak', 'read')).toBe(false);
      });

      it('应该支持中间位置的 *', () => {
        const resolver = createPatternResolver('test_*.py');

        expect(resolver.check('/test_unit.py', 'read')).toBe(true);
        expect(resolver.check('/test_.py', 'read')).toBe(true);
        expect(resolver.check('/unit_test.py', 'read')).toBe(false);
      });
    });

    describe('** 递归通配符', () => {
      it('应该匹配任意深度的目录', () => {
        const resolver = createPatternResolver('logs/**/*.log');

        expect(resolver.check('/logs/app.log', 'read')).toBe(true);
        expect(resolver.check('/logs/2024/app.log', 'read')).toBe(true);
        expect(resolver.check('/logs/2024/01/15/app.log', 'read')).toBe(true);
      });

      it('不应该匹配其他根目录', () => {
        const resolver = createPatternResolver('logs/**/*.log');

        expect(resolver.check('/other/app.log', 'read')).toBe(false);
        expect(resolver.check('/app.log', 'read')).toBe(false);
      });

      it('** 在末尾应该匹配所有子内容', () => {
        const resolver = createPatternResolver('src/**');

        expect(resolver.check('/src/index.ts', 'read')).toBe(true);
        expect(resolver.check('/src/utils/helper.ts', 'read')).toBe(true);
        expect(resolver.check('/lib/index.ts', 'read')).toBe(false);
      });
    });

    describe('? 单字符通配符', () => {
      it('应该匹配恰好一个字符', () => {
        const resolver = createPatternResolver('file?.txt');

        expect(resolver.check('/file1.txt', 'read')).toBe(true);
        expect(resolver.check('/fileA.txt', 'read')).toBe(true);
        expect(resolver.check('/file_.txt', 'read')).toBe(true);
      });

      it('不应该匹配零个字符', () => {
        const resolver = createPatternResolver('file?.txt');

        expect(resolver.check('/file.txt', 'read')).toBe(false);
      });

      it('不应该匹配多个字符', () => {
        const resolver = createPatternResolver('file?.txt');

        expect(resolver.check('/file12.txt', 'read')).toBe(false);
        expect(resolver.check('/fileAB.txt', 'read')).toBe(false);
      });

      it('应该支持多个 ?', () => {
        const resolver = createPatternResolver('log_????.txt');

        expect(resolver.check('/log_2024.txt', 'read')).toBe(true);
        expect(resolver.check('/log_abc.txt', 'read')).toBe(false);  // 只有3个字符
        expect(resolver.check('/log_12345.txt', 'read')).toBe(false); // 5个字符
      });
    });

    describe('字符类 []', () => {
      it('应该匹配指定字符', () => {
        const resolver = createPatternResolver('file[123].txt');

        expect(resolver.check('/file1.txt', 'read')).toBe(true);
        expect(resolver.check('/file2.txt', 'read')).toBe(true);
        expect(resolver.check('/file3.txt', 'read')).toBe(true);
      });

      it('不应该匹配未指定的字符', () => {
        const resolver = createPatternResolver('file[123].txt');

        expect(resolver.check('/file4.txt', 'read')).toBe(false);
        expect(resolver.check('/fileA.txt', 'read')).toBe(false);
      });

      it('应该支持范围', () => {
        const resolver = createPatternResolver('file[a-z].txt');

        expect(resolver.check('/filea.txt', 'read')).toBe(true);
        expect(resolver.check('/filez.txt', 'read')).toBe(true);
        expect(resolver.check('/fileA.txt', 'read')).toBe(false);
        expect(resolver.check('/file1.txt', 'read')).toBe(false);
      });

      it('应该支持否定 [!...]', () => {
        const resolver = createPatternResolver('file[!0-9].txt');

        expect(resolver.check('/fileA.txt', 'read')).toBe(true);
        expect(resolver.check('/file_.txt', 'read')).toBe(true);
        expect(resolver.check('/file1.txt', 'read')).toBe(false);
        expect(resolver.check('/file9.txt', 'read')).toBe(false);
      });
    });

    describe('大括号扩展 {}', () => {
      it('应该匹配任一选项', () => {
        const resolver = createPatternResolver('*.{js,ts}');

        expect(resolver.check('/app.js', 'read')).toBe(true);
        expect(resolver.check('/app.ts', 'read')).toBe(true);
      });

      it('不应该匹配其他选项', () => {
        const resolver = createPatternResolver('*.{js,ts}');

        expect(resolver.check('/app.py', 'read')).toBe(false);
        expect(resolver.check('/app.jsx', 'read')).toBe(false);
      });

      it('应该支持多个选项', () => {
        const resolver = createPatternResolver('*.{js,jsx,ts,tsx,mjs,cjs}');

        expect(resolver.check('/app.js', 'read')).toBe(true);
        expect(resolver.check('/app.jsx', 'read')).toBe(true);
        expect(resolver.check('/app.ts', 'read')).toBe(true);
        expect(resolver.check('/app.tsx', 'read')).toBe(true);
        expect(resolver.check('/app.mjs', 'read')).toBe(true);
        expect(resolver.check('/app.vue', 'read')).toBe(false);
      });
    });

    describe('组合模式', () => {
      it('应该支持 ** 与 {} 组合', () => {
        const resolver = createPatternResolver('src/**/*.{ts,tsx}');

        expect(resolver.check('/src/index.ts', 'read')).toBe(true);
        expect(resolver.check('/src/components/Button.tsx', 'read')).toBe(true);
        expect(resolver.check('/src/utils/helper.js', 'read')).toBe(false);
        expect(resolver.check('/lib/index.ts', 'read')).toBe(false);
      });

      it('应该支持 ? 与 [] 组合', () => {
        const resolver = createPatternResolver('log_[0-9][0-9][0-9][0-9]-??-??.txt');

        expect(resolver.check('/log_2024-01-15.txt', 'read')).toBe(true);
        expect(resolver.check('/log_2024-1-15.txt', 'read')).toBe(false);  // 月份缺少前导零
      });
    });
  });
});
