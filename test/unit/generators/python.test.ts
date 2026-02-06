import { describe, it, expect } from 'vitest';
import { PythonGenerator } from '../../../src/generators';
import { InputProtocol } from '../../../src/types/request';
import type { InferredSignature } from '../../../src/inference/engine';

describe('PythonGenerator', () => {
  const generator = new PythonGenerator();

  const defaultSignature: InferredSignature = {
    params: [],
    variadic: true,
    acceptsKwargs: true,
    hasOptionsParam: false,
    source: 'convention',
  };

  describe('基本属性', () => {
    it('language 应该是 python', () => {
      expect(generator.language).toBe('python');
    });

    it('fileExtension 应该是 .py', () => {
      expect(generator.fileExtension).toBe('.py');
    });
  });

  describe('generateFiles', () => {
    it('应该生成包含 main.py 和 user_code.py 的文件映射', () => {
      const userCode = 'def add(a, b): return a + b';
      const files = generator.generateFiles(
        userCode,
        'add',
        [1, 2],
        {},
        defaultSignature
      );

      expect(files['main.py']).toBeDefined();
      expect(files['user_code.py']).toBe(userCode);
      
      const proxyCode = files['main.py'] as string;
      expect(proxyCode).toContain('import sys, json');
      expect(proxyCode).toContain('__sandbox_serialize__');
      expect(proxyCode).toContain('START_MARKER = "__SANDBOX_RESULT_START__"');
    });
  });

  describe('generateStdin', () => {
    it('应该生成以 InputProtocol.ATOMIC 开头的 JSON 字符串', () => {
      const functionName = 'add';
      const args = [1, 2];
      const kwargs = { greeting: 'hello' };
      
      const stdin = generator.generateStdin(functionName, args, kwargs) as string;
      
      expect(stdin.startsWith(InputProtocol.ATOMIC)).toBe(true);
      
      // Skip 9 bytes header: [Mode(1b)][Length(8b hex)]
      const jsonStr = stdin.substring(9);
      const request = JSON.parse(jsonStr);
      
      expect(request.functionName).toBe(functionName);
      expect(request.args).toEqual(args);
      expect(request.kwargs).toEqual(kwargs);
      expect(request.filePath).toBe('/workspace/user_code.py');
    });
  });

  describe('参数序列化 (通过 Proxy 运行, 内部 serialize 用于特定需求)', () => {
    // 现在的 serialize 主要用于 Proxy 内部或兼容性，我们仍然可以测试它
    it('应该正确序列化数组', () => {
      // @ts-ignore - serialize is protected
      const result = generator.serialize([1, 2, 3]);
      expect(result).toBe('[1, 2, 3]');
    });

    it('应该正确序列化对象', () => {
       // @ts-ignore - serialize is protected
      const result = generator.serialize({ key: 'value' });
      expect(result).toBe('{"key": "value"}');
    });

    it('应该处理 undefined 为 None', () => {
       // @ts-ignore - serialize is protected
      const result = generator.serialize(undefined);
      expect(result).toBe('None');
    });
  });
});