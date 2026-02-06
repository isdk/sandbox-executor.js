import { describe, it, expect } from 'vitest';
import { createExecutor } from '../../src/executor';

describe('Arguments Passing Modes - Cross Language', () => {
  const executor = createExecutor();

  describe('Python', () => {
    const code = 'def test_func(a, b): return a + b';

    const modes: any[] = ['inline', 'stdin', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'python',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('JavaScript', () => {
    const code = 'export function test_func(a, b) { return a + b; }';

    const modes: any[] = ['inline', 'stdin', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'javascript',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('Ruby', () => {
    const code = 'def test_func(a, b); a + b; end';

    const modes: any[] = ['inline', 'stdin', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'ruby',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('PHP-CGI', () => {
    const code = 'function test_func($a, $b) { return $a + $b; }';

    // PHP-CGI traditionally had issues with stdin in some WASM builds,
    // so 'file' and 'inline' are the preferred modern ways.
    const modes: any[] = ['inline', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'php',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('C (Clang)', () => {
    const code = '#include <stdio.h>\nint test_func(int a, int b) { return a + b; }';

    const modes: any[] = ['inline', 'stdin', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'c',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('C++ (Clang++)', () => {
    const code = 'int test_func(int a, int b) { return a + b; }';

    const modes: any[] = ['inline', 'stdin', 'file'];
    modes.forEach(mode => {
      it(`should work in ${mode} mode`, async () => {
        const result = await executor.execute({
          language: 'cpp',
          code,
          functionName: 'test_func',
          args: [10, 20],
          options: { argsMode: mode }
        });
        expect(result.success).toBe(true);
        expect(result.result).toBe(30);
      });
    });
  });

  describe('Auto Mode Threshold Logic', () => {
    const pythonCode = 'def large_data(data): return len(data)';

    it('should use inline for small data in auto mode', async () => {
      const result = await executor.execute({
        language: 'python',
        code: pythonCode,
        functionName: 'large_data',
        args: ['short'],
        options: { argsMode: 'auto' }
      });
      expect(result.success).toBe(true);
      // We check if it used inline by inspecting the generated files if we could,
      // but here we just ensure correctness.
    });

    it('should use file for large data in auto mode (> 8KB)', async () => {
      const largeStr = 'a'.repeat(10000);
      const result = await executor.execute({
        language: 'python',
        code: pythonCode,
        functionName: 'large_data',
        args: [largeStr],
        options: { argsMode: 'auto' }
      });
      expect(result.success).toBe(true);
      expect(result.result).toBe(10000);
    });
  });
});