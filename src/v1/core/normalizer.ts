import { ExecutionRequest } from '../types/provider';
import { InferredSignature } from '../../inference/engine';

/**
 * 归一化后的参数结果
 */
export interface NormalizedArguments {
  args: any[];
  kwargs: Record<string, any>;
}

/**
 * 参数归一化器：负责将用户灵活的输入转换为语言包易于处理的标准格式。
 * 
 * 核心功能：
 * 1. 处理位置参数 (Array) 和命名参数 (Object)。
 * 2. 支持特殊格式：{ "paramName": { "index": 0, "value": 123 } }。
 * 3. 利用函数签名 (Signature) 智能填补 args 中的孔洞。
 */
export class ArgumentNormalizer {
  static normalize(request: ExecutionRequest, signature?: InferredSignature): NormalizedArguments {
    let args: any[] = [];
    let kwargs: Record<string, any> = {};
    const rawArgs = request.args;

    // 1. 初步拆分位置与命名参数
    if (Array.isArray(rawArgs)) {
      rawArgs.forEach((item, idx) => {
        if (this.isIndexedValue(item)) {
          args[item.index] = item.value;
        } else {
          args[idx] = item;
        }
      });
    } else if (rawArgs && typeof rawArgs === 'object') {
      for (const [key, item] of Object.entries(rawArgs)) {
        if (this.isIndexedValue(item)) {
          args[item.index] = item.value;
        } else {
          kwargs[key] = item;
        }
      }
    }

    // 兼容废弃的 kwargs 属性
    if ((request as any).kwargs) {
      Object.assign(kwargs, (request as any).kwargs);
    }

    // 2. 智能填补：利用签名信息将 kwargs 中的值映射到 args 数组的空位中
    if (signature && signature.input) {
      const inputSchema = signature.input;
      if (Array.isArray(inputSchema)) {
        // 数组格式签名
        inputSchema.forEach((schema, idx) => {
          if (args[idx] === undefined && schema.name && schema.name in kwargs) {
            args[idx] = kwargs[schema.name];
            delete kwargs[schema.name];
          }
        });
      } else {
        // 对象格式签名 Record<string, JsonSchema & { index?: number }>
        for (const [name, schema] of Object.entries(inputSchema)) {
          const idx = (schema as any).index;
          if (idx !== undefined && args[idx] === undefined && name in kwargs) {
            args[idx] = kwargs[name];
            delete kwargs[name];
          }
        }
      }
    }

    // 3. 转换为真正的数组（处理稀疏数组的空洞）
    args = Array.from(args);

    return { args, kwargs };
  }

  private static isIndexedValue(item: any): item is { index: number; value: any } {
    return item && typeof item === 'object' && 'index' in item && 'value' in item;
  }
}
