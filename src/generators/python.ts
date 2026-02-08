import { CodeGenerator, type GenerationOptions } from './base';
import type { ArgsMode } from '../types/request';
import { Serializer } from './utils/serializer';

export class PythonGenerator extends CodeGenerator {
  readonly language = 'python';
  readonly fileExtension = '.py';

  supportedArgsModes(): ArgsMode[] {
    return ['stdin', 'inline', 'file'];
  }

  generateFiles(
    options: GenerationOptions
  ): Record<string, string | Uint8Array> {
    const { code: userCode, functionName, args, kwargs, argsMode } = options;
    
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
    options: GenerationOptions
  ): string | Uint8Array {
    const { functionName, args, kwargs, argsMode } = options;
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
