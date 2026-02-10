import { describe, it, expect } from 'vitest';
import { SignatureInferenceEngine } from '../../src/inference/engine';

describe('SignatureInferenceEngine - Detection and Body Mode', () => {
  const engine = new SignatureInferenceEngine();

  describe('Python Detection', () => {
    it('should detect a unique function', () => {
      const code = 'def hello(): return "world"';
      const result = engine.resolve(code, undefined, 'python');
      expect(result.functionName).toBe('hello');
      expect(result.source).toBe('inferred');
    });

    it('should filter out private functions and detect unique public function', () => {
      const code = `
def _private(): pass
def public_func(): return "hello"
`;
      const result = engine.resolve(code, undefined, 'python');
      expect(result.functionName).toBe('public_func');
    });

    it('should throw error when multiple public functions exist', () => {
      const code = `
def func1(): pass
def func2(): pass
`;
      expect(() => engine.resolve(code, undefined, 'python')).toThrow(/Multiple functions detected/);
    });

    it('should enter Body Mode when no functions are detected', () => {
      const code = `print("hello")
return 1 + 1`;
      const result = engine.resolve(code, undefined, 'python');
      expect(result.functionName).toBe('__anonymous_wrapper__');
      expect(result.code).toContain('def __anonymous_wrapper__(*args, **kwargs):');
      expect(result.code).toContain('    return 1 + 1');
    });

    it('should ignore nested functions', () => {
      const code = `
def outer():
    def inner():
        pass
    return inner()
`;
      const result = engine.resolve(code, undefined, 'python');
      expect(result.functionName).toBe('outer');
    });

    it('should ignore class methods', () => {
      const code = `
class MyClass:
    def method(self):
        pass

def top_level():
    pass
`;
      const result = engine.resolve(code, undefined, 'python');
      expect(result.functionName).toBe('top_level');
    });

    it('should handle functions with decorators', () => {
      const code = `
@decorator
def decorated_func(a, b):
    return a + b
`;
      const result = engine.resolve(code, undefined, 'python');
      expect(result.functionName).toBe('decorated_func');
    });
  });

  describe('JavaScript Detection', () => {
    it('should detect a unique function declaration', () => {
      const code = 'function greet() { return "hi"; }';
      const result = engine.resolve(code, undefined, 'javascript');
      expect(result.functionName).toBe('greet');
    });

    it('should detect export default function', () => {
      const code = 'export default function main() {}';
      const result = engine.resolve(code, undefined, 'javascript');
      expect(result.functionName).toBe('main');
    });

    it('should detect named export function', () => {
      const code = 'export function run() {}';
      const result = engine.resolve(code, undefined, 'javascript');
      expect(result.functionName).toBe('run');
    });

    it('should detect a unique arrow function', () => {
      const code = 'const myFunc = () => "test"';
      const result = engine.resolve(code, undefined, 'javascript');
      expect(result.functionName).toBe('myFunc');
    });

    it('should enter Body Mode for JS', () => {
      const code = '// some comment\nconst a = 1; return a + 1;';
      const result = engine.resolve(code, undefined, 'javascript');
      expect(result.functionName).toBe('__anonymous_wrapper__');
      expect(result.code).toContain('async function __anonymous_wrapper__(...args)');
    });
  });

  describe('Ruby & PHP Detection', () => {
    it('should detect Ruby function', () => {
      const code = 'def ruby_func(a); a; end';
      const result = engine.resolve(code, undefined, 'ruby');
      expect(result.functionName).toBe('ruby_func');
    });

    it('should detect PHP function', () => {
      const code = 'function php_func($a) { return $a; }';
      const result = engine.resolve(code, undefined, 'php');
      expect(result.functionName).toBe('php_func');
    });

    it('should wrap Body Mode for Ruby', () => {
      const code = 'a = 1\na + 1';
      const result = engine.resolve(code, undefined, 'ruby');
      expect(result.functionName).toBe('__anonymous_wrapper__');
      expect(result.code).toContain('def __anonymous_wrapper__(*args)');
    });
  });

  describe('C/C++ Detection and Body Mode', () => {
    it('should detect unique C function', () => {
      const code = 'int add(int a, int b) { return a + b; }';
      const result = engine.resolve(code, undefined, 'c');
      expect(result.functionName).toBe('add');
    });

    it('should wrap as body in C with schema', () => {
      const code = 'return a + b;';
      const schema = {
        input: { a: { type: 'number' }, b: { type: 'number' } },
        output: { type: 'number' }
      };
      const result = engine.resolve(code, undefined, 'c', schema as any);
      expect(result.functionName).toBe('__anonymous_wrapper__');
      expect(result.code).toContain('int __anonymous_wrapper__()');
    });
  });
});
