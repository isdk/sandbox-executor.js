import { SandboxLinkMessage } from './protocol';
import { FunctionCallRequest as RootExecutionRequest, ExecutionResult, WASIFS } from '../../types';
import { InferredSignature } from '../../inference/engine';

/**
 * 驱动能力声明
 */
export interface DriverCapabilities {
  transports: {
    fd: boolean;      // 是否支持文件描述符 (如 FD 3)
    ipc: boolean;     // 是否支持 IPC 通道
    stdio: boolean;   // 是否支持标准输入输出
  };
  persistent: boolean; // 是否支持持久运行 (会话模式)
  features: {
    network: boolean;
    fs: 'virtual' | 'native' | 'none';
  };
}

/**
 * 待执行的包 (LanguageProvider 生成)
 */
export interface ExecutionBundle {
  entryPoint: string;
  files: WASIFS;
  envs?: Record<string, string>;
  stdin?: string | Uint8Array;
  timeout?: number; // Timeout in seconds
}

/**
 * 驱动返回的原始输出 (SandboxDriver 返回)
 */
export interface RawOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  resultData?: string; // 专门从 FD 3 或其他隔离通道获取的数据
  fs?: WASIFS;
}

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
export interface ExecutionRequest extends Omit<RootExecutionRequest, 'language' | 'args'> {
  language?: RootExecutionRequest['language'];
  args?: any[] | Record<string, any>;
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
  ): Promise<ExecutionBundle>;

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
   * 执行 Bundle 并返回原始输出 (单次执行模式)
   */
  run(bundle: ExecutionBundle): Promise<RawOutput>;

  /**
   * 创建一个持久化会话 (常驻模式)
   */
  createSession?(bundle: ExecutionBundle): Promise<SandboxSession>;
}

/**
 * 持久化会话接口
 */
export interface SandboxSession {
  /**
   * 发送指令或调用到会话中
   */
  send(message: SandboxLinkMessage): Promise<void>;

  /**
   * 监听来自会话的消息
   */
  onMessage(handler: (message: SandboxLinkMessage) => void): void;

  /**
   * 销毁会话
   */
  destroy(): Promise<void>;

  /**
   * 获取当前会话的状态
   */
  readonly isAlive: boolean;
}
