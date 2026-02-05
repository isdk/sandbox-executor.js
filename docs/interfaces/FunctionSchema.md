[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / FunctionSchema

# Interface: FunctionSchema

Defined in: [packages/sandbox-executor/src/types/request.ts:96](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L96)

Schema definition for a function.

## Properties

### acceptsKwargs?

> `optional` **acceptsKwargs**: `boolean`

Defined in: [packages/sandbox-executor/src/types/request.ts:102](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L102)

Whether the function accepts keyword arguments

***

### params?

> `optional` **params**: [`ParamSchema`](ParamSchema.md)[]

Defined in: [packages/sandbox-executor/src/types/request.ts:98](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L98)

Parameter schemas

***

### variadic?

> `optional` **variadic**: `boolean`

Defined in: [packages/sandbox-executor/src/types/request.ts:100](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L100)

Whether the function accepts variable positional arguments
