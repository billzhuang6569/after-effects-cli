# 项目执行规则总纲（RULES）

**版本**：v2.1（MCP Server 架构版）
**日期**：2026年3月30日

## 1. 单一真理源

- 所有实现以 `specs/API.md`、`docs/ARCHITECTURE.md`、`docs/PRD.md`、`docs/CONTEXT_ENGINEERING.md`、`rules/DEVGUIDE.md` 为准
- 任一需求若缺少明确字段或流程定义，先补文档再开发

## 2. 协议一致性

- 严格使用 `API.md` 中定义的请求与响应结构
- 禁止增加未定义字段、修改字段语义、改写 Action 名称
- 成功与失败返回必须统一使用 `status/data/error` 结构

## 3. 架构一致性

- 对外接口：MCP Server（stdio 传输）
- 通信仅允许本地文件桥接（~/Documents/AE_Agent_Bridge/）
- MCP Server 负责工具调用翻译；CEP 负责轮询、分发、回传；JSX 负责 AE DOM 操作
- ae-cep-extension/ 目录保持零改动，新功能在 ae-mcp-server/ 中实现

## 4. AE 安全执行

- ExtendScript 仅使用 ES3 语法
- 所有项目修改操作包裹 Undo Group（`app.beginUndoGroup` / `app.endUndoGroup`）
- 所有执行入口必须做错误捕获并回传可诊断错误信息
- Undo Group 必须在 `finally` 块中关闭，防止异常导致 AE undo 栈损坏

## 5. MCP Server 执行规则

- BridgeClient 必须串行发送命令，不允许并发写入 bridge 目录
- 每个 MCP 工具必须有完整的 ToolMetadata（含 tags + examplePrompts）
- search_ae_tools 必须支持中英双语关键词搜索

## 6. 上下文工程规则

- 工具暴露采用 Tool Search 模式（search_ae_tools / get_active_context / execute_raw_jsx 三个门面）
- 错误时自动重试修正，最多 3 次后转人工处理
- 长对话触发上下文压缩，保留意图、进度与关键决策

## 7. 交付与验收规则

- 严格按 Phase 1→2→3(A/B/C/D)→4 推进，不跨阶段交付
- 每一阶段按 `DEVGUIDE.md` 的验收标准逐条验证
- 每个新增 JSX action 必须经过 AE 真机验证才能宣称完成
- 验证结果记录在 `.trae/rules/project_rules.md` 的 Action 白名单中

## 8. 当前进度快照（2026年3月30日）

| Phase | 状态 | 关键成果 |
|-------|------|---------|
| Phase 1 | ✅ 完成 | 文件桥接闭环、CEP 骨架 |
| Phase 2 | ✅ 完成 | 5个 JSX action 真机验证 |
| Phase 3-A | ✅ 完成 | MCP Server 骨架（BridgeClient + 6 工具） |
| Phase 3-B | ✅ 完成 | Tool Search 机制（中英双语同义词） |
| Phase 3-C | ✅ 完成 | 高价值新工具（13 工具，全部真机验证） |
| Phase 3-D | ✅ 完成 | 错误优化 + README + E2E 场景测试 + 真机集成测试 20/20 |
| Phase 4 | 🔜 待开始 | 上下文工程优化 |
