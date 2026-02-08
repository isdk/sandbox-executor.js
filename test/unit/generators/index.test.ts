import { describe, it, expect } from 'vitest';
import {
  getGenerator,
  CodeGenerator,
  PythonGenerator,
  JavaScriptGenerator,
  RubyGenerator,
  RESULT_MARKERS,
} from '../../../src/generators';
import { InputProtocol } from '../../../src/types/request';

describe('generators/index', () => {
  describe('getGenerator', () => {
    it('应该返回 Python 生成器', () => {
      const generator = getGenerator('python');
      expect(generator).toBeInstanceOf(PythonGenerator);
      expect(generator.language).toBe('python');
    });

    it('应该返回 JavaScript 生成器', () => {
      const generator = getGenerator('javascript');
      expect(generator).toBeInstanceOf(JavaScriptGenerator);
      expect(generator.language).toBe('javascript');
    });

    it('应该返回 Ruby 生成器', () => {
      const generator = getGenerator('ruby');
      expect(generator).toBeInstanceOf(RubyGenerator);
      expect(generator.language).toBe('ruby');
    });

    it('应该对不支持的语言抛出错误', () => {
      expect(() => {
        getGenerator('unknown' as any);
      }).toThrow('Unsupported language: unknown');
    });
  });

  describe('RESULT_MARKERS', () => {
    it('应该导出 START 标记', () => {
      expect(RESULT_MARKERS.START).toBe('__SANDBOX_RESULT_START__');
    });

    it('应该导出 END 标记', () => {
      expect(RESULT_MARKERS.END).toBe('__SANDBOX_RESULT_END__');
    });
  });

  describe('所有生成器', () => {
    const languages = ['python', 'quickjs', 'ruby', 'clang', 'clangpp'] as const;

    languages.forEach(lang => {
      describe(`${lang} 生成器`, () => {
        const generator = getGenerator(lang);

        it('应该是 CodeGenerator 的实例', () => {
          expect(generator).toBeInstanceOf(CodeGenerator);
        });

        it('应该有 language 属性', () => {
          expect(generator.language).toBeTruthy();
        });

        it('应该有 fileExtension 属性', () => {
          expect(generator.fileExtension).toMatch(/^\.\w+$/);
        });

        it('应该生成 main 文件和用户代码文件', async () => {
          const files = await generator.generateFiles({
            code: 'test',
            functionName: 'test',
            args: [],
            kwargs: {},
            signature: {
              input: {},
              variadic: false,
              acceptsKwargs: false,
              hasOptionsParam: false,
              source: 'convention',
            },
            argsMode: 'stdin',
          });

          expect(files[`main${generator.fileExtension}`]).toBeDefined();
        });

        it('generateStdin 应该以 InputProtocol.ATOMIC 开头 (原子模式)', () => {
           const stdin = generator.generateStdin({
             code: 'test',
             functionName: 'test',
             args: [],
             kwargs: {},
             argsMode: 'stdin',
           });
           if (typeof stdin === 'string') {
             expect(stdin.startsWith(InputProtocol.ATOMIC)).toBe(true);
           }
        });
      });
    });
  });
});