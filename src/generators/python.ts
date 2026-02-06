import { CodeGenerator } from './base';
import type { InferredSignature } from '../inference/engine';
import type { InvokeOptions, ArgsMode } from '../types/request';
import { Serializer } from './utils/serializer';

export class PythonGenerator extends CodeGenerator {
  readonly language = 'python';
  readonly fileExtension = '.py';

  supportedArgsModes(): ArgsMode[] {
    return ['stdin', 'inline', 'file'];
  }

  generateFiles(
    userCode: string,
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    _signature: InferredSignature,
    options?: InvokeOptions
  ): Record<string, string | Uint8Array> {
    const argsMode = options?.argsMode || 'stdin';
    
    if (argsMode === 'inline') {
      let wrapper = this.getTemplate('wrapper');
      wrapper = wrapper
        .replace('{{FUNCTION_NAME}}', functionName)
        .replace('{{ARGS}}', this.serialize(args))
        .replace('{{KWARGS}}', this.serialize(kwargs));
      
      return {
        [`main${this.fileExtension}`]: wrapper,
        [`user_code${this.fileExtension}`]: userCode,
      };
    } else if (argsMode === 'file') {
      const requestData = JSON.stringify({
        functionName,
        args,
        kwargs,
        filePath: `/workspace/user_code${this.fileExtension}`
      });
      
      return {
        [`main${this.fileExtension}`]: this.getTemplate('file'),
        [`user_code${this.fileExtension}`]: userCode,
        [`.sandbox_request.json`]: requestData,
      };
    } else {
      // Default to proxy/stdin mode
      return {
        [`main${this.fileExtension}`]: this.getTemplate('proxy'),
        [`user_code${this.fileExtension}`]: userCode,
      };
    }
  }

  generateStdin(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    options?: InvokeOptions
  ): string | Uint8Array {
    const argsMode = options?.argsMode || 'stdin';
    if (argsMode !== 'stdin') return '';

    return this.buildAtomicStdin({
      functionName,
      args,
      kwargs,
      filePath: `/workspace/user_code${this.fileExtension}`
    });
  }

  protected serialize(value: unknown): string {
    return Serializer.python(value);
  }

  /**
   * @deprecated No longer used with template-based generation
   */
  protected generateWrapper(): string {
    return '';
  }
}
