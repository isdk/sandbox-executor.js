import { describe, it, expect, beforeEach } from 'vitest';
import { createExecutor } from '../../src/executor';

describe('Real Environment Integration', () => {
  const executor = createExecutor();

  describe('Python Execution', () => {
    it('should execute python code and return result', async () => {
      const result = await executor.execute({
        language: 'python',
        code: 'def add(a, b): return a + b',
        functionName: 'add',
        args: [10, 20],
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe(30);
    });

    it('should handle python errors', async () => {
      const result = await executor.execute({
        language: 'python',
        code: 'def fail(): return 1 / 0',
        functionName: 'fail',
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('ZeroDivisionError');
    });
  });

  describe('JavaScript (QuickJS) Execution', () => {
    it('should execute javascript code and return result', async () => {
      const result = await executor.execute({
        language: 'quickjs',
        code: 'function multiply(a, b) { return a * b; }',
        functionName: 'multiply',
        args: [6, 7],
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
    });

    it('should handle js aliases (js/javascript)', async () => {
      const result1 = await executor.execute({
        language: 'js',
        code: 'function test() { return "js"; }',
        functionName: 'test',
      });
      expect(result1.success).toBe(true);
      expect(result1.result).toBe('js');

      const result2 = await executor.execute({
        language: 'javascript',
        code: 'function test() { return "javascript"; }',
        functionName: 'test',
      });
      expect(result2.success).toBe(true);
      expect(result2.result).toBe('javascript');
    });
  });

  describe('PHP Execution', () => {
    it('should execute php code and return result', async () => {
      const result = await executor.execute({
        language: 'php',
        code: '<?php function greet($name) { return "Hello, $name"; }',
        functionName: 'greet',
        args: ['World'],
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('Hello, World');
    });

    it('should execute php code without <?php tag', async () => {
      const result = await executor.execute({
        language: 'php',
        code: 'function add($a, $b) { return $a + $b; }',
        functionName: 'add',
        args: [1, 2],
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe(3);
    });

    it('should handle php variadic arguments', async () => {
      const result = await executor.execute({
        language: 'php',
        code: '<?php function sum(...$numbers) { return array_sum($numbers); }',
        functionName: 'sum',
        args: [1, 2, 3, 4, 5],
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });
  });

  describe('C Execution', () => {
    it('should execute C code and return result', async () => {
      const result = await executor.execute({
        language: 'c',
        code: `
#include <stdio.h>
int add(int a, int b) {
    return a + b;
}
`,
        functionName: 'add',
        args: [10, 20],
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe(30);
    });

    it('should handle C return types (float)', async () => {
      const result = await executor.execute({
        language: 'c',
        code: `
float multiply(float a, float b) {
    return a * b;
}
`,
        functionName: 'multiply',
        args: [2.5, 4.0],
      });

      expect(result.success).toBe(true);
      expect(Number(result.result)).toBeCloseTo(10.0);
    });
  });

  describe('C++ Execution', () => {
    it('should execute C++ code and return result', async () => {
      const result = await executor.execute({
        language: 'cpp',
        code: `
#include <iostream>
int fib(int n) {
    if (n <= 1) return n;
    return fib(n-1) + fib(n-2);
}
`,
        functionName: 'fib',
        args: [6],
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe(8);
    });

    it('should handle C++ strings', async () => {
      const result = await executor.execute({
        language: 'cpp',
        code: `
#include <string>
#include <iostream>
std::string greet(std::string name) {
    return "Hello " + name;
}
`,
        functionName: 'greet',
        args: ['World'],
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('Hello World');
    });
  });

  describe('File System Changes in Real Environment', () => {
    it('should track file creation in python', async () => {
      const result = await executor.execute({
        language: 'python',
        code: `
def create_file(content):
    with open('test.txt', 'w') as f:
        f.write(content)
    return True
`,
        functionName: 'create_file',
        args: ['hello from python'],
      });

      expect(result.success).toBe(true);
      expect(result.files?.created.length).toBeGreaterThan(0);
      const paths = result.files?.created.map(f => f.path);
      const file = result.files?.byPath('/test.txt');
      expect(file).toBeDefined();
      expect(new TextDecoder().decode(file?.content)).toBe('hello from python');
    });
  });
});
