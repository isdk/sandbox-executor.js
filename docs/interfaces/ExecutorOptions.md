[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / ExecutorOptions

# Interface: ExecutorOptions

Defined in: [packages/sandbox-executor/src/executor.ts:57](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/executor.ts#L57)

Options for configuring the SandboxExecutor.

## Properties

### defaultWorkdir?

> `optional` **defaultWorkdir**: `string`

Defined in: [packages/sandbox-executor/src/executor.ts:62](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/executor.ts#L62)

The default working directory within the sandbox.
Defaults to '/workspace'.

***

### syncEventConfig?

> `optional` **syncEventConfig**: [`SyncEventConfig`](SyncEventConfig.md)

Defined in: [packages/sandbox-executor/src/executor.ts:66](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/executor.ts#L66)

Configuration for synchronization events.
