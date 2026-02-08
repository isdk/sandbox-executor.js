import * as fs from 'fs';
import * as path from 'path';
import {
  LanguageProvider,
  ExecutionRequest,
  DriverCapabilities,
  ExecutionBundle,
  RawOutput,
  NormalizedArguments
} from '../../types/provider';
import { ExecutionResult } from '../../../types';
import { FSBuilder } from '../../../fs/fs-builder';
import { InferredSignature } from '../../../inference/engine';

export class PythonProvider implements LanguageProvider {
  id = 'python';
  fileExtension = '.py';

  private async getTemplate(name: string) {
    const templatePath = path.join(__dirname, 'templates', `${name}.py`);
    return fs.readFileSync(templatePath, 'utf8');
  }

  async generate(
    request: ExecutionRequest,
    caps: DriverCapabilities,
    normalized: NormalizedArguments,
    signature?: InferredSignature
  ): Promise<ExecutionBundle> {
    const { code, functionName, options } = request;
    const { args, kwargs } = normalized; // 直接使用 Core 归一化后的数据
    const workdir = options?.workdir || '/workspace';

    const envs: Record<string, string> = {
      'SB_REPORT_IO': '1',
    };

    if (caps.transports.fd) {
      envs['SB_RESULT_FD'] = '3';
    }

    // 模板注入实现优雅降级
    let wrapper = await this.getTemplate('universal_wrapper');
    wrapper = wrapper
      .replace('{{SB_REPORT_IO}}', envs['SB_REPORT_IO'] || '0')
      .replace('{{SB_RESULT_FD}}', envs['SB_RESULT_FD'] || '')
      .replace('{{SB_IPC}}', '');

    const builder = new FSBuilder({ workdir });
    builder.addFiles({
      'user_code.py': code,
      'main.py': wrapper
    });

    // 构建 Sandbox-Link 请求
    const callMessage = {
      ver: '1.0',
      id: `call-${Date.now()}`,
      type: 'call',
      method: functionName,
      params: { args, kwargs },
      config: {
        report_io: true,
        reset: options?.reset || 'none'
      }
    };

    const callJson = JSON.stringify(callMessage);
    const jsonBytes = new TextEncoder().encode(callJson);
    const lenHex = jsonBytes.length.toString(16).padStart(8, '0');
    const sipStdin = `A${lenHex}${callJson}`;

    return {
      entryPoint: `${workdir}/main.py`,
      files: builder.build(),
      envs,
      stdin: sipStdin
    };
  }

  parseResult<T>(output: RawOutput): ExecutionResult<T> {
    const { stdout, stderr, exitCode, resultData } = output;
    const startMarker = "__SANDBOX_RESULT_START__";
    const endMarker = "__SANDBOX_RESULT_END__";

    const jsonMsgs: string[] = [];
    if (resultData) {
      jsonMsgs.push(...resultData.split('\n').filter(line => line.trim()));
    }

    let searchIdx = 0;
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
        status: 'error',
        success: false,
        error: { message: 'No result found in output', type: 'NoResultError' },
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
      } catch (e) {
      }
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
      result: finalResult.data.result,
      error: finalResult.data.error,
      stdout,
      stderr,
      exitCode
    };
  }
}