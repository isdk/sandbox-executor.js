# Contributing to Sandbox Executor

First off, thank you for considering contributing to Sandbox Executor! It's people like you who make it such a great tool.

## 🏗️ Architecture Overview

Sandbox Executor is designed to provide a high-level, function-centric API on top of WebAssembly-based sandboxes.

### Design Philosophy

* **Standard I/O as Communication Bridge**: Use `stdin` for function input within the sandbox and `stdout` for function output. This design allows the executor to support any programming language and facilitates easier replacement or iteration of the underlying sandbox library.
* **SIP (Sandbox Input Protocol)**: To ensure robustness and future extensibility, input uses a length-prefix protocol:
  * **1st Byte**: Mode (`'A'` for Atomic, `'P'` for Persistent).
  * **Bytes 2-5**: 4-byte big-endian integer representing the length of the JSON payload.
  * **Subsequent Bytes**: JSON call request (containing `functionName`, `args`, `kwargs`, etc.).
* **Proxy/User-Code Separation**: Each language has a `main` proxy program responsible for handling the SIP protocol and dynamically loading the `user_code` file containing the user logic.

### Technical Limitations & Future Roadmap

* **Stdin Buffer Limit**: The current underlying `runFS` implementation has a limit of **8188 bytes (8KB)** for a single `stdin` input.
* **Streaming Stdin**: Refactoring `runFS` to support a streaming `stdin` API (e.g., via `ReadableStream`) is planned.

### PHP-CGI Solution: Pseudo-Stdin

The `php-cgi` runtime in certain WASM environments (like `@runno/sandbox`) has several limitations regarding standard input:

1. **Unreliable Stream Access**: `php://stdin` and `php://input` may fail to read the `stdin` string passed via `runFS` in some runtimes.
2. **CGI Protocol Conflicts**: `php-cgi` often expects inputs adhering to the CGI protocol, causing simple raw string writes to be ignored.

**Solution:**
The PHP generator employs a "Pseudo-Stdin" strategy. When generating the `main.php` proxy, the executor Base64-encodes the SIP protocol packet and embeds it directly into the code template as a constant string.

* **Generation**: `encodedData = base64_encode(SIP_Packet)` -> replaces `{{STDIN_DATA}}` in the template.
* **Execution**: The proxy program calls `base64_decode` to retrieve the input instead of attempting to read from the actual `stdin` stream.
This ensures compatibility while maintaining a consistent internal logic with other language proxies.

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
    * **Static Proxy with Dynamic Dispatch**: For languages without reflection (e.g., C/C++), the generator dynamically creates a `dispatcher` glue layer to handle function routing.

3. **Signature Inference (src/inference/engine.ts)**:
    * Uses static analysis (regex-based) and language conventions to determine function parameters.
    * This allows the executor to correctly map `args` and `kwargs` to the underlying language's function call syntax.

4. **File System Management (src/fs/)**:
    * **`FSBuilder`**: Constructs the initial `WASIFS` object.
    * **`FileSystemDiffer`**: Handles change detection by taking a snapshot before execution and comparing it with the result from the WASM runtime. This snapshot-based approach ensures compatibility with WASM workers where `Proxy` objects cannot be cloned.
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

# Run integration tests only (requires network/WASM runtimes)
npx vitest test/integration
```

## 🌍 Adding Support for a New Language

To add a new language, you need to follow these steps:

1. **Add Language Type**: Update `SupportedLanguage` in `src/types/request.ts`.
2. **Implement Generator**: Create `src/generators/<language>.ts` extending `CodeGenerator`.
    * Implement `generateWrapper`: Create the code that calls the user function and prints JSON output between markers.
    * Implement `serialize`: How to convert JS types to the target language literals.
3. **Register Generator**: Add your generator to the map in `src/generators/index.ts`.
    * If the Runno runtime name differs from your language name (e.g., `php` -> `php-cgi`), update `getRuntime`.
    * **Note for C/C++**: The current sandbox environment for `clang` and `clangpp` has some limitations:
        * **Exceptions**: Exceptions are disabled. Do not use `try-catch` blocks in the wrapper code.
        * **Standard**: Use C++11 compatible code. Avoid C++14/17/20 features like `if constexpr` or type trait variables (e.g., `is_same_v`). Use traditional template specialization and `std::enable_if` if needed.
4. **Add Inference Logic**: Update `src/inference/engine.ts`.
    * Implement an `infer<Language>` method to parse function signatures.
    * Update `getConvention` with default behavior for the new language.
5. **Add Tests**:
    * Unit test for the generator in `test/unit/generators/`.
    * Inference tests in `test/unit/inference-engine.test.ts`.
    * Integration test in `test/integration/real-environment.test.ts`.

## 📁 File System Tracking Details

Previously, we used a `Proxy`-based approach (`TrackedFileSystem`). However, because `@runno/sandbox` executes WASM in a Worker, the file system object must be cloned via the Structured Clone Algorithm. Since `Proxy` objects cannot be cloned, we switched to `FileSystemDiffer`.

`FileSystemDiffer` works by:

1. Taking a deep copy of the `WASIFS` before execution.
2. Passing the plain `WASIFS` object to the sandbox.
3. Comparing the returned `WASIFS` from the sandbox with the initial snapshot.

This approach is more robust for cross-thread communication and ensures all changes (including those made by the WASI runtime itself) are captured.
