import { minimatch } from 'minimatch';
import type {
  Permission,
  PermissionConfig,
  PermissionRule,
  PermissionSet,
} from '../types';

export interface ResolvedPermission {
  read: boolean;
  list: boolean;
  create: boolean;
  modify: boolean;
  delete: boolean;
  matchedRule?: PermissionRule;
}

const DEFAULT_EXCLUDE_PRIORITY = 1000;

export class PermissionResolver {
  private rules: PermissionRule[];
  private defaultPerms: Required<PermissionSet>;
  private isAllowAll: boolean;

  constructor(config?: PermissionConfig, allowAll = false) {
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
   * 创建全开放权限解析器（用于纯虚拟模式）
   */
  static allowAll(): PermissionResolver {
    return new PermissionResolver(undefined, true);
  }

  /**
   * 创建默认只读权限解析器
   */
  static readOnly(): PermissionResolver {
    return new PermissionResolver({
      default: { read: true, list: true, create: false, modify: false, delete: false },
    });
  }

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
