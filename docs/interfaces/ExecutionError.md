[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / ExecutionError

# Interface: ExecutionError

Defined in: [packages/sandbox-executor/src/types/request.ts:12](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L12)

Detailed error information from execution.

## Properties

### message

> **message**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:14](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L14)

Error message

***

### stack?

> `optional` **stack**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:18](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L18)

Stack trace if available

***

### type?

> `optional` **type**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:16](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L16)

Type of the error (e.g., 'ZeroDivisionError', 'ValueError')
