import { GenerationOptionsWithSignature } from './base';
import { CGenerator } from './c';
import type { ArgsMode } from '../types/request';

export class CppGenerator extends CGenerator {
  readonly language = 'clangpp';
  readonly fileExtension = '.cpp';

  supportedArgsModes(): ArgsMode[] {
    return ['stdin', 'inline', 'file'];
  }

  /**
   * C++ implementation of dispatcher with proper include file extensions
   * and support for std::string return values.
   */
  protected generateDispatcher(functionName: string, options: GenerationOptionsWithSignature): string {
    const dispatcher = super.generateDispatcher(functionName, options);

    const cppHelper = `
#ifdef __cplusplus
#include <string>
// Overload cJSON_CreateString to accept std::string
static inline cJSON* cJSON_CreateString(const std::string& s) {
    return cJSON_CreateString(s.c_str());
}
#endif
`;

    return dispatcher
      .replace('#include "user_code.c"', '#include "user_code.cpp"')
      .replace('#include "cJSON.h"', `#include "cJSON.h"\n${cppHelper}`);
  }
}
