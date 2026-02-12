import { describe, it, expect, beforeAll } from 'vitest';
import { SandboxExecutorV1 } from '../../../src/v1/core/executor';
import { PythonProvider } from '../../../src/v1/languages/python';
import { JavaScriptProvider } from '../../../src/v1/languages/javascript';
import { CProvider, CppProvider } from '../../../src/v1/languages/c';
import { RubyProvider } from '../../../src/v1/languages/ruby';
import { RunnoDriver } from '../../../src/v1/drivers/runno';
import { TemplateManager } from '../../../src/v1/core/template-manager';

describe('v1 进阶集成测试场景', () => {
  let executor: SandboxExecutorV1;

  beforeAll(() => {
    const tm = new TemplateManager();
    const providers = [
      new PythonProvider(tm),
      new JavaScriptProvider(tm),
      new CProvider(tm),
      new CppProvider(tm),
      new RubyProvider(tm)
    ];
    const runnoDriver = new RunnoDriver();
    executor = new SandboxExecutorV1({
      providers,
      drivers: [runnoDriver]
    });
  });

  describe('日志拦截 (Log Interception)', () => {
    it('JS: 应该能捕获 console.log 并转换为协议消息', async () => {
      const code = `
export function logTest(name) {
    console.log("Input name:", name);
    return "Done";
}
`;
      const result = await executor.execute('javascript', {
        code,
        functionName: 'logTest',
        args: ['Gemini']
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('"type":"log"');
      expect(result.stdout).toContain('Input name: Gemini');
    });

    it('Ruby: 应该能捕获 puts 并转换为协议消息', async () => {
      const code = `
def log_test(val)
  puts "Ruby log: #{val}"
  val * 2
end
`;
      const result = await executor.execute('ruby', {
        code,
        functionName: 'log_test',
        args: [21]
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('"type":"log"');
      expect(result.stdout).toContain('Ruby log: 21');
    });
  });

  describe('复杂数据结构 (Complex Data)', () => {
    it('Python: 应该能正确处理嵌套的 Dictionary 和 List', async () => {
      const code = `
def process_data(data):
    data['received'] = True
    data['count'] = len(data.get('items', []))
    return data
`;
      const input = {
        items: [1, 2, 3],
        meta: { user: 'admin' }
      };
      const result = await executor.execute('python', {
        code,
        functionName: 'process_data',
        args: [input]
      });

      expect(result.success).toBe(true);
      expect(result.result.received).toBe(true);
      expect(result.result.count).toBe(3);
      expect(result.result.meta.user).toBe('admin');
    });
  });

  describe('错误处理 (Error Handling)', () => {
    it('C: 调用不存在的函数应该报错', async () => {
      const code = `int real_func() { return 1; }`;
      // 故意调用不存在的 wrong_func
      const result = await executor.execute('c', {
        code,
        functionName: 'wrong_func',
        args: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toHaveProperty('type', 'RuntimeError')
      // TODO: 被runno 拦截后，它没有转发
      // expect(result.stderr).toContain("wrong_func");
    });

    it('JS: 语法错误应该被捕获', async () => {
      const code = `export function broken() {  if (true) {  `; // 缺少闭合括号
      const result = await executor.execute('javascript', {
        code,
        functionName: 'broken'
      });

      expect(result.success).toBe(false);
      // QuickJS 的错误通常在加载阶段抛出
      expect(result.stderr + result.stdout).toContain('SyntaxError');
    });
  });

  describe('多函数探测 (Multi-function Detection)', () => {
    it('Ruby: 应该能根据 functionName 从多个函数中选择正确的一个', async () => {
      const code = `
def first_func; "first"; end
def second_func; "second"; end
`;
      const result = await executor.execute('ruby', {
        code,
        functionName: 'second_func'
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('second');
    });
  });
});
