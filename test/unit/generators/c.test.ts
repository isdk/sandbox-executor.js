import { describe, it, expect } from 'vitest';
import { CGenerator } from '../../../src/generators/c';
import { InputProtocol } from '../../../src/types/request';
import type { InferredSignature } from '../../../src/inference/engine';

describe('CGenerator', () => {
  const generator = new CGenerator();

  const signature: InferredSignature = {
    input: {
      a: { type: 'number', index: 0 },
      b: { type: 'number', index: 1 }
    },
    variadic: false,
    acceptsKwargs: false,
    hasOptionsParam: false,
    source: 'convention',
    returnType: 'int',
  };

  describe('generateFiles', () => {
    it('应该生成 C 代理及相关支持文件', () => {
      const userCode = 'int add(int a, int b) { return a + b; }';
      const files = generator.generateFiles({
        code: userCode,
        functionName: 'add',
        args: [1, 2],
        kwargs: {},
        signature,
        argsMode: 'stdin',
      });

      expect(files['main.c']).toBeDefined();
      expect(files['user_code.c']).toBe(userCode);
      expect(files['__sandbox_dispatcher.c']).toBeDefined();
      expect(files['cJSON.h']).toBeDefined();
      expect(files['cJSON.c']).toBeDefined();
      
      const dispatcher = files['__sandbox_dispatcher.c'] as string;
      expect(dispatcher).toContain('add(arg_0, arg_1)');
      expect(dispatcher).toContain('cJSON_CreateNumber');
    });
  });

  describe('generateStdin', () => {
    it('应该生成正确的 Stdin', () => {
      const stdin = generator.generateStdin({
        code: '',
        functionName: 'add',
        args: [1, 2],
        kwargs: {},
        argsMode: 'stdin'
      }) as string;
      expect(stdin.startsWith(InputProtocol.ATOMIC)).toBe(true);
      const request = JSON.parse(stdin.substring(9));
      expect(request.functionName).toBe('add');
      expect(request.args).toEqual([1, 2]);
    });
  });
});