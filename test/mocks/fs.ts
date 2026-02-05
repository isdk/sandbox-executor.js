import { vi } from 'vitest';

export function createMockNodeFS() {
  const files = new Map<string, Buffer>();
  const dirs = new Set<string>();

  return {
    files,
    dirs,

    promises: {
      readFile: vi.fn(async (path: string) => {
        const content = files.get(path);
        if (!content) throw new Error(`ENOENT: ${path}`);
        return content;
      }),

      writeFile: vi.fn(async (path: string, content: Buffer | Uint8Array) => {
        files.set(path, Buffer.from(content));
      }),

      unlink: vi.fn(async (path: string) => {
        if (!files.has(path)) throw new Error(`ENOENT: ${path}`);
        files.delete(path);
      }),

      mkdir: vi.fn(async (path: string, options?: { recursive?: boolean }) => {
        dirs.add(path);
      }),

      readdir: vi.fn(async (path: string, options?: { withFileTypes?: boolean }) => {
        return [];
      }),

      stat: vi.fn(async (path: string) => {
        return { size: files.get(path)?.length ?? 0 };
      }),
    },

    reset() {
      files.clear();
      dirs.clear();
    },
  };
}
