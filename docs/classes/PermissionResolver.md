[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / PermissionResolver

# Class: PermissionResolver

Defined in: [packages/sandbox-executor/src/fs/permission-resolver.ts:38](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/permission-resolver.ts#L38)

Resolves file system permissions for specific paths based on glob patterns.

It supports:
- Default permission sets.
- Prioritized rules with 'allow' and 'deny' lists.
- Exclusion patterns (highest priority).
- Glob pattern matching using minimatch.

## Constructors

### Constructor

> **new PermissionResolver**(`config?`, `allowAll?`): `PermissionResolver`

Defined in: [packages/sandbox-executor/src/fs/permission-resolver.ts:48](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/permission-resolver.ts#L48)

Creates a new PermissionResolver.

#### Parameters

##### config?

[`PermissionConfig`](../interfaces/PermissionConfig.md)

The permission configuration rules and defaults.

##### allowAll?

`boolean` = `false`

If true, bypasses all rules and allows all operations.

#### Returns

`PermissionResolver`

## Methods

### check()

> **check**(`path`, `operation`): `boolean`

Defined in: [packages/sandbox-executor/src/fs/permission-resolver.ts:124](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/permission-resolver.ts#L124)

Checks if a specific operation is allowed on a path.

#### Parameters

##### path

`string`

The virtual path to check.

##### operation

The operation to validate.

`"read"` | `"list"` | `"create"` | `"modify"` | `"delete"`

#### Returns

`boolean`

True if allowed, false otherwise.

***

### resolve()

> **resolve**(`path`): `ResolvedPermission`

Defined in: [packages/sandbox-executor/src/fs/permission-resolver.ts:96](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/permission-resolver.ts#L96)

Resolves the full set of permissions for a given path.

#### Parameters

##### path

`string`

The virtual path to check.

#### Returns

`ResolvedPermission`

The resolved permissions for the path.

***

### allowAll()

> `static` **allowAll**(): `PermissionResolver`

Defined in: [packages/sandbox-executor/src/fs/permission-resolver.ts:78](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/permission-resolver.ts#L78)

Creates a resolver that allows all operations on all paths.

#### Returns

`PermissionResolver`

***

### readOnly()

> `static` **readOnly**(): `PermissionResolver`

Defined in: [packages/sandbox-executor/src/fs/permission-resolver.ts:85](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/permission-resolver.ts#L85)

Creates a resolver that only allows read and list operations by default.

#### Returns

`PermissionResolver`
