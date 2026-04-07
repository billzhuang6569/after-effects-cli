# 上下文工程与 AI 架构设计 (CONTEXT_ENGINEERING.md)

**版本**：v2.1（原生 App 多层上下文版）
**日期**：2026年3月30日

本文件定义 Phase 4 中原生聊天 App 的上下文工程策略，包括工具暴露、记忆分层、经验沉淀、知识检索与多智能体协作规则。

---

## 1. 总体原则

1. 模型只负责推理，不直接承担系统调度
2. 规划与执行显式拆分，所有步骤可观测
3. 工具调用最小暴露，按需发现
4. 记忆、知识、经验分层存储与读取
5. 回答必须可追溯（工具轨迹或知识引用）

---

## 2. 工具暴露策略（Tool Search Pattern）

### 2.1 初始暴露面

会话启动仅暴露以下门面工具：

```
1. search_ae_tools(query, category?)
2. get_active_context()
3. execute_raw_jsx(script)
```

### 2.2 调用规则

1. 未知参数时必须先调用 `search_ae_tools`
2. 有 `requiresActiveComp=true` 的工具先校验上下文
3. 普通路径禁止调用 `execute_raw_jsx`
4. 危险操作必须在 UI 中显示风险标签

### 2.3 检索权重

1. 工具名精确匹配
2. tags 匹配
3. examplePrompts 匹配
4. description 匹配
5. 同义词扩展匹配（中英双语）

---

## 3. 多层上下文模型

### 3.1 层次定义

| 层 | 内容 | 生命周期 |
|----|------|---------|
| L0 实时上下文 | 当前用户输入、当前 AE 状态 | 单轮 |
| L1 工作记忆 | 当前任务计划、步骤状态、近期观察 | 单任务 |
| L2 长期记忆 | 用户偏好、历史任务摘要、常见错误 | 跨任务 |
| L3 经验库 | Playbook、模板步骤、修复策略 | 跨用户/团队 |
| L4 知识库 | AE 文档、SOP、规范文档 | 全局 |

### 3.2 组装顺序

System Prompt 组装顺序固定为：
1. 角色与安全规则
2. 工具调用规则
3. L1 工作记忆摘要
4. L2 长期记忆命中项
5. L3 经验命中项
6. L4 知识证据片段
7. 用户最新输入 + AE 实时上下文

---

## 4. Agent Loop Prompt 模板

### 4.1 Planner Prompt（目标与计划）

输入：
- 用户目标
- 约束条件
- 经验命中结果
- 可用工具摘要

输出：
- `goal`
- `acceptance_criteria`
- `steps[]`（包含工具建议与前置条件）

### 4.2 Executor Prompt（动作与观察）

输入：
- 当前 step
- 工具 schema
- 运行前上下文

输出：
- 工具调用请求
- 观察结果摘要
- 下一步建议

### 4.3 Verifier Prompt（达标检查）

输入：
- 目标与验收标准
- 当前结果
- 错误日志（如有）

输出：
- `pass/fail`
- `issues[]`
- `repair_plan[]`

---

## 5. 错误自纠错与重试

### 5.1 标准流程

1. 工具返回 error
2. 提取结构化错误（message、line、tool、payload）
3. 生成修复候选调用
4. 重新执行
5. 连续失败 3 次后停止自动重试并升级人工

### 5.2 错误分型

| 类型 | 策略 |
|------|------|
| 参数错误 | 修正参数后重试 |
| 上下文缺失 | 先补 `get_active_context` 或结构查询 |
| 对象不存在 | 尝试搜索替代对象或提示用户选择 |
| 超时错误 | 降级步骤粒度并重试 |

---

## 6. 记忆压缩与持久化

### 6.1 压缩触发

触发条件之一即启动压缩：
- 对话上下文超过阈值
- 任务进入新阶段（如从 plan 切换到 verify）
- 会话结束归档

### 6.2 压缩产物

每次压缩输出：
- 任务目标摘要
- 已完成步骤
- 关键失败与修复
- 关键产物路径
- 待办事项

### 6.3 持久化建议

使用 thread_id 作为主键保存：
- 最新状态快照
- 历史快照链
- 可选 checkpoint 回放

---

## 7. 教程到经验（YouTube → Playbook）

### 7.1 流程

1. 输入视频链接
2. 抽取字幕/章节
3. 结构化为步骤卡（目标、前提、动作、检查）
4. 映射到现有 MCP 工具
5. 生成经验候选条目
6. 人工审核后入库

### 7.2 经验条目结构

```json
{
  "id": "exp_ae_elastic_intro_001",
  "trigger": ["文本入场", "弹性", "位置动画"],
  "steps": [
    "get_active_context",
    "search_ae_tools('elastic expression position')",
    "apply_expression_preset"
  ],
  "pitfalls": ["未选中属性", "layerIndex 越界"],
  "validation": ["预览时出现回弹", "表达式无语法报错"]
}
```

---

## 8. AE 上下文感知规范

1. 用户提“当前/选中/这个”时，优先拉取 `get_active_context`
2. 用户提具体合成名时，优先拉取结构工具（`get_comp_tree` / `get_comp_structure_summary`）
3. 涉及批处理前，先做对象清点，再批量执行
4. 涉及跨语言字段时，优先 `matchName`，避免显示名歧义

---

## 9. 观测与评估

核心评估指标：
- tool_selection_accuracy
- retry_success_rate
- experience_hit_rate
- knowledge_citation_rate
- task_completion_rate

上线前最小评测集：
1. 表达式应用
2. 模板克隆
3. 批量重命名 + 预合成
4. 效果添加 + 参数设置
5. 错误自修路径
