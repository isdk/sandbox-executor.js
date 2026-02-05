import type { WASIFS, WASIFile } from '../types';

export interface FSBuilderOptions {
  workdir: string;
}

export class FSBuilder {
  private fs: WASIFS = {};
  private workdir: string;

  constructor(options: FSBuilderOptions) {
    this.workdir = options.workdir;
  }

  /**
   * Add entry file (main script)
   */
  addEntryFile(filename: string, content: string): this {
    const path = this.resolvePath(filename);
    this.fs[path] = this.createFile(path, content);
    return this;
  }

  /**
   * Add virtual files
   */
  addFiles(files: Record<string, string | Uint8Array>): this {
    for (const [name, content] of Object.entries(files)) {
      const path = this.resolvePath(name);
      this.fs[path] = this.createFile(path, content);
    }
    return this;
  }

  /**
   * Load files from real filesystem (Node.js only)
   */
  async loadFromDisk(
    virtualPath: string,
    realPath: string,
    options?: {
      maxFileSize?: number;
      maxTotalSize?: number;
      exclude?: string[];
    }
  ): Promise<this> {
    // Check if we're in Node.js environment
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
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const realEntryPath = path.join(dir, entry.name);
        const virtualEntryPath = `${virtualDir}/${entry.name}`;

        // Check exclude patterns
        if (options?.exclude?.some(p => minimatch(entry.name, p))) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(realEntryPath, virtualEntryPath);
        } else if (entry.isFile()) {
          const stat = await fs.stat(realEntryPath);

          if (stat.size > maxFile) {
            console.warn(`Skipping ${realEntryPath}: exceeds maxFileSize`);
            continue;
          }

          if (totalSize + stat.size > maxTotal) {
            console.warn(`Skipping ${realEntryPath}: would exceed maxTotalSize`);
            continue;
          }

          const content = await fs.readFile(realEntryPath);
          this.fs[virtualEntryPath] = this.createFile(virtualEntryPath, content);
          totalSize += stat.size;
        }
        // Skip symlinks, devices, etc.
      }
    };

    await walk(realPath, virtualPath);
    return this;
  }

  build(): WASIFS {
    return this.fs;
  }

  private resolvePath(name: string): string {
    if (name.startsWith('/')) {
      return name;
    }
    return `${this.workdir}/${name}`;
  }

  private createFile(path: string, content: string | Uint8Array) {
    const now = new Date();
    const isString = typeof content === 'string';

    return {
      path,
      content: content,
      mode: isString ? 'string' : 'binary',
      timestamps: {
        access: now,
        modification: now,
        change: now,
      },
    } as WASIFile;
  }
}
