[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / CodeGenerator

# Abstract Class: CodeGenerator

Defined in: [packages/sandbox-executor/src/generators/base.ts:8](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/generators/base.ts#L8)

## Constructors

### Constructor

> **new CodeGenerator**(): `CodeGenerator`

#### Returns

`CodeGenerator`

## Properties

### fileExtension

> `abstract` `readonly` **fileExtension**: `string`

Defined in: [packages/sandbox-executor/src/generators/base.ts:10](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/generators/base.ts#L10)

***

### language

> `abstract` `readonly` **language**: `string`

Defined in: [packages/sandbox-executor/src/generators/base.ts:9](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/generators/base.ts#L9)

## Methods

### generateExecutionCode()

> **generateExecutionCode**(`userCode`, `functionName`, `args`, `kwargs`, `signature`): `string`

Defined in: [packages/sandbox-executor/src/generators/base.ts:12](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/generators/base.ts#L12)

#### Parameters

##### userCode

`string`

##### functionName

`string`

##### args

`unknown`[]

##### kwargs

`Record`\<`string`, `unknown`\>

##### signature

`InferredSignature`

#### Returns

`string`

***

### generateWrapper()

> `abstract` `protected` **generateWrapper**(`functionName`, `args`, `kwargs`, `signature`): `string`

Defined in: [packages/sandbox-executor/src/generators/base.ts:23](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/generators/base.ts#L23)

#### Parameters

##### functionName

`string`

##### args

`unknown`[]

##### kwargs

`Record`\<`string`, `unknown`\>

##### signature

`InferredSignature`

#### Returns

`string`

***

### serialize()

> `abstract` `protected` **serialize**(`value`): `string`

Defined in: [packages/sandbox-executor/src/generators/base.ts:30](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/generators/base.ts#L30)

#### Parameters

##### value

`unknown`

#### Returns

`string`
