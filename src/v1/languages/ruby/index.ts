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

export class RubyProvider implements LanguageProvider {
  id = 'ruby';
  fileExtension = '.rb';
  private templateManager: TemplateManager;

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

    const wrapper = await this.templateManager.getTemplate('ruby', 'universal_wrapper', '.rb');

    const builder = new FSBuilder({ workdir });
    builder.addFiles({
      'user_code.rb': code,
      'main.rb': wrapper
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
      entryPoint: `${workdir}/main.rb`,
      files: builder.build(),
      stdin: sipStdin
    };
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
      status: finalResult.status === 'ok' ? 'success' : (finalResult.status === 'timeout' ? 'timeout' : 'error'),
      success: finalResult.status === 'ok',
      result: finalResult.data?.result,
      error: finalResult.data?.error,
      stdout,
      stderr,
      exitCode
    };
  }
}
