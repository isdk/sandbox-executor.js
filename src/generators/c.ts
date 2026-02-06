import { CodeGenerator } from './base';
import type { InferredSignature } from '../inference/engine';
import type { InvokeOptions, ArgsMode } from '../types/request';
import { Serializer } from './utils/serializer';

export class CGenerator extends CodeGenerator {
  readonly language = 'clang';
  readonly fileExtension = '.c';

  supportedArgsModes(): ArgsMode[] {
    return ['stdin', 'inline', 'file'];
  }

  generateFiles(
    userCode: string,
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    signature: InferredSignature,
    options?: InvokeOptions
  ): Record<string, string | Uint8Array> {
    const argsMode = options?.argsMode || 'stdin';
    const dispatcher = this.generateDispatcher(functionName, signature);
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
    functionName: string,
    args: unknown[],
    kwargs: Record<string, unknown>,
    options?: InvokeOptions
  ): string | Uint8Array {
    const argsMode = options?.argsMode || 'stdin';
    if (argsMode !== 'stdin') return '';

    return this.buildAtomicStdin({
      functionName,
      args,
      kwargs
    });
  }

  protected generateDispatcher(functionName: string, signature: InferredSignature): string {
    const params = signature.params || [];
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

    const returnType = (signature as any).returnType || 'double';
    let callAndReturnCode = '';
    
    if (returnType === 'void') {
      callAndReturnCode = `
    ${functionName}(${callArgs.join(', ')});
    cJSON *res = cJSON_CreateObject();
    cJSON_AddItemToObject(res, "success", cJSON_CreateBool(1));
    cJSON_AddItemToObject(res, "result", cJSON_CreateNull());
    return res;
`;
    } else {
      let createResultCode = '';
      if (returnType === 'string' || returnType === 'char*') {
        createResultCode = `cJSON_CreateString(${functionName}(${callArgs.join(', ')}))`;
      } else if (returnType === 'boolean' || returnType === 'bool') {
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