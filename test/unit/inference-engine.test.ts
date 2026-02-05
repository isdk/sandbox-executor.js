// tests/unit/inference-engine.test.ts

import { describe, it, expect } from 'vitest';
import { SignatureInferenceEngine } from '../../src';
import type { FunctionSchema } from '../../src/types';

describe('SignatureInferenceEngine', () => {
  const engine = new SignatureInferenceEngine();

  describe('优先级 1: Schema', () => {
    it('应该优先使用用户提供的 schema', () => {
      const schema: FunctionSchema = {
        params: [
          { name: 'x', type: 'number', required: true },
          { name: 'y', type: 'number', required: false },
        ],
        variadic: false,
        acceptsKwargs: false,
      };

      const result = engine.resolve('def func(): pass', 'func', 'python', schema);

      expect(result.source).toBe('schema');
      expect(result.params).toEqual(schema.params);
      expect(result.variadic).toBe(false);
    });
  });

  describe('优先级 2: Python 推断', () => {
    it('应该推断简单函数参数', () => {
      const code = 'def add(a, b): return a + b';
      const result = engine.resolve(code, 'add', 'python');

      expect(result.source).toBe('inferred');
      expect(result.params).toHaveLength(2);
      expect(result.params[0].name).toBe('a');
      expect(result.params[1].name).toBe('b');
    });

    it('应该推断带默认值的参数', () => {
      const code = 'def greet(name, greeting="Hello"): pass';
      const result = engine.resolve(code, 'greet', 'python');

      expect(result.params).toHaveLength(2);
      expect(result.params[0].required).toBe(true);
      expect(result.params[1].required).toBe(false);
    });

    it('应该识别 *args', () => {
      const code = 'def func(*args): pass';
      const result = engine.resolve(code, 'func', 'python');

      expect(result.variadic).toBe(true);
    });

    it('应该识别 **kwargs', () => {
      const code = 'def func(**kwargs): pass';
      const result = engine.resolve(code, 'func', 'python');

      expect(result.acceptsKwargs).toBe(true);
    });

    it('应该处理复杂签名', () => {
      const code = 'def func(a, b=1, *args, c, d=2, **kwargs): pass';
      const result = engine.resolve(code, 'func', 'python');

      expect(result.variadic).toBe(true);
      expect(result.acceptsKwargs).toBe(true);
    });

    it('应该跳过 self 和 cls', () => {
      const code = `
class MyClass:
    def method(self, a, b): pass
      `;
      const result = engine.resolve(code, 'method', 'python');

      expect(result.params).toHaveLength(2);
      expect(result.params[0].name).toBe('a');
    });

    it('应该处理类型注解', () => {
      const code = 'def func(a: int, b: str = "default") -> bool: pass';
      const result = engine.resolve(code, 'func', 'python');

      expect(result.params).toHaveLength(2);
      expect(result.params[0].name).toBe('a');
      expect(result.params[1].name).toBe('b');
    });
  });

  describe('优先级 2: JavaScript 推断', () => {
    it('应该推断函数声明', () => {
      const code = 'function add(a, b) { return a + b; }';
      const result = engine.resolve(code, 'add', 'quickjs');

      expect(result.source).toBe('inferred');
      expect(result.params).toHaveLength(2);
    });

    it('应该推断箭头函数', () => {
      const code = 'const add = (a, b) => a + b;';
      const result = engine.resolve(code, 'add', 'quickjs');

      expect(result.params).toHaveLength(2);
    });

    it('应该推断 async 箭头函数', () => {
      const code = 'const fetchData = async (url, options) => {};';
      const result = engine.resolve(code, 'fetchData', 'quickjs');

      expect(result.params).toHaveLength(2);
    });

    it('应该识别 options 参数名', () => {
      const code = 'function fetch(url, options) {}';
      const result = engine.resolve(code, 'fetch', 'quickjs');

      expect(result.hasOptionsParam).toBe(true);
    });

    it('应该识别 opts 参数名', () => {
      const code = 'function fetch(url, opts = {}) {}';
      const result = engine.resolve(code, 'fetch', 'quickjs');

      expect(result.hasOptionsParam).toBe(true);
    });

    it('应该识别解构参数', () => {
      const code = 'function create({ name, age }) {}';
      const result = engine.resolve(code, 'create', 'quickjs');

      expect(result.hasOptionsParam).toBe(true);
    });

    it('应该识别 rest 参数', () => {
      const code = 'function sum(...numbers) {}';
      const result = engine.resolve(code, 'sum', 'quickjs');

      expect(result.variadic).toBe(true);
    });
  });

  describe('优先级 2: Ruby 推断', () => {
    it('应该推断简单函数', () => {
      const code = 'def add(a, b)\n  a + b\nend';
      const result = engine.resolve(code, 'add', 'ruby');

      expect(result.source).toBe('inferred');
      expect(result.params).toHaveLength(2);
    });

    it('应该识别关键字参数', () => {
      const code = 'def greet(name:, greeting: "Hello")\nend';
      const result = engine.resolve(code, 'greet', 'ruby');

      expect(result.params.length).toBeGreaterThan(0);
    });

    it('应该识别 **kwargs', () => {
      const code = 'def func(**options)\nend';
      const result = engine.resolve(code, 'func', 'ruby');

      expect(result.acceptsKwargs).toBe(true);
    });
  });

  describe('优先级 2: PHP 推断', () => {
    it('应该推断简单函数参数', () => {
      const code = 'function add($a, $b) { return $a + $b; }';
      const result = engine.resolve(code, 'add', 'php');

      expect(result.source).toBe('inferred');
      expect(result.params).toHaveLength(2);
      expect(result.params[0].name).toBe('a');
      expect(result.params[1].name).toBe('b');
    });

    it('应该推断带默认值的参数', () => {
      const code = 'function greet($name, $greeting = "Hello") {}';
      const result = engine.resolve(code, 'greet', 'php');

      expect(result.params).toHaveLength(2);
      expect(result.params[0].required).toBe(true);
      expect(result.params[1].required).toBe(false);
    });

    it('应该识别 variadic 参数 (...$args)', () => {
      const code = 'function func(...$args) {}';
      const result = engine.resolve(code, 'func', 'php');

      expect(result.variadic).toBe(true);
    });

    it('应该处理类型提示', () => {
      const code = 'function func(int $a, ?string $b = null) {}';
      const result = engine.resolve(code, 'func', 'php');

      expect(result.params).toHaveLength(2);
      expect(result.params[0].name).toBe('a');
      expect(result.params[1].name).toBe('b');
    });
  });

  describe('优先级 2: C 推断', () => {
    it('应该推断简单 C 函数', () => {
      const code = 'int add(int a, int b) { return a + b; }';
      const result = engine.resolve(code, 'add', 'c');

      expect(result.source).toBe('inferred');
      expect(result.returnType).toBe('int');
      expect(result.params).toHaveLength(2);
      expect(result.params[0].name).toBe('a');
      expect(result.params[1].name).toBe('b');
    });

    it('应该推断带指针的 C 函数', () => {
      const code = 'char* greet(const char* name) { return "hello"; }';
      const result = engine.resolve(code, 'greet', 'c');

      expect(result.returnType).toBe('char*');
      expect(result.params).toHaveLength(1);
      expect(result.params[0].name).toBe('name');
    });
  });

  describe('优先级 2: C++ 推断', () => {
    it('应该推断简单 C++ 函数', () => {
      const code = 'double multiply(double x, double y) { return x * y; }';
      const result = engine.resolve(code, 'multiply', 'cpp');

      expect(result.source).toBe('inferred');
      expect(result.returnType).toBe('double');
      expect(result.params).toHaveLength(2);
      expect(result.params[0].name).toBe('x');
    });
  });

  describe('优先级 3: 语言约定', () => {
    it('Python 约定应该支持 variadic 和 kwargs', () => {
      // 使用无法解析的代码
      const result = engine.resolve('invalid code', 'unknown', 'python');

      expect(result.source).toBe('convention');
      expect(result.variadic).toBe(true);
      expect(result.acceptsKwargs).toBe(true);
    });

    it('JavaScript 约定应该使用 options 模式', () => {
      const result = engine.resolve('invalid', 'unknown', 'quickjs');

      expect(result.source).toBe('convention');
      expect(result.hasOptionsParam).toBe(true);
    });

    it('Ruby 约定应该支持 variadic 和 kwargs', () => {
      const result = engine.resolve('invalid', 'unknown', 'ruby');

      expect(result.source).toBe('convention');
      expect(result.variadic).toBe(true);
      expect(result.acceptsKwargs).toBe(true);
    });

    it('PHP 约定应该支持 variadic 和 kwargs', () => {
      const result = engine.resolve('invalid', 'unknown', 'php');

      expect(result.source).toBe('convention');
      expect(result.variadic).toBe(true);
      expect(result.acceptsKwargs).toBe(true);
    });

    it('C 约定应该有默认返回类型', () => {
      const result = engine.resolve('invalid', 'unknown', 'c');
      expect(result.source).toBe('convention');
      expect(result.returnType).toBe('int');
    });

    it('C++ 约定应该有默认返回类型', () => {
      const result = engine.resolve('invalid', 'unknown', 'cpp');
      expect(result.source).toBe('convention');
      expect(result.returnType).toBe('int');
    });
  });

  describe('边界情况', () => {
    it('应该处理空代码', () => {
      const result = engine.resolve('', 'func', 'python');
      expect(result.source).toBe('convention');
    });

    it('应该处理函数不存在的情况', () => {
      const result = engine.resolve('def other(): pass', 'func', 'python');
      expect(result.source).toBe('convention');
    });

    it('应该处理多行代码', () => {
      const code = `
import os

def helper():
    pass

def target(a, b, c=None):
    return a + b

def another():
    pass
      `;
      const result = engine.resolve(code, 'target', 'python');

      expect(result.source).toBe('inferred');
      expect(result.params).toHaveLength(3);
    });
  });
});
