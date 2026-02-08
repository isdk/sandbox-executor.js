import { describe, it, expect } from 'vitest';
import { CppGenerator } from '../../../src/generators/cpp';
import { InputProtocol } from '../../../src/types/request';
import type { InferredSignature } from '../../../src/inference/engine';

describe('CppGenerator', () => {
  const generator = new CppGenerator();

  const signature: InferredSignature = {
    input: {
      s: { type: 'string', index: 0 }
    },
    variadic: false,
    acceptsKwargs: false,
    hasOptionsParam: false,
    source: 'convention',
    returnType: 'std::string',
  };

  describe('generateFiles', () => {
    it('应该生成 C++ 代理及相关支持文件', async () => {
      const userCode = `#include <string>
std::string greet(std::string s) { return "Hello " + s; }`;
      const files = await generator.generateFiles({
        code: userCode,
        functionName: 'greet',
        args: ['World'],
        kwargs: {},
        signature,
        argsMode: 'stdin',
      });

      expect(files['main.cpp']).toBeDefined();
      expect(files['user_code.cpp']).toBe(userCode);
      expect(files['__sandbox_dispatcher.cpp']).toBeDefined();

      const dispatcher = files['__sandbox_dispatcher.cpp'] as string;
      expect(dispatcher).toContain('greet(arg_0)');
      expect(dispatcher).toContain('cJSON_CreateString');
    });
  });

  describe('generateStdin', () => {
    it('应该生成正确的 Stdin', () => {
      const stdin = generator.generateStdin({
        code: '',
        functionName: 'greet',
        args: ['World'],
        kwargs: {},
        argsMode: 'stdin'
      }) as string;
      expect(stdin.startsWith(InputProtocol.ATOMIC)).toBe(true);
    });
  });
});