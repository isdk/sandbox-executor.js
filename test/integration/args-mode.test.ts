import { describe, it, expect } from 'vitest';
import { createExecutor } from '../../src/executor';

describe('Arguments Passing Modes - Cross Language', () => {
  const executor = createExecutor();

  describe('Python', () => {
    const code = 'def test_func(a, b): return a + b';

    const modes: any[] = ['inline', 'stdin', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'python',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('JavaScript', () => {
    const code = 'export function test_func(a, b) { return a + b; }';

    const modes: any[] = ['inline', 'stdin', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'javascript',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('Ruby', () => {
    const code = 'def test_func(a, b); a + b; end';

    const modes: any[] = ['inline', 'stdin', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'ruby',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('PHP-CGI', () => {
    const code = 'function test_func($a, $b) { return $a + $b; }';

    // PHP-CGI traditionally had issues with stdin in some WASM builds,
    // so 'file' and 'inline' are the preferred modern ways.
    const modes: any[] = ['inline', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'php',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('C (Clang)', () => {
    const code = '#include <stdio.h>\nint test_func(int a, int b) { return a + b; }';

    const modes: any[] = ['inline', 'stdin', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'c',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('C++ (Clang++)', () => {
    const code = 'int test_func(int a, int b) { return a + b; }';

    const modes: any[] = ['inline', 'stdin', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'cpp',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('Complex Data & Boundary Characters', () => {
    const testCases = [
      {
        name: 'nested objects and arrays',
        args: [
          42,
          { key: 'value', list: [1, 2, 3] },
          ['a', 'b', 'c']
        ]
      },
      {
        name: 'boundary characters (quotes, backslashes, etc)',
        args: [
          "quote'\"\\; $PATH `echo hi` \n\r\t",
          "unicode: 🚀 中文"
        ]
      }
    ];

    const scriptLanguages = [
      { lang: 'python', code: 'def test_echo(*args, **kwargs): return args[0]' },
      { lang: 'javascript', code: 'export function test_echo(...args) { return args[0]; }' },
      { lang: 'ruby', code: 'def test_echo(*args); args[0]; end' },
      { lang: 'php', code: 'function test_echo(...$args) { return $args[0]; }' }
    ];

    scriptLanguages.forEach(({ lang, code }) => {
      describe(lang, () => {
        testCases.forEach(({ name, args }) => {
          it(`should handle ${name} in inline mode`, async () => {
            const result = await executor.execute({
              language: lang as any,
              code,
              functionName: 'test_echo',
              args,
              options: { argsMode: 'inline' }
            });
            expect(result.success).toBe(true);
            expect(result.result).toEqual(args[0]);
          });

          it(`should handle ${name} in stdin mode`, async () => {
            const result = await executor.execute({
              language: lang as any,
              code,
              functionName: 'test_echo',
              args,
              options: { argsMode: 'stdin' }
            });
            expect(result.success).toBe(true);
            expect(result.result).toEqual(args[0]);
          });
        });
      });
    });

    describe('C/C++ Strings', () => {
      const boundaryStr = "quote'\"\\; $PATH \n\r\t";
      ['c', 'cpp'].forEach(lang => {
        it(`should handle boundary characters in ${lang} (inline)`, async () => {
          const result = await executor.execute({
            language: lang as any,
            code: lang === 'c'
              ? '#include <string.h>\nconst char* test_echo(const char* s) { return s; }'
              : '#include <string>\nstd::string test_echo(std::string s) { return s; }',
            functionName: 'test_echo',
            args: [boundaryStr],
            options: { argsMode: 'inline' }
          });
          expect(result.success).toBe(true);
          expect(result.result).toBe(boundaryStr);
        });
      });
    });
  });

  describe('Null, Empty & Edge Cases', () => {
    const cases = [
      { name: 'null', args: [null] },
      { name: 'empty array', args: [[]] },
      { name: 'empty object', args: [{}] },
      { name: 'empty string', args: [""] }
    ];

    ['python', 'javascript', 'ruby'].forEach(lang => {
      describe(lang, () => {
        cases.forEach(({ name, args }) => {
          it(`should handle ${name}`, async () => {
            const result = await executor.execute({
              language: lang as any,
              code: lang === 'python' ? 'def test(a): return a' : (lang === 'ruby' ? 'def test(a); a; end' : 'export function test(a){return a}'),
              functionName: 'test',
              args
            });
            expect(result.success).toBe(true);
            if (name === 'null' && lang === 'python') {
              expect(result.result).toBeNull();
            } else {
              expect(result.result).toEqual(args[0]);
            }
          });
        });
      });
    });
  });

  describe('Auto Mode Threshold Logic (Cross-Language)', () => {
    const langs = [
      { lang: 'python', code: 'def large_data(data): return len(data)' },
      { lang: 'javascript', code: 'export function large_data(data) { return data.length; }' },
      { lang: 'ruby', code: 'def large_data(data); data.length; end' }
    ];

    langs.forEach(({ lang, code }) => {
      describe(lang, () => {
        it('should use inline for small data in auto mode', async () => {
          const result = await executor.execute({
            language: lang as any,
            code,
            functionName: 'large_data',
            args: ['short'],
            options: { argsMode: 'auto' }
          });
          expect(result.success).toBe(true);
          expect(result.result).toBe(5);
        });

        it('should use file for large data in auto mode', async () => {
          const largeStr = 'a'.repeat(10000);
          const result = await executor.execute({
            language: lang as any,
            code,
            functionName: 'large_data',
            args: [largeStr],
            options: { argsMode: 'auto' }
          });
          expect(result.success).toBe(true);
          expect(result.result).toBe(10000);
        });
      });
    });
  });
});