import { describe, it, expect } from 'vitest';
import { PHPGenerator } from '../../../src/generators';
import { RESULT_MARKERS } from '../../../src/generators/base';
import type { InferredSignature } from '../../../src/inference/engine';

describe('PHPGenerator', () => {
  const generator = new PHPGenerator();

  const defaultSignature: InferredSignature = {
    params: [],
    variadic: true,
    acceptsKwargs: true,
    hasOptionsParam: false,
    source: 'convention',
  };

  describe('基本属性', () => {
    it('language 应该是 php', () => {
      expect(generator.language).toBe('php');
    });

    it('fileExtension 应该是 .php', () => {
      expect(generator.fileExtension).toBe('.php');
    });
  });

  describe('generateExecutionCode', () => {
    it('应该生成包含用户代码和包装器的完整代码', () => {
      const userCode = 'function add($a, $b) { return $a + $b; }';
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
        'function func(...$args) {}',
        'func',
        [1, 'hello', true, null],
        {},
        defaultSignature
      );

      expect(result).toContain('func(1, "hello", true, null)');
    });

    it('应该正确序列化关键字参数', () => {
      const result = generator.generateExecutionCode(
        'function func($name, $age, $active) {}',
        'func',
        [],
        { name: 'Alice', age: 30, active: true },
        defaultSignature
      );

      expect(result).toContain('name: "Alice"');
      expect(result).toContain('age: 30');
      expect(result).toContain('active: true');
    });

    it('应该正确序列化数组', () => {
      const result = generator.generateExecutionCode(
        'function func($arr) {}',
        'func',
        [[1, 2, 3]],
        {},
        defaultSignature
      );

      expect(result).toContain('[1, 2, 3]');
    });

    it('应该正确序列化对象为关联数组', () => {
      const result = generator.generateExecutionCode(
        'function func($obj) {}',
        'func',
        [{ key: 'value', nested: { a: 1 } }],
        {},
        defaultSignature
      );

      expect(result).toContain('"key" => "value"');
      expect(result).toContain('"nested" => ["a" => 1]');
    });

    it('应该处理 undefined 为 null', () => {
      const result = generator.generateExecutionCode(
        'function func($x) {}',
        'func',
        [undefined],
        {},
        defaultSignature
      );

      expect(result).toContain('func(null)');
    });
  });

  describe('包装器代码', () => {
    it('应该包含 try-catch 错误处理', () => {
      const result = generator.generateExecutionCode(
        'function func() {}',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('try {');
      expect(result).toContain('catch (Throwable $__e__)');
    });

    it('应该包含 JSON 序列化', () => {
      const result = generator.generateExecutionCode(
        'function func() {}',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('json_encode');
    });

    it('应该包含自定义序列化函数', () => {
      const result = generator.generateExecutionCode(
        'function func() {}',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain('__sandbox_serialize__');
    });

    it('应该输出结果标记', () => {
      const result = generator.generateExecutionCode(
        'function func() {}',
        'func',
        [],
        {},
        defaultSignature
      );

      expect(result).toContain(`echo "${RESULT_MARKERS.START}\\n"`);
      expect(result).toContain(`echo "\\n${RESULT_MARKERS.END}\\n"`);
    });
  });
});
