import { describe, it, expect } from 'vitest';
import { JavaScriptGenerator } from '../../../src/generators';
import { InputProtocol } from '../../../src/types/request';
import type { InferredSignature } from '../../../src/inference/engine';

describe('JavaScriptGenerator', () => {
  const generator = new JavaScriptGenerator();

  const defaultSignature: InferredSignature = {
    params: [],
    variadic: true,
    acceptsKwargs: true,
    hasOptionsParam: false,
    source: 'convention',
  };

  describe('基本属性', () => {
    it('language 应该是 quickjs', () => {
      expect(generator.language).toBe('quickjs');
    });

    it('fileExtension 应该是 .js', () => {
      expect(generator.fileExtension).toBe('.js');
    });
  });

  describe('generateFiles', () => {
    it('应该生成包含 main.js 和 user_code.js 的文件映射', () => {
      const userCode = 'function add(a, b) { return a + b; }';
      const files = generator.generateFiles(
        userCode,
        'add',
        [1, 2],
        {},
        defaultSignature
      );
      expect(files['main.js']).toBeDefined();
      expect(files['user_code.js']).toContain('export function add');
      const proxyCode = files['main.js'] as string;
      expect(proxyCode).toContain("import * as std from 'std'");
      expect(proxyCode).toContain('START_MARKER = "__SANDBOX_RESULT_START__"');
    });

    it('应该能够识别并添加 export', () => {
      const userCode = 'const myFunc = (a) => a';
      const files = generator.generateFiles(
        userCode,
        'myFunc',
        [1],
        {},
        defaultSignature
      );
      expect(files['user_code.js']).toContain('export const myFunc');
    });
  });

  describe('generateStdin', () => {
    it('应该生成以 InputProtocol.ATOMIC 开头的 JSON 字符串', () => {
      const functionName = 'calculate';
      const args = [10, 20];
      const kwargs = { mode: 'fast' };

      const stdin = generator.generateStdin(functionName, args, kwargs) as string;

      expect(stdin.startsWith(InputProtocol.ATOMIC)).toBe(true);

      // Skip 5 bytes header
      const jsonStr = stdin.substring(5);
      const request = JSON.parse(jsonStr);

      expect(request.functionName).toBe(functionName);
      expect(request.args).toEqual(args);
      expect(request.kwargs).toEqual(kwargs);
      expect(request.filePath).toBe(`./user_code${generator.fileExtension}`);
    });
  });
});
