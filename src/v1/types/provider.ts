import { SandboxLinkMessage } from './protocol';
import { ExecutionRequest as RootExecutionRequest, ExecutionResult, WASIFS } from '../../types';
import { InferredSignature } from '../../inference/engine';

/**
 * 归一化后的参数
 */
export interface NormalizedArguments {
  args: any[];
  kwargs: Record<string, any>;
}

/**
 * 执行请求 (核心层发给 LanguageProvider)
 */
export interface ExecutionRequest extends RootExecutionRequest {
  args: any[] | Record<string, any>;
}

/**
 * 语言插件接口
 */
export interface LanguageProvider {
  id: string;
  fileExtension: string;

  /**
   * 根据驱动能力生成执行包
   * @param request 原始请求
   * @param caps 驱动能力
   * @param normalized 归一化后的参数 (由 Core 处理)
   * @param signature 推断出的签名 (由 Core 处理)
   */
  generate(
    request: ExecutionRequest,
    caps: DriverCapabilities,
    normalized: NormalizedArguments,
    signature?: InferredSignature
  ): ExecutionBundle;

  /**
   * 解析执行结果
   */
  parseResult<T>(output: RawOutput): ExecutionResult<T>;
}

/**
 * 驱动插件接口
 */
export interface SandboxDriver {
  id: string;
  capabilities: DriverCapabilities;

  /**
   * 执行 Bundle 并返回原始输出
   */
  run(bundle: ExecutionBundle): Promise<RawOutput>;
}
