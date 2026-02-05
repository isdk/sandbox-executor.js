[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / FileChangeSummary

# Interface: FileChangeSummary

Defined in: [packages/sandbox-executor/src/types/request.ts:200](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L200)

Collection of all file system changes and denials.

## Properties

### created

> **created**: [`FileChange`](FileChange.md)[]

Defined in: [packages/sandbox-executor/src/types/request.ts:202](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L202)

Files that were created

***

### deleted

> **deleted**: [`FileChange`](FileChange.md)[]

Defined in: [packages/sandbox-executor/src/types/request.ts:206](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L206)

Files that were deleted

***

### denied

> **denied**: [`PermissionDeniedRecord`](PermissionDeniedRecord.md)[]

Defined in: [packages/sandbox-executor/src/types/request.ts:208](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L208)

Permission denial events

***

### modified

> **modified**: [`FileChange`](FileChange.md)[]

Defined in: [packages/sandbox-executor/src/types/request.ts:204](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L204)

Files that were modified

## Methods

### all()

> **all**(): [`FileChange`](FileChange.md)[]

Defined in: [packages/sandbox-executor/src/types/request.ts:212](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L212)

Returns a flattened list of all successful changes.

#### Returns

[`FileChange`](FileChange.md)[]

***

### byPath()

> **byPath**(`path`): [`FileChange`](FileChange.md) \| `undefined`

Defined in: [packages/sandbox-executor/src/types/request.ts:214](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L214)

Finds a change by its virtual path.

#### Parameters

##### path

`string`

#### Returns

[`FileChange`](FileChange.md) \| `undefined`

***

### hasChanges()

> **hasChanges**(): `boolean`

Defined in: [packages/sandbox-executor/src/types/request.ts:210](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L210)

Returns true if there are any created, modified, or deleted files.

#### Returns

`boolean`
