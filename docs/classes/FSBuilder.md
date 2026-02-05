[**@isdk/sandbox-executor**](../README.md)

***

[@isdk/sandbox-executor](../globals.md) / FSBuilder

# Class: FSBuilder

Defined in: [packages/sandbox-executor/src/fs/fs-builder.ts:13](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/fs-builder.ts#L13)

Helper class to construct an initial WASIFS file system image.

It provides methods to add files from memory (strings or Uint8Arrays)
and to load entire directory structures from the host disk.

## Constructors

### Constructor

> **new FSBuilder**(`options`): `FSBuilder`

Defined in: [packages/sandbox-executor/src/fs/fs-builder.ts:21](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/fs-builder.ts#L21)

Creates a new FSBuilder instance.

#### Parameters

##### options

`FSBuilderOptions`

Configuration including the default working directory.

#### Returns

`FSBuilder`

## Methods

### addEntryFile()

> **addEntryFile**(`filename`, `content`): `this`

Defined in: [packages/sandbox-executor/src/fs/fs-builder.ts:32](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/fs-builder.ts#L32)

Adds an entry file (the main script to be executed).

#### Parameters

##### filename

`string`

Name of the file (relative to workdir or absolute).

##### content

`string`

Source code string.

#### Returns

`this`

The FSBuilder instance for chaining.

***

### addFiles()

> **addFiles**(`files`): `this`

Defined in: [packages/sandbox-executor/src/fs/fs-builder.ts:44](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/fs-builder.ts#L44)

Adds virtual files from a record object.

#### Parameters

##### files

`Record`\<`string`, `string` \| `Uint8Array`\>

Map of virtual paths to content (string or Uint8Array).

#### Returns

`this`

The FSBuilder instance for chaining.

***

### build()

> **build**(): [`WASIFS`](../type-aliases/WASIFS.md)

Defined in: [packages/sandbox-executor/src/fs/fs-builder.ts:137](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/fs-builder.ts#L137)

Builds and returns a snapshot of the current WASIFS object.

#### Returns

[`WASIFS`](../type-aliases/WASIFS.md)

A shallow copy of the internal WASIFS mapping.

***

### clear()

> **clear**(): `this`

Defined in: [packages/sandbox-executor/src/fs/fs-builder.ts:145](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/fs-builder.ts#L145)

Clears all files from the internal file system representation.

#### Returns

`this`

The FSBuilder instance for chaining.

***

### loadFromDisk()

> **loadFromDisk**(`virtualPath`, `realPath`, `options?`): `Promise`\<`FSBuilder`\>

Defined in: [packages/sandbox-executor/src/fs/fs-builder.ts:61](https://github.com/isdk/sandbox-executor.js/blob/f9de053b57c38e0b433fcaabc5079f6b07e7958c/src/fs/fs-builder.ts#L61)

Loads files from the host disk into the virtual file system.
Only available in Node.js environments.

#### Parameters

##### virtualPath

`string`

The target directory in the virtual file system.

##### realPath

`string`

The source directory on the host disk.

##### options?

Loading constraints like max file size or exclusion patterns.

###### exclude?

`string`[]

Glob patterns of files or directories to exclude.

###### maxFileSize?

`number`

Maximum size of an individual file in bytes.

###### maxTotalSize?

`number`

Maximum total size of all loaded files in bytes.

#### Returns

`Promise`\<`FSBuilder`\>

A promise resolving to the FSBuilder instance.
