import type { InferredSignature } from '../inference/engine';
import { InputProtocol } from '../types/request';

export const RESULT_MARKERS = {
  START: '__SANDBOX_RESULT_START__',
  END: '__SANDBOX_RESULT_END__',
} as const;

export abstract class CodeGenerator {
  abstract readonly language: string;
  abstract readonly fileExtension: string;

  /**
   * Generates all files needed for execution in the sandbox.
   *
   * @param userCode - The original user source code.
   * @param functionName - The name of the function to call.
   * @param args - Positional arguments.
   * @param kwargs - Keyword arguments.
   * @param signature - The inferred function signature.
   * @returns A map of filename to content.
   */
  generateFiles(
    userCode: string,
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): Record<string, string | Uint8Array> {
    // Default implementation for backward compatibility
    // Newer generators should override this to provide a separate proxy and user_code
    const wrapper = this.generateWrapper(functionName, args, kwargs, signature);
    return {
      [`main${this.fileExtension}`]: `${userCode}\n\n${wrapper}`
    };
  }

  /**
   * Generates the stdin content for the sandbox.
   *
   * @param functionName - The name of the function to call.
   * @param args - Positional arguments.
   * @param kwargs - Keyword arguments.
   * @returns The stdin content as a Uint8Array or string.
   */
  generateStdin(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>
  ): string | Uint8Array {
    // Default is empty for backward compatibility
    return '';
  }

  /**
   * Helper to build atomic mode stdin content with length prefix.
   * Format: [Mode(1b)][Length(4b)][JSON]
   * Returns a "binary string" where each character's charCode is a byte.
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
    // Since it's UTF-8, we can decode it back to string.
    res += new TextDecoder().decode(jsonBytes);
    
    return res;
  }

  /**
   * @deprecated Use generateFiles instead.
   */
  generateExecutionCode(
    userCode: string,
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string {
    const files = this.generateFiles(userCode, functionName, args, kwargs, signature);
    return files[`main${this.fileExtension}`] as string;
  }

  protected abstract generateWrapper(
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature
  ): string;

  protected abstract serialize(value: unknown): string;
}
