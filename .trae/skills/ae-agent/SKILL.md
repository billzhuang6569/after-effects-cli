---
name: "ae-agent"
description: "Operates After Effects through the AE MCP toolchain. Invoke when users ask about AE, After Effects, comps, layers, effects, expressions, or motion design workflows."
---

# AE Agent

## Purpose

Use this skill when the user wants to inspect or operate Adobe After Effects projects through the AE MCP toolchain.

## When To Invoke

- User mentions AE, After Effects, 合成, 图层, 效果, 表达式, 关键帧, 预合成, 动效
- User wants to inspect current AE context before acting
- User wants to modify AE content through the toolchain

## Execution Order

1. Run `check_ae_connection` first
2. Run `get_active_context` to capture current AE state
3. Use `search_ae_tools` to discover the best matching tool and confirm schema
4. Execute the selected tool with validated arguments
5. Use `execute_raw_jsx` only as the last fallback

## Rules

- Do not guess tool names when the task is unclear
- Prefer structured tools over raw JSX
- Keep parameters aligned with the documented schemas
- For context-sensitive tasks, refresh active context before destructive operations

## Examples

- “检查 AE 当前状态并告诉我选中了什么”
- “给 2 号图层加高斯模糊”
- “把 1、3、5 图层预合成”
- “分析这个合成的图层结构”
