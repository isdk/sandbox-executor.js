import { describe, it, expect } from 'vitest';
import { PHPGenerator } from '../../../src/generators';
import { InputProtocol } from '../../../src/types/request';
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

  describe('generateFiles', () => {
    it('应该生成包含 main.php 和 user_code.php 的文件映射', () => {
      const userCode = 'function add($a, $b) { return $a + $b; }';
      const files = generator.generateFiles(
        userCode,
        'add',
        [1, 2],
        {},
        defaultSignature
      );

      expect(files['main.php']).toBeDefined();
      expect(files['user_code.php']).toContain('<?php');
      expect(files['user_code.php']).toContain(userCode);
      
      const proxyCode = files['main.php'] as string;
      expect(proxyCode).toContain('<?php');
      expect(proxyCode).toContain('function execute_request($request)');
      expect(proxyCode).toContain('START_MARKER = "__SANDBOX_RESULT_START__"');
    });

    it('如果用户代码没有 <?php 标记，应该自动添加', () => {
      const userCode = 'echo "hello";';
      const files = generator.generateFiles(
        userCode,
        'test',
        [],
        {},
        defaultSignature
      );
      expect(files['user_code.php'] as string).toMatch(/^<\?php/);
    });
  });

  describe('generateStdin', () => {
    it('应该返回空字符串 (PHP 使用 pseudo-stdin)', () => {
      const functionName = 'func';
      const args = [1, 'test'];
      const kwargs = { key: 'val' };
      
      const stdin = generator.generateStdin(functionName, args, kwargs);
      expect(stdin).toBe('');
    });
  });

  describe('参数序列化 (内部使用)', () => {
    it('应该正确序列化关联数组', () => {
       // @ts-ignore - serialize is protected
      const result = generator.serialize({ a: 1, b: 'two' });
      expect(result).toBe('["a" => 1, "b" => "two"]');
    });

    it('应该正确序列化 null 为 null', () => {
       // @ts-ignore - serialize is protected
      expect(generator.serialize(null)).toBe('null');
    });
  });
});