[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / TrackedFileSystem

# Class: TrackedFileSystem

Defined in: [packages/sandbox-executor/src/fs/tracked-fs.ts:33](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/tracked-fs.ts#L33)

TrackedFileSystem wraps a standard WASIFS object to monitor changes and enforce permissions.

It uses a JavaScript Proxy to intercept set and delete operations,
allowing it to record 'create', 'modify', and 'delete' events in real-time.
It also maintains an initial snapshot to perform a final diff, ensuring no
changes are missed.

Permissions are checked for every operation through the provided PermissionResolver.

## Constructors

### Constructor

> **new TrackedFileSystem**(`fs`, `permissionResolver`, `onDenied`): `TrackedFileSystem`

Defined in: [packages/sandbox-executor/src/fs/tracked-fs.ts:44](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/tracked-fs.ts#L44)

Creates a new TrackedFileSystem.

#### Parameters

##### fs

[`WASIFS`](../type-aliases/WASIFS.md)

The underlying WASIFS object.

##### permissionResolver

[`PermissionResolver`](PermissionResolver.md)

The resolver to check permissions against.

##### onDenied

[`PermissionDeniedBehavior`](../type-aliases/PermissionDeniedBehavior.md) = `'throw'`

Behavior when a permission is denied ('throw', 'ignore', 'virtual').

#### Returns

`TrackedFileSystem`

## Methods

### diffWithOriginal()

> **diffWithOriginal**(`fs`): `void`

Defined in: [packages/sandbox-executor/src/fs/tracked-fs.ts:155](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/tracked-fs.ts#L155)

Performs a deep comparison between the current state and the initial snapshot.
This is used to detect changes that might have bypassed the Proxy traps.

#### Parameters

##### fs

[`WASIFS`](../type-aliases/WASIFS.md) = `...`

Optional FS to compare against. If not provided, uses the tracked fs.

#### Returns

`void`

***

### getChanges()

> **getChanges**(): `object`

Defined in: [packages/sandbox-executor/src/fs/tracked-fs.ts:129](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/tracked-fs.ts#L129)

Returns a summary of all recorded changes and permission denials.

#### Returns

`object`

##### created

> **created**: [`FileChange`](../interfaces/FileChange.md)[]

##### deleted

> **deleted**: [`FileChange`](../interfaces/FileChange.md)[]

##### denied

> **denied**: [`PermissionDeniedRecord`](../interfaces/PermissionDeniedRecord.md)[]

##### modified

> **modified**: [`FileChange`](../interfaces/FileChange.md)[]

***

### getProxy()

> **getProxy**(): [`WASIFS`](../type-aliases/WASIFS.md)

Defined in: [packages/sandbox-executor/src/fs/tracked-fs.ts:57](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/tracked-fs.ts#L57)

Returns a Proxy that intercepts file system operations.
This proxy should be passed to the WASI runner.

#### Returns

[`WASIFS`](../type-aliases/WASIFS.md)

The proxied WASIFS object.
