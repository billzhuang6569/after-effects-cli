# 开发规范与交付清单 (DEVGUIDE.md)

**版本**：v2.1（MCP Server 架构版）
**日期**：2026年3月30日

本指南为 AI 编程助手（Claude Code / Cursor）提供明确的技术栈约束、代码规范和分阶段交付目标。

---

## 1. 技术栈约束

### 1.1 MCP Server（ae-mcp-server/）— 新建

| 项目 | 规范 |
|------|------|
| **语言** | TypeScript（严格模式） |
| **运行时** | Node.js 18+ |
| **MCP SDK** | `@modelcontextprotocol/sdk`（官方 SDK） |
| **传输协议** | stdio（本地）|
| **参数校验** | Zod v4 |
| **测试框架** | vitest |
| **发布形式** | npx 直接运行（本地开发阶段） |

目录结构：
```
ae-mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          — 入口：McpServer + stdio transport
│   ├── bridge/
│   │   ├── client.ts     — BridgeClient（串行队列 + 超时）
│   │   └── protocol.ts   — 协议类型定义
│   ├── registry/
│   │   ├── tool-registry.ts  — 工具注册表
│   │   └── tool-search.ts    — ToolSearchEngine（中英双语）
│   ├── tools/
│   │   ├── context.ts    — A类：上下文工具
│   │   ├── layers.ts     — B类：图层工具
│   │   ├── properties.ts — C类：属性与动画工具
│   │   ├── effects.ts    — D类：效果工具
│   │   ├── compositions.ts   — E类：合成管理工具
│   │   └── meta.ts       — I类：元工具（search_ae_tools 等）
│   └── utils/
│       ├── matchnames.ts — AE matchName 常量表
│       └── color.ts      — 颜色格式转换
└── tests/
    ├── bridge/           — BridgeClient 单元测试
    └── tools/            — Tool handler 单元测试
```

### 1.2 AE CEP 接收器（ae-cep-extension/）— 零改动

| 项目 | 规范 |
|------|------|
| **面板 UI** | 原生 HTML/CSS/JS |
| **宿主环境** | CEP 11+（兼容 AE 2022+） |
| **脚本语言** | ExtendScript（**严格 ES3，禁用 ES6+ 语法**） |

---

## 2. 代码规范

### 2.1 MCP Server（TypeScript）规范

**BridgeClient 实现要点**：

```typescript
// 串行队列保证 AE 单线程安全
class BridgeClient {
  private queue: Promise<void> = Promise.resolve();

  async execute(action: string, payload: object): Promise<BridgeResponse> {
    return new Promise((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        // 写入命令文件 → 轮询等待 .response → 解析返回
      });
    });
  }
}
```

**Tool Handler 实现模式**：

```typescript
// 每个工具必须：参数校验 → bridge 调用 → 结果格式化
server.tool("apply_expression", ApplyExpressionSchema, async (params) => {
  const validated = ApplyExpressionSchema.parse(params);
  const response = await bridge.execute("apply_expression", validated);
  if (response.status === "error") {
    return { content: [{ type: "text", text: `错误：${response.error.message}` }], isError: true };
  }
  return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
});
```

### 2.2 ExtendScript（JSX）规范

**新增 action 必须遵循的模板**：

```javascript
newAction: function(id, payload) {
    var hasUndo = false;
    try {
        // 1. 参数校验
        if (!payload.compName) {
            return AEAgentCore.error(id, "compName is required");
        }

        // 2. 查找对象
        var comp = AEAgentCore.findCompByName(payload.compName);
        if (!comp) {
            return AEAgentCore.error(id, "Comp not found: " + payload.compName);
        }

        // 3. 执行操作（必须包裹 Undo Group）
        app.beginUndoGroup("Agent: new_action");
        hasUndo = true;

        // ... 实际操作 ...

        app.endUndoGroup();
        hasUndo = false;

        // 4. 返回标准成功响应
        return AEAgentCore.success(id, { /* data */ });

    } catch (e) {
        if (hasUndo) { app.endUndoGroup(); }
        return AEAgentCore.error(id, e.toString(), e.line);
    }
}
```

**ES3 约束检查清单**：
- ✅ 使用 `var` 而非 `let` / `const`
- ✅ 使用普通 `function` 而非箭头函数
- ✅ 使用 `for` 循环而非 `forEach` / `map` / `filter`
- ✅ 不使用模板字符串（`\`...\``）
- ✅ 不使用解构赋值
- ✅ 不使用 `Promise` / `async` / `await`
- ✅ JSON 序列化使用 `AEAgentCore.encodeValue()`（自实现）
- ✅ JSON 反序列化使用 `eval("(" + json + ")")`（ES3 兼容方式）

**属性定位规则**：
- 始终使用 `matchName`（如 `ADBE Position`）
- 禁止使用 `name`（随 AE 语言版本变化）
- 参考 `ae-mcp-server/src/utils/matchnames.ts` 中的常量表

---

## 3. 分阶段交付清单（更新版）

**规则**：在完成前一阶段的验收标准前，禁止进入下一阶段。

---

### ✅ Phase 1：跑通本地文件桥接（已完成并验证）

**验收结果**：
- CEP 扩展骨架完整（manifest.xml, index.html, main.js, host.jsx）
- 300ms 轮询通信闭环已打通
- .processing 串行处理、.response 回写均正常

---

### ✅ Phase 2：封装核心 ExtendScript API（已完成并验证）

**验收结果**：

| Action | 验证结果 |
|--------|---------|
| `get_active_context` | ✅ 真实 AE 联调通过 |
| `get_comp_tree` | ✅ 实现完成 |
| `apply_expression` | ✅ 成功/越界/属性不存在三条路径均验证 |
| `create_solid_layer` | ✅ 真实 AE 联调通过 |
| `execute_raw_jsx` | ✅ 实现完成 |

---

### ✅ Phase 3-A：MCP Server 骨架（已完成）

**目标**：Claude Code 通过 MCP 能调用现有工具操作 AE

**验收结果**：
- `ae-mcp-server/` 初始化完成（TypeScript + MCP SDK + Zod + vitest）
- `BridgeClient` 已实现串行队列、15s 超时、`.processing` 清理
- MCP 工具基础封装完成，并可稳定调用 AE 文件桥接
- `check_ae_connection` 已上线并用于连通性诊断

---

### ✅ Phase 3-B：Tool Search 机制（已完成）

**验收结果**：
- ToolMetadata 与 ToolCatalog 已落地，支持 tags 与 examplePrompts 检索
- ToolSearchEngine 已实现关键词扩展与中英同义词映射
- `search_ae_tools` 已上线，支持工具发现与 schema 回传
- 场景验证通过：弹性表达式、整理图层等查询均可命中目标工具

---

### ✅ Phase 3-C：高价值新工具（已完成）

**验收结果**：
- 高价值与高频工具已实现并接入 MCP：`apply_expression_preset`、`get_comp_structure_summary`、`clone_comp_structure`、`set_transform`、`set_property_value`、`create_text_layer`、`add_keyframes_batch`、`batch_rename_layers`、`set_layer_parent`、`add_effect`、`precompose_layers`、`create_composition`、`create_null_layer`
- 所有新增 action 均已写入 `specs/API.md` 并在 `host.jsx` 落地
- 工具覆盖真实 MG 工作流：结构分析、模板克隆、批量整理、动画与效果编辑

---

### ✅ Phase 3-D：打磨与文档发布（已完成）

**验收结果**：
- 错误信息已统一优化，支持更可读的诊断输出
- README 已支持 Claude Code / Cursor / Windsurf 接入路径
- 端到端与真机集成测试通过（20/20）

---

### 🔜 Phase 4：优化与打磨（Context Engineering，待开始）

**目标**：引入 Prompt Caching、错误自我纠正机制优化（由 LLM APP 侧实现）

**任务**：参考 `docs/CONTEXT_ENGINEERING.md` 进行建议文档完善
