# Contributing to Sandbox Executor

First off, thank you for considering contributing to Sandbox Executor! It's people like you who make it such a great tool.

## 🏗️ Architecture Overview

Sandbox Executor is designed to provide a high-level, function-centric API on top of WebAssembly-based sandboxes.

### Design Philosophy

* **Standard I/O as Communication Bridge**: Use `stdin` for function input within the sandbox and `stdout` for function output. This design allows the executor to support any programming language and facilitates easier replacement or iteration of the underlying sandbox library.
* **SIP (Sandbox Input Protocol)**: To ensure robustness and future extensibility, input uses a length-prefix protocol:
  * **1st Byte**: Mode (`'A'` for Atomic, `'S'` for Stream, `'P'` for Persistent).
  * **Bytes 2-9**: 8-character hex-encoded string representing the length of the JSON payload.
  * **Subsequent Bytes**: JSON call request (containing `functionName`, `args`, `kwargs`, etc.).
  * **Note**: We use hex-encoded length because the underlying `runFS` `stdin` only supports strings. Binary length bytes could be corrupted or change size during UTF-8 encoding. Hex ensures ASCII safety.
* **Proxy/User-Code Separation**: Each language has a `main` proxy program responsible for handling the SIP protocol and dynamically loading the `user_code` file containing the user logic.

### 🏗️ Argument Passing Mechanisms

To balance performance, reliability, and data volume, Sandbox Executor supports three distinct argument passing modes. The `auto` mode (default) intelligently chooses the best strategy.

#### 1. `inline` Mode (Fastest)

* **Mechanism**: Arguments are serialized into target language literals and hardcoded directly into the generated `main` proxy source code.
* **Pros**: Zero runtime overhead for communication; bypasses all `stdin` limitations.
* **Cons**: Source code size increases; risk of code injection if not properly escaped.
* **Best for**: Small data, simple function calls (e.g., less than 4KB).

#### 2. `stdin` Mode (Standard)

* **Mechanism**: Arguments are passed via the standard input stream using the **SIP (Sandbox Input Protocol)** (Length-prefixed JSON).
* **Pros**: Decouples data from source code; standard WASI communication.
* **Cons**: Limited by the underlying sandbox's **non-streaming** implementation of `stdin` (currently **8KB** buffered in `runFS`). Large data will cause timeouts or truncation.
* **Best for**: Moderate data volumes (4KB to 8KB).

#### 3. `file` Mode (Most Robust)

* **Mechanism**: Arguments are written to a temporary virtual JSON file (e.g., `/workspace/.sandbox_request.json`) within the sandbox VFS. The proxy program reads this file at startup.
* **Pros**: Bypasses all `stdin` buffer limits; extremely reliable for very large data (e.g., Base64 strings).
* **Best for**: Large data (> 8KB) or environments with unstable `stdin`.

### 🧠 `auto` Selection Logic

The `SandboxExecutor` evaluates the total size of arguments and chooses:

* **Size < 4KB**: Use `inline` if the language supports it.
* **4KB <= Size < 8KB**: Use `stdin`.
* **Size >= 8KB**: Use `file`.

---

### ⚠️ Pitfalls & Lessons Learned

During the industrialization of the parameter passing mechanism, several critical issues were resolved:

#### 1. The 8KB Stdin Wall

The `runno` `runFS` implementation has a fixed buffer for `stdin`. Sending more than 8188 bytes results in an immediate hang or silent failure.

* **Fix**: The introduction of `file` mode (VFS-based) completely resolved this for all languages.

#### 2. Python "Multiple Values for Argument"

When mixing positional `args` and keyword `kwargs` (e.g., `func(*[None, 2], **{'a': 1})`), Python throws a `TypeError` if `a` is the first parameter.

* **Fix**: Implemented **Hole-filling logic** in `normalizeArguments`. If the `args` array has gaps, the executor uses the function signature to pull matching keys from `kwargs` into those gaps before passing them to the sandbox.

#### 3. C++ Strictness

* **Memory Allocation**: In C++, `malloc` returns `void*` and requires an explicit cast (e.g., `(char*)malloc(...)`). Shared C templates must include these casts to be valid C++.
* **Type Overloading**: C++ functions returning `std::string` cannot be directly passed to `cJSON_CreateString(const char*)`.
* **Fix**: Injected a C++ helper/overload into the dispatcher to handle `std::string` transparently.

#### 4. Absolute Path Consistency

Relative paths in the sandbox (like `./file.json`) can be ambiguous depending on the entry point.

* **Fix**: Always use absolute paths (e.g., `/workspace/.sandbox_request.json`) and pass them to proxies via environment variables or `#define` macros.

#### 5. String Escaping in C Templates

When generating C code from JavaScript strings, `\n` and `\0` can be double-processed.

* **Fix**: Use raw strings or carefully controlled escaping in templates. Ensure the `cJSON` printer uses a large enough dynamic buffer (8KB+) to prevent memory corruption when serializing complex results.

#### 6. API Ergonomics & Leveling (V0.2 New)

Previously, `FunctionCallRequest` was cluttered with mixed levels of concerns.
* **Refining Levels**: Common execution parameters like `timeout` and `argsMode` were moved to the root request to improve developer experience. Environment-specific settings like `mount`, `files`, and `workdir` were grouped into an `options` object.
* **Reporting rename**: `resultOptions` was renamed to `reporting` to better reflect its purpose: controlling what metadata the sandbox reports back.

#### 7. Schema Unification & C Dispatching (V0.2 New)

* **InputSchema**: We moved from `ParamSchema[]` to `InputSchema` (Record or Array of JsonSchema) to better support AI tool calls.
* **C Generator Dispatching**: Since `input` can now be a Record, the C generator must sort parameters by their `index` property to ensure the correct positional call order in the generated dispatcher. This is critical for languages without native reflection.

### Core Components

1. **`SandboxExecutor` (src/executor.ts)**: The main entry point. It orchestrates the entire execution lifecycle:
    * Signature inference.
    * File system preparation (generating proxy and user-code files).
    * Building SIP packets via `generateStdin`.
    * WASM execution via `@runno/sandbox`.
    * Post-execution change detection and result parsing.

2. **Code Generators (src/generators/)**:
    * Each language has a `CodeGenerator` implementing `generateFiles` and `generateStdin`.
    * The proxy program reads the SIP packet from `stdin`, parses it, calls the target function, and serializes the result to `stdout`.
    * **Static Proxy with Dynamic Dispatch**: For languages without reflection (e.g., C/C++), the generator dynamically creates a `dispatcher` glue layer to handle function routing based on `signature.input`.

3. **Signature Inference (src/inference/engine.ts)**:
    * Uses static analysis (regex-based) and language conventions to determine function parameters.
    * Resolves signatures into `InferredSignature` with an `input: InputSchema`.

4. **File System Management (src/fs/)**:
    * **`FSBuilder`**: Constructs the initial `WASIFS` object.
    * **`FileSystemDiffer`**: Handles change detection by taking a snapshot before execution and comparing it with the result from the WASM runtime. This snapshot-based approach ensures compatibility with WASM workers where `Proxy` objects cannot be cloned (Structured Clone Algorithm limitation).
    * **`SyncManager`**: Synchronizes changes from the virtual file system back to the host disk, enforcing configured permissions.
    * **`PermissionResolver`**: Evaluates glob-based rules to allow or deny file operations.

## 🚀 Development Workflow

### Prerequisites

* Node.js >= 20.11.1
* pnpm

### Setup

```bash
git clone https://github.com/isdk/sandbox-executor.js.git
cd sandbox-executor.js
pnpm install
```

### Building

```bash
pnpm run build
```

### Testing

We use [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run integration tests only (requires network/runno environments)
npx vitest test/integration
```

## 🌍 Adding Support for a New Language

To add a new language, you need to follow these steps:

1. **Add Language Type**: Update `SupportedLanguage` in `src/types/request.ts`.
2. **Implement Generator**: Create `src/generators/<language>.ts` extending `CodeGenerator`.
    * Implement `generateWrapper`: Create the code that calls the user function and prints JSON output between markers.
    * Implement `serialize`: How to convert JS types to the target language literals for `inline` mode.
3. **Register Generator**: Add your generator to the map in `src/generators/index.ts`.
    * **Runtime Mapping**: If the Runno runtime name differs from your language name (e.g., `php` -> `php-cgi`), update `getRuntime`.
    * **Note for C/C++**: The current sandbox environment for `clang` and `clangpp` has some limitations:
        * **Exceptions**: Exceptions are disabled. Do not use `try-catch` blocks in the wrapper code.
        * **Standard**: Use C++11 compatible code. Avoid C++14/17/20 features like `if constexpr` or type trait variables (e.g., `is_same_v`). Use traditional template specialization and `std::enable_if` if needed.
4. **Add Inference Logic**: Update `src/inference/engine.ts`.
    * Implement an `infer<Language>` method to parse function signatures into `InputSchema`.
    * Update `getConvention` with default behavior for the new language.
5. **Add Tests**:
    * Unit test for the generator in `test/unit/generators/`.
    * Inference tests in `test/unit/inference-engine.test.ts`.
    * Integration test in `test/integration/executor.test.ts` and `test/integration/real-environment.test.ts`.

## 📁 File System Tracking Details

Previously, we used a `Proxy`-based approach (`TrackedFileSystem`). However, because `@runno/sandbox` executes WASM in a Worker, the file system object must be cloned via the **Structured Clone Algorithm**. Since **`Proxy` objects cannot be cloned**, we switched to `FileSystemDiffer`.

`FileSystemDiffer` works by:

1. Taking a **deep copy (snapshot)** of the `WASIFS` before execution.
2. Passing the plain `WASIFS` object to the sandbox.
3. Comparing the returned `WASIFS` from the sandbox with the initial snapshot.

This approach is more robust for cross-thread communication and ensures all changes (including those made by the WASI runtime itself) are captured.