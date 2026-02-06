import { describe, it, expect } from 'vitest';
import { RubyGenerator } from '../../../src/generators/ruby';
import { InputProtocol } from '../../../src/types/request';
import type { InferredSignature } from '../../../src/inference/engine';

describe('RubyGenerator', () => {
  const generator = new RubyGenerator();

  const defaultSignature: InferredSignature = {
    params: [],
    variadic: true,
    acceptsKwargs: true,
    hasOptionsParam: false,
    source: 'convention',
  };

  describe('基本属性', () => {
    it('language 应该是 ruby', () => {
      expect(generator.language).toBe('ruby');
    });

    it('fileExtension 应该是 .rb', () => {
      expect(generator.fileExtension).toBe('.rb');
    });
  });

  describe('generateFiles', () => {
    it('应该生成包含 main.rb 和 user_code.rb 的文件映射', () => {
      const userCode = 'def add(a, b); a + b; end';
      const files = generator.generateFiles(
        userCode,
        'add',
        [1, 2],
        {},
        defaultSignature
      );

      expect(files['main.rb']).toBeDefined();
      expect(files['user_code.rb']).toBe(userCode);
      
      const proxyCode = files['main.rb'] as string;
      expect(proxyCode).toContain("require 'json'");
      expect(proxyCode).toContain('def execute_request(request)');
      expect(proxyCode).toContain('START_MARKER = "__SANDBOX_RESULT_START__"');
    });
  });

  describe('generateStdin', () => {
    it('应该生成以 InputProtocol.ATOMIC 开头的 JSON 字符串', () => {
      const functionName = 'greet';
      const args = ['World'];
      const kwargs = { greeting: 'Hi' };
      
      const stdin = generator.generateStdin(functionName, args, kwargs) as string;
      
      expect(stdin.startsWith(InputProtocol.ATOMIC)).toBe(true);
      
      // Skip 5 bytes header
      const jsonStr = stdin.substring(5);
      const request = JSON.parse(jsonStr);
      
      expect(request.functionName).toBe(functionName);
      expect(request.args).toEqual(args);
      expect(request.kwargs).toEqual(kwargs);
      expect(request.filePath).toBe('/workspace/user_code.rb');
    });
  });

  describe('参数序列化 (内部使用)', () => {
    it('应该正确序列化 nil', () => {
       // @ts-ignore - serialize is protected
      expect(generator.serialize(null)).toBe('nil');
    });

    it('应该正确序列化布尔值', () => {
       // @ts-ignore - serialize is protected
      expect(generator.serialize(true)).toBe('true');
       // @ts-ignore - serialize is protected
      expect(generator.serialize(false)).toBe('false');
    });

    it('应该正确序列化 Hash', () => {
       // @ts-ignore - serialize is protected
      const result = generator.serialize({ a: 1, b: 'two' });
      expect(result).toBe('{"a" => 1, "b" => "two"}');
    });
  });
});