import { describe, it, expect } from 'vitest';
import { PythonGenerator } from '../../../src/generators';
import { RESULT_MARKERS } from '../../../src//generators/base';
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

  describe('generateExecutionCode', () => {
    it('应该生成包含用户代码和包装器的完整代码', () => {
      const userCode = 'def add(a, b): return a + b';
      const result = generator.generateExecutionCode(
        userCode,
        'add',
        [1, 2],
        {},
        defaultSignature
      );

      expect(result).toContain(userCode);
      expect(result).toContain('add(1, 2)');
      expect(result).toContain(RESULT_MARKERS.START);
      expect(result).toContain(RESULT_MARKERS.END);
    });
  });

  describe('参数序列化', () => {
    it('应该正确序列化位置参数', () => {
      const result = generator.generateExecutionCode(
        'def func(*args): pass',
        'func',
        [1, 'hello', true, null],
        {},
        defaultSignature
      );

      expect(result).toContain('func(1, "hello", True, None)');
    });

    it('应该正确序列化关键字参数', () => {
      const result = generator.generateExecutionCode(
        'def func(**kwargs): pass',
        'func',
        [],
        { name: 'Alice', age: 30, active: true },
        defaultSignature
      );

      expect(result).toContain('name="Alice"');
      expect(result).toContain('age=30');
      expect(result).toContain('active=True');
    });

    it('应该正确序列化数组', () => {
      const result = generator.generateExecutionCode(
        'def func(arr): pass',
        'func',
        [[1, 2, 3]],
        {},
        defaultSignature
      );

      expect(result).toContain('[1, 2, 3]');
    });

    it('应该正确序列化对象', () => {
      const result = generator.generateExecutionCode(
        'def func(obj): pass',
        'func',
        [{ key: 'value', nested: { a: 1 } }],
        {},
        defaultSignature
      );

      expect(result).toContain('"key": "value"');
      expect(result).toContain('"nested": {"a": 1}');
    });

    it('应该处理 undefined 为 None', () => {
      const result = generator.generateExecutionCode(
        'def func(x): pass',
        'func',
        [undefined],
        {},
        defaultSignature
      );

      expect(result).toContain('func(None)');
    });
  });

  describe('包装器代码', () => {
    it('应该包含 try-except 错误处理', () => {
      const result = generator.generateExecutionCode(
        'def func(): pass',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('try:');
      expect(result).toContain('except Exception');
    });

    it('应该包含 JSON 序列化', () => {
      const result = generator.generateExecutionCode(
        'def func(): pass',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('import json');
      expect(result).toContain('json.dumps');
    });

    it('应该包含自定义序列化函数', () => {
      const result = generator.generateExecutionCode(
        'def func(): pass',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('__sandbox_serialize__');
    });

    it('应该输出结果标记', () => {
      const result = generator.generateExecutionCode(
        'def func(): pass',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain(`print("${RESULT_MARKERS.START}")`);
      expect(result).toContain(`print("${RESULT_MARKERS.END}")`);
    });
  });
});
