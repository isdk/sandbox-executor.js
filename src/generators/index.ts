import type { SupportedLanguage } from '../types';
import { CodeGenerator } from './base';
import { PythonGenerator } from './python';
import { JavaScriptGenerator } from './javascript';
import { RubyGenerator } from './ruby';

const generators = new Map<SupportedLanguage, CodeGenerator>([
  ['python', new PythonGenerator()],
  ['quickjs', new JavaScriptGenerator()],
  ['ruby', new RubyGenerator()],
]);

export function getGenerator(language: SupportedLanguage): CodeGenerator {
  const generator = generators.get(language);
  if (!generator) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return generator;
}

export { CodeGenerator, RESULT_MARKERS } from './base';
export { PythonGenerator } from './python';
export { JavaScriptGenerator } from './javascript';
export { RubyGenerator } from './ruby';
