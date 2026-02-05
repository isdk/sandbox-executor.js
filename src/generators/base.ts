import type { InferredSignature } from '../inference/engine';

export const RESULT_MARKERS = {
  START: '__SANDBOX_RESULT_START__',
  END: '__SANDBOX_RESULT_END__',
} as const;

export abstract class CodeGenerator {
  abstract readonly language: string;
  abstract readonly fileExtension: string;

  generateExecutionCode(
    userCode: string,
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string {
    const wrapper = this.generateWrapper(functionName, args, kwargs, signature);
    return `${userCode}\n\n${wrapper}`;
  }

  protected abstract generateWrapper(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string;

  protected abstract serialize(value: unknown): string;
}
