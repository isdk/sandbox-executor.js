import { minimatch } from 'minimatch';
import type {
  Permission,
  PermissionConfig,
  PermissionRule,
  PermissionSet,
} from '../types';

/**
 * Result of a path permission resolution.
 */
export interface ResolvedPermission {
  /** Permission to read file content. */
  read: boolean;
  /** Permission to list directory contents. */
  list: boolean;
  /** Permission to create new files or directories. */
  create: boolean;
  /** Permission to modify existing files. */
  modify: boolean;
  /** Permission to delete files or directories. */
  delete: boolean;
  /** The rule that was matched, if any. */
  matchedRule?: PermissionRule;
}

const DEFAULT_EXCLUDE_PRIORITY = 1000;

/**
 * Resolves file system permissions for specific paths based on glob patterns.
 * 
 * It supports:
 * - Default permission sets.
 * - Prioritized rules with 'allow' and 'deny' lists.
 * - Exclusion patterns (highest priority).
 * - Glob pattern matching using minimatch.
 */
export class PermissionResolver {
  private rules: PermissionRule[];
  private defaultPerms: Required<PermissionSet>;
  private isAllowAll: boolean;

  /**
   * Creates a new PermissionResolver.
   * @param config - The permission configuration rules and defaults.
   * @param allowAll - If true, bypasses all rules and allows all operations.
   */
  constructor(config?: PermissionConfig, allowAll = false) {
    // ...
    this.isAllowAll = allowAll;

    if (allowAll) {
      // 全开放模式：所有权限都允许
      this.defaultPerms = {
        read: true,
        list: true,
        create: true,
        modify: true,
        delete: true,
      };
      this.rules = [];
    } else {
      // 正常模式：使用配置或默认值
      this.defaultPerms = {
        read: config?.default?.read ?? true,
        list: config?.default?.list ?? true,
        create: config?.default?.create ?? false,
        modify: config?.default?.modify ?? false,
        delete: config?.default?.delete ?? false,
      };
      this.rules = this.buildRules(config);
    }
  }

  /**
   * Creates a resolver that allows all operations on all paths.
   */
  static allowAll(): PermissionResolver {
    return new PermissionResolver(undefined, true);
  }

  /**
   * Creates a resolver that only allows read and list operations by default.
   */
  static readOnly(): PermissionResolver {
    return new PermissionResolver({
      default: { read: true, list: true, create: false, modify: false, delete: false },
    });
  }

  /**
   * Resolves the full set of permissions for a given path.
   * @param path - The virtual path to check.
   * @returns The resolved permissions for the path.
   */
  resolve(path: string): ResolvedPermission {
    // 全开放模式直接返回
    if (this.isAllowAll) {
      return { ...this.defaultPerms };
    }

    const normalizedPath = this.normalizePath(path);
    const result: ResolvedPermission = { ...this.defaultPerms };
    let matchedRule: PermissionRule | undefined;

    for (const rule of this.rules) {
      if (this.matchPattern(normalizedPath, rule.pattern)) {
        this.applyRule(result, rule);
        matchedRule = rule;
        break;
      }
    }

    result.matchedRule = matchedRule;
    return result;
  }

  /**
   * Checks if a specific operation is allowed on a path.
   * @param path - The virtual path to check.
   * @param operation - The operation to validate.
   * @returns True if allowed, false otherwise.
   */
  check(path: string, operation: Permission): boolean {
    if (this.isAllowAll) return true;
    return this.resolve(path)[operation];
  }

  private buildRules(config?: PermissionConfig): PermissionRule[] {
    const rules: PermissionRule[] = [...(config?.rules ?? [])];

    if (config?.exclude) {
      for (const pattern of config.exclude) {
        const normalizedPattern = pattern.includes('/')
          ? pattern
          : `**/${pattern}/**`;
        rules.push({
          pattern: normalizedPattern,
          deny: '*',
          priority: DEFAULT_EXCLUDE_PRIORITY,
        });
      }
    }

    return rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  private normalizePath(path: string): string {
    return path.replace(/^\/+/, '');
  }

  private matchPattern(path: string, pattern: string): boolean {
    const normalizedPattern = pattern.replace(/^\/+/, '');
    return minimatch(path, normalizedPattern, { dot: true });
  }

  private applyRule(perms: ResolvedPermission, rule: PermissionRule): void {
    if (rule.deny) {
      const denyList: Permission[] = rule.deny === '*'
        ? ['read', 'list', 'create', 'modify', 'delete']
        : rule.deny;
      for (const perm of denyList) {
        perms[perm] = false;
      }
    }

    if (rule.allow) {
      const allowList: Permission[] = rule.allow === '*'
        ? ['read', 'list', 'create', 'modify', 'delete']
        : rule.allow;
      for (const perm of allowList) {
        perms[perm] = true;
      }
    }
  }
}
