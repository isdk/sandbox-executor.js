import { describe, it, expect } from 'vitest';
import { CProvider } from '../../../src/v1/languages/c';
import { InferredSignature } from '../../../src/inference/engine';
import { ExecutionRequest, DriverCapabilities, NormalizedArguments } from '../../../src/v1/types/provider';

describe('CProvider Dispatcher Generation', () => {
  const provider = new CProvider();

  it('应该能够为基本类型生成正确的 C 调度器代码', async () => {
    const signature: InferredSignature = {
      code: 'double add(double a, double b) { return a + b; }',
      functionName: 'add',
      language: 'c',
      input: [
        { name: 'a', type: 'number' },
        { name: 'b', type: 'number' }
      ],
      returnType: 'double'
    };

    // 访问 protected 方法需要一点技巧，或者我们可以测试 generate 的产物
    // 这里我们直接测试 generateDispatcher (如果它是 protected，我们可以临时把它改为 public 或用 any 访问)
    const dispatcher = (provider as any).generateDispatcher('add', signature);

    expect(dispatcher).toContain('cJSON_GetArrayItem(args, 0)->valuedouble');
    expect(dispatcher).toContain('cJSON_GetArrayItem(args, 1)->valuedouble');
    expect(dispatcher).toContain('add(arg_0, arg_1)');
    expect(dispatcher).toContain('cJSON_CreateNumber(add(arg_0, arg_1))');
  });

  it('应该能处理字符串类型参数', () => {
    const signature: InferredSignature = {
      code: 'int str_len(const char* s) { return strlen(s); }',
      functionName: 'str_len',
      language: 'c',
      input: [
        { name: 's', type: 'string' }
      ],
      returnType: 'int'
    };

    const dispatcher = (provider as any).generateDispatcher('str_len', signature);

    expect(dispatcher).toContain('const char* arg_0 = cJSON_GetArrayItem(args, 0)->valuestring;');
    expect(dispatcher).toContain('str_len(arg_0)');
  });

  it('应该能处理布尔类型', () => {
    const signature: InferredSignature = {
      code: 'bool logical_not(bool b) { return !b; }',
      functionName: 'logical_not',
      language: 'c',
      input: [
        { name: 'b', type: 'boolean' }
      ],
      returnType: 'bool'
    };

    const dispatcher = (provider as any).generateDispatcher('logical_not', signature);

    expect(dispatcher).toContain('bool arg_0 = cJSON_GetArrayItem(args, 0)->type == cJSON_True;');
    expect(dispatcher).toContain('cJSON_CreateBool(logical_not(arg_0))');
  });

  it('应该能处理 void 返回值', () => {
    const signature: InferredSignature = {
      code: 'void nop() {}',
      functionName: 'nop',
      language: 'c',
      input: [],
      returnType: 'void'
    };

    const dispatcher = (provider as any).generateDispatcher('nop', signature);

    expect(dispatcher).toContain('nop();');
    expect(dispatcher).toContain('cJSON_AddStringToObject(data, "result", "void");');
  });
});
