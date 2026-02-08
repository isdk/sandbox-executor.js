import type { InferredSignature } from '../inference/engine';
import { InputProtocol, type ArgsMode, type BaseFunctionRequest } from '../types/request';

export const RESULT_MARKERS = {
  START: '__SANDBOX_RESULT_START__',
  END: '__SANDBOX_RESULT_END__',
} as const;

/**
 * Options for the code generator.
 */
export interface GenerationOptions extends BaseFunctionRequest {
  /** Positional arguments. */
  args: unknown[];
  /** Keyword arguments. */
  kwargs: Record<string, unknown>;
  /** The inferred function signature. */
  signature?: InferredSignature;
  /** Final argument passing mode (resolved). */
  argsMode: ArgsMode;
}

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
   * @param options - Generation options.
   * @returns A map of filename to content.
   */
  abstract generateFiles(
    options: GenerationOptions
  ): Record<string, string | Uint8Array>;

  /**
   * Generates the stdin content for the sandbox.
   *
   * @param options - Generation options.
   * @returns The stdin content as a Uint8Array or string.
   */
  generateStdin(
    options: GenerationOptions
  ): string | Uint8Array {
    return '';
  }

  /**
   * Helper to build atomic mode stdin content with length prefix.
   * Format: [Mode(1b)][Length(8b hex)][JSON]
   */
  protected buildAtomicStdin(data: object): string {
    const jsonStr = JSON.stringify(data);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    const len = jsonBytes.length;
    
    // Use 8-character hex for length to be safe with UTF-8 encoding in runFS
    const lenHex = len.toString(16).padStart(8, '0');
    
    return InputProtocol.ATOMIC + lenHex + jsonStr;
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
