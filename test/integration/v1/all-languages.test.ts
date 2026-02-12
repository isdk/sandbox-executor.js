import { describe, it, expect, beforeAll } from 'vitest';
import { SandboxExecutorV1 } from '../../../src/v1/core/executor';
import { PythonProvider } from '../../../src/v1/languages/python';
import { JavaScriptProvider } from '../../../src/v1/languages/javascript';
import { CProvider, CppProvider } from '../../../src/v1/languages/c';
import { RubyProvider } from '../../../src/v1/languages/ruby';
import { PHPCgiProvider } from '../../../src/v1/languages/php-cgi';
import { RunnoDriver } from '../../../src/v1/drivers/runno';
import { TemplateManager } from '../../../src/v1/core/template-manager';

describe('v1 多语言集成测试 (Runno Driver)', () => {
  let executor: SandboxExecutorV1;

  beforeAll(() => {
    const tm = new TemplateManager();
    const providers = [
      new PythonProvider(tm),
      new JavaScriptProvider(tm),
      new CProvider(tm),
      new CppProvider(tm),
      new RubyProvider(tm),
      new PHPCgiProvider(tm)
    ];
    const runnoDriver = new RunnoDriver();
    executor = new SandboxExecutorV1({
      providers,
      drivers: [runnoDriver]
    });
  });

  it('JavaScript: 应该能成功执行并返回结果', async () => {
    const code = `
export function multiply(a, b) {
    return a * b;
}
`;
    const result = await executor.execute('javascript', {
      code,
      functionName: 'multiply',
      args: [6, 7]
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe(42);
  });

  it('C: 应该能成功编译并执行', async () => {
    const code = `
#include <stdio.h>
double add_floats(double a, double b) {
    return a + b;
}
`;
    const result = await executor.execute('c', {
      code,
      functionName: 'add_floats',
      args: [1.5, 2.5]
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe(4.0);
  });

  it('Cpp: 应该能支持 std::string 返回值', async () => {
    const code = `
#include <string>
std::string greet(const char* name) {
    return "Hello " + std::string(name) + "!";
}
`;
    const result = await executor.execute('cpp', {
      code,
      functionName: 'greet',
      args: ['World']
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe('Hello World!');
  });

  it('Ruby: 应该能正确执行并处理关键字参数', async () => {
    const code = `
def calculate_volume(length, width, height: 1)
  length * width * height
end
`;
    const result = await executor.execute('ruby', {
      code,
      functionName: 'calculate_volume',
      args: [10, 5],
      kwargs: { height: 2 }
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe(100);
  });

  it('PHP: 应该能成功执行 (通过注入的 Pseudo-stdin)', async () => {
    const code = `
function power($base, $exp) {
    return pow($base, $exp);
}
`;
    const result = await executor.execute('php-cgi', {
      code,
      functionName: 'power',
      args: [2, 10]
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe(1024);
  });
});
