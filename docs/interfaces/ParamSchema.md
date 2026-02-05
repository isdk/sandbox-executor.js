[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / ParamSchema

# Interface: ParamSchema

Defined in: [packages/sandbox-executor/src/types/request.ts:80](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L80)

Schema definition for a single function parameter.

## Properties

### default?

> `optional` **default**: `unknown`

Defined in: [packages/sandbox-executor/src/types/request.ts:88](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L88)

Default value if not provided

***

### description?

> `optional` **description**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:90](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L90)

Description for documentation or AI hints

***

### name

> **name**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:82](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L82)

Parameter name

***

### required?

> `optional` **required**: `boolean`

Defined in: [packages/sandbox-executor/src/types/request.ts:86](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L86)

Whether the parameter is required

***

### type?

> `optional` **type**: `"string"` \| `"number"` \| `"boolean"` \| `"object"` \| `"array"` \| `"any"`

Defined in: [packages/sandbox-executor/src/types/request.ts:84](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L84)

Expected parameter type
