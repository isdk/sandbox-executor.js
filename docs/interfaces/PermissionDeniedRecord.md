[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / PermissionDeniedRecord

# Interface: PermissionDeniedRecord

Defined in: [packages/sandbox-executor/src/types/request.ts:186](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L186)

Record of a permission denial event.

## Properties

### operation

> **operation**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:190](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L190)

Operation that was attempted (read, create, etc.)

***

### path

> **path**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:188](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L188)

Path where permission was denied

***

### rule?

> `optional` **rule**: [`PermissionRule`](PermissionRule.md)

Defined in: [packages/sandbox-executor/src/types/request.ts:192](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L192)

The rule that triggered the denial, if any

***

### timestamp

> **timestamp**: `Date`

Defined in: [packages/sandbox-executor/src/types/request.ts:194](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L194)

Timestamp of the event
