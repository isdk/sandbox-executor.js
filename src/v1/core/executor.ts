import { EventEmitter } from 'events-ex';
import {
  LanguageProvider,
  SandboxDriver,
  ExecutionRequest,
  SandboxSession
} from '../types/provider';
import { ExecutionResult } from '../../types';
import { FSBuilder } from '../../fs/fs-builder'; // 复用现有的 FS 构建逻辑
import { SignatureInferenceEngine } from '../../inference/engine';
import { ArgumentNormalizer } from './normalizer';
import { SandboxLinkMessage, ResultMessage } from '../types/protocol';

export interface V1ExecutorOptions {
  providers: LanguageProvider[];
  drivers: SandboxDriver[];
  defaultDriver?: string;
}

export class SandboxExecutorV1 extends EventEmitter {
  private providers = new Map<string, LanguageProvider>();
  private drivers = new Map<string, SandboxDriver>();
  private activeSessions = new Map<string, SandboxSession>();
  private inferenceEngine = new SignatureInferenceEngine();
  private defaultDriverId: string;

  constructor(options: V1ExecutorOptions) {
    super();
    options.providers.forEach(p => this.providers.set(p.id, p));
    options.drivers.forEach(d => this.drivers.set(d.id, d));
    this.defaultDriverId = options.defaultDriver || options.drivers[0]?.id;
  }

  /**
   * 打开一个持久化会话
   */
  async openSession(
    languageId: string,
    initialRequest: ExecutionRequest,
    driverId?: string
  ): Promise<string> {
    const provider = this.providers.get(languageId);
    const driver = this.drivers.get(driverId || this.defaultDriverId);

    if (!provider || !driver) {
      throw new Error(`Provider or Driver not found`);
    }

    if (!driver.capabilities.persistent || !driver.createSession) {
      throw new Error(`Driver ${driver.id} does not support persistent sessions`);
    }

    // 1. 生成初始 Bundle (用于启动环境和加载用户代码)
    const bundle = await provider.generate(initialRequest, driver.capabilities, { args: [], kwargs: {} });

    // 2. 创建会话
    const session = await driver.createSession(bundle);
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    this.activeSessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * 在现有会话中执行代码
   */
  async executeInSession<T = any>(
    sessionId: string,
    languageId: string,
    method: string,
    args: any[] = [],
    kwargs: Record<string, any> = {}
  ): Promise<T> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const provider = this.providers.get(languageId);
    if (!provider) throw new Error(`Provider not found: ${languageId}`);

    return new Promise((resolve, reject) => {
      const callId = `call-${Date.now()}`;
      
      const handler = (msg: SandboxLinkMessage) => {
        if (msg.type === 'result' && msg.id === callId) {
          if (msg.status === 'ok') {
            resolve(msg.data.result);
          } else {
            reject(new Error(msg.data.error?.message || 'Execution failed'));
          }
        }
      };

      session.onMessage(handler);

      session.send({
        ver: '1.0',
        id: callId,
        type: 'call',
        method: method,
        params: { args, kwargs }
      }).catch(reject);
    });
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      await session.destroy();
      this.activeSessions.delete(sessionId);
    }
  }

  async execute<T = any>(
    languageId: string,
    request: ExecutionRequest,
    driverId?: string
  ): Promise<ExecutionResult<T>> {
    const provider = this.providers.get(languageId);
    if (!provider) throw new Error(`Provider not found: ${languageId}`);

    const driver = this.drivers.get(driverId || this.defaultDriverId);
    if (!driver) throw new Error(`Driver not found: ${driverId || this.defaultDriverId}`);

    // 1. 推断签名 (Core 核心能力)
    const signature = this.inferenceEngine.resolve(
      request.code,
      request.functionName,
      languageId as any,
      request.options?.schema
    );

    // 2. 归一化参数 (Core 核心能力)
    const normalized = ArgumentNormalizer.normalize(request, signature);

    // 3. 生成执行包 (传入归一化后的数据)
    // 使用 signature 中确定的 code 和 functionName 覆盖原始请求
    const effectiveRequest: ExecutionRequest = {
      ...request,
      language: languageId as any,
      code: signature.code,
      functionName: signature.functionName,
    };
    const bundle = await provider.generate(effectiveRequest, driver.capabilities, normalized, signature);
    bundle.timeout = request.timeout ?? request.options?.timeout;

    // 4. 增强文件系统
    if (request.options?.files) {
      const workdir = request.options?.workdir || '/workspace';
      const builder = new FSBuilder({ workdir });
      builder.addFiles(request.options.files);
      Object.assign(bundle.files, builder.build());
    }

    // 5. 驱动执行
    const rawOutput = await driver.run(bundle);

    // 6. 解析结果
    return provider.parseResult<T>(rawOutput);
  }
}

