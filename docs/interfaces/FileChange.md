[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / FileChange

# Interface: FileChange

Defined in: [packages/sandbox-executor/src/types/request.ts:166](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L166)

Represents a single file system change.

## Extended by

- [`AfterSyncEventData`](AfterSyncEventData.md)

## Properties

### content?

> `optional` **content**: `Uint8Array`\<`ArrayBufferLike`\>

Defined in: [packages/sandbox-executor/src/types/request.ts:174](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L174)

New content of the file

***

### oldContent?

> `optional` **oldContent**: `Uint8Array`\<`ArrayBufferLike`\>

Defined in: [packages/sandbox-executor/src/types/request.ts:176](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L176)

Original content before modification (if applicable)

***

### path

> **path**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:170](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L170)

Virtual path in the sandbox

***

### realPath?

> `optional` **realPath**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:172](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L172)

Real path on the host (if synced)

***

### size

> **size**: `number`

Defined in: [packages/sandbox-executor/src/types/request.ts:178](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L178)

Size of the file in bytes

***

### timestamp

> **timestamp**: `Date`

Defined in: [packages/sandbox-executor/src/types/request.ts:180](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L180)

Timestamp of the change

***

### type

> **type**: `"create"` \| `"modify"` \| `"delete"`

Defined in: [packages/sandbox-executor/src/types/request.ts:168](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L168)

Type of change
