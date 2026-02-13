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

export class PHPCgiProvider implements LanguageProvider {
  id = 'php-cgi';
  fileExtension = '.php';
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
    const { code: userCode, functionName, options } = request;
    const { args, kwargs } = normalized;
    const workdir = options?.workdir || '/workspace';

    let code = userCode.trim();
    if (!code.startsWith('<?php')) {
      code = '<?php\n' + code;
    }

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
    
    // PHP-CGI WASM 兼容性处理：将 STDIN 数据注入到模板中
    const encodedStdin = Buffer.from(sipStdin, 'utf8').toString('base64');

    let wrapper = await this.templateManager.getTemplate('php-cgi', 'universal_wrapper', '.php');
    wrapper = wrapper.replace('{{STDIN_DATA}}', encodedStdin);

    const builder = new FSBuilder({ workdir });
    builder.addFiles({
      'user_code.php': code,
      'main.php': wrapper
    });

    return {
      entryPoint: `${workdir}/main.php`,
      files: builder.build(),
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
