import type { SupportedLanguage } from '../types';
import { CodeGenerator } from './base';
import { PythonGenerator } from './python';
import { JavaScriptGenerator } from './javascript';
import { RubyGenerator } from './ruby';
import { PHPGenerator } from './php';

const jsGenerator = new JavaScriptGenerator();
const generators = new Map<string, CodeGenerator>([
  ['python', new PythonGenerator()],
  ['quickjs', jsGenerator],
  ['ruby', new RubyGenerator()],
  ['php', new PHPGenerator()],
]);

export function getCanonicalLanguage(language: SupportedLanguage): string {
  switch (language) {
    case 'js':
    case 'javascript':
      return 'quickjs';
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
export { PHPGenerator } from './php';
