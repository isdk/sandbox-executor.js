import { CodeGenerator, type GenerationOptions } from './base';
import type { ArgsMode } from '../types/request';
import { Serializer } from './utils/serializer';

export class PHPCgiGenerator extends CodeGenerator {
  readonly language = 'php-cgi';
  readonly fileExtension = '.php';

  supportedArgsModes(): ArgsMode[] {
    return ['stdin', 'inline', 'file'];
  }

  generateFiles(
    options: GenerationOptions
  ): Record<string, string | Uint8Array> {
    const { code: userCode, functionName, args, kwargs, argsMode } = options;
    let code = userCode.trim();
    if (!code.startsWith('<?php')) {
      code = '<?php\n' + code;
    }

    if (argsMode === 'inline') {
      let wrapper = this.getTemplate('wrapper');
      wrapper = wrapper
        .replace('{{FUNCTION_NAME}}', functionName)
        .replace('{{ARGS}}', this.serialize(args))
        .replace('{{KWARGS}}', this.serialize(kwargs));

      return {
        [`main${this.fileExtension}`]: wrapper,
        [`user_code${this.fileExtension}`]: code,
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
        [`user_code${this.fileExtension}`]: code,
        [`.sandbox_request.json`]: requestData,
      };
    } else {
      const stdinData = this.buildAtomicStdin({
        functionName,
        args,
        kwargs,
        filePath: `/workspace/user_code${this.fileExtension}`
      });

      // Convert string to base64 for pseudo-stdin using utf8 to preserve Unicode
      const encodedStdin = Buffer.from(stdinData, 'utf8').toString('base64');
      const proxyContent = this.getTemplate('proxy').replace('{{STDIN_DATA}}', encodedStdin);

      return {
        [`main${this.fileExtension}`]: proxyContent,
        [`user_code${this.fileExtension}`]: code,
      };
    }
  }

  generateStdin(
    _options: GenerationOptions
  ): string | Uint8Array {
    return '';
  }

  protected generateWrapper(): string {
    return '';
  }

  protected serialize(value: unknown): string {
    return Serializer.phpCgi(value);
  }
}