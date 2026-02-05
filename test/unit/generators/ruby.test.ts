import { describe, it, expect } from 'vitest';
import { RubyGenerator } from '../../../src/generators/ruby';
import { RESULT_MARKERS } from '../../../src/generators/base';
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

  describe('generateExecutionCode', () => {
    it('应该生成包含用户代码和包装器的完整代码', () => {
      const userCode = 'def add(a, b)\n  a + b\nend';
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

    it('应该包含 require json', () => {
      const result = generator.generateExecutionCode(
        'def func; end',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain("require 'json'");
    });
  });

  describe('位置参数序列化', () => {
    it('应该正确序列化整数', () => {
      const result = generator.generateExecutionCode(
        'def func(x); end',
        'func',
        [42],
        {},
        defaultSignature
      );

      expect(result).toContain('func(42)');
    });

    it('应该正确序列化浮点数', () => {
      const result = generator.generateExecutionCode(
        'def func(x); end',
        'func',
        [3.14],
        {},
        defaultSignature
      );

      expect(result).toContain('func(3.14)');
    });

    it('应该正确序列化字符串', () => {
      const result = generator.generateExecutionCode(
        'def func(s); end',
        'func',
        ['hello world'],
        {},
        defaultSignature
      );

      expect(result).toContain('func("hello world")');
    });

    it('应该正确序列化包含特殊字符的字符串', () => {
      const result = generator.generateExecutionCode(
        'def func(s); end',
        'func',
        ['hello "world"'],
        {},
        defaultSignature
      );

      expect(result).toContain('func("hello \\"world\\"")');
    });

    it('应该正确序列化布尔值 true', () => {
      const result = generator.generateExecutionCode(
        'def func(b); end',
        'func',
        [true],
        {},
        defaultSignature
      );

      expect(result).toContain('func(true)');
    });

    it('应该正确序列化布尔值 false', () => {
      const result = generator.generateExecutionCode(
        'def func(b); end',
        'func',
        [false],
        {},
        defaultSignature
      );

      expect(result).toContain('func(false)');
    });

    it('应该正确序列化 null 为 nil', () => {
      const result = generator.generateExecutionCode(
        'def func(x); end',
        'func',
        [null],
        {},
        defaultSignature
      );

      expect(result).toContain('func(nil)');
    });

    it('应该正确序列化 undefined 为 nil', () => {
      const result = generator.generateExecutionCode(
        'def func(x); end',
        'func',
        [undefined],
        {},
        defaultSignature
      );

      expect(result).toContain('func(nil)');
    });

    it('应该正确序列化数组', () => {
      const result = generator.generateExecutionCode(
        'def func(arr); end',
        'func',
        [[1, 2, 3]],
        {},
        defaultSignature
      );

      expect(result).toContain('func([1, 2, 3])');
    });

    it('应该正确序列化嵌套数组', () => {
      const result = generator.generateExecutionCode(
        'def func(arr); end',
        'func',
        [[[1, 2], [3, 4]]],
        {},
        defaultSignature
      );

      expect(result).toContain('func([[1, 2], [3, 4]])');
    });

    it('应该正确序列化混合类型数组', () => {
      const result = generator.generateExecutionCode(
        'def func(arr); end',
        'func',
        [[1, 'two', true, null]],
        {},
        defaultSignature
      );

      expect(result).toContain('func([1, "two", true, nil])');
    });

    it('应该正确序列化对象为 Hash', () => {
      const result = generator.generateExecutionCode(
        'def func(obj); end',
        'func',
        [{ name: 'Alice', age: 30 }],
        {},
        defaultSignature
      );

      expect(result).toContain('"name" => "Alice"');
      expect(result).toContain('"age" => 30');
    });

    it('应该正确序列化嵌套对象', () => {
      const result = generator.generateExecutionCode(
        'def func(obj); end',
        'func',
        [{ user: { name: 'Bob', scores: [1, 2, 3] } }],
        {},
        defaultSignature
      );

      expect(result).toContain('"user" =>');
      expect(result).toContain('"name" => "Bob"');
      expect(result).toContain('"scores" => [1, 2, 3]');
    });

    it('应该正确处理多个位置参数', () => {
      const result = generator.generateExecutionCode(
        'def func(a, b, c); end',
        'func',
        [1, 'two', true],
        {},
        defaultSignature
      );

      expect(result).toContain('func(1, "two", true)');
    });
  });

  describe('关键字参数序列化', () => {
    it('应该正确序列化关键字参数', () => {
      const result = generator.generateExecutionCode(
        'def func(name:, age:); end',
        'func',
        [],
        { name: 'Alice', age: 30 },
        defaultSignature
      );

      expect(result).toContain('name: "Alice"');
      expect(result).toContain('age: 30');
    });

    it('应该正确序列化布尔关键字参数', () => {
      const result = generator.generateExecutionCode(
        'def func(active:, verified:); end',
        'func',
        [],
        { active: true, verified: false },
        defaultSignature
      );

      expect(result).toContain('active: true');
      expect(result).toContain('verified: false');
    });

    it('应该正确序列化 nil 关键字参数', () => {
      const result = generator.generateExecutionCode(
        'def func(value:); end',
        'func',
        [],
        { value: null },
        defaultSignature
      );

      expect(result).toContain('value: nil');
    });

    it('应该正确序列化数组关键字参数', () => {
      const result = generator.generateExecutionCode(
        'def func(items:); end',
        'func',
        [],
        { items: [1, 2, 3] },
        defaultSignature
      );

      expect(result).toContain('items: [1, 2, 3]');
    });

    it('应该正确序列化 Hash 关键字参数', () => {
      const result = generator.generateExecutionCode(
        'def func(config:); end',
        'func',
        [],
        { config: { debug: true, level: 'info' } },
        defaultSignature
      );

      expect(result).toContain('config: {');
      expect(result).toContain('"debug" => true');
      expect(result).toContain('"level" => "info"');
    });
  });

  describe('混合参数', () => {
    it('应该正确处理位置参数和关键字参数的组合', () => {
      const result = generator.generateExecutionCode(
        'def greet(name, greeting:); end',
        'greet',
        ['World'],
        { greeting: 'Hello' },
        defaultSignature
      );

      expect(result).toContain('greet("World", greeting: "Hello")');
    });

    it('应该正确处理多个位置参数和多个关键字参数', () => {
      const result = generator.generateExecutionCode(
        'def func(a, b, x:, y:); end',
        'func',
        [1, 2],
        { x: 10, y: 20 },
        defaultSignature
      );

      expect(result).toContain('func(1, 2, x: 10, y: 20)');
    });

    it('只有位置参数时不应该有尾随逗号', () => {
      const result = generator.generateExecutionCode(
        'def func(a, b); end',
        'func',
        [1, 2],
        {},
        defaultSignature
      );

      expect(result).toContain('func(1, 2)');
      expect(result).not.toContain('func(1, 2,');
    });

    it('只有关键字参数时不应该有前导逗号', () => {
      const result = generator.generateExecutionCode(
        'def func(x:); end',
        'func',
        [],
        { x: 1 },
        defaultSignature
      );

      expect(result).toContain('func(x: 1)');
      expect(result).not.toContain('func(, x: 1)');
    });
  });

  describe('无参数函数', () => {
    it('应该正确处理无参数的函数', () => {
      const result = generator.generateExecutionCode(
        'def get_value; 42; end',
        'get_value',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('get_value()');
    });
  });

  describe('包装器代码结构', () => {
    it('应该包含 begin-rescue 错误处理', () => {
      const result = generator.generateExecutionCode(
        'def func; end',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('begin');
      expect(result).toContain('rescue => e');
    });

    it('应该包含成功结果结构', () => {
      const result = generator.generateExecutionCode(
        'def func; end',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('success: true');
      expect(result).toContain('result:');
    });

    it('应该包含错误结果结构', () => {
      const result = generator.generateExecutionCode(
        'def func; end',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('success: false');
      expect(result).toContain('error:');
      expect(result).toContain('message:');
      expect(result).toContain('type:');
    });

    it('应该包含错误堆栈信息', () => {
      const result = generator.generateExecutionCode(
        'def func; end',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('e.backtrace');
    });

    it('应该使用 puts 输出结果', () => {
      const result = generator.generateExecutionCode(
        'def func; end',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('puts');
      expect(result).toContain('.to_json');
    });

    it('应该输出结果标记', () => {
      const result = generator.generateExecutionCode(
        'def func; end',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain(`puts "${RESULT_MARKERS.START}"`);
      expect(result).toContain(`puts "${RESULT_MARKERS.END}"`);
    });
  });

  describe('特殊情况', () => {
    it('应该处理空数组', () => {
      const result = generator.generateExecutionCode(
        'def func(arr); end',
        'func',
        [[]],
        {},
        defaultSignature
      );

      expect(result).toContain('func([])');
    });

    it('应该处理空对象', () => {
      const result = generator.generateExecutionCode(
        'def func(obj); end',
        'func',
        [{}],
        {},
        defaultSignature
      );

      expect(result).toContain('func({})');
    });

    it('应该处理包含换行符的字符串', () => {
      const result = generator.generateExecutionCode(
        'def func(s); end',
        'func',
        ['line1\nline2'],
        {},
        defaultSignature
      );

      expect(result).toContain('func("line1\\nline2")');
    });

    it('应该处理包含制表符的字符串', () => {
      const result = generator.generateExecutionCode(
        'def func(s); end',
        'func',
        ['col1\tcol2'],
        {},
        defaultSignature
      );

      expect(result).toContain('func("col1\\tcol2")');
    });

    it('应该处理 Unicode 字符串', () => {
      const result = generator.generateExecutionCode(
        'def func(s); end',
        'func',
        ['你好世界 🌍'],
        {},
        defaultSignature
      );

      expect(result).toContain('你好世界 🌍');
    });

    it('应该处理非常大的数字', () => {
      const result = generator.generateExecutionCode(
        'def func(n); end',
        'func',
        [Number.MAX_SAFE_INTEGER],
        {},
        defaultSignature
      );

      expect(result).toContain(String(Number.MAX_SAFE_INTEGER));
    });

    it('应该处理负数', () => {
      const result = generator.generateExecutionCode(
        'def func(n); end',
        'func',
        [-42],
        {},
        defaultSignature
      );

      expect(result).toContain('func(-42)');
    });

    it('应该处理科学计数法', () => {
      const result = generator.generateExecutionCode(
        'def func(n); end',
        'func',
        [1e10],
        {},
        defaultSignature
      );

      // JavaScript 会将 1e10 转换为 10000000000
      expect(result).toContain('10000000000');
    });
  });

  describe('与签名信息的交互', () => {
    it('应该忽略 hasOptionsParam（Ruby 不使用）', () => {
      const signature: InferredSignature = {
        ...defaultSignature,
        hasOptionsParam: true,  // Ruby 不关心这个
      };

      const result = generator.generateExecutionCode(
        'def func(a, opts = {}); end',
        'func',
        [1],
        { key: 'value' },
        signature
      );

      // Ruby 仍然使用关键字参数语法
      expect(result).toContain('func(1, key: "value")');
    });

    it('应该处理 variadic 签名', () => {
      const signature: InferredSignature = {
        ...defaultSignature,
        variadic: true,
        params: [{ name: 'args', required: false }],
      };

      const result = generator.generateExecutionCode(
        'def func(*args); end',
        'func',
        [1, 2, 3],
        {},
        signature
      );

      expect(result).toContain('func(1, 2, 3)');
    });

    it('应该处理 acceptsKwargs 签名', () => {
      const signature: InferredSignature = {
        ...defaultSignature,
        acceptsKwargs: true,
      };

      const result = generator.generateExecutionCode(
        'def func(**kwargs); end',
        'func',
        [],
        { a: 1, b: 2, c: 3 },
        signature
      );

      expect(result).toContain('a: 1');
      expect(result).toContain('b: 2');
      expect(result).toContain('c: 3');
    });
  });

  describe('复杂数据结构', () => {
    it('应该正确处理深度嵌套结构', () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const result = generator.generateExecutionCode(
        'def func(data); end',
        'func',
        [complexData],
        {},
        defaultSignature
      );

      expect(result).toContain('"level1"');
      expect(result).toContain('"level2"');
      expect(result).toContain('"level3"');
      expect(result).toContain('"value" => "deep"');
    });

    it('应该正确处理包含数组的对象', () => {
      const data = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      };

      const result = generator.generateExecutionCode(
        'def func(data); end',
        'func',
        [data],
        {},
        defaultSignature
      );

      expect(result).toContain('"users"');
      expect(result).toContain('"name" => "Alice"');
      expect(result).toContain('"name" => "Bob"');
    });

    it('应该正确处理包含对象的数组', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const result = generator.generateExecutionCode(
        'def func(items); end',
        'func',
        [data],
        {},
        defaultSignature
      );

      expect(result).toContain('"id" => 1');
      expect(result).toContain('"name" => "Item 1"');
      expect(result).toContain('"id" => 2');
      expect(result).toContain('"name" => "Item 2"');
    });
  });

  describe('边界情况', () => {
    it('应该处理只有一个字符的函数名', () => {
      const result = generator.generateExecutionCode(
        'def f; end',
        'f',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('f()');
    });

    it('应该处理带下划线的函数名', () => {
      const result = generator.generateExecutionCode(
        'def my_function_name; end',
        'my_function_name',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('my_function_name()');
    });

    it('应该处理带问号的函数名', () => {
      const result = generator.generateExecutionCode(
        'def valid?; end',
        'valid?',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('valid?()');
    });

    it('应该处理带感叹号的函数名', () => {
      const result = generator.generateExecutionCode(
        'def save!; end',
        'save!',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('save!()');
    });

    it('应该处理空字符串参数', () => {
      const result = generator.generateExecutionCode(
        'def func(s); end',
        'func',
        [''],
        {},
        defaultSignature
      );

      expect(result).toContain('func("")');
    });

    it('应该处理只有空格的字符串', () => {
      const result = generator.generateExecutionCode(
        'def func(s); end',
        'func',
        ['   '],
        {},
        defaultSignature
      );

      expect(result).toContain('func("   ")');
    });
  });
});
