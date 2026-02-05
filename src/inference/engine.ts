// src/inference/engine.ts

import type { FunctionSchema, ParamSchema, SupportedLanguage } from '../types';

/**
 * Represents a function signature determined by the inference engine.
 */
export interface InferredSignature {
  /** List of individual parameters. */
  params: ParamSchema[];
  /** Whether the function accepts variable positional arguments. */
  variadic: boolean;
  /** Whether the function accepts keyword arguments (kwargs). */
  acceptsKwargs: boolean;
  /** (JavaScript only) Whether the last parameter is an options object. */
  hasOptionsParam: boolean;
  /** How this signature was determined. */
  source: 'schema' | 'inferred' | 'convention';
}

/**
 * Engine for determining function signatures from source code or metadata.
 * 
 * It uses a priority-based approach:
 * 1. Explicit schema provided by the user.
 * 2. Static analysis (regex-based) of the source code.
 * 3. Language-specific default conventions.
 */
export class SignatureInferenceEngine {
  /**
   * Resolves the signature of a function within the given code.
   * 
   * @param code - The source code to analyze.
   * @param functionName - Name of the function to resolve.
   * @param language - Programming language of the code.
   * @param schema - Optional explicit schema to use instead of inference.
   * @returns The resolved function signature.
   */
  resolve(
    code: string,
    functionName: string,
    language: SupportedLanguage,
    schema?: FunctionSchema
  ): InferredSignature {
    const canonicalLanguage = this.canonicalizeLanguage(language);

    // Priority 1: User-provided schema
    if (schema?.params) {
      return {
        params: schema.params,
        variadic: schema.variadic ?? false,
        acceptsKwargs: schema.acceptsKwargs ?? this.languageAcceptsKwargs(canonicalLanguage),
        hasOptionsParam: false,
        source: 'schema',
      };
    }

    // Priority 2: Infer from code
    try {
      const inferred = this.inferFromCode(code, functionName, canonicalLanguage);
      if (inferred) {
        return { ...inferred, source: 'inferred' };
      }
    } catch (e) {
      // Inference failed, fall through to convention
    }

    // Priority 3: Language convention
    return this.getConvention(canonicalLanguage);
  }

  private canonicalizeLanguage(language: SupportedLanguage): string {
    switch (language) {
      case 'js':
      case 'javascript':
        return 'quickjs';
      default:
        return language;
    }
  }

  private inferFromCode(
    code: string,
    functionName: string,
    language: string
  ): Omit<InferredSignature, 'source'> | null {
    switch (language) {
      case 'python': return this.inferPython(code, functionName);
      case 'quickjs': return this.inferJavaScript(code, functionName);
      case 'ruby': return this.inferRuby(code, functionName);
      case 'php': return this.inferPHP(code, functionName);
      default: return null;
    }
  }

  private inferPython(code: string, functionName: string) {
    const match = code.match(new RegExp(`def\\s+${functionName}\\s*\\(([^)]*)\\)`, 'm'));
    if (!match) return null;

    const params: ParamSchema[] = [];
    let variadic = false;
    let acceptsKwargs = false;

    for (const part of this.splitParams(match[1])) {
      const trimmed = part.trim();
      if (!trimmed || trimmed === 'self' || trimmed === 'cls') continue;

      if (trimmed.startsWith('**')) {
        acceptsKwargs = true;
      } else if (trimmed.startsWith('*') && trimmed !== '*') {
        variadic = true;
      } else if (trimmed !== '*') {
        const [nameWithType, defaultVal] = trimmed.split('=').map(s => s.trim());
        const name = nameWithType.split(':')[0].trim();
        params.push({ name, required: !defaultVal });
      }
    }

    return { params, variadic, acceptsKwargs, hasOptionsParam: false };
  }

  private inferPHP(code: string, functionName: string) {
    const match = code.match(new RegExp(`function\\s+${functionName}\\s*\\(([^)]*)\\)`, 'm'));
    if (!match) return null;

    const params: ParamSchema[] = [];
    let variadic = false;

    for (const part of this.splitParams(match[1])) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('...')) {
        variadic = true;
      } else {
        const [nameWithType, defaultVal] = trimmed.split('=').map(s => s.trim());
        const parts = nameWithType.split(/\s+/);
        const nameWithDollar = parts[parts.length - 1];
        const name = nameWithDollar.startsWith('$') ? nameWithDollar.substring(1) : nameWithDollar;
        params.push({ name, required: !defaultVal });
      }
    }

    return { params, variadic, acceptsKwargs: true, hasOptionsParam: false };
  }

  private inferJavaScript(code: string, functionName: string) {
    const patterns = [
      new RegExp(`function\\s+${functionName}\\s*\\(([^)]*)\\)`),
      new RegExp(`(?:const|let|var)\\s+${functionName}\\s*=\\s*(?:async\\s*)?\\(([^)]*)\\)\\s*=>`),
      new RegExp(`(?:const|let|var)\\s+${functionName}\\s*=\\s*(?:async\\s*)?function\\s*\\(([^)]*)\\)`),
    ];

    let paramsStr: string | null = null;
    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) { paramsStr = match[1]; break; }
    }
    if (!paramsStr) return null;

    const params: ParamSchema[] = [];
    let variadic = false;
    let hasOptionsParam = false;

    const parts = this.splitParams(paramsStr);
    parts.forEach((part, i) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const isLast = i === parts.length - 1;

      if (trimmed.startsWith('...')) {
        variadic = true;
      } else if (trimmed.startsWith('{')) {
        hasOptionsParam = true;
      } else {
        const [name] = trimmed.split('=').map(s => s.trim());
        if (isLast && /^(options?|opts?|config|props|params)$/i.test(name)) {
          hasOptionsParam = true;
        }
        params.push({ name, required: !trimmed.includes('=') });
      }
    });

    return { params, variadic, acceptsKwargs: false, hasOptionsParam };
  }

  private inferRuby(code: string, functionName: string) {
    const match = code.match(new RegExp(`def\\s+${functionName}\\s*(?:\\(([^)]*)\\))?`, 'm'));
    if (!match) return null;

    const params: ParamSchema[] = [];
    let variadic = false;
    let acceptsKwargs = false;

    for (const part of this.splitParams(match[1] || '')) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('**')) acceptsKwargs = true;
      else if (trimmed.startsWith('*')) variadic = true;
      else {
        const name = trimmed.split(/[=:]/)[0].trim();
        params.push({ name, required: !trimmed.includes('=') && !trimmed.includes(':') });
      }
    }

    return { params, variadic, acceptsKwargs, hasOptionsParam: false };
  }

  private getConvention(language: string): InferredSignature {
    const conventions: Record<string, InferredSignature> = {
      python: { params: [], variadic: true, acceptsKwargs: true, hasOptionsParam: false, source: 'convention' },
      ruby: { params: [], variadic: true, acceptsKwargs: true, hasOptionsParam: false, source: 'convention' },
      php: { params: [], variadic: true, acceptsKwargs: true, hasOptionsParam: false, source: 'convention' },
      quickjs: { params: [], variadic: false, acceptsKwargs: false, hasOptionsParam: true, source: 'convention' },
    };
    return conventions[language];
  }

  private languageAcceptsKwargs(language: string): boolean {
    return language === 'python' || language === 'ruby' || language === 'php';
  }

  private splitParams(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of str) {
      if ('([{'.includes(char)) depth++;
      if (')]}'.includes(char)) depth--;
      if (char === ',' && depth === 0) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) result.push(current);
    return result;
  }
}
