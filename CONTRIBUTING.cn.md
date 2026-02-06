# 贡献指南

首先，感谢你考虑为 Sandbox Executor 做出贡献！正是像你这样的人让它成为了一个如此出色的工具。

## 🏗️ 架构概览

Sandbox Executor 旨在为基于 WebAssembly 的沙盒提供高级的、以函数为中心的 API。

### 设计理念

* **标准 I/O 作为通信桥梁**: 使用 `stdin` 作为沙盒内的函数输入，`stdout` 作为函数输出。这种设计使得执行器能够支持任意编程语言，并能更方便地对实际沙盒库进行更换或迭代。
* **SIP (Sandbox Input Protocol)**: 为了确保鲁棒性和未来扩展性，输入采用长度前缀协议：
  * **第 1 字节**: 模式（`'A'` 代表原子模式，`'P'` 代表持久模式）。
  * **第 2-5 字节**: 4 字节大端序整数，表示 JSON 负载的字节长度。
  * **后续字节**: JSON 格式的调用请求（包含 `functionName`, `args`, `kwargs` 等）。
* **代理/用户代码分离**: 每种语言都由一个 `main` 代理程序负责处理 SIP 协议，并动态加载存放用户逻辑的 `user_code` 文件。

### 🏗️ 参数传递机制

为了平衡性能、可靠性和数据量，Sandbox Executor 支持三种不同的参数传递模式。`auto` 模式（默认）会智能地选择最佳策略。

#### 1. `inline` 模式 (最快)

* **机制**: 将参数序列化为目标语言的字面量，直接硬编码到生成的 `main` 代理源代码中。
* **优点**: 运行时通信开销为零；绕过所有 `stdin` 限制。
* **缺点**: 源代码体积增加；如果转义不当存在代码注入风险。
* **适用场景**: 小数据量、简单的函数调用（例如小于 4KB）。

#### 2. `stdin` 模式 (标准)

* **机制**: 通过标准输入流使用 **SIP (Sandbox Input Protocol)**（长度前缀的 JSON）传递参数。
* **优点**: 数据与源代码解耦；符合标准 WASI 通信。
* **缺点**: 受底层沙盒**非流式** `stdin` 实现的限制（当前 `runFS` 中为 **8KB** 缓冲）。发送大数据量会导致超时或截断。
* **适用场景**: 中等数据量（4KB 到 8KB）。

#### 3. `file` 模式 (最健壮)

* **机制**: 将参数写入沙盒 VFS 内的临时虚拟 JSON 文件（例如 `/workspace/.sandbox_request.json`）。代理程序在启动时读取此文件。
* **优点**: 绕过所有 `stdin` 缓冲区限制；对于极大跨度的数据（如 Base64 字符串）极其可靠。
* **适用场景**: 大数据量 (> 8KB) 或 `stdin` 不稳定的环境。

### 🧠 `auto` 选择逻辑

`SandboxExecutor` 会评估参数的总大小并选择：

* **大小 < 4KB**: 如果语言支持，使用 `inline`。
* **4KB <= 大小 < 8KB**: 使用 `stdin`。
* **大小 >= 8KB**: 使用 `file`。

---

### ⚠️ 踩坑总结与经验

在参数传递机制工业化的过程中，我们解决了几个关键问题：

#### 1. 8KB Stdin 之墙

`runno` 的 `runFS` 实现对 `stdin` 有固定缓冲区。发送超过 8188 字节会导致立即挂起或静默失败。

* **修复**: 引入 `file` 模式（基于 VFS）彻底解决了所有语言的大数据传递问题。

#### 2. Python "一个参数收到了多个值" 错误

当混合使用位置参数 `args` 和关键字参数 `kwargs` 时（例如 `func(*[None, 2], **{'a': 1})`），如果 `a` 是第一个参数，Python 会抛出 `TypeError`。

* **修复**: 在 `normalizeArguments` 中实现了 **填补孔洞 (Hole-filling) 逻辑**。如果 `args` 数组存在空缺，执行器会根据函数签名，在将参数传递给沙箱前，从 `kwargs` 中提取匹配的键填入这些空缺。

#### 3. C++ 严格性

* **内存分配**: 在 C++ 中，`malloc` 返回 `void*`，必须进行显式类型转换（例如 `(char*)malloc(...)`）。共享的 C 模板必须包含这些转换才能作为合法的 C++ 编译。
* **类型重载**: 返回 `std::string` 的 C++ 函数不能直接传递给 `cJSON_CreateString(const char*)`。
* **修复**: 在分发器（Dispatcher）中注入了 C++ 辅助函数/重载，以透明地处理 `std::string`。

#### 4. 绝对路径一致性

沙箱中的相对路径（如 `./file.json`）可能会因入口点不同而产生歧义。

* **修复**: 始终使用绝对路径（如 `/workspace/.sandbox_request.json`），并通过环境变量或 `#define` 宏传递给代理程序。

#### 5. C 模板中的字符串转义

从 JavaScript 字符串生成 C 代码时，`\n` 和 `\0` 可能会被二次处理。

* **修复**: 在模板中使用原始字符串或仔细控制转义。确保 `cJSON` 打印机使用足够大的动态缓冲区（8KB+），以防止序列化复杂结果时发生内存损坏。

### 核心组件

1. **`SandboxExecutor` (src/executor.ts)**: 主要入口点。它编排整个执行生命周期：
    * 签名推断。
    * 文件系统准备（包含生成代理文件和用户代码文件）。
    * 通过 `generateStdin` 构建 SIP 数据包。
    * 通过 `@runno/sandbox` 进行 WASM 执行。
    * 执行后的变更检测和结果解析。

2. **代码生成器 (src/generators/)**:
    * 每种语言都有一个 `CodeGenerator`，实现 `generateFiles` 和 `generateStdin`。
    * 代理程序负责从 `stdin` 读取 SIP 包，解析并调用目标函数，将结果序列化到 `stdout`。
    * **静态代理与动态转发**: 对于不支持反射的语言（如 C/C++），生成器会动态生成一个 `dispatcher` 胶水层来处理函数分发。

3. **签名推断 (src/inference/engine.ts)**:
    * 使用静态分析（基于正则）和语言约定来确定函数参数。
    * 这使得执行器能够正确地将 `args` 和 `kwargs` 映射到底层语言的函数调用语法。

4. **文件系统管理 (src/fs/)**:
    * **`FSBuilder`**: 构建初始的 `WASIFS` 对象。
    * **`FileSystemDiffer`**: 通过在执行前拍摄快照并与 WASM 运行时的结果进行对比来处理变更检测。这种基于快照的方法确保了与 WASM Worker 的兼容性（Proxy 对象无法被克隆）。
    * **`SyncManager`**: 将虚拟文件系统的变更同步回真实磁盘，并执行配置的权限。
    * **`PermissionResolver`**: 计算基于 glob 的规则以允许或拒绝文件操作。

## 🚀 开发流程

### 前提条件

* Node.js >= 20.11.1
* pnpm

### 设置

```bash
git clone https://github.com/isdk/sandbox-executor.js.git
cd sandbox-executor.js
pnpm install
```

### 构建

```bash
pnpm run build
```

### 测试

我们使用 [Vitest](https://vitest.dev/) 进行测试。

```bash
# 运行所有测试
pnpm test

# 运行测试并查看覆盖率
pnpm test:coverage

# 仅运行集成测试（需要网络/WASM 运行时）
npx vitest test/integration
```

## 🌍 添加新语言支持

要添加新语言，你需要执行以下步骤：

1. **添加语言类型**: 更新 `src/types/request.ts` 中的 `SupportedLanguage`。
2. **实现生成器**: 创建 `src/generators/<language>.ts` 并继承 `CodeGenerator`。
    * 实现 `generateWrapper`: 创建调用用户函数并在标记之间打印 JSON 输出的代码。
    * 实现 `serialize`: 如何将 JS 类型转换为目标语言的字面量。
3. **注册生成器**: 将你的生成器添加到 `src/generators/index.ts` 中的映射中。
    * 如果 Runno 的运行时名称与你的语言名称不同（例如 `php` -> `php-cgi`），请更新 `getRuntime`。
    * **C/C++ 注意事项**: 当前沙盒环境中的 `clang` 和 `clangpp` 存在一些限制：
        * **异常**: 异常已被禁用。不要在包装代码中使用 `try-catch` 块。
        * **标准**: 使用兼容 C++11 的代码。避免使用 C++14/17/20 的特性，如 `if constexpr` 或类型特征变量（如 `is_same_v`）。如果需要，请使用传统的模板特化和 `std::enable_if`。
4. **添加推断逻辑**: 更新 `src/inference/engine.ts`。
    * 实现 `infer<Language>` 方法来解析函数签名。
    * 使用新语言的默认行为更新 `getConvention`。
5. **添加测试**:
    * 在 `test/unit/generators/` 中添加生成器的单元测试。
    * 在 `test/unit/inference-engine.test.ts` 中添加推断测试。
    * 在 `test/integration/real-environment.test.ts` 中添加集成测试。

## 📁 文件系统追踪详情

之前，我们使用基于 `Proxy` 的方法 (`TrackedFileSystem`)。但是，由于 `@runno/sandbox` 在 Worker 中执行 WASM，文件系统对象必须通过结构化克隆算法进行克隆。由于 `Proxy` 对象无法被克隆，我们切换到了 `FileSystemDiffer`。

`FileSystemDiffer` 的工作原理：

1. 在执行前对 `WASIFS` 进行深拷贝。
2. 将纯 `WASIFS` 对象传递给沙盒。
3. 将沙盒返回的 `WASIFS` 与初始快照进行对比。

这种方法对于跨线程通信更加健壮，并确保捕获所有变更（包括 WASI 运行时本身所做的变更）。
