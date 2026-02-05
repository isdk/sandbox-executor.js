[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / ResultOptions

# Interface: ResultOptions

Defined in: [packages/sandbox-executor/src/types/request.ts:123](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L123)

Options for customizing the execution result.

## Properties

### includeChanges?

> `optional` **includeChanges**: `boolean`

Defined in: [packages/sandbox-executor/src/types/request.ts:125](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L125)

Whether to include file changes in the result. Defaults to true.

***

### includeContents?

> `optional` **includeContents**: `boolean`

Defined in: [packages/sandbox-executor/src/types/request.ts:127](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L127)

Whether to include file contents in the changes. Defaults to true.

***

### includeDenied?

> `optional` **includeDenied**: `boolean`

Defined in: [packages/sandbox-executor/src/types/request.ts:129](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L129)

Whether to include permission denied records. Defaults to true.
