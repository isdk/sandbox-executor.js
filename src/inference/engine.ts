// src/inference/engine.ts

import type { FunctionSchema, InputSchema, JsonSchema, SupportedLanguage } from '../types';

/**
 * Represents a function signature determined by the inference engine.
 */
export interface InferredSignature {
  /** The name of the function being called. */
  functionName: string;
  /** The source code (possibly wrapped). */
  code: string;
  /** Input parameter schemas. */
  input: InputSchema;
  /** Whether the function accepts variable positional arguments. */
  variadic: boolean;
  /** Whether the function accepts keyword arguments (kwargs). */
  acceptsKwargs: boolean;
  /** (JavaScript only) Whether the last parameter is an options object. */
  hasOptionsParam: boolean;
  /** How this signature was determined. */
  source: 'schema' | 'inferred' | 'convention';
  /** The return type of the function (for C/C++). */
  returnType?: string;
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
   * @param functionName - Name of the function to resolve (optional).
   * @param language - Programming language of the code.
   * @param schema - Optional explicit schema to use instead of inference.
   * @returns The resolved function signature.
   */
  resolve(
    code: string,
    functionName: string | undefined,
    language: SupportedLanguage,
    schema?: FunctionSchema
  ): InferredSignature {
    const canonicalLanguage = this.canonicalizeLanguage(language);
    let finalFunctionName = functionName;
    let finalCode = code;

    // Detection/Wrapping logic if functionName is missing
    if (!finalFunctionName) {
      const detectedNames = this.findFunctions(code, canonicalLanguage);
      
      if (detectedNames.length === 1) {
        finalFunctionName = detectedNames[0];
      } else if (detectedNames.length > 1) {
        // Apply language-specific filtering
        const filteredNames = this.filterFunctions(detectedNames, canonicalLanguage);
        if (filteredNames.length === 1) {
          finalFunctionName = filteredNames[0];
        } else {
          throw new Error(
            `Multiple functions detected: [${filteredNames.join(', ')}]. Please specify functionName manually.`
          );
        }
      } else {
        // No functions detected, enter Body Mode
        finalFunctionName = '__anonymous_wrapper__';
        finalCode = this.wrapAsBody(code, finalFunctionName, canonicalLanguage, schema);
      }
    }

    // Priority 1: User-provided schema
    if (schema?.input) {
      return {
        functionName: finalFunctionName,
        code: finalCode,
        input: schema.input,
        variadic: schema.variadic ?? false,
        acceptsKwargs: schema.acceptsKwargs ?? this.languageAcceptsKwargs(canonicalLanguage),
        hasOptionsParam: false,
        source: 'schema',
      };
    }

    // Priority 2: Infer from code
    try {
      const inferred = this.inferFromCode(finalCode, finalFunctionName, canonicalLanguage);
      if (inferred) {
        return { ...inferred, functionName: finalFunctionName, code: finalCode, source: 'inferred' };
      }
    } catch (e) {
      // Inference failed, fall through to convention
    }

    // Priority 3: Language convention
    return {
      ...this.getConvention(canonicalLanguage),
      functionName: finalFunctionName,
      code: finalCode,
    };
  }

  private findFunctions(code: string, language: string): string[] {
    const patterns: Record<string, RegExp> = {
      python: /^def\s+([a-zA-Z_]\w*)\s*\(/gm,
      ruby: /^def\s+([a-zA-Z_]\w*)\s*(?:\(.*\))?/gm,
      php: /^function\s+([a-zA-Z_]\w*)\s*\(/gm,
      quickjs: /^(?:export\s+(?:default\s+)?)?(?:function\s+([a-zA-Z_]\w*)|(?:const|let|var)\s+([a-zA-Z_]\w*)\s*=\s*.*=>)/gm,
      clang: /^[\w\s\*]+\s+([a-zA-Z_]\w*)\s*\(/gm,
      clangpp: /^[\w\s\*]+\s+([a-zA-Z_]\w*)\s*\(/gm,
    };

    const pattern = patterns[language];
    if (!pattern) return [];

    const matches = [];
    let match;
    while ((match = pattern.exec(code)) !== null) {
      // For JS, it might be the 1st or 2nd capture group
      matches.push(match[1] || match[2]);
    }
    return matches.filter(Boolean);
  }

  private filterFunctions(names: string[], language: string): string[] {
    if (language === 'python' || language === 'ruby') {
      // Filter out private functions (starting with _) if public ones exist
      const publicNames = names.filter(n => !n.startsWith('_'));
      return publicNames.length > 0 ? publicNames : names;
    }
    if (language === 'quickjs') {
      // In JS, if we had a more complex regex we could check for 'export',
      // but findFunctions already handles some. For now, we return as is.
      return names;
    }
    return names;
  }

  private wrapAsBody(code: string, functionName: string, language: string, schema?: FunctionSchema): string {
    switch (language) {
      case 'python':
        const indentedCode = code.split('\n').map(line => '    ' + line).join('\n');
        return `def ${functionName}(*args, **kwargs):\n${indentedCode}`;
      case 'quickjs':
        return `export async function ${functionName}(...args) {\n${code}\n}`;
      case 'ruby':
        return `def ${functionName}(*args)\n${code}\nend`;
      case 'php':
        // PHP doesn't strictly need export, it's global when included
        return `function ${functionName}(...$args) {\n${code}\n}`;
      case 'clang':
      case 'clangpp':
        // For C/C++, we need types from schema. If no schema, we use default int return and void/mixed args
        const returnType = (schema as any)?.output?.type === 'string' ? 'char*' : 'int';
        return `${returnType} ${functionName}() {\n${code}\n}`;
      default:
        return code;
    }
  }

  private canonicalizeLanguage(language: SupportedLanguage): string {
    switch (language) {
      case 'js':
      case 'javascript':
        return 'quickjs';
      case 'c':
      case 'clang':
        return 'clang';
      case 'cpp':
      case 'clangpp':
        return 'clangpp';
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
      case 'clang':
      case 'c':
        return this.inferC(code, functionName);
      case 'clangpp':
      case 'cpp':
        return this.inferCpp(code, functionName);
      default: return null;
    }
  }

  private inferC(code: string, functionName: string): Omit<InferredSignature, 'source'> | null {
    // Basic C function regex: returnType functionName(params)
    const match = code.match(new RegExp(`([\\w\\s\\*]+)\\s+${functionName}\\s*\\(([^)]*)\\)`, 'm'));
    if (!match) return null;

    const returnType = match[1].trim();
    const input: Record<string, JsonSchema & { index: number }> = {};
    let index = 0;

    for (const part of this.splitParams(match[2])) {
      const trimmed = part.trim();
      if (!trimmed || trimmed === 'void') continue;

      // Basic C param: type name
      const parts = trimmed.split(/\s+/);
      const name = parts[parts.length - 1].replace(/^\*/, ''); // handle pointers
      
      // Try to determine internal type from C type declaration
      const cType = parts.slice(0, -1).join(' ').toLowerCase();
      let type: JsonSchema['type'] = 'number';
      
      if (cType.includes('char*') || cType.includes('char *') || cType.includes('string')) {
        type = 'string';
      } else if (cType.includes('bool') || cType.includes('_bool')) {
        type = 'boolean';
      }
      
      input[name] = { type, required: true, index: index++ };
    }

    return { input, variadic: false, acceptsKwargs: false, hasOptionsParam: false, returnType };
  }

  private inferCpp(code: string, functionName: string) {
    // Similar to C but might have namespaces or templates (we'll keep it simple)
    return this.inferC(code, functionName);
  }

  private inferPython(code: string, functionName: string): Omit<InferredSignature, 'source'> | null {
    const match = code.match(new RegExp(`def\\s+${functionName}\\s*\\(([^)]*)\\)`, 'm'));
    if (!match) return null;

    const input: Record<string, JsonSchema & { index: number }> = {};
    let variadic = false;
    let acceptsKwargs = false;
    let index = 0;

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
        input[name] = { required: !defaultVal, index: index++ };
      }
    }

    return { input, variadic, acceptsKwargs, hasOptionsParam: false };
  }

  private inferPHP(code: string, functionName: string): Omit<InferredSignature, 'source'> | null {
    const match = code.match(new RegExp(`function\\s+${functionName}\\s*\\(([^)]*)\\)`, 'm'));
    if (!match) return null;

    const input: Record<string, JsonSchema & { index: number }> = {};
    let variadic = false;
    let index = 0;

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
        input[name] = { required: !defaultVal, index: index++ };
      }
    }

    return { input, variadic, acceptsKwargs: true, hasOptionsParam: false };
  }

  private inferJavaScript(code: string, functionName: string): Omit<InferredSignature, 'source'> | null {
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

    const input: Record<string, JsonSchema & { index: number }> = {};
    let variadic = false;
    let hasOptionsParam = false;
    let index = 0;

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
        input[name] = { required: !trimmed.includes('='), index: index++ };
      }
    });

    return { input, variadic, acceptsKwargs: false, hasOptionsParam };
  }

  private inferRuby(code: string, functionName: string): Omit<InferredSignature, 'source'> | null {
    const match = code.match(new RegExp(`def\\s+${functionName}\\s*(?:\\(([^)]*)\\))?`, 'm'));
    if (!match) return null;

    const input: Record<string, JsonSchema & { index: number }> = {};
    let variadic = false;
    let acceptsKwargs = false;
    let index = 0;

    for (const part of this.splitParams(match[1] || '')) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('**')) acceptsKwargs = true;
      else if (trimmed.startsWith('*')) variadic = true;
      else {
        const name = trimmed.split(/[=:]/)[0].trim();
        input[name] = { required: !trimmed.includes('=') && !trimmed.includes(':'), index: index++ };
      }
    }

    return { input, variadic, acceptsKwargs, hasOptionsParam: false };
  }

  private getConvention(language: string): InferredSignature {
    const conventions: Record<string, InferredSignature> = {
      python: { input: {}, variadic: true, acceptsKwargs: true, hasOptionsParam: false, source: 'convention' },
      ruby: { input: {}, variadic: true, acceptsKwargs: true, hasOptionsParam: false, source: 'convention' },
      php: { input: {}, variadic: true, acceptsKwargs: true, hasOptionsParam: false, source: 'convention' },
      quickjs: { input: {}, variadic: false, acceptsKwargs: false, hasOptionsParam: true, source: 'convention' },
      clang: { input: {}, variadic: false, acceptsKwargs: false, hasOptionsParam: false, source: 'convention', returnType: 'int' },
      clangpp: { input: {}, variadic: false, acceptsKwargs: false, hasOptionsParam: false, source: 'convention', returnType: 'int' },
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