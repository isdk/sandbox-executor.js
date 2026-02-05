[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / SyncResult

# Interface: SyncResult

Defined in: [packages/sandbox-executor/src/types/request.ts:230](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L230)

Result of a file synchronization operation.

## Properties

### failed

> **failed**: `object`[]

Defined in: [packages/sandbox-executor/src/types/request.ts:234](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L234)

Paths that failed to sync with their respective errors.

#### error

> **error**: `Error`

#### path

> **path**: `string`

***

### skipped

> **skipped**: `string`[]

Defined in: [packages/sandbox-executor/src/types/request.ts:236](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L236)

Paths that were skipped (e.g., due to configuration or events).

***

### synced

> **synced**: `string`[]

Defined in: [packages/sandbox-executor/src/types/request.ts:232](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L232)

Paths that were successfully synced.
