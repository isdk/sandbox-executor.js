import {
  LanguageProvider,
  ExecutionRequest,
  DriverCapabilities,
  ExecutionBundle,
  RawOutput,
  NormalizedArguments
} from '../../types';
import { ExecutionResult } from '../../../types';
import { FSBuilder } from '../../../fs/fs-builder';
import { InferredSignature } from '../../../inference/engine';
import { TemplateManager } from '../../core/template-manager';

export class CProvider implements LanguageProvider {
  id = 'c';
  fileExtension = '.c';
  protected templateManager: TemplateManager;

  constructor(templateManager?: TemplateManager) {
    this.templateManager = templateManager || new TemplateManager();
  }

  async generate(
    request: ExecutionRequest,
    caps: DriverCapabilities,
    normalized: NormalizedArguments,
    signature?: InferredSignature
  ): Promise<ExecutionBundle> {
    const { code, functionName, options } = request;
    const { args, kwargs } = normalized;
    const workdir = options?.workdir || '/workspace';

    if (!signature) {
      throw new Error(`${this.id.toUpperCase()} execution requires a function signature.`);
    }

    const dispatcher = this.generateDispatcher(functionName!, signature);

    // 加载模板 (C/C++ 共享 C 的模板)
    const cjson_h = await this.templateManager.getTemplate('c', 'cJSON', '.h');
    const cjson_c = await this.templateManager.getTemplate('c', 'cJSON', '.c');
    const proxy_c = await this.templateManager.getTemplate('c', 'universal_wrapper', '.c');

    const builder = new FSBuilder({ workdir });
    builder.addFiles({
      [`user_code${this.fileExtension}`]: code,
      [`__sandbox_dispatcher${this.fileExtension}`]: dispatcher,
      'cJSON.h': cjson_h,
      [`cJSON${this.fileExtension}`]: cjson_c,
      [`main${this.fileExtension}`]: proxy_c
        .replace('#include "cJSON.c"', `#include "cJSON${this.fileExtension}"`)
        .replace('#include "__sandbox_dispatcher.c"', `#include "__sandbox_dispatcher${this.fileExtension}"`)
    });

    const callMessage = {
      ver: '1.0',
      id: `call-${Date.now()}`,
      type: 'call',
      method: functionName,
      params: { args, kwargs },
    };

    const callJson = JSON.stringify(callMessage);
    const jsonBytes = new TextEncoder().encode(callJson);
    const lenHex = jsonBytes.length.toString(16).padStart(8, '0');
    const sipStdin = `A${lenHex}${callJson}`;

    return {
      entryPoint: `${workdir}/main${this.fileExtension}`,
      files: builder.build(),
      stdin: sipStdin
    };
  }

  protected generateDispatcher(functionName: string, signature: InferredSignature): string {
    const input = signature.input;
    const params: any[] = [];

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

      const type = (param.type || 'number').toLowerCase();
      if (type === 'number' || type === 'integer' || type === 'float') {
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

    const returnType = (signature.returnType || 'double').toLowerCase();
    let callAndReturnCode = '';

    if (returnType.includes('void')) {
      callAndReturnCode = `
    ${functionName}(${callArgs.join(', ')});
    cJSON *data = cJSON_CreateObject();
    cJSON_AddStringToObject(data, "result", "void");
    return data;
`;
    } else {
      let createResultCode = '';
      if (returnType.includes('char*') || returnType.includes('string')) {
        createResultCode = `cJSON_CreateString(${functionName}(${callArgs.join(', ')}))`;
      } else if (returnType.includes('bool')) {
        createResultCode = `cJSON_CreateBool(${functionName}(${callArgs.join(', ')}))`;
      } else {
        createResultCode = `cJSON_CreateNumber(${functionName}(${callArgs.join(', ')}))`;
      }

      callAndReturnCode = `
    cJSON *data = cJSON_CreateObject();
    cJSON_AddItemToObject(data, "result", ${createResultCode});
    return data;
`;
    }

    return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include "cJSON.h"
#include "user_code${this.fileExtension}"

cJSON* __sandbox_dispatch(cJSON* call_params) {
    cJSON *args = cJSON_GetObjectItem(call_params, "args");
${extractParamsCode}
${callAndReturnCode}
}
`;
  }

  parseResult<T>(output: RawOutput): ExecutionResult<T> {
    const { stdout, stderr, exitCode } = output;
    const startMarker = "__SANDBOX_RESULT_START__";
    const endMarker = "__SANDBOX_RESULT_END__";

    let searchIdx = 0;
    const jsonMsgs: string[] = [];
    while (true) {
      const startIdx = stdout.indexOf(startMarker, searchIdx);
      if (startIdx === -1) break;
      const endIdx = stdout.indexOf(endMarker, startIdx);
      if (endIdx === -1) break;

      jsonMsgs.push(stdout.slice(startIdx + startMarker.length, endIdx));
      searchIdx = endIdx + endMarker.length;
    }

    if (jsonMsgs.length === 0) {
      // 如果没有找到结果标记，且退出码非0，通常是编译错误或严重崩溃
      return {
        status: exitCode === 0 ? 'success' : 'error',
        success: false,
        error: {
          message: exitCode !== 0 ? (stderr || 'Execution failed') : 'No result found in output',
          type: exitCode !== 0 ? 'ExecutionError' : 'NoResultError'
        },
        stdout,
        stderr,
        exitCode
      };
    }

    let finalResult: any = null;
    for (const jsonStr of jsonMsgs) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === 'result') {
          finalResult = parsed;
        }
      } catch (e) {}
    }

    if (!finalResult) {
      return {
        status: 'error',
        success: false,
        error: { message: 'No message of type "result" found', type: 'NoResultError' },
        stdout,
        stderr,
        exitCode
      };
    }

    return {
      status: finalResult.status === 'ok' ? 'success' : 'error',
      success: finalResult.status === 'ok',
      result: finalResult.data?.result,
      error: finalResult.data?.error,
      stdout,
      stderr,
      exitCode
    };
  }
}

export class CppProvider extends CProvider {
  override id = 'cpp';
  override fileExtension = '.cpp';

  protected override generateDispatcher(functionName: string, signature: InferredSignature): string {
    const dispatcher = super.generateDispatcher(functionName, signature);

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
      .replace(`#include "user_code${this.fileExtension}"`, `#include "user_code.cpp"`)
      .replace('#include "cJSON.h"', `#include "cJSON.h"\n${cppHelper}`);
  }
}
