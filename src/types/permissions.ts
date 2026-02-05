// src/types/permissions.ts

export const ALL_PERMISSIONS = [
  'read', 'list', 'create', 'modify', 'delete'
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export interface PermissionSet {
  read?: boolean;
  list?: boolean;
  create?: boolean;
  modify?: boolean;
  delete?: boolean;
}

export interface PermissionRule {
  pattern: string;
  allow?: Permission[] | '*';
  deny?: Permission[] | '*';
  priority?: number;
}

export interface PermissionConfig {
  default?: PermissionSet;
  rules?: PermissionRule[];
  exclude?: string[];
}
