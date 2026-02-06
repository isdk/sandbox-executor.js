import { CodeGenerator } from './base';
import type { InferredSignature } from '../inference/engine';
import type { InvokeOptions, ArgsMode } from '../types/request';
import { Serializer } from './utils/serializer';

export class JavaScriptGenerator extends CodeGenerator {
  readonly language = 'javascript'; // Use 'javascript' for template path
  readonly fileExtension = '.js';

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
    
    // Ensure user code has exports if it's using ESM
    let processedCode = userCode;
    if (!userCode.includes('export ') && !userCode.includes('module.exports')) {
      // Very simple heuristic: if it looks like a function definition, add export
      processedCode = userCode.replace(/function\s+(\w+)/g, 'export function $1');
      // Also for arrow functions assigned to const/let
      processedCode = processedCode.replace(/(const|let|var)\s+(\w+)\s*=\s*(async\s*)?\(/g, 'export $1 $2 = $3(');
    }

    if (argsMode === 'inline') {
      let wrapper = this.getTemplate('wrapper');
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
        [`main${this.fileExtension}`]: this.getTemplate('file'),
        [`user_code${this.fileExtension}`]: processedCode,
        [`.sandbox_request.json`]: requestData,
      };
    } else {
      return {
        [`main${this.fileExtension}`]: this.getTemplate('proxy'),
        [`user_code${this.fileExtension}`]: processedCode,
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
