# AE AI Agent 项目规则（Project Rules）

**版本**：v2.1（MCP Server 架构版）
**日期**：2026年3月30日

## 0. 适用范围

- 适用于本仓库所有开发任务
- 以文档为唯一事实来源，禁止主观补全协议、字段、架构和流程

## 1. 文档优先级（必须遵守）

- 第 1 优先级：`specs/API.md`
- 第 2 优先级：`docs/ARCHITECTURE.md`
- 第 3 优先级：`docs/PRD.md`
- 第 4 优先级：`docs/CONTEXT_ENGINEERING.md`
- 第 5 优先级：`rules/DEVGUIDE.md`
- 第 6 优先级：`AGENT.md`
- 第 7 优先级：`.trae/rules/project_rules.md`
- 第 8 优先级：`rules/RULES.md`

若低优先级文档与高优先级冲突，以高优先级为准。

## 2. 不可违反的硬性约束

- 不得捏造 `action`、`payload` 字段、响应结构或错误结构
- AE 与外部通信必须使用本地文件桥接，不得改为 WebSocket/HTTP
- ExtendScript 必须兼容 ES3，不得使用 `let`、`const`、箭头函数、`Promise`
- AE 操作必须通过预封装 JSX 函数执行，不让 LLM 直接输出大段 JSX 作为常规路径
- 涉及属性定位时优先使用 `matchName`，不得依赖多语言可变显示名
- 新增 action 必须先录入 `specs/API.md`，禁止在未录入的情况下实现

## 3. 请求/响应协议基线

- 请求文件命名：`cmd_<timestamp>_<uuid>.json`
- 响应文件命名：`cmd_<timestamp>_<uuid>.json.response`
- 请求结构仅允许：
  - `id: string`
  - `action: string`
  - `payload: object`
- 响应结构仅允许：
  - `id: string`
  - `status: "success" | "error"`
  - `data: object`
  - `error?: { message: string, line?: number }`

## 4. 当前已验证的 Action 白名单

以下 action 已在真实 AE 环境验证通过：

| Action | 状态 |
|--------|------|
| `get_active_context` | ✅ 已验证 |
| `get_comp_tree` | ✅ 已实现 |
| `apply_expression` | ✅ 已验证（含错误路径） |
| `create_solid_layer` | ✅ 已验证 |
| `execute_raw_jsx` | ✅ 已实现（高危，仅内部/高级模式） |
| `get_comp_structure_summary` | ✅ 已验证 |
| `clone_comp_structure` | ✅ 已验证 |
| `set_layer_parent` | ✅ 已验证 |
| `create_text_layer` | ✅ 已验证 |
| `batch_rename_layers` | ✅ 已验证 |
| `add_effect` | ✅ 已验证 |
| `add_keyframes_batch` | ✅ 已验证（含 Bug Fix：PropertyValueType 枚举修正）|
| `precompose_layers` | ✅ 已验证（含 Bug Fix：1-based 索引修正）|
| `create_composition` | ✅ 已验证 |
| `set_property_value` | ✅ 已验证（含 Bug Fix：PropertyValueType 枚举修正）|

新增 action 必须：先录入 `specs/API.md` → 在 `host.jsx` 实现 → 单元测试 → AE 真机验证 → 更新此白名单。

## 5. 架构与执行规则

### 5.1 三层架构（固定）

```
任意 LLM APP
  ↕ MCP 协议（stdio）
ae-mcp-server/（TypeScript，新建）
  ↕ 本地文件桥接（~/Documents/AE_Agent_Bridge/）
ae-cep-extension/（现有，零改动）
  ↕ CEP evalScript
Adobe After Effects
```

### 5.2 CEP 端约束

- AE 端轮询处理需串行消费命令文件，避免并发冲突（通过 .processing 锁实现）
- 所有 AE DOM 修改操作必须放入 Undo Group
- 所有 JSX 函数必须 `try...catch` 并返回标准错误结构

### 5.3 MCP Server 约束

- BridgeClient 内部必须维护串行队列（不允许并发写入 bridge 目录）
- 普通操作超时 15s，渲染相关操作超时 60s
- 启动时自动清理 bridge 目录中的 .processing 残留文件
- execute_raw_jsx 在 MCP 端必须标注 riskLevel: "dangerous"

## 6. Tool Search 与上下文工程

- 工具暴露采用 Tool Search 模式：初始只暴露 search_ae_tools / get_active_context / execute_raw_jsx
- ToolSearchEngine 必须支持中英双语同义词映射
- 执行失败启用自我纠错，连续失败 3 次后升级人工处理

## 7. 开发节奏（按阶段验收）

- Phase 1 ✅ 完成：文件桥接闭环
- Phase 2 ✅ 完成：5个核心 JSX action
- Phase 3 ✅ 完成：
  - 3-A：MCP Server 骨架（已完成）
  - 3-B：Tool Search 机制（已完成）
  - 3-C：高价值新工具（已完成）
  - 3-D：打磨与发布（已完成）
- Phase 4 🔜 待开始：上下文工程优化

未满足当前阶段验收标准，不得进入下一阶段。

## 8. 交付前检查清单

- 新 Action：对照 `specs/API.md` 逐项核对 JSON 字段与类型
- 新 Action：JSX 实现包含 Undo Group + try/catch + 标准响应结构
- 新 Action：完成 AE 真机验证，通过成功路径和至少一条错误路径
- MCP Tool：对照 `docs/ARCHITECTURE.md` 核对调用链路
- MCP Tool：ToolMetadata 已録入 tool-catalog.json（包含 tags 和 examplePrompts）
- 整体：对照 `docs/PRD.md` 核对用户故事与验收标准
