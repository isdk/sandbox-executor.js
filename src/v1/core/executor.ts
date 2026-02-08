import { EventEmitter } from 'events-ex';
import {
  LanguageProvider,
  SandboxDriver,
  ExecutionRequest
} from '../types/provider';
import { ExecutionResult } from '../../types';
import { FSBuilder } from '../../fs/fs-builder'; // 复用现有的 FS 构建逻辑
import { SignatureInferenceEngine } from '../../inference/engine';
import { ArgumentNormalizer } from './normalizer';

export interface V1ExecutorOptions {
  providers: LanguageProvider[];
  drivers: SandboxDriver[];
  defaultDriver?: string;
}

export class SandboxExecutorV1 extends EventEmitter {
  private providers = new Map<string, LanguageProvider>();
  private drivers = new Map<string, SandboxDriver>();
  private inferenceEngine = new SignatureInferenceEngine();
  private defaultDriverId: string;

  constructor(options: V1ExecutorOptions) {
    super();
    options.providers.forEach(p => this.providers.set(p.id, p));
    options.drivers.forEach(d => this.drivers.set(d.id, d));
    this.defaultDriverId = options.defaultDriver || options.drivers[0]?.id;
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
    const bundle = await provider.generate(request, driver.capabilities, normalized, signature);

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

