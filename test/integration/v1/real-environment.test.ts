import { describe, it, expect } from 'vitest';
import { SandboxExecutorV1 } from '../../../src/v1/core/executor';
import { PythonProvider } from '../../../src/v1/languages/python';
import { RunnoDriver } from '../../../src/v1/drivers/runno';

describe('v1 真实环境集成测试 (Runno + Python)', () => {
  const pythonProvider = new PythonProvider();
  const runnoDriver = new RunnoDriver();
  const executor = new SandboxExecutorV1({
    providers: [pythonProvider],
    drivers: [runnoDriver]
  });

  it('应该能成功执行 Python 函数并返回结果', async () => {
    const code = `
def add(a, b):
    return a + b
`;
    const result = await executor.execute('python', {
      code,
      functionName: 'add',
      args: [10, 20],
      kwargs: {}
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe(30);
  });

  it('应该能捕获用户在代码中的打印输出 (Log Streaming)', async () => {
    const code = `
def greet(name):
    print(f"Hello internal: {name}")
    return f"Hi {name}"
`;
    const result = await executor.execute('python', {
      code,
      functionName: 'greet',
      args: ['Alice'],
      kwargs: {}
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe('Hi Alice');

    // 验证 stdout 中包含了协议包装后的日志
    // 注意：目前 RunnoDriver 是结束后统一返回 stdout
    expect(result.stdout).toContain('{"ver": "1.0", "id": "log-evt", "type": "log", "stream": "stdout", "content": "Hello internal: Alice"}');
  });

  it('应该能正确处理 Python 内部异常', async () => {
    const code = `
def divide(a, b):
    return a / b
`;
    const result = await executor.execute('python', {
      code,
      functionName: 'divide',
      args: [1, 0],
      kwargs: {}
    });

    expect(result.success).toBe(false);
    expect(result.error?.type).toBe('ZeroDivisionError');
    expect(result.error?.message).toContain('division by zero');
  });

  it('应该支持智能参数归一化 (通过签名填补孔洞)', async () => {
    const code = `
def complex_math(a, b, c=10):
    return (a + b) * c
`;
    // 故意传入混合格式：a 通过索引，b 通过名称，c 默认
    const result = await executor.execute('python', {
      code,
      functionName: 'complex_math',
      args: {
        "a": { "index": 0, "value": 5 },
        "b": 5
      }
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe(100); // (5 + 5) * 10
  });
});
