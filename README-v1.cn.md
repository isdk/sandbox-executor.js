# Sandbox Executor v1 架构重构记录

本项目正在进行从 v0.1 到 v1.0 的深度重构。v1 的核心目标是实现 **“核心驱动、语言插件与沙箱后端的彻底解耦”**，并建立一套通用的函数计算通信协议。

## 核心架构：解耦三部曲

v1 采用了三层解耦架构：

1. **Core (核心调度层)**:
    * 负责文件系统（VFS）构建与权限控制。
    * **智能参数归一化 (ArgumentNormalizer)**: 负责处理位置/命名参数，并利用签名推断填补参数孔洞。
    * **签名推断 (SignatureInferenceEngine)**: 自动从源码解析函数定义。
    * 不再包含任何特定语言或特定驱动的逻辑。

2. **Language Provider (语言插件层)**:
    * 负责将用户代码包装成可执行的 `ExecutionBundle`。
    * **通用包装器 (Universal Wrapper)**: 具备环境感知能力的脚本，优先使用专用通道（FD/IPC），保底使用 Stdout 标记位。
    * **协议解析**: 负责解析沙箱返回的原始数据。

3. **Sandbox Driver (驱动层)**:
    * 负责提供执行环境（WASM, Native 等）。
    * **能力协商 (Capabilities)**: 声明是否支持 FD、IPC、持久化运行等。
    * 负责 IO 通道的建立与环境变量注入。

## Sandbox-Link 协议

这是 Host 与 Sandbox 之间的通信生命线，基于 JSON 消息总线。

* **消息类型**: `call` (调用), `result` (结果), `log` (日志), `chunk` (分片), `error` (错误)。
* **分片传输 (Chunking)**: 支持大数据的切片传输。
* **日志流分离**: 通过拦截 `stdout/stderr` 并封装为 `log` 消息，解决用户打印信息污染结果通道的问题。
* **SIP (Sandbox Input Protocol)**: 在 Stdin 模式下采用 `[Mode(1b)][Length(8b hex)][Payload]` 格式，彻底解决 WASM 环境下 `EOF` 缺失导致的读取卡死问题。

## 当前工作状态

### 已完成 (Done)

- [x] **核心接口定义**: 确立了 `LanguageProvider` 和 `SandboxDriver` 的契约。
- [x] **协议实现**: 完成了 `Sandbox-Link` 消息结构的定义。
- [x] **Python 插件 (Beta)**:
  - 实现了 `universal_wrapper.py`，支持 SIP 协议读取和环境自适应输出。
  - 实现了 `LogInterceptor` 实时拦截 `print`。
- [x] **JavaScript 插件 (Alpha)**: 支持 QuickJS 运行时。
- [x] **Ruby 插件 (Alpha)**: 支持 Ruby 运行时及日志拦截。
- [x] **PHP-CGI 插件 (Alpha)**: 针对 WASM 环境优化了输入流处理。
- [x] **C/C++ 提供者重构**: 完成了基于 `cJSON` 的动态调度器生成逻辑。
- [x] **Runno 驱动**: 完成了基于 WASM 的 Runno 适配。
- [x] **参数归一化**: 成功移植并优化了原有的智能参数处理逻辑。
- [x] **测试通过**:
  - `executor.test.ts`: 验证了核心调度与能力协商逻辑。
  - `real-environment.test.ts`: 验证了在真实 WASM 环境下的端到端执行、日志拦截、异常捕获和智能参数填补。

### 待办 (Todo)

- [ ] **TemplateManager 增强**: 建立更稳健的模板发现与加载机制。
- [ ] **持久化会话 (Session)**: 为未来“驻留内存”模式预留协议支持。
- [ ] **Native Driver**: 探索基于 Host 原生隔离的执行驱动。

## 关键决策记录

1. **环境变量优先，模板注入降级**: 为了在不支持环境变量的驱动（如 Runno）中也能工作，Provider 会在生成时将配置注入到 Wrapper 模板中作为默认值。
2. **强制使用 SIP**: 只要是 Stdin 模式，必须使用长度前缀，以保证在 WASM 下的稳定性。
3. **专用通道隔离**: 鼓励 Driver 提供 FD 3 作为结果返回通道，彻底将协议数据与用户 Stdout 物理隔离。

---
*记录日期: 2026年2月8日*
