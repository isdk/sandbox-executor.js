import type { InferredSignature } from '../inference/engine';
import { InputProtocol, type ArgsMode, type InvokeOptions } from '../types/request';

export const RESULT_MARKERS = {
  START: '__SANDBOX_RESULT_START__',
  END: '__SANDBOX_RESULT_END__',
} as const;

export abstract class CodeGenerator {
  abstract readonly language: string;
  abstract readonly fileExtension: string;

  /**
   * Returns the supported argument passing modes for this language.
   */
  supportedArgsModes(): ArgsMode[] {
    return ['stdin']; // Default to stdin only
  }

  /**
   * Generates all files needed for execution in the sandbox.
   *
   * @param userCode - The original user source code.
   * @param functionName - The name of the function to call.
   * @param args - Positional arguments.
   * @param kwargs - Keyword arguments.
   * @param signature - The inferred function signature.
   * @param options - Execution options including argsMode.
   * @returns A map of filename to content.
   */
  abstract generateFiles(
    userCode: string,
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature,
    options?: InvokeOptions
  ): Record<string, string | Uint8Array>;

  /**
   * Generates the stdin content for the sandbox.
   *
   * @param functionName - The name of the function to call.
   * @param args - Positional arguments.
   * @param kwargs - Keyword arguments.
   * @param options - Execution options.
   * @returns The stdin content as a Uint8Array or string.
   */
  generateStdin(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    options?: InvokeOptions
  ): string | Uint8Array {
    return '';
  }

  /**
   * Helper to build atomic mode stdin content with length prefix.
   * Format: [Mode(1b)][Length(4b)][JSON]
   */
  protected buildAtomicStdin(data: object): string {
    const jsonStr = JSON.stringify(data);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    const len = jsonBytes.length;
    
    let res = InputProtocol.ATOMIC;
    // Big-endian length encoded as characters
    res += String.fromCharCode((len >> 24) & 0xff);
    res += String.fromCharCode((len >> 16) & 0xff);
    res += String.fromCharCode((len >> 8) & 0xff);
    res += String.fromCharCode(len & 0xff);
    
    // Convert JSON bytes to string. 
    res += new TextDecoder().decode(jsonBytes);
    
    return res;
  }

  /**
   * Helper to load a template file.
   */
  protected getTemplate(name: string, ext?: string): string {
    const extension = ext ?? this.fileExtension;
    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.versions?.node) {
        const fs = require('fs');
        const path = require('path');
        const possiblePaths = [
          path.join(__dirname, 'templates', this.language, `${name}${extension}`),
          path.join(__dirname, 'templates', 'common', `${name}${extension}`),
          path.join(process.cwd(), 'src/generators/templates', this.language, `${name}${extension}`),
          path.join(process.cwd(), 'src/generators/templates', 'common', `${name}${extension}`),
          path.join(process.cwd(), 'packages/sandbox-executor/src/generators/templates', this.language, `${name}${extension}`),
          path.join(process.cwd(), 'packages/sandbox-executor/src/generators/templates', 'common', `${name}${extension}`),
        ];
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            // console.log(`DEBUG: Loading template from ${p}`);
            return fs.readFileSync(p, 'utf8');
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to load template ${name}${extension} for ${this.language}:`, e);
    }
    throw new Error(`Template ${name}${extension} not found for ${this.language}`);
  }

  protected abstract serialize(value: unknown): string;
}
