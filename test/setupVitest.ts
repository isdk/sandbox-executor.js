import { vi } from 'vitest';
import type { WASIFile, WASIFS } from '../src/types';

// 测试工具函数
export function createMockWASIFile(
  path: string,
  content: string | Uint8Array
) {
  const now = new Date();
  return {
    path,
    content,
    mode: typeof content === 'string' ? 'string' : 'binary',
    timestamps: {
      access: now,
      modification: now,
      change: now,
    },
  } as WASIFile;
}

export function createMockWASIFS(
  files: Record<string, string | Uint8Array>
): WASIFS {
  const fs: WASIFS = {};
  for (const [path, content] of Object.entries(files)) {
    fs[path] = createMockWASIFile(path, content);
  }
  return fs;
}
