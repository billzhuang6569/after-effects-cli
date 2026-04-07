# 系统架构设计文档 (ARCHITECTURE.md)

**版本**：v2.1（MCP + 原生聊天 App 双引擎版）
**日期**：2026年3月30日

---

## 1. 架构总览

Phase 4 保持现有 AE 控制链路不变，在其上叠加“原生聊天 App + Agent Runtime + Memory/Experience/Knowledge”层。

```
AE Native Chat App（macOS，Cherry Studio 二开）
    ├── Chat UI / Task Panel / Memory Panel
    ├── Agent Runtime（Planner / Executor / Verifier / Curator）
    ├── Model Router（多模型策略）
    └── State Store（thread/workspace/checkpoint）
            │
            │ MCP tools/call（stdio 或内部连接）
            ▼
ae-mcp-server/（TypeScript）
    ├── McpServer
    ├── ToolRegistry + ToolSearchEngine
    └── BridgeClient（串行队列 + 超时 + 清理）
            │
            │ 文件桥接 ~/Documents/AE_Agent_Bridge/
            ▼
ae-cep-extension/（现有，零改动）
    ├── main.js 轮询分发
    └── host.jsx AEAgentCore
            │
            ▼
Adobe After Effects（ExtendScript / AE DOM）
```

---

## 2. 分层职责

### 2.1 原生聊天 App 层（新增）

**角色**：面向用户的任务操作系统，负责“理解需求、规划步骤、执行工具、验证结果、沉淀经验”。

**核心模块**：
- **Conversation Core**：会话流与上下文管理
- **Task Runtime**：任务状态机（analyze/plan/act/verify）
- **Memory Manager**：短期与长期记忆管理
- **Experience Engine**：Playbook 命中、回放、沉淀
- **Knowledge Gateway**：文档/RAG 检索
- **Observability**：trace、步骤日志、错误分析

### 2.2 MCP Server 层（保持稳定）

**角色**：无状态工具协议层，不负责推理，仅负责工具暴露与执行。

**硬性职责**：
- 继续通过 `tools/list` 和 `tools/call` 暴露 AE 工具
- 继续使用串行 BridgeClient，避免 AE 并发冲突
- 继续执行 15s/60s 超时策略

### 2.3 文件桥接层（保持稳定）

保持以下协议不变：
- 请求文件：`cmd_<timestamp>_<uuid>.json`
- 响应文件：`cmd_<timestamp>_<uuid>.json.response`
- 请求字段：`id/action/payload`
- 响应字段：`id/status/data/error?`

### 2.4 CEP + AE 层（保持稳定）

保持以下约束不变：
- 轮询串行消费 + `.processing` 锁
- JSX 函数全部 `try...catch`
- DOM 修改必须包裹 Undo Group
- ExtendScript 仅 ES3 语法

---

## 3. Agent Runtime 设计（Phase 4 核心）

### 3.1 状态机

```
IDLE
  → ANALYZE
  → PLAN
  → ACT
  → OBSERVE
  → VERIFY
  → (PASS → COMPLETE) | (FAIL → REPLAN)
```

### 3.2 角色拆分

| 角色 | 责任 | 失败处理 |
|------|------|---------|
| Planner | 用户意图转执行计划 | 计划冲突时重写 plan |
| Executor | 调用 MCP 工具 | 参数/上下文错误时重试 |
| Verifier | 检查目标达成 | 失败输出修复建议 |
| Curator | 经验沉淀与清洗 | 低置信度条目标记待审 |

### 3.3 执行原则

1. 不确定工具参数时必须先调用 `search_ae_tools`
2. 普通路径禁止使用 `execute_raw_jsx`
3. 失败最多自动重试 3 次，超限升级人工
4. 每步必须写入结构化日志，支持回放与审计

---

## 4. 记忆/知识/经验数据流

### 4.1 记忆（Memory）

- **短期**：当前会话状态、近期观察、任务 todo
- **长期**：用户偏好、历史任务摘要、常见错误修复策略
- **持久化建议**：LangGraph checkpointer + thread_id

### 4.2 知识（Knowledge）

- **文档源**：AE JS 文档、项目规范、内部流程文档
- **检索策略**：问题改写 → 向量召回 → 重排序 → 引用返回
- **输出要求**：回答附证据来源，避免“裸结论”

### 4.3 经验（Experience）

经验对象定义：
- `trigger`：触发条件（意图/上下文特征）
- `steps`：推荐步骤模板
- `pitfalls`：常见失败点与修复
- `score`：成功率、最近使用、置信度

经验来源：
1. 成功任务自动提炼
2. 人工专家录入
3. 教程转译流水线（可由 n8n 驱动）

---

## 5. 与 n8n 的协作边界

适合放入 n8n：
- YouTube 链接抓取、字幕提取、步骤结构化
- 经验候选审核工作流（AI 生成 → 人审 → 入库）
- 运营报表、告警、异步通知

不放入 n8n：
- 实时 AE 工具调用
- Agent Loop 内部同步决策
- 需要严格顺序一致性的运行路径

---

## 6. 工程实施方案

### 6.1 仓库分层建议

```
apps/
  ae-native-chat/        # 原生 App（UI + Runtime）
packages/
  agent-runtime/         # 角色编排与状态机
  memory-engine/         # 记忆与经验服务
  knowledge-gateway/     # RAG 与知识检索
services/
  ae-mcp-server/         # 现有服务
  ae-cep-extension/      # 现有扩展
```

### 6.2 分支与交付策略

- `main`：稳定发布分支
- `phase4/*`：阶段特性分支
- `hotfix/*`：生产修复分支
- 每个 PR 要附：任务截图、日志片段、回归结果

### 6.3 团队角色分工

| 角色 | 主要责任 |
|------|---------|
| 产品/架构 | PRD、验收口径、里程碑推进 |
| 客户端工程 | App UI、会话管理、可视化执行 |
| Agent 工程 | Runtime、模型路由、纠错策略 |
| AE 工程 | MCP 工具扩展、CEP 兼容与真机验证 |
| 质量工程 | 回归用例、稳定性监控、发布守门 |

---

## 7. 验收与可观测

必须落地的可观测指标：
- tool_call_success_rate
- retry_count
- step_latency_ms
- task_completion_rate
- experience_hit_rate

必须落地的回归集合：
1. 表达式应用
2. 合成结构克隆
3. 批量重命名 + 预合成
4. 效果添加与参数设置
5. 错误路径自纠错

---

## 8. 不可违反约束

- **通信层**：AE 外部通信必须使用本地文件桥接，禁止改 WebSocket/HTTP
- **协议层**：禁止捏造 action、payload、响应结构
- **ExtendScript**：仅 ES3 语法
- **安全层**：`execute_raw_jsx` 仅危险后备路径，必须标记 riskLevel 为 dangerous
- **演进层**：新增 AE action 必须先更新 `specs/API.md` 再实现
