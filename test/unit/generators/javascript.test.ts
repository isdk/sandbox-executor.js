// tests/unit/generators/javascript.test.ts

import { describe, it, expect } from 'vitest';
import { JavaScriptGenerator } from '../../../src/generators/javascript';
import { RESULT_MARKERS } from '../../../src/generators/base';
import type { InferredSignature } from '../../../src/inference/engine';

describe('JavaScriptGenerator', () => {
  const generator = new JavaScriptGenerator();

  const defaultSignature: InferredSignature = {
    params: [],
    variadic: false,
    acceptsKwargs: false,
    hasOptionsParam: true,
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

  describe('options 参数模式', () => {
    it('当 hasOptionsParam 为 true 时，kwargs 应该作为最后一个对象参数', () => {
      const signature: InferredSignature = {
        ...defaultSignature,
        hasOptionsParam: true,
      };

      const result = generator.generateExecutionCode(
        'function func(a, options) {}',
        'func',
        [1],
        { foo: 'bar', baz: 42 },
        signature
      );

      expect(result).toContain('func(1, {"foo":"bar","baz":42})');
    });

    it('没有位置参数时，应该只传 options 对象', () => {
      const signature: InferredSignature = {
        ...defaultSignature,
        hasOptionsParam: true,
      };

      const result = generator.generateExecutionCode(
        'function func(options) {}',
        'func',
        [],
        { foo: 'bar' },
        signature
      );

      expect(result).toContain('func({"foo":"bar"})');
    });
  });

  describe('参数映射模式', () => {
    it('应该将 kwargs 映射到对应的位置参数', () => {
      const signature: InferredSignature = {
        params: [
          { name: 'a', required: true },
          { name: 'b', required: true },
          { name: 'c', required: false },
        ],
        variadic: false,
        acceptsKwargs: false,
        hasOptionsParam: false,
        source: 'inferred',
      };

      const result = generator.generateExecutionCode(
        'function func(a, b, c) {}',
        'func',
        [1],  // a = 1
        { b: 2, c: 3 },  // 映射 b 和 c
        signature
      );

      expect(result).toContain('func(1, 2, 3)');
    });
  });

  describe('包装器代码', () => {
    it('应该使用 async IIFE', () => {
      const result = generator.generateExecutionCode(
        'function func() {}',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('(async () => {');
      expect(result).toContain('})();');
    });

    it('应该使用 await 调用函数', () => {
      const result = generator.generateExecutionCode(
        'function func() {}',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('await (func())');
    });

    it('应该包含 try-catch 错误处理', () => {
      const result = generator.generateExecutionCode(
        'function func() {}',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('try {');
      expect(result).toContain('} catch (e) {');
    });
  });
});