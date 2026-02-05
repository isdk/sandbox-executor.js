[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / FunctionCallRequest

# Interface: FunctionCallRequest\<TArgs, TKwargs\>

Defined in: [packages/sandbox-executor/src/types/request.ts:137](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L137)

Request object for executing a function call in the sandbox.

## Type Parameters

### TArgs

`TArgs` *extends* `unknown`[] = `unknown`[]

Type of positional arguments.

### TKwargs

`TKwargs` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Type of keyword arguments.

## Properties

### args?

> `optional` **args**: `TArgs`

Defined in: [packages/sandbox-executor/src/types/request.ts:148](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L148)

Positional arguments to pass to the function.

***

### code

> **code**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:144](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L144)

The source code containing the function.

***

### files?

> `optional` **files**: `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

Defined in: [packages/sandbox-executor/src/types/request.ts:156](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L156)

Optional virtual files to seed in the sandbox.

***

### functionName

> **functionName**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:146](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L146)

The name of the function to call.

***

### kwargs?

> `optional` **kwargs**: `TKwargs`

Defined in: [packages/sandbox-executor/src/types/request.ts:150](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L150)

Keyword arguments to pass to the function.

***

### language

> **language**: [`SupportedLanguage`](../type-aliases/SupportedLanguage.md)

Defined in: [packages/sandbox-executor/src/types/request.ts:142](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L142)

The programming language of the code.

***

### mount?

> `optional` **mount**: [`MountConfig`](MountConfig.md)

Defined in: [packages/sandbox-executor/src/types/request.ts:154](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L154)

Optional configuration for mounting host directories.

***

### resultOptions?

> `optional` **resultOptions**: [`ResultOptions`](ResultOptions.md)

Defined in: [packages/sandbox-executor/src/types/request.ts:160](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L160)

Options for the result output.

***

### schema?

> `optional` **schema**: [`FunctionSchema`](FunctionSchema.md)

Defined in: [packages/sandbox-executor/src/types/request.ts:152](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L152)

Optional schema for the function. If not provided, it will be inferred.

***

### workdir?

> `optional` **workdir**: `string`

Defined in: [packages/sandbox-executor/src/types/request.ts:158](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/types/request.ts#L158)

Initial working directory in the sandbox.
