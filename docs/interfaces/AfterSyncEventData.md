[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / AfterSyncEventData

# Interface: AfterSyncEventData

Defined in: [packages/sandbox-executor/src/types/events.ts:16](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/events.ts#L16)

Represents a single file system change.

## Extends

- [`FileChange`](FileChange.md)

## Properties

### content?

> `optional` **content**: `Uint8Array`\<`ArrayBufferLike`\>

Defined in: [packages/sandbox-executor/src/types/request.ts:174](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L174)

New content of the file

#### Inherited from

[`FileChange`](FileChange.md).[`content`](FileChange.md#content)

***

### error?

> `optional` **error**: `Error`

Defined in: [packages/sandbox-executor/src/types/events.ts:18](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/events.ts#L18)

***

### oldContent?

> `optional` **oldContent**: `Uint8Array`\<`ArrayBufferLike`\>

Defined in: [packages/sandbox-executor/src/types/request.ts:176](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L176)

Original content before modification (if applicable)

#### Inherited from

[`FileChange`](FileChange.md).[`oldContent`](FileChange.md#oldcontent)

***

### path

> **path**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:170](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L170)

Virtual path in the sandbox

#### Inherited from

[`FileChange`](FileChange.md).[`path`](FileChange.md#path)

***

### realPath?

> `optional` **realPath**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:172](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L172)

Real path on the host (if synced)

#### Inherited from

[`FileChange`](FileChange.md).[`realPath`](FileChange.md#realpath)

***

### size

> **size**: `number`

Defined in: [packages/sandbox-executor/src/types/request.ts:178](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L178)

Size of the file in bytes

#### Inherited from

[`FileChange`](FileChange.md).[`size`](FileChange.md#size)

***

### success

> **success**: `boolean`

Defined in: [packages/sandbox-executor/src/types/events.ts:17](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/events.ts#L17)

***

### timestamp

> **timestamp**: `Date`

Defined in: [packages/sandbox-executor/src/types/request.ts:180](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L180)

Timestamp of the change

#### Inherited from

[`FileChange`](FileChange.md).[`timestamp`](FileChange.md#timestamp)

***

### type

> **type**: `"create"` \| `"modify"` \| `"delete"`

Defined in: [packages/sandbox-executor/src/types/request.ts:168](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L168)

Type of change

#### Inherited from

[`FileChange`](FileChange.md).[`type`](FileChange.md#type)
