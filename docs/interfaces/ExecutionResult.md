[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / ExecutionResult

# Interface: ExecutionResult\<T\>

Defined in: [packages/sandbox-executor/src/types/request.ts:25](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L25)

Result of the function call execution.

## Type Parameters

### T

`T` = `unknown`

The expected type of the function's return value.

## Properties

### error?

> `optional` **error**: [`ExecutionError`](ExecutionError.md)

Defined in: [packages/sandbox-executor/src/types/request.ts:49](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L49)

Error details if success is false.

***

### exitCode

> **exitCode**: `number`

Defined in: [packages/sandbox-executor/src/types/request.ts:64](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L64)

Process exit code.

***

### files?

> `optional` **files**: [`FileChangeSummary`](FileChangeSummary.md)

Defined in: [packages/sandbox-executor/src/types/request.ts:69](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L69)

Summary of file changes if tracked.

***

### meta?

> `optional` **meta**: [`ExecutionMeta`](ExecutionMeta.md)

Defined in: [packages/sandbox-executor/src/types/request.ts:74](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L74)

Metadata about the execution.

***

### result?

> `optional` **result**: `T`

Defined in: [packages/sandbox-executor/src/types/request.ts:44](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L44)

The value returned by the function.

***

### status

> **status**: [`ExecutionStatus`](../type-aliases/ExecutionStatus.md)

Defined in: [packages/sandbox-executor/src/types/request.ts:34](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L34)

Execution status.
- `success`: Function executed and returned successfully.
- `error`: Function execution threw an exception.
- `crash`: The sandbox environment crashed.
- `timeout`: Execution exceeded the time limit.
- `terminated`: Execution was manually terminated.

***

### stderr

> **stderr**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:59](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L59)

Standard error (stderr) captured during execution.

***

### stdout

> **stdout**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:54](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L54)

Standard output (stdout) captured during execution.

***

### success

> **success**: `boolean`

Defined in: [packages/sandbox-executor/src/types/request.ts:39](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L39)

Whether the execution was successful (status is 'success').
