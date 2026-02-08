# Sandbox Executor

[![npm version](https://img.shields.io/npm/v/@isdk/sandbox-executor.svg)](https://www.npmjs.com/package/@isdk/sandbox-executor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A powerful, type-safe library for executing functions in isolated sandbox environments across multiple programming languages. Built on top of [@runno/sandbox](https://runno.dev/) with WebAssembly-based isolation.

## ✨ Features

- 🌍 **Multi-Language Support** - Execute Python, JavaScript (QuickJS), Ruby, PHP, C and C++ code
- 📦 **Function-Level Execution** - Call specific functions with args and kwargs, not just run scripts
- ⚡ **High Performance** - Smart `inline` mode embeds arguments directly into code to bypass I/O overhead
- 🐘 **Large Data Support** - Robust `file` mode bypasses non-streaming `stdin` implementation limits of the underlying sandbox for massive payloads
- 🤖 **Auto Optimization** - Automatically chooses the best passing mode (Inline/Stdin/File) based on data size
- 🔒 **Permission Control** - Fine-grained file system permissions with glob patterns
- 📁 **Virtual File System** - In-memory file operations with optional real filesystem sync
- 🔄 **Change Tracking** - Automatic detection and tracking of file changes (Snapshot-based for robustness)
- 🎯 **Smart Signature Inference** - Automatically infers function signatures from code
- 📊 **Schema Support** - Optional explicit parameter schemas for precise control
- 🎪 **Event System** - Rich event hooks for sync operations with abort/skip capabilities
- 🛡️ **Type-Safe** - Full TypeScript support with comprehensive type definitions

## 📦 Installation

```bash
npm install @isdk/sandbox-executor
# or
yarn add @isdk/sandbox-executor
# or
pnpm add @isdk/sandbox-executor
```

## 🚀 Quick Start

### Basic Function Execution

```typescript
import { createExecutor } from '@isdk/sandbox-executor';

const executor = createExecutor();

// Python
const result = await executor.execute({
  language: 'python',
  code: `
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"
  `,
  functionName: 'greet',
  args: { name: 'World', greeting: 'Hi' },
});

console.log(result.result); // "Hi, World!"

// PHP (Supports automatic <?php tag injection)
const phpResult = await executor.execute({
  language: 'php',
  code: `
function multiply($a, $b) {
    return $a * $b;
}
  `,
  functionName: 'multiply',
  args: [6, 7],
});

console.log(phpResult.result); // 42

// JavaScript (Supports aliases: quickjs, js, javascript)
const jsResult = await executor.execute({
  language: 'js',
  code: `
function calculate(a, b, options = {}) {
  const { multiplier = 1 } = options;
  return (a + b) * multiplier;
}
  `,
  functionName: 'calculate',
  args: { a: 5, b: 3, multiplier: 10 },
});

console.log(jsResult.result); // 80
```

### Flexible Arguments & Optimization

```typescript
// Support for mixed positional and keyword arguments with index mapping
const result = await executor.execute({
  language: 'python',
  code: 'def add(a, b, c=0): return a + b + c',
  functionName: 'add',
  args: {
    "a": 1,
    "b": { "index": 1, "value": 2 }, // Explicitly map to index 1
    "c": 3
  },
  argsMode: 'auto', // Default: chooses 'inline' for small data, 'file' for large
  timeout: 30,      // Custom timeout in seconds
});

// Handling large data (e.g., Base64 strings)
const largeData = 'a'.repeat(1024 * 500); // 500KB
const result = await executor.execute({
  language: 'python',
  code: 'def process(data): return len(data)',
  functionName: 'process',
  args: [largeData],
  // System will automatically switch to 'file' mode to bypass 8KB stdin limit
});
```

### With Virtual Files

```typescript
const result = await executor.execute({
  language: 'python',
  code: `
def process(input_path, output_path):
    with open(input_path) as f:
        data = f.read()

    with open(output_path, 'w') as f:
        f.write(data.upper())

    return len(data)
  `,
  functionName: 'process',
  args: ['/workspace/input.txt', '/workspace/output.txt'],
  options: {
    files: {
      'input.txt': 'hello world',
    },
  },
});

console.log(result.result); // 11
console.log(result.files?.created); // [{ path: '/workspace/output.txt', ... }]
```

### With Real Directory Mount (Node.js)

```typescript
const result = await executor.execute({
  language: 'python',
  code: `
def process_files(input_dir, output_dir):
    import os
    for name in os.listdir(input_dir):
        with open(f'{input_dir}/{name}') as f:
            data = f.read()
        with open(f'{output_dir}/{name}.out', 'w') as f:
            f.write(data.upper())
    return 'done'
  `,
  functionName: 'process_files',
  args: ['/data/input', '/data/output'],

  options: {
    mount: {
      dirs: {
        '/data': './my-project/data',
      },
      permissions: {
        default: { read: true, list: true },
        rules: [
          { pattern: 'output/**', allow: ['create', 'modify'] },
        ],
        exclude: ['node_modules', '.git'],
      },
      loading: { mode: 'eager' },
      sync: { mode: 'batch', onError: 'continue' },
    },
  },
});
```

## 📖 API Reference

### `createExecutor(options?)`

Creates a new sandbox executor instance.

```typescript
const executor = createExecutor({
  defaultWorkdir: '/workspace',  // Default: '/workspace'
  syncEventConfig: {
    allowAbort: true,  // Allow beforeSync to abort entire sync
  },
});
```

### `executor.execute(request)`

Executes a function in the sandbox.

```typescript
interface BaseFunctionRequest {
  /** The source code containing the function */
  code: string;

  /** The name of the function to call */
  functionName: string;

  /** Execution timeout in seconds */
  timeout?: number;

  /**
   * 'inline': hardcoded in source (fastest)
   * 'stdin': standard SIP protocol
   * 'file': via virtual JSON file (most robust for large data)
   * 'auto': automatic selection (default)
   */
  argsMode?: 'inline' | 'stdin' | 'file' | 'auto';

  /** Threshold for auto mode */
  autoModeThreshold?: number;
}

interface FunctionCallRequest extends BaseFunctionRequest {
  // Required
  language: 'python' | 'ruby' | 'quickjs' | 'php' | 'js' | 'javascript' | 'c' | 'cpp';

  // Optional (Common)
  /**
   * Array for positional, Object for keyword/mixed.
   * Supports: { "paramName": { "index": number, "value": any } }
   */
  args?: ArgumentItem[] | Record<string, ArgumentItem>;

  /** Interface Definition */
  schema?: FunctionSchema;

  /** Runtime Environment & Reporting */
  options?: InvokeOptions;

  /** @deprecated Use args as an object instead */
  kwargs?: Record<string, any>;
}

interface FunctionSchema {
  /** Input parameter schemas (JSON Schema like) */
  input?: InputSchema;
  /** Return value schema */
  output?: any;
  /** Enforce strict validation */
  strict?: boolean;
  variadic?: boolean;
  acceptsKwargs?: boolean;
}

interface InvokeOptions {
  /** Host directory mounts */
  mount?: MountConfig;
  /** Virtual files to seed */
  files?: Record<string, string | Uint8Array>;
  /** Working directory override */
  workdir?: string;
  /** Result reporting configuration */
  reporting?: ReportingOptions;
}
```

### `executor.syncFiles(changes, mount, options?)`

Manually sync file changes to real filesystem.

```typescript
const syncResult = await executor.syncFiles(
  result.files?.created ?? [],
  { dirs: { '/workspace': './output' } },
  { onError: 'continue' }
);
```

### Execution Result

```typescript
interface ExecutionResult<T> {
  status: 'success' | 'error' | 'crash' | 'timeout' | 'terminated';
  success: boolean;
  result?: T;
  error?: {
    message: string;
    type?: string;
    stack?: string;
  };
  stdout: string;
  stderr: string;
  exitCode: number;
  files?: FileChangeSummary;
  meta?: {
    duration: number;
    signatureSource: 'schema' | 'inferred' | 'convention';
  };
}
```

## ⚙️ Configuration

### Mount Configuration

```typescript
interface MountConfig {
  // Directory mappings: { virtualPath: realPath }
  dirs: Record<string, string>;

  // Permission configuration
  permissions?: {
    default?: {
      read?: boolean;    // Default: true
      list?: boolean;    // Default: true
      create?: boolean;  // Default: false
      modify?: boolean;  // Default: false
      delete?: boolean;  // Default: false
    };
    rules?: Array<{
      pattern: string;      // Glob pattern
      allow?: Permission[] | '*';
      deny?: Permission[] | '*';
      priority?: number;    // Higher = matched first
    }>;
    exclude?: string[];     // Shorthand for high-priority deny rules
  };

  // Loading strategy
  loading?: {
    mode: 'eager' | 'lazy' | 'explicit';
    include?: string[];
    maxFileSize?: number;
    maxTotalSize?: number;
  };

  // Sync strategy
  sync?: {
    mode: 'batch' | 'manual';
    onError?: 'rollback' | 'continue' | 'abort';
  };

  // Security options
  security?: {
    followSymlinks?: boolean | 'restricted';
  };

  // Permission denied behavior
  onPermissionDenied?: 'throw' | 'ignore' | 'virtual';
}
```

### Permission Patterns

The library uses [minimatch](https://github.com/isaacs/minimatch) for glob pattern matching:

| Pattern | Description | Example Matches |
|---------|-------------|-----------------|
| `*` | Match any characters in a segment | `*.txt` → `file.txt` |
| `**` | Match any directory depth | `src/**/*.ts` → `src/a/b/c.ts` |
| `?` | Match exactly one character | `file?.txt` → `file1.txt` |
| `[abc]` | Match any character in set | `file[123].txt` → `file1.txt` |
| `[!abc]` | Match any character not in set | `file[!0-9].txt` → `fileA.txt` |
| `{a,b}` | Match any of the patterns | `*.{js,ts}` → `app.js`, `app.ts` |

### Function Schema

Provide explicit parameter schemas for precise control:

```typescript
await executor.execute({
  language: 'python',
  code: '...',
  functionName: 'process',
  args: { a: 1, b: 2, c: 3 },
  schema: {
    input: {
      a: { type: 'number', required: true, index: 0 },
      b: { type: 'number', required: true, index: 1 },
      c: { type: 'number', required: false, default: 0, index: 2 },
    },
    strict: true,
  },
});
```

## 🎪 Events

Use event listeners to intercept and control sync operations:

```typescript
import { createExecutor, SyncStates } from '@isdk/sandbox-executor';

const executor = createExecutor();

// Before sync - can skip or abort
executor.on('beforeSync', function(change) {
  console.log(`Syncing: ${change.path}`);

  // Skip specific files
  if (change.path.endsWith('.tmp')) {
    this.result = { state: SyncStates.SKIP, reason: 'Temporary file' };
    return;
  }

  // Abort entire sync
  if (change.path.includes('/secrets/')) {
    this.result = { state: SyncStates.ABORT };
    this.stopped = true;
  }
});

// After sync - notification only
executor.on('afterSync', function(data) {
  if (data.success) {
    console.log(`✅ Synced: ${data.path}`);
  } else {
    console.log(`❌ Failed: ${data.path}`, data.error);
  }
});

// Error handling
executor.on('syncError', function(change, error) {
  console.error(`Sync error for ${change.path}:`, error);
});

// Permission denied
executor.on('permissionDenied', function(record) {
  console.warn(`🚫 Permission denied: ${record.operation} on ${record.path}`);
});
```

## 🔄 Execution Modes

### Pure Virtual Mode

No real filesystem access, everything runs in memory:

```typescript
const result = await executor.execute({
  language: 'python',
  code: 'def add(a, b): return a + b',
  functionName: 'add',
  args: [1, 2],
});
// No mount config = full permissions in virtual FS
```

### Virtual Files Mode

Provide virtual files without syncing to real filesystem:

```typescript
const result = await executor.execute({
  language: 'python',
  code: '...',
  functionName: 'process',
  options: {
    files: {
      'input.txt': 'content',
      'config.json': '{"key": "value"}',
    },
  },
});
// Files exist only in memory
```

### Real Directory Mode

Mount real directories with permission control and sync:

```typescript
const result = await executor.execute({
  language: 'python',
  code: '...',
  functionName: 'process',
  options: {
    mount: {
      dirs: { '/workspace': './real-dir' },
      sync: { mode: 'batch' },
    },
  },
});
// Changes synced to real filesystem
```

### Manual Sync Mode

Control exactly which changes to sync:

```typescript
const result = await executor.execute({
  language: 'python',
  code: '...',
  functionName: 'generate',
  options: {
    mount: {
      dirs: { '/workspace': './output' },
      sync: { mode: 'manual' },
    },
  },
});

// Inspect changes first
console.log('Created:', result.files?.created);

// Sync only selected files
const toSync = result.files?.created.filter(f => f.path.endsWith('.json')) ?? [];
await executor.syncFiles(toSync, { dirs: { '/workspace': './output' } });
```

## 🧪 Signature Inference

The library automatically infers function signatures with a three-tier priority:

1. **Schema** (highest) - User-provided explicit schema
2. **Inferred** - Parsed from code using AST/regex
3. **Convention** (lowest) - Language-specific defaults

### Python Convention

```python
def func(*args, **kwargs):  # Supports variadic and kwargs
    pass
```

### JavaScript Convention

```javascript
function func(arg1, arg2, options = {}) {  // Last param as options object
}
```

### Ruby Convention

```ruby
def func(*args, **kwargs)  # Supports variadic and kwargs
end
```

### PHP Convention

```php
function func(...$args) {  // Supports variadic and kwargs (via associative arrays)
}
```

## 📊 Result Status

| Status | Description | Exit Code |
|--------|-------------|-----------|
| `success` | Function executed successfully | 0 |
| `error` | Function threw an exception | 1 |
| `crash` | WASM runtime crashed | 1 |
| `timeout` | Execution timed out | 124 |
| `terminated` | Execution was terminated | 143 |

## 🔧 Advanced Usage

### Custom Workdir

```typescript
const executor = createExecutor({
  defaultWorkdir: '/app',
});

// Or per-request
await executor.execute({
  // ...
  options: {
    workdir: '/custom/path',
  },
});
```

### Type-Safe Results

```typescript
interface UserData {
  name: string;
  age: number;
}

const result = await executor.execute<UserData>({
  language: 'python',
  code: `
def get_user():
    return {"name": "Alice", "age": 30}
  `,
  functionName: 'get_user',
});

if (result.success) {
  console.log(result.result?.name); // TypeScript knows this is string
}
```

### Error Handling

```typescript
const result = await executor.execute({
  language: 'python',
  code: 'def divide(a, b): return a / b',
  functionName: 'divide',
  args: [1, 0],
});

switch (result.status) {
  case 'success':
    console.log('Result:', result.result);
    break;
  case 'error':
    console.log('Function error:', result.error?.message);
    console.log('Error type:', result.error?.type); // e.g., 'ZeroDivisionError'
    break;
  case 'crash':
    console.log('Runtime crashed:', result.error?.message);
    break;
  case 'timeout':
    console.log('Execution timed out');
    break;
  case 'terminated':
    console.log('Execution was terminated');
    break;
}
```

## ⚠️ Technical Limitations

- **Stdin Implementation**: The underlying `@runno/sandbox` (specifically `runFS`) currently uses a **buffered, non-streaming** `stdin` implementation. This imposes a physical limit of **8188 bytes (8KB)** for single-shot input.
- **PHP Environment**: For PHP, the sandbox provides a `php-cgi` environment rather than a standard CLI. Consequently, standard `stdin` streams are not supported for this language.
- **Workaround**: The `file` mode (VFS-based) is the recommended robust solution for large data payloads and for PHP execution.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) to learn about our architecture, how to add new languages, and development workflow.

## 📄 License

MIT © [Riceball LEE](https://github.com/snowyu)

## 🙏 Acknowledgments

- [@runno/sandbox](https://runno.dev/) - WebAssembly-based code execution
- [events-ex](https://www.npmjs.com/package/events-ex) - Enhanced event emitter
- [minimatch](https://github.com/isaacs/minimatch) - Glob pattern matching
