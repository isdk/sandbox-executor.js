[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / SyncManager

# Class: SyncManager

Defined in: [packages/sandbox-executor/src/fs/sync-manager.ts:62](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/sync-manager.ts#L62)

SyncManager coordinates the synchronization of file changes from the virtual sandbox
file system back to the real host file system.

It supports:
- Batch synchronization of multiple changes.
- Event-based hooks (beforeSync, afterSync, syncError).
- Error handling strategies: continue, abort, or rollback.
- Path resolution through custom resolvers.

## Fires

beforeSync - Emitted before a file is synced. Can be used to skip or abort.

## Fires

afterSync - Emitted after a file is synced (successfully or with error).

## Fires

syncError - Emitted when a specific file sync fails.

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new SyncManager**(`options`): `SyncManager`

Defined in: [packages/sandbox-executor/src/fs/sync-manager.ts:73](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/sync-manager.ts#L73)

Creates a new SyncManager instance.

#### Parameters

##### options

`SyncManagerOptions`

Configuration and IO providers.

#### Returns

`SyncManager`

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

### syncBatch()

> **syncBatch**(`changes`): `Promise`\<[`SyncResult`](../interfaces/SyncResult.md)\>

Defined in: [packages/sandbox-executor/src/fs/sync-manager.ts:88](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/sync-manager.ts#L88)

Synchronizes a batch of file changes to the host.

#### Parameters

##### changes

[`FileChange`](../interfaces/FileChange.md)[]

Array of file changes to apply.

#### Returns

`Promise`\<[`SyncResult`](../interfaces/SyncResult.md)\>

A promise resolving to the synchronization summary.

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
