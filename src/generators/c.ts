import { CodeGenerator, type GenerationOptions, type GenerationOptionsWithSignature } from './base';
import type { ArgsMode, JsonSchema } from '../types/request';
import { Serializer } from './utils/serializer';

export class CGenerator extends CodeGenerator {
  language = 'clang';
  fileExtension = '.c';

  supportedArgsModes(): ArgsMode[] {
    return ['stdin', 'inline', 'file'];
  }

  generateFiles(
    options: GenerationOptionsWithSignature
  ): Record<string, string | Uint8Array> {
    const { code: userCode, functionName, args, kwargs, argsMode } = options;
    const dispatcher = this.generateDispatcher(functionName, options);
    const files: Record<string, string | Uint8Array> = {
      [`user_code${this.fileExtension}`]: userCode,
      [`__sandbox_dispatcher${this.fileExtension}`]: dispatcher,
      [`cJSON.h`]: this.getTemplate('cJSON', '.h'),
      // Use the language's native extension for the cJSON implementation if possible,
      // otherwise fallback to .c from common
      [`cJSON${this.fileExtension}`]: this.getTemplate('cJSON', '.c'),
    };

    const requestData = {
      functionName,
      args,
      kwargs
    };

    let mainContent: string;
    if (argsMode === 'inline') {
      const jsonStr = JSON.stringify(requestData);
      const escapedJson = Serializer.escapeCString(jsonStr);
      mainContent = this.getTemplate('wrapper', '.c').replace('{{ARGS_JSON}}', escapedJson);
    } else if (argsMode === 'file') {
      mainContent = this.getTemplate('file', '.c');
      const requestFile = '/workspace/.sandbox_request.json';
      mainContent = `#define SANDBOX_REQUEST_FILE "${requestFile}"\n` + mainContent;
      files[`.sandbox_request.json`] = JSON.stringify(requestData);
    } else {
      mainContent = this.getTemplate('proxy', '.c');
    }

    // Dynamically adjust includes based on file extension (for C++)
    files[`main${this.fileExtension}`] = mainContent
      .replace(/#include "cJSON\.c"/g, `#include "cJSON${this.fileExtension}"`)
      .replace(/#include "__sandbox_dispatcher\.c"/g, `#include "__sandbox_dispatcher${this.fileExtension}"`);

    return files;
  }

  generateStdin(
    options: GenerationOptions
  ): string | Uint8Array {
    const { functionName, args, kwargs, argsMode } = options;
    if (argsMode !== 'stdin') return '';

    return this.buildAtomicStdin({
      functionName,
      args,
      kwargs
    });
  }

  protected generateDispatcher(functionName: string, options: GenerationOptionsWithSignature): string {
    const { signature } = options;
    const input = signature.input;
    const params: (JsonSchema & { name: string })[] = [];

    if (Array.isArray(input)) {
      input.forEach((schema, idx) => {
        params.push({ ...schema, name: (schema as any).name || `arg_${idx}` });
      });
    } else {
      Object.entries(input)
        .sort((a, b) => (a[1].index ?? 0) - (b[1].index ?? 0))
        .forEach(([name, schema]) => {
          params.push({ ...schema, name });
        });
    }

    let extractParamsCode = '';
    const callArgs: string[] = [];

    params.forEach((param, idx) => {
      const argName = `arg_${idx}`;
      callArgs.push(argName);
      let extraction = '';

      const type = param.type || 'number';
      if (type === 'number') {
        extraction = `double ${argName} = cJSON_GetArrayItem(args, ${idx})->valuedouble;`;
      } else if (type === 'string') {
        extraction = `const char* ${argName} = cJSON_GetArrayItem(args, ${idx})->valuestring;`;
      } else if (type === 'boolean') {
        extraction = `bool ${argName} = cJSON_GetArrayItem(args, ${idx})->type == cJSON_True;`;
      } else {
        extraction = `double ${argName} = cJSON_GetArrayItem(args, ${idx})->valuedouble;`;
      }

      extractParamsCode += `    ${extraction}\n`;
    });

    const returnType = ((signature as any).returnType || 'double').toLowerCase();
    let callAndReturnCode = '';

    if (returnType.includes('void')) {
      callAndReturnCode = `
    ${functionName}(${callArgs.join(', ')});
    cJSON *res = cJSON_CreateObject();
    cJSON_AddItemToObject(res, "success", cJSON_CreateBool(1));
    cJSON_AddItemToObject(res, "result", cJSON_CreateNull());
    return res;
`;
    } else {
      let createResultCode = '';
      if (returnType.includes('char*') || returnType.includes('char *') || returnType.includes('string')) {
        createResultCode = `cJSON_CreateString(${functionName}(${callArgs.join(', ')}))`;
      } else if (returnType.includes('bool')) {
        createResultCode = `cJSON_CreateBool(${functionName}(${callArgs.join(', ')}))`;
      } else {
        createResultCode = `cJSON_CreateNumber(${functionName}(${callArgs.join(', ')}))`;
      }

      callAndReturnCode = `
    cJSON *res = cJSON_CreateObject();
    cJSON_AddItemToObject(res, "success", cJSON_CreateBool(1));
    cJSON_AddItemToObject(res, "result", ${createResultCode});
    return res;
`;
    }

    return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include "cJSON.h"
#include "user_code.c"

cJSON* __sandbox_dispatch(cJSON* params) {
    cJSON *args = cJSON_GetObjectItem(params, "args");
${extractParamsCode}
${callAndReturnCode}
}
`;
  }

  protected serialize(value: unknown): string {
    return Serializer.cpp(value);
  }

  protected generateWrapper(): string { return ''; }
}
