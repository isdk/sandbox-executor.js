import type { SupportedLanguage } from '../types';
import { CodeGenerator } from './base';
import { PythonGenerator } from './python';
import { JavaScriptGenerator } from './javascript';
import { RubyGenerator } from './ruby';
import { PHPCgiGenerator } from './php-cgi';
import { CGenerator } from './c';
import { CppGenerator } from './cpp';

const jsGenerator = new JavaScriptGenerator();
const generators = new Map<string, CodeGenerator>([
  ['python', new PythonGenerator()],
  ['quickjs', jsGenerator],
  ['ruby', new RubyGenerator()],
  ['php', new PHPCgiGenerator()],
  ['clang', new CGenerator()],
  ['clangpp', new CppGenerator()],
]);

export function getCanonicalLanguage(language: SupportedLanguage): string {
  switch (language) {
    case 'js':
    case 'javascript':
      return 'quickjs';
    case 'c':
    case 'clang':
      return 'clang';
    case 'cpp':
    case 'c++' as any: // In case someone uses c++
    case 'clangpp':
      return 'clangpp';
    default:
      return language;
  }
}

export function getGenerator(language: SupportedLanguage): CodeGenerator {
  const canonical = getCanonicalLanguage(language);
  const generator = generators.get(canonical);
  if (!generator) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return generator;
}

export function getRuntime(language: SupportedLanguage): string {
  const canonical = getCanonicalLanguage(language);
  if (canonical === 'php') return 'php-cgi';
  return canonical;
}

export { CodeGenerator, RESULT_MARKERS } from './base';
export { PythonGenerator } from './python';
export { JavaScriptGenerator } from './javascript';
export { RubyGenerator } from './ruby';
export { PHPCgiGenerator } from './php-cgi';
export { CGenerator } from './c';
export { CppGenerator } from './cpp';
