[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / SignatureInferenceEngine

# Class: SignatureInferenceEngine

Defined in: [packages/sandbox-executor/src/inference/engine.ts:31](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/inference/engine.ts#L31)

Engine for determining function signatures from source code or metadata.

It uses a priority-based approach:
1. Explicit schema provided by the user.
2. Static analysis (regex-based) of the source code.
3. Language-specific default conventions.

## Constructors

### Constructor

> **new SignatureInferenceEngine**(): `SignatureInferenceEngine`

#### Returns

`SignatureInferenceEngine`

## Methods

### resolve()

> **resolve**(`code`, `functionName`, `language`, `schema?`): `InferredSignature`

Defined in: [packages/sandbox-executor/src/inference/engine.ts:41](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/inference/engine.ts#L41)

Resolves the signature of a function within the given code.

#### Parameters

##### code

`string`

The source code to analyze.

##### functionName

`string`

Name of the function to resolve.

##### language

[`SupportedLanguage`](../type-aliases/SupportedLanguage.md)

Programming language of the code.

##### schema?

[`FunctionSchema`](../interfaces/FunctionSchema.md)

Optional explicit schema to use instead of inference.

#### Returns

`InferredSignature`

The resolved function signature.
