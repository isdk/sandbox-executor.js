# Sandbox Executor

[![npm version](https://img.shields.io/npm/v/@isdk/sandbox-executor.svg)](https://www.npmjs.com/package/@isdk/sandbox-executor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

一个强大的、类型安全的沙盒函数执行库，支持多种编程语言。基于 [@runno/sandbox](https://runno.dev/) 构建，使用 WebAssembly 实现安全隔离。

## ✨ 特性

- 🌍 **多语言支持** - 执行 Python、JavaScript (QuickJS)、Ruby、PHP、C 和 C++ 代码
- 📦 **函数级执行** - 调用指定函数并传递 args 和 kwargs，而非仅运行脚本
- ⚡ **高性能** - 智能 `inline` 模式将参数直接嵌入代码，避开 I/O 开销
- 🐘 **大数据支持** - 稳健的 `file` 模式绕过底层沙盒非流式 `stdin` 的缓冲区限制，支持大规模负载
- 🤖 **自动优化** - 根据数据大小自动选择最佳传递模式 (Inline/Stdin/File)
- 🔒 **权限控制** - 基于 glob 模式的细粒度文件系统权限控制
- 📁 **虚拟文件系统** - 内存中的文件操作，可选同步到真实文件系统
- 🔄 **变更追踪** - 自动检测和追踪文件变更（基于快照方案，更稳定可靠）
- 🎯 **智能签名推断** - 自动从代码推断函数签名
- 📊 **Schema 支持** - 可选的显式参数 Schema，实现精确控制
- 🎪 **事件系统** - 丰富的同步事件钩子，支持中止/跳过操作
- 🛡️ **类型安全** - 完整的 TypeScript 支持和类型定义

## 📦 安装

```bash
npm install @isdk/sandbox-executor
# 或
yarn add @isdk/sandbox-executor
# 或
pnpm add @isdk/sandbox-executor
```

## 🚀 快速开始

### 基础函数执行

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

// PHP (支持自动注入 <?php 标签)
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

// JavaScript (支持别名: quickjs, js, javascript)
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

### 灵活的参数与优化

```typescript
// 支持混合位置参数和关键字参数，并支持 index 映射
const result = await executor.execute({
  language: 'python',
  code: 'def add(a, b, c=0): return a + b + c',
  functionName: 'add',
  args: {
    "a": 1,
    "b": { "index": 1, "value": 2 }, // 显式映射到索引 1
    "c": 3
  },
  argsMode: 'auto', // 默认值：小数据自动选择 'inline'，大数据选择 'file'
  timeout: 30,      // 自定义超时时间（秒）
});

// 处理大数据量（如 Base64 字符串）
const largeData = 'a'.repeat(1024 * 500); // 500KB
const result = await executor.execute({
  language: 'python',
  code: 'def process(data): return len(data)',
  functionName: 'process',
  args: [largeData],
  // 系统会自动切换到 'file' 模式，绕过 8KB 的 stdin 限制
});
```

### 使用虚拟文件

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

### 挂载真实目录 (Node.js)

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

## 📖 API 参考

### `createExecutor(options?)`

创建新的沙盒执行器实例。

```typescript
const executor = createExecutor({
  defaultWorkdir: '/workspace',  // 默认: '/workspace'
  syncEventConfig: {
    allowAbort: true,  // 允许 beforeSync 中止整个同步
  },
});
```

### `executor.execute(request)`

在沙盒中执行函数。

```typescript
interface BaseFunctionRequest {
  /** 源码（包含要调用的函数） */
  code: string;

  /** 要调用的函数名 */
  functionName: string;

  /** 超时时间（秒） */
  timeout?: number;

  /**
   * 'inline': 硬编码在源码中 (最快)
   * 'stdin': 标准 SIP 协议
   * 'file': 通过虚拟 JSON 文件 (大数据最稳健)
   * 'auto': 自动选择 (默认)
   */
  argsMode?: 'inline' | 'stdin' | 'file' | 'auto';

  /** 自动模式下的切换阈值 */
  autoModeThreshold?: number;
}

interface FunctionCallRequest extends BaseFunctionRequest {
  // 必填
  language: SupportedLanguage;

  // 可选 (常用)
  /**
   * 数组用于位置参数，对象用于关键字或混合参数。
   * 支持: { "paramName": { "index": number, "value": any } }
   */
  args?: ArgumentItem[] | Record<string, ArgumentItem>;

  /** 接口定义 (Schema) */
  schema?: FunctionSchema;

  /** 运行时环境与报告配置 */
  options?: InvokeOptions;

  /** @deprecated 请直接将 args 设为对象 */
  kwargs?: Record<string, any>;
}

interface FunctionSchema {
  /** 输入参数定义 (JSON Schema 风格) */
  input?: InputSchema;
  /** 返回值定义 */
  output?: any;
  /** 是否开启严格校验 */
  strict?: boolean;
  variadic?: boolean;
  acceptsKwargs?: boolean;
}

interface InvokeOptions {
  /** 挂载宿主目录 */
  mount?: MountConfig;
  /** 预置的虚拟文件 */
  files?: Record<string, string | Uint8Array>;
  /** 覆盖默认工作目录 */
  workdir?: string;
  /** 结果报告选项 */
  reporting?: ReportingOptions;
}
```

### `executor.syncFiles(changes, mount, options?)`

手动同步文件变更到真实文件系统。

```typescript
const syncResult = await executor.syncFiles(
  result.files?.created ?? [],
  { dirs: { '/workspace': './output' } },
  { onError: 'continue' }
);
```

### 执行结果

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

## ⚙️ 配置

### 挂载配置

```typescript
interface MountConfig {
  // 目录映射: { 虚拟路径: 真实路径 }
  dirs: Record<string, string>;

  // 权限配置
  permissions?: {
    default?: {
      read?: boolean;    // 默认: true
      list?: boolean;    // 默认: true
      create?: boolean;  // 默认: false
      modify?: boolean;  // 默认: false
      delete?: boolean;  // 默认: false
    };
    rules?: Array<{
      pattern: string;      // Glob 模式
      allow?: Permission[] | '*';
      deny?: Permission[] | '*';
      priority?: number;    // 数字越大优先级越高
    }>;
    exclude?: string[];     // 排除项的语法糖，转换为高优先级 deny 规则
  };

  // 加载策略
  loading?: {
    mode: 'eager' | 'lazy' | 'explicit';
    include?: string[];
    maxFileSize?: number;
    maxTotalSize?: number;
  };

  // 同步策略
  sync?: {
    mode: 'batch' | 'manual';
    onError?: 'rollback' | 'continue' | 'abort';
  };

  // 安全选项
  security?: {
    followSymlinks?: boolean | 'restricted';
  };

  // 权限拒绝时的行为
  onPermissionDenied?: 'throw' | 'ignore' | 'virtual';
}
```

### 权限模式

本库使用 [minimatch](https://github.com/isaacs/minimatch) 进行 glob 模式匹配：

| 模式 | 说明 | 匹配示例 |
|------|------|----------|
| `*` | 匹配路径段中的任意字符 | `*.txt` → `file.txt` |
| `**` | 匹配任意深度的目录 | `src/**/*.ts` → `src/a/b/c.ts` |
| `?` | 匹配恰好一个字符 | `file?.txt` → `file1.txt` |
| `[abc]` | 匹配集合中的任一字符 | `file[123].txt` → `file1.txt` |
| `[!abc]` | 匹配不在集合中的字符 | `file[!0-9].txt` → `fileA.txt` |
| `{a,b}` | 匹配任一模式 | `*.{js,ts}` → `app.js`, `app.ts` |

### 函数 Schema

提供显式的参数 Schema 以实现精确控制：

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

## 🎪 事件

使用事件监听器拦截和控制同步操作：

```typescript
import { createExecutor, SyncStates } from '@isdk/sandbox-executor';

const executor = createExecutor();

// 同步前 - 可以跳过或中止
executor.on('beforeSync', function(change) {
  console.log(`正在同步: ${change.path}`);

  // 跳过特定文件
  if (change.path.endsWith('.tmp')) {
    this.result = { state: SyncStates.SKIP, reason: '临时文件' };
    return;
  }

  // 中止整个同步
  if (change.path.includes('/secrets/')) {
    this.result = { state: SyncStates.ABORT };
    this.stopped = true;
  }
});

// 同步后 - 仅通知
executor.on('afterSync', function(data) {
  if (data.success) {
    console.log(`✅ 已同步: ${data.path}`);
  } else {
    console.log(`❌ 失败: ${data.path}`, data.error);
  }
});

// 错误处理
executor.on('syncError', function(change, error) {
  console.error(`同步错误 ${change.path}:`, error);
});

// 权限拒绝
executor.on('permissionDenied', function(record) {
  console.warn(`🚫 权限拒绝: ${record.operation} 于 ${record.path}`);
});
```

## 🔄 执行模式

### 纯虚拟模式

无真实文件系统访问，所有操作在内存中进行：

```typescript
const result = await executor.execute({
  language: 'python',
  code: 'def add(a, b): return a + b',
  functionName: 'add',
  args: [1, 2],
});
// 无 mount 配置 = 虚拟 FS 中全部权限开放
```

### 虚拟文件模式

提供虚拟文件但不同步到真实文件系统：

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
// 文件仅存在于内存中
```

### 真实目录模式

挂载真实目录并进行权限控制和同步：

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
// 变更同步到真实文件系统
```

### 手动同步模式

精确控制同步哪些变更：

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

// 先检查变更
console.log('已创建:', result.files?.created);

// 只同步选定的文件
const toSync = result.files?.created.filter(f => f.path.endsWith('.json')) ?? [];
await executor.syncFiles(toSync, { dirs: { '/workspace': './output' } });
```

## 🧪 签名推断

本库使用三层优先级自动推断函数签名：

1. **Schema**（最高优先级）- 用户提供的显式 Schema
2. **Inferred** - 从代码解析（AST/正则）
3. **Convention**（最低优先级）- 语言特定的默认约定

### Python 约定

```python
def func(*args, **kwargs):  # 支持可变参数和关键字参数
    pass
```

### JavaScript 约定

```javascript
function func(arg1, arg2, options = {}) {  // 最后一个参数作为 options 对象
}
```

### Ruby 约定

```ruby
def func(*args, **kwargs)  # 支持可变参数和关键字参数
end
```

### PHP 约定

```php
function func(...$args) {  // 支持可变参数和关键字参数 (通过关联数组)
}
```

## 📊 结果状态

| 状态 | 说明 | 退出码 |
|------|------|--------|
| `success` | 函数执行成功 | 0 |
| `error` | 函数抛出异常 | 1 |
| `crash` | WASM 运行时崩溃 | 1 |
| `timeout` | 执行超时 | 124 |
| `terminated` | 执行被终止 | 143 |

## 🔧 高级用法

### 自定义工作目录

```typescript
const executor = createExecutor({
  defaultWorkdir: '/app',
});

// 或按请求指定
await executor.execute({
  // ...
  options: {
    workdir: '/custom/path',
  },
});
```

### 类型安全的结果

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
  console.log(result.result?.name); // TypeScript 知道这是 string 类型
}
```

### 错误处理

```typescript
const result = await executor.execute({
  language: 'python',
  code: 'def divide(a, b): return a / b',
  functionName: 'divide',
  args: [1, 0],
});

switch (result.status) {
  case 'success':
    console.log('结果:', result.result);
    break;
  case 'error':
    console.log('函数错误:', result.error?.message);
    console.log('错误类型:', result.error?.type); // 例如 'ZeroDivisionError'
    break;
  case 'crash':
    console.log('运行时崩溃:', result.error?.message);
    break;
  case 'timeout':
    console.log('执行超时');
    break;
  case 'terminated':
    console.log('执行被终止');
    break;
}
```

## ⚠️ 技术限制

- **Stdin 实现限制**: 底层依赖的 `@runno/sandbox` (具体为 `runFS`) 目前采用**非流式、带缓冲**的 `stdin` 实现。这导致单次输入被物理限制在 **8188 字节 (8KB)** 以内。
- **PHP 环境限制**: 对于 PHP，沙盒目前仅提供 `php-cgi` 运行时而非标准 CLI。因此，PHP 在此环境下不支持标准的 `stdin` 流输入。
- **解决方案**: 推荐使用 `file` 模式（基于虚拟文件系统）来可靠地处理大数据负载或执行 PHP 代码。

## 🤝 贡献

欢迎贡献！请阅读我们的[贡献指南](CONTRIBUTING.cn.md)以了解我们的架构、如何添加新语言以及开发流程。

## 📄 许可证

MIT © [Riceball LEE](https://github.com/snowyu)

## 🙏 致谢

- [@runno/sandbox](https://runno.dev/) - 基于 WebAssembly 的代码执行
- [events-ex](https://www.npmjs.com/package/events-ex) - 增强的事件发射器
- [minimatch](https://github.com/isaacs/minimatch) - Glob 模式匹配
