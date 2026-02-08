import { CodeGenerator, type GenerationOptions } from './base';
import type { ArgsMode } from '../types/request';
import { Serializer } from './utils/serializer';

export class JavaScriptGenerator extends CodeGenerator {
  readonly language = 'javascript'; // Use 'javascript' for template path
  readonly fileExtension = '.js';

  supportedArgsModes(): ArgsMode[] {
    return ['stdin', 'inline', 'file'];
  }

  async generateFiles(
    options: GenerationOptions
  ): Promise<Record<string, string | Uint8Array>> {
    const { code: userCode, functionName, args, kwargs, argsMode } = options;
    
    // Ensure user code has exports if it's using ESM
    let processedCode = userCode;
    if (!userCode.includes('export ') && !userCode.includes('module.exports')) {
      // Very simple heuristic: if it looks like a function definition, add export
      processedCode = userCode.replace(/function\s+(\w+)/g, 'export function $1');
      // Also for arrow functions assigned to const/let
      processedCode = processedCode.replace(/(const|let|var)\s+(\w+)\s*=\s*(async\s*)?\(/g, 'export $1 $2 = $3(');
    }

    if (argsMode === 'inline') {
      let wrapper = await this.getTemplateAsync('wrapper');
      wrapper = wrapper
        .replace('{{FUNCTION_NAME}}', functionName)
        .replace('{{ARGS}}', this.serialize(args))
        .replace('{{KWARGS}}', this.serialize(kwargs));

      return {
        [`main${this.fileExtension}`]: wrapper,
        [`user_code${this.fileExtension}`]: processedCode,
      };
    } else if (argsMode === 'file') {
      const requestData = JSON.stringify({
        functionName,
        args,
        kwargs,
        filePath: `./user_code${this.fileExtension}`
      });
      return {
        [`main${this.fileExtension}`]: await this.getTemplateAsync('file'),
        [`user_code${this.fileExtension}`]: processedCode,
        [`.sandbox_request.json`]: requestData,
      };
    } else {
      return {
        [`main${this.fileExtension}`]: await this.getTemplateAsync('proxy'),
        [`user_code${this.fileExtension}`]: processedCode,
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
      filePath: `./user_code${this.fileExtension}`
    });
  }

  protected serialize(value: unknown): string {
    return Serializer.javascript(value);
  }

  protected generateWrapper(): string {
    return '';
  }
}
