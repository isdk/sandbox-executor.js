# Contributing to Sandbox Executor

First off, thank you for considering contributing to Sandbox Executor! It's people like you who make it such a great tool.

## 🏗️ Architecture Overview

Sandbox Executor is designed to provide a high-level, function-centric API on top of WebAssembly-based sandboxes.

### Core Components

1.  **`SandboxExecutor` (src/executor.ts)**: The main entry point. It orchestrates the entire execution lifecycle:
    *   Signature inference.
    *   Code wrapping.
    *   File system preparation.
    *   WASM execution via `@runno/sandbox`.
    *   Post-execution change detection and cleanup.

2.  **Code Generators (src/generators/)**:
    *   Each language has a `CodeGenerator` that wraps user code into an execution harness.
    *   The harness is responsible for calling the target function, capturing the result/error, and serializing it to `stdout` using specific markers (`__SANDBOX_RESULT_START__`).

3.  **Signature Inference (src/inference/engine.ts)**:
    *   Uses static analysis (regex-based) and language conventions to determine function parameters.
    *   This allows the executor to correctly map `args` and `kwargs` to the underlying language's function call syntax.

4.  **File System Management (src/fs/)**:
    *   **`FSBuilder`**: Constructs the initial `WASIFS` object.
    *   **`FileSystemDiffer`**: Handles change detection by taking a snapshot before execution and comparing it with the result from the WASM runtime. This snapshot-based approach ensures compatibility with WASM workers where `Proxy` objects cannot be cloned.
    *   **`SyncManager`**: Synchronizes changes from the virtual file system back to the host disk, enforcing configured permissions.
    *   **`PermissionResolver`**: Evaluates glob-based rules to allow or deny file operations.

## 🚀 Development Workflow

### Prerequisites

*   Node.js >= 20.11.1
*   pnpm

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

1.  **Add Language Type**: Update `SupportedLanguage` in `src/types/request.ts`.
2.  **Implement Generator**: Create `src/generators/<language>.ts` extending `CodeGenerator`.
    *   Implement `generateWrapper`: Create the code that calls the user function and prints JSON output between markers.
    *   Implement `serialize`: How to convert JS types to the target language literals.
3.  **Register Generator**: Add your generator to the map in `src/generators/index.ts`.
    *   If the Runno runtime name differs from your language name (e.g., `php` -> `php-cgi`), update `getRuntime`.
4.  **Add Inference Logic**: Update `src/inference/engine.ts`.
    *   Implement an `infer<Language>` method to parse function signatures.
    *   Update `getConvention` with default behavior for the new language.
5.  **Add Tests**:
    *   Unit test for the generator in `test/unit/generators/`.
    *   Inference tests in `test/unit/inference-engine.test.ts`.
    *   Integration test in `test/integration/real-environment.test.ts`.

## 📁 File System Tracking Details

Previously, we used a `Proxy`-based approach (`TrackedFileSystem`). However, because `@runno/sandbox` executes WASM in a Worker, the file system object must be cloned via the Structured Clone Algorithm. Since `Proxy` objects cannot be cloned, we switched to `FileSystemDiffer`.

`FileSystemDiffer` works by:
1.  Taking a deep copy of the `WASIFS` before execution.
2.  Passing the plain `WASIFS` object to the sandbox.
3.  Comparing the returned `WASIFS` from the sandbox with the initial snapshot.

This approach is more robust for cross-thread communication and ensures all changes (including those made by the WASI runtime itself) are captured.
