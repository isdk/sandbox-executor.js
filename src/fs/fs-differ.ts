import type { WASIFS, WASIFile } from '../types';
import type { FileChange, PermissionDeniedRecord, Permission } from '../types';
import { PermissionResolver } from './permission-resolver';

export interface DiffResult {
  created: FileChange[];
  modified: FileChange[];
  deleted: FileChange[];
  denied: PermissionDeniedRecord[];
}

export class FileSystemDiffer {
  private permissionResolver: PermissionResolver;
  private denied: PermissionDeniedRecord[] = [];

  constructor(permissionResolver?: PermissionResolver) {
    this.permissionResolver = permissionResolver ?? PermissionResolver.allowAll();
  }

  /**
   * 创建文件系统快照（深拷贝）
   */
  static snapshot(fs: WASIFS): WASIFS {
    const snapshot: WASIFS = {};

    for (const [path, file] of Object.entries(fs)) {
      snapshot[path] = {
        path: file.path,
        content: FileSystemDiffer.cloneContent(file.content),
        mode: file.mode,
        timestamps: {
          access: new Date(file.timestamps.access),
          modification: new Date(file.timestamps.modification),
          change: new Date(file.timestamps.change),
        },
      } as any;
    }

    return snapshot;
  }

  /**
   * 克隆文件内容
   */
  private static cloneContent(content: string | Uint8Array): string | Uint8Array {
    if (typeof content === 'string') {
      return content;
    }
    return new Uint8Array(content);
  }

  /**
   * 对比两个文件系统，返回差异
   */
  diff(original: WASIFS, current: WASIFS): DiffResult {
    const created: FileChange[] = [];
    const modified: FileChange[] = [];
    const deleted: FileChange[] = [];

    const originalPaths = new Set(Object.keys(original));
    const currentPaths = new Set(Object.keys(current));

    // 检测创建和修改
    for (const path of currentPaths) {
      const currentFile = current[path];

      if (!originalPaths.has(path)) {
        // 新文件
        if (this.checkPermission(path, 'create')) {
          created.push(this.createChange('create', path, currentFile));
        }
      } else {
        // 可能修改了
        const originalFile = original[path];
        if (this.hasContentChanged(originalFile, currentFile)) {
          if (this.checkPermission(path, 'modify')) {
            modified.push(this.createChange('modify', path, currentFile, originalFile));
          }
        }
      }
    }

    // 检测删除
    for (const path of originalPaths) {
      if (!currentPaths.has(path)) {
        if (this.checkPermission(path, 'delete')) {
          deleted.push(this.createChange('delete', path, undefined, original[path]));
        }
      }
    }

    return {
      created,
      modified,
      deleted,
      denied: this.denied,
    };
  }

  /**
   * 检查内容是否变化
   */
  private hasContentChanged(original: WASIFile, current: WASIFile): boolean {
    const origContent = original.content;
    const currContent = current.content;

    if (typeof origContent !== typeof currContent) {
      return true;
    }

    if (typeof origContent === 'string') {
      return origContent !== currContent;
    }

    // Uint8Array 比较
    const origBytes = origContent as Uint8Array;
    const currBytes = currContent as Uint8Array;

    if (origBytes.length !== currBytes.length) {
      return true;
    }

    for (let i = 0; i < origBytes.length; i++) {
      if (origBytes[i] !== currBytes[i]) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查权限
   */
  private checkPermission(path: string, operation: Permission): boolean {
    const allowed = this.permissionResolver.check(path, operation);

    if (!allowed) {
      this.denied.push({
        path,
        operation,
        timestamp: new Date(),
      });
    }

    return allowed;
  }

  /**
   * 创建变更记录
   */
  private createChange(
    type: 'create' | 'modify' | 'delete',
    path: string,
    currentFile?: WASIFile,
    originalFile?: WASIFile
  ): FileChange {
    return {
      type,
      path,
      content: currentFile ? this.extractContent(currentFile) : undefined,
      oldContent: originalFile ? this.extractContent(originalFile) : undefined,
      size: currentFile ? this.getContentSize(currentFile) : 0,
      timestamp: new Date(),
    };
  }

  /**
   * 提取文件内容为 Uint8Array
   */
  private extractContent(file: WASIFile): Uint8Array {
    if (typeof file.content === 'string') {
      return new TextEncoder().encode(file.content);
    }
    return file.content;
  }

  /**
   * 获取内容大小
   */
  private getContentSize(file: WASIFile): number {
    if (typeof file.content === 'string') {
      return new TextEncoder().encode(file.content).length;
    }
    return file.content.length;
  }
}
