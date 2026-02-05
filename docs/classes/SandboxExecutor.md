[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / SandboxExecutor

# Class: SandboxExecutor

Defined in: [packages/sandbox-executor/src/executor.ts:91](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/executor.ts#L91)

SandboxExecutor handles the execution of code within a secure WASM-based sandbox.

It manages:
- Code generation and wrapping for different languages.
- Function signature inference.
- Virtual and mounted file systems with change tracking.
- Bidirectional file synchronization between host and sandbox.
- Secure execution with permission controls.

## Example

```typescript
const executor = createExecutor();
const result = await executor.execute({
  language: 'python',
  code: 'def add(a, b): return a + b',
  functionName: 'add',
  args: [1, 2]
});
console.log(result.result); // 3
```

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new SandboxExecutor**(`options`): `SandboxExecutor`

Defined in: [packages/sandbox-executor/src/executor.ts:99](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/executor.ts#L99)

Creates a new SandboxExecutor instance.

#### Parameters

##### options

[`ExecutorOptions`](../interfaces/ExecutorOptions.md) = `{}`

Configuration options for the executor.

#### Returns

`SandboxExecutor`

#### Overrides

`EventEmitter.constructor`

## Properties

### defaultMaxListeners

> `static` **defaultMaxListeners**: `number`

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:7

#### Inherited from

`EventEmitter.defaultMaxListeners`

## Methods

### emit()

> **emit**(`eventName`, ...`args`): `any`

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:48

Emits the specified event type with the given arguments.

#### Parameters

##### eventName

`string`

##### args

...`any`[]

The event type followed by any number of arguments to be passed to the listener functions.

#### Returns

`any`

The result of the event.

#### Inherited from

`EventEmitter.emit`

***

### emitAsync()

> **emitAsync**(`eventName`, ...`args`): `Promise`\<`any`\>

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:54

Asynchronously emits the specified event type with the given arguments.

#### Parameters

##### eventName

`string`

##### args

...`any`[]

The event type followed by any number of arguments to be passed to the listener functions.

#### Returns

`Promise`\<`any`\>

A promise that resolves with the result of the event.

#### Inherited from

`EventEmitter.emitAsync`

***

### execute()

> **execute**\<`T`\>(`request`): `Promise`\<[`ExecutionResult`](../interfaces/ExecutionResult.md)\<`T`\>\>

Defined in: [packages/sandbox-executor/src/executor.ts:122](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/executor.ts#L122)

Executes a function call in the sandbox.

This method follows these steps:
1. Resolve function signature (via schema or inference).
2. Generate execution wrapper code.
3. Build the virtual file system (including mounts and virtual files).
4. Run the code in the WASM sandbox.
5. Track file changes and handle synchronization.
6. Parse and return the function result.

#### Type Parameters

##### T

`T` = `unknown`

The expected return type of the function.

#### Parameters

##### request

[`FunctionCallRequest`](../interfaces/FunctionCallRequest.md)

The execution request details.

#### Returns

`Promise`\<[`ExecutionResult`](../interfaces/ExecutionResult.md)\<`T`\>\>

A promise resolving to the execution result.

***

### listenerCount()

> **listenerCount**(`eventName`): `number`

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:83

Returns the count of listeners that are registered to listen for the specified event.

#### Parameters

##### eventName

The name of the event to get the listeners for.

`string` | `RegExp`

#### Returns

`number`

- the listeners count

#### Inherited from

`EventEmitter.listenerCount`

***

### listeners()

> **listeners**(`eventName`): `Function`[]

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:76

Returns an array of functions that are registered to listen for the specified event.

#### Parameters

##### eventName

The name of the event to get the listeners for.

`string` | `RegExp`

#### Returns

`Function`[]

- An array of functions that are registered to listen for the specified event.

#### Inherited from

`EventEmitter.listeners`

***

### off()

> **off**(`eventName`, `listener`): `EventEmitter`

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:33

Removes a listener function from the specified event type.

#### Parameters

##### eventName

`string` | `RegExp`

##### listener

`Function`

The listener function to be removed.

#### Returns

`EventEmitter`

The EventEmitter instance to allow chaining.

#### Throws

If the listener is not a function.

#### See

[removeListener](#removelistener)

#### Inherited from

`EventEmitter.off`

***

### on()

> **on**(`eventName`, `listener`): `EventEmitter`

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:16

Adds a listener function to the specified event type.

#### Parameters

##### eventName

`string` | `RegExp`

##### listener

`Function`

The listener function to be called when the event is emitted.

#### Returns

`EventEmitter`

The EventEmitter instance to allow chaining.

#### Throws

If the listener is not a function.

#### Inherited from

`EventEmitter.on`

***

### once()

> **once**(`eventName`, `listener`): `EventEmitter`

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:24

Adds a one-time listener function to the specified event type.

#### Parameters

##### eventName

`string` | `RegExp`

##### listener

`Function`

The listener function to be called once when the event is emitted.

#### Returns

`EventEmitter`

The EventEmitter instance to allow chaining.

#### Throws

If the listener is not a function.

#### Inherited from

`EventEmitter.once`

***

### removeAllListeners()

> **removeAllListeners**(`eventName?`): `EventEmitter`

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:61

Removes all listeners for a specific event or all events from an event emitter.

#### Parameters

##### eventName?

The event to remove listeners for. If not provided, all listeners for all events will be removed.

`string` | `RegExp`

#### Returns

`EventEmitter`

- The event emitter with all listeners removed.

#### Inherited from

`EventEmitter.removeAllListeners`

***

### removeListener()

> **removeListener**(`eventName`, `listener`): `EventEmitter`

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:42

Removes a listener function from the specified event type.

#### Parameters

##### eventName

`string` | `RegExp`

##### listener

`Function`

The listener function to be removed.

#### Returns

`EventEmitter`

The EventEmitter instance to allow chaining.

#### Throws

If the listener is not a function.

#### See

[off](#off)

#### Inherited from

`EventEmitter.removeListener`

***

### setMaxListeners()

> **setMaxListeners**(`n`): `EventEmitter`

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:69

Sets the maximum number of listeners allowed for the event emitter.

#### Parameters

##### n

`number`

The maximum number of listeners to set. Must be a positive integer.

#### Returns

`EventEmitter`

The EventEmitter instance for method chaining.

#### Throws

If `n` is not a positive integer.

#### Inherited from

`EventEmitter.setMaxListeners`

***

### syncFiles()

> **syncFiles**(`changes`, `mount`, `options?`): `Promise`\<[`SyncResult`](../interfaces/SyncResult.md)\>

Defined in: [packages/sandbox-executor/src/executor.ts:311](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/executor.ts#L311)

Manually synchronize file changes from the sandbox to the host file system.

#### Parameters

##### changes

[`FileChange`](../interfaces/FileChange.md)[]

The list of file changes to sync.

##### mount

[`MountConfig`](../interfaces/MountConfig.md)

The mount configuration specifying virtual to real path mappings.

##### options?

Additional synchronization options.

###### onError?

`"rollback"` \| `"continue"` \| `"abort"`

#### Returns

`Promise`\<[`SyncResult`](../interfaces/SyncResult.md)\>

A promise resolving to the synchronization result summary.

***

### ~~listenerCount()~~

> `static` **listenerCount**(`emitter`, `eventName`): `number`

Defined in: node\_modules/.pnpm/events-ex@2.1.1/node\_modules/events-ex/lib/event-emitter.d.ts:91

Returns the count of listeners that are registered to listen for the specified event.

#### Parameters

##### emitter

`EventEmitter`

##### eventName

`string` | `RegExp`

#### Returns

`number`

#### Deprecated

use emitter.listenerCount instead

#### Inherited from

`EventEmitter.listenerCount`
