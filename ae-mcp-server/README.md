# AE MCP Server

AI 驱动的 After Effects 控制工具包，让 Claude Code、Cursor 等 LLM 直接操控 AE。

## 快速开始（3 步接入）

### 第 1 步：安装 CEP 扩展

将 ae-cep-extension/ 复制到 AE 扩展目录：
- macOS：~/Library/Application Support/Adobe/CEP/extensions/
- Windows：%APPDATA%\Adobe\CEP\extensions\

重启 AE，从菜单「窗口 → 扩展 → AE Agent」打开扩展面板。

### 第 2 步：接入 Claude Code（推荐）

```bash
claude mcp add ae-agent -- npx tsx /你的路径/ae-mcp-server/src/index.ts
```

### 第 3 步：验证连接

在 Claude Code 中输入：「检查 AE 连接状态」

Claude 会自动调用 check_ae_connection。

## 工具一览

按类别分组（共 20 个）：

**元工具**
- search_ae_tools：按中英关键词搜索工具并返回参数结构。
- check_ae_connection：检测 AE 与 CEP 扩展是否可通信。

**上下文类**
- get_active_context：读取当前活动合成、选中图层与属性状态。
- get_comp_tree：获取当前合成的图层树。
- get_comp_structure_summary：分析模板合成结构并输出可复用摘要。

**表达式与属性类**
- apply_expression：向指定属性直接写入表达式。
- apply_expression_preset：应用内置表达式预设并自动映射到属性。
- set_property_value：设置属性静态值。
- set_transform：批量设置图层变换属性。

**图层类**
- create_solid_layer：创建纯色图层。
- create_text_layer：创建文本图层并写入内容。
- create_null_layer：创建空对象图层用于控制器。
- set_layer_parent：设置图层父子关系。
- batch_rename_layers：按规则批量重命名图层。
- add_effect：为图层添加效果。
- add_keyframes_batch：批量添加关键帧。
- precompose_layers：将多个图层打包为预合成。

**合成类**
- create_composition：创建新合成并设置基础参数。
- clone_comp_structure：按源合成结构在新合成中重建骨架。

**高级类**
- execute_raw_jsx：执行原始 JSX 脚本（高风险，仅高级模式）。

## Cursor / Windsurf 接入

将以下配置加入 `.cursor/mcp.json` 或 Windsurf 的 MCP 配置：

```json
{
  "mcpServers": {
    "ae-agent": {
      "command": "npx",
      "args": ["tsx", "/你的路径/ae-mcp-server/src/index.ts"]
    }
  }
}
```

## 兼容性表

| 项目 | 要求 |
|---|---|
| macOS | 12+ |
| Windows | 10+ |
| After Effects | 2022+ |
| Node.js | 18+ |

---English Version

# AE MCP Server

An AI-driven After Effects toolkit that allows LLM apps such as Claude Code and Cursor to control AE directly.

## Quick Start (3 Steps)

### Step 1: Install CEP Extension

Copy ae-cep-extension/ to the AE extension directory:
- macOS: ~/Library/Application Support/Adobe/CEP/extensions/
- Windows: %APPDATA%\Adobe\CEP\extensions\

Restart AE, then open the extension panel from "Window → Extensions → AE Agent".

### Step 2: Connect Claude Code (Recommended)

```bash
claude mcp add ae-agent -- npx tsx /your-path/ae-mcp-server/src/index.ts
```

### Step 3: Verify Connection

In Claude Code, type: "Check AE connection status"

Claude will automatically call check_ae_connection.

## Tool Overview

Grouped by category (20 tools total):

**Meta Tools**
- search_ae_tools: Search tools with bilingual keywords and return full parameter schema.
- check_ae_connection: Verify connectivity between AE and the CEP extension.

**Context Tools**
- get_active_context: Read active comp, selected layers, and selected properties.
- get_comp_tree: Get the layer tree of the current composition.
- get_comp_structure_summary: Analyze a template comp and output reusable structure summary.

**Expression & Property Tools**
- apply_expression: Apply an expression to a target property.
- apply_expression_preset: Apply built-in expression presets to target properties.
- set_property_value: Set static property values.
- set_transform: Batch update layer transform properties.

**Layer Tools**
- create_solid_layer: Create a solid layer.
- create_text_layer: Create a text layer with content.
- create_null_layer: Create a null layer for control rigging.
- set_layer_parent: Set parent-child relationships between layers.
- batch_rename_layers: Rename layers in batch with naming rules.
- add_effect: Add an effect to a target layer.
- add_keyframes_batch: Add keyframes in batch.
- precompose_layers: Precompose selected layers.

**Composition Tools**
- create_composition: Create a new composition with base settings.
- clone_comp_structure: Rebuild layer skeleton in a new comp from a source comp.

**Advanced Tools**
- execute_raw_jsx: Execute raw JSX scripts (high risk, advanced mode only).

## Cursor / Windsurf Setup

Add the following JSON to `.cursor/mcp.json` or Windsurf MCP settings:

```json
{
  "mcpServers": {
    "ae-agent": {
      "command": "npx",
      "args": ["tsx", "/your-path/ae-mcp-server/src/index.ts"]
    }
  }
}
```

## Compatibility

| Item | Requirement |
|---|---|
| macOS | 12+ |
| Windows | 10+ |
| After Effects | 2022+ |
| Node.js | 18+ |
