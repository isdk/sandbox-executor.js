import type { WASIFS, WASIFile } from '../types';

export interface FSBuilderOptions {
  workdir: string;
}

/**
 * Helper class to construct an initial WASIFS file system image.
 * 
 * It provides methods to add files from memory (strings or Uint8Arrays)
 * and to load entire directory structures from the host disk.
 */
export class FSBuilder {
  private fs: WASIFS = {};
  private workdir: string;

  /**
   * Creates a new FSBuilder instance.
   * @param options - Configuration including the default working directory.
   */
  constructor(options: FSBuilderOptions) {
    this.workdir = this.normalizeWorkdir(options.workdir);
  }

  /**
   * Adds an entry file (the main script to be executed).
   * 
   * @param filename - Name of the file (relative to workdir or absolute).
   * @param content - Source code string.
   * @returns The FSBuilder instance for chaining.
   */
  addEntryFile(filename: string, content: string): this {
    const path = this.resolvePath(filename);
    this.fs[path] = this.createFile(path, content);
    return this;
  }

  /**
   * Adds virtual files from a record object.
   * 
   * @param files - Map of virtual paths to content (string or Uint8Array).
   * @returns The FSBuilder instance for chaining.
   */
  addFiles(files: Record<string, string | Uint8Array>): this {
    for (const [name, content] of Object.entries(files)) {
      const path = this.resolvePath(name);
      this.fs[path] = this.createFile(path, content);
    }
    return this;
  }

  /**
   * Loads files from the host disk into the virtual file system.
   * Only available in Node.js environments.
   * 
   * @param virtualPath - The target directory in the virtual file system.
   * @param realPath - The source directory on the host disk.
   * @param options - Loading constraints like max file size or exclusion patterns.
   * @returns A promise resolving to the FSBuilder instance.
   */
  async loadFromDisk(
    virtualPath: string,
    realPath: string,
    options?: {
      /** Maximum size of an individual file in bytes. */
      maxFileSize?: number;
      /** Maximum total size of all loaded files in bytes. */
      maxTotalSize?: number;
      /** Glob patterns of files or directories to exclude. */
      exclude?: string[];
    }
  ): Promise<this> {
    if (typeof process === 'undefined' || !process.versions?.node) {
      console.warn('loadFromDisk is only available in Node.js environment');
      return this;
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    const { minimatch } = await import('minimatch');

    let totalSize = 0;
    const maxTotal = options?.maxTotalSize ?? Infinity;
    const maxFile = options?.maxFileSize ?? Infinity;

    const walk = async (dir: string, virtualDir: string): Promise<void> => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (e) {
        console.warn(`Failed to read directory ${dir}:`, e);
        return;
      }

      for (const entry of entries) {
        const realEntryPath = path.join(dir, entry.name);
        const virtualEntryPath = this.joinPath(virtualDir, entry.name);

        if (options?.exclude?.some(p => minimatch(entry.name, p))) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(realEntryPath, virtualEntryPath);
        } else if (entry.isFile()) {
          try {
            const stat = await fs.stat(realEntryPath);

            if (stat.size > maxFile) {
              console.warn(`Skipping ${realEntryPath}: exceeds maxFileSize (${stat.size} > ${maxFile})`);
              continue;
            }

            if (totalSize + stat.size > maxTotal) {
              console.warn(`Skipping ${realEntryPath}: would exceed maxTotalSize`);
              continue;
            }

            const content = await fs.readFile(realEntryPath);
            this.fs[virtualEntryPath] = this.createFile(virtualEntryPath, content);
            totalSize += stat.size;
          } catch (e) {
            console.warn(`Failed to read file ${realEntryPath}:`, e);
          }
        }
      }
    };

    await walk(realPath, virtualPath);
    return this;
  }

  /**
   * Builds and returns a snapshot of the current WASIFS object.
   * @returns A shallow copy of the internal WASIFS mapping.
   */
  build(): WASIFS {
    return { ...this.fs };
  }

  /**
   * Clears all files from the internal file system representation.
   * @returns The FSBuilder instance for chaining.
   */
  clear(): this {
    this.fs = {};
    return this;
  }

  /**
   * 规范化工作目录
   */
  private normalizeWorkdir(workdir: string): string {
    // 移除尾部斜杠（除非是根目录）
    if (workdir.length > 1 && workdir.endsWith('/')) {
      return workdir.slice(0, -1);
    }
    return workdir;
  }

  /**
   * 解析文件路径
   */
  private resolvePath(name: string): string {
    // 绝对路径直接返回
    if (name.startsWith('/')) {
      return name;
    }
    return this.joinPath(this.workdir, name);
  }

  /**
   * 连接路径，正确处理根目录
   */
  private joinPath(base: string, name: string): string {
    if (base === '/') {
      return `/${name}`;
    }
    return `${base}/${name}`;
  }

  private createFile(path: string, content: string | Uint8Array | Buffer) {
    const now = new Date();
    const isString = typeof content === 'string';

    let finalContent: string | Uint8Array;
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(content)) {
      finalContent = new Uint8Array(content);
    } else {
      finalContent = content as string | Uint8Array;
    }

    return {
      path,
      content: finalContent,
      mode: isString ? 'string' : 'binary',
      timestamps: {
        access: now,
        modification: now,
        change: now,
      },
    } as WASIFile;
  }
}
