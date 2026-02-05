import type { WASIFS, WASIFile } from '../types';
import type {
  FileChange,
  PermissionDeniedRecord,
  Permission,
  PermissionDeniedBehavior,
} from '../types';
import { PermissionResolver } from './permission-resolver';

export class PermissionDeniedError extends Error {
  constructor(
    public readonly path: string,
    public readonly operation: Permission
  ) {
    super(`Permission denied: ${operation} on ${path}`);
    this.name = 'PermissionDeniedError';
  }
}

export class TrackedFileSystem {
  private originalHashes = new Map<string, string>();
  private changes = new Map<string, FileChange>();
  private deniedRecords: PermissionDeniedRecord[] = [];

  constructor(
    private fs: WASIFS,
    private permissionResolver: PermissionResolver,
    private onDenied: PermissionDeniedBehavior = 'throw'
  ) {
    this.takeSnapshot();
  }

  getProxy(): WASIFS {
    const self = this;

    return new Proxy(this.fs, {
      get(target, prop: string) {
        // Handle special properties
        if (typeof prop === 'symbol' || prop === 'then') {
          return undefined;
        }
        return target[prop];
      },

      set(target, path: string, file: WASIFile) {
        if (typeof path !== 'string') return false;

        const isNew = !(path in target);
        const operation: Permission = isNew ? 'create' : 'modify';

        if (!self.handlePermissionCheck(path, operation)) {
          return true;
        }

        self.recordChange(path, file, isNew, target[path]);
        target[path] = file;
        return true;
      },

      deleteProperty(target, path: string) {
        if (typeof path !== 'string') return false;

        if (!self.handlePermissionCheck(path, 'delete')) {
          return true;
        }

        if (path in target) {
          self.changes.set(path, {
            type: 'delete',
            path,
            oldContent: self.extractContent(target[path]),
            size: 0,
            timestamp: new Date(),
          });
          delete target[path];
        }
        return true;
      },

      ownKeys(target) {
        return Object.keys(target);
      },

      has(target, prop) {
        return prop in target;
      },

      getOwnPropertyDescriptor(target, prop) {
        if (prop in target) {
          return {
            enumerable: true,
            configurable: true,
            value: target[prop as string],
          };
        }
        return undefined;
      },
    });
  }

  getChanges(): {
    created: FileChange[];
    modified: FileChange[];
    deleted: FileChange[];
    denied: PermissionDeniedRecord[];
  } {
    const created: FileChange[] = [];
    const modified: FileChange[] = [];
    const deleted: FileChange[] = [];

    for (const change of this.changes.values()) {
      switch (change.type) {
        case 'create': created.push(change); break;
        case 'modify': modified.push(change); break;
        case 'delete': deleted.push(change); break;
      }
    }

    return { created, modified, deleted, denied: [...this.deniedRecords] };
  }

  /**
   * Diff with original snapshot (catches changes missed by Proxy)
   */
  diffWithOriginal(): void {
    const currentPaths = new Set(Object.keys(this.fs));
    const originalPaths = new Set(this.originalHashes.keys());

    // Detect new files
    for (const path of currentPaths) {
      if (!originalPaths.has(path) && !this.changes.has(path)) {
        const file = this.fs[path];
        this.changes.set(path, {
          type: 'create',
          path,
          content: this.extractContent(file),
          size: this.getFileSize(file),
          timestamp: new Date(),
        });
      }
    }

    // Detect deleted files
    for (const path of originalPaths) {
      if (!currentPaths.has(path) && !this.changes.has(path)) {
        this.changes.set(path, {
          type: 'delete',
          path,
          size: 0,
          timestamp: new Date(),
        });
      }
    }

    // Detect modified files
    for (const path of currentPaths) {
      if (originalPaths.has(path) && !this.changes.has(path)) {
        const currentHash = this.hashFile(this.fs[path]);
        const originalHash = this.originalHashes.get(path);
        if (currentHash !== originalHash) {
          this.changes.set(path, {
            type: 'modify',
            path,
            content: this.extractContent(this.fs[path]),
            size: this.getFileSize(this.fs[path]),
            timestamp: new Date(),
          });
        }
      }
    }
  }

  private takeSnapshot(): void {
    for (const [path, file] of Object.entries(this.fs)) {
      this.originalHashes.set(path, this.hashFile(file));
    }
  }

  private handlePermissionCheck(path: string, operation: Permission): boolean {
    const allowed = this.permissionResolver.check(path, operation);

    if (!allowed) {
      const record: PermissionDeniedRecord = {
        path,
        operation,
        timestamp: new Date(),
      };
      this.deniedRecords.push(record);

      switch (this.onDenied) {
        case 'throw':
          throw new PermissionDeniedError(path, operation);
        case 'ignore':
          return false;
        case 'virtual':
          return true; // Allow in virtual FS, skip sync later
      }
    }

    return true;
  }

  private recordChange(
    path: string,
    file: WASIFile,
    isNew: boolean,
    oldFile?: WASIFile
  ): void {
    this.changes.set(path, {
      type: isNew ? 'create' : 'modify',
      path,
      content: this.extractContent(file),
      oldContent: oldFile ? this.extractContent(oldFile) : undefined,
      size: this.getFileSize(file),
      timestamp: new Date(),
    });
  }

  private extractContent(file: WASIFile): Uint8Array {
    if (file.mode === 'string') {
      return new TextEncoder().encode(file.content as string);
    }
    return file.content as Uint8Array;
  }

  private getFileSize(file: WASIFile): number {
    return this.extractContent(file).byteLength;
  }

  private hashFile(file: WASIFile): string {
    const content = this.extractContent(file);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content[i];
      hash |= 0;
    }
    return hash.toString(16);
  }
}
