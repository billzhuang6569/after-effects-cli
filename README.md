# AE AI Agent

用自然语言操控 After Effects。直接说你要做什么，AI 帮你执行。

---

## 这是什么

一个让 AI 直接操作 AE 的工具。你在 Claude 里说"把第 3 层的位置加一个弹性表达式"，AE 里就真的发生了。

不需要写脚本，不需要记表达式语法，不需要点菜单。

**支持的操作包括：**

- 创建图层（文字、纯色、空对象）
- 设置父子关系、批量重命名、预合成
- 添加关键帧、设置缓动
- 应用表达式（wiggle、弹性入场、循环等预设）
- 添加效果
- 读取合成结构、图层信息、表达式内容
- 按模板克隆合成结构

---

## 安装

需要在电脑上安装两个东西：AE 插件面板 和 本地服务。

### 第一步：安装 AE 插件面板

把 `ae-cep-extension` 文件夹复制到 Adobe 的扩展目录：

**macOS：**
```
~/Library/Application Support/Adobe/CEP/extensions/
```

**Windows：**
```
%APPDATA%\Adobe\CEP\extensions\
```

复制完之后重启 AE，从菜单 **窗口 → 扩展 → AE Agent** 打开面板，面板出现即代表安装成功。

> 如果菜单里找不到"扩展"，需要先开启 AE 的调试模式。
> **macOS**：在终端运行 `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`，重启 AE 即可。

---

### 第二步：安装本地服务

需要电脑上有 Node.js（18 以上版本）。没有的话先去 [nodejs.org](https://nodejs.org) 下载安装。

然后在终端运行：

```bash
cd ae-mcp-server
npm install
npm run build
```

---

### 第三步：连接到 Claude

打开终端，运行这一行（把路径替换成你自己的实际路径）：

```bash
claude mcp add ae-agent -- node /你的路径/ae-mcp-server/dist/src/index.js
```

**怎么知道路径是什么？** 把 `ae-mcp-server` 文件夹拖进终端，它会自动显示完整路径，复制过来加上 `/dist/src/index.js` 即可。

完成后**重启 Claude Code**，连接就生效了。

---

## 验证是否正常工作

重启 Claude Code 后，直接输入：

> 检查一下 AE 连接状态

如果返回"已连接"，就可以开始用了。如果没反应，确认 AE 已打开且插件面板是展开状态。

---

## 怎么用

直接用中文说你想做什么。AI 会自动理解并操作 AE。

**几个例子：**

```
分析一下 Main_Title 这个合成的结构
```
```
给第 2 层的位置加一个 wiggle 抖动表达式
```
```
把 1、3、5 这三个图层预合成，命名为 Logo_Precomp
```
```
按照 Template_Main 的结构克隆一个新合成，叫 Template_V2
```
```
把合成里所有图层按 BG_ TXT_ CTRL_ 的规则批量重命名
```
```
查看第 5 层有哪些表达式控制效果，当前值是多少
```

---

## 命令行工具（可选）

除了在 Claude 里对话，也可以在终端直接查询 AE 信息：

```bash
ae-cli check                                      # 检查 AE 连接状态
ae-cli context                                    # 当前合成 + 选中图层
ae-cli layers "合成名称"                           # 图层列表
ae-cli layers "合成名称" --detail with-effects    # 图层列表（含效果）
ae-cli layer "合成名称" 3 --detail full           # 单图层完整详情（效果 + 表达式）
ae-cli call <工具名> --args '{"参数":"值"}'        # 直接调用任意工具
```

→ [完整 CLI 命令参考](#cli-命令完整参考)

---

## AI 工具能力一览

以下是 AI 可以直接调用的工具，分类列出高频用途。

**读取与分析**

| 工具 | 用途 |
|------|------|
| `get_active_context` | 获取当前合成、选中图层和选中属性 |
| `get_comp_tree` | 获取合成的图层树（支持 basic / timing / with-effects / full） |
| `get_layer_info` | 获取单图层详情，含效果列表和表达式内容 |
| `get_comp_structure_summary` | 深度分析合成结构，输出命名规律和表达式使用情况 |
| `check_ae_connection` | 检查 AE 与插件面板是否正常连接 |
| `search_ae_tools` | 用关键词搜索可用工具（AI 自动调用） |

**图层操作**

| 工具 | 用途 |
|------|------|
| `create_text_layer` | 创建文字图层，支持字体大小、颜色、位置 |
| `create_solid_layer` | 创建纯色图层 |
| `create_null_layer` | 创建空对象图层 |
| `set_layer_parent` | 设置图层的父子关系 |
| `batch_rename_layers` | 按规则批量重命名图层（前缀/后缀/查找替换） |
| `precompose_layers` | 将选中图层预合成 |
| `create_composition` | 新建合成 |
| `clone_comp_structure` | 按源合成克隆结构到新合成 |

**动画与属性**

| 工具 | 用途 |
|------|------|
| `apply_expression` | 为属性应用自定义表达式 |
| `apply_expression_preset` | 应用预设表达式（wiggle / elastic / bounce / loop 等） |
| `set_property_value` | 设置任意属性值（位置、缩放、不透明度等） |
| `set_transform` | 批量设置变换属性（位置、缩放、旋转、锚点） |
| `add_keyframes_batch` | 批量添加关键帧，支持设置缓动 |

**效果**

| 工具 | 用途 |
|------|------|
| `add_effect` | 为图层添加效果（按 matchName 指定） |

→ [完整工具参数说明](#工具参数完整参考)

---

## CLI 命令完整参考

```bash
# 连接检测
ae-cli check

# 当前状态（合成 + 选中图层 + 选中属性）
ae-cli context

# 图层树
ae-cli layers "<合成名>"
ae-cli layers "<合成名>" --detail basic          # 默认：index / name / type / parent
ae-cli layers "<合成名>" --detail timing         # + 入出点、startTime
ae-cli layers "<合成名>" --detail with-effects   # + 每层效果列表
ae-cli layers "<合成名>" --detail with-expressions  # + 有表达式的属性
ae-cli layers "<合成名>" --detail full           # 以上全部

# 单图层详情
ae-cli layer "<合成名>" <图层序号>
ae-cli layer "<合成名>" <图层序号> --detail full  # 含效果 props + 完整表达式

# 通用工具调用
ae-cli call <工具名> --args '<JSON参数>'
ae-cli call get_active_context --args '{}'
ae-cli call set_property_value --args '{"compName":"Main","layerIndex":1,"propertyMatchName":"ADBE Opacity","value":50}'

# 输出格式
ae-cli layers "Main" --json     # 压缩 JSON，适合管道处理
ae-cli layers "Main" --silent   # 只输出错误
```

**退出码：**
- `0` 成功
- `1` AE 执行错误
- `2` 参数错误
- `3` 连接超时（AE 未开或面板未启动）

---

## 工具参数完整参考

<details>
<summary>展开查看所有工具的参数说明</summary>

**get_comp_tree**
```json
{
  "compName": "Main_Title",
  "detail": "basic | timing | with-effects | with-expressions | full"
}
```

**get_layer_info**
```json
{
  "compName": "Main_Title",
  "layerIndex": 1,
  "detail": "basic | timing | with-effects | with-expressions | full"
}
```

**create_text_layer**
```json
{
  "compName": "Main_Title",
  "text": "Hello",
  "fontSize": 72,
  "color": [1, 1, 1],
  "position": [960, 540]
}
```

**apply_expression_preset**
```json
{
  "compName": "Main_Title",
  "layerIndex": 1,
  "propertyMatchName": "ADBE Position",
  "preset": "wiggle | elastic | bounce | loop_cycle | loop_pingpong"
}
```

**add_keyframes_batch**
```json
{
  "compName": "Main_Title",
  "layerIndex": 1,
  "propertyMatchName": "ADBE Position",
  "keyframes": [
    { "time": 0, "value": [960, 540] },
    { "time": 1, "value": [1160, 540] }
  ],
  "easing": "ease_out"
}
```

**batch_rename_layers**
```json
{
  "compName": "Main_Title",
  "targetIndices": [1, 2, 3],
  "prefix": "BG_",
  "suffix": "_V2",
  "findText": "Old",
  "replaceText": "New"
}
```

**clone_comp_structure**
```json
{
  "sourceCompName": "Template_Main",
  "newCompName": "Template_V2",
  "width": 1920,
  "height": 1080,
  "duration": 8,
  "frameRate": 30
}
```

**set_transform**
```json
{
  "compName": "Main_Title",
  "layerIndex": 1,
  "position": [960, 540],
  "scale": [100, 100],
  "rotation": 0,
  "opacity": 100,
  "anchorPoint": [0, 0]
}
```

</details>

---

## 常见问题

**Q：AE 里操作失败了怎么办？**  
AE 里支持撤销（Cmd+Z），每一步操作都有记录，可以随时回退。

**Q：支持哪些版本的 AE？**  
After Effects 2022 及以上版本，macOS 和 Windows 均可。

**Q：AI 会不会乱改我的文件？**  
所有操作都通过 AE 本身的撤销系统执行，不会直接修改源文件。建议操作前先保存项目。

**Q：需要一直开着终端吗？**  
本地服务启动后不需要单独开着终端窗口，Claude 会在需要时自动调用。

---

## 系统要求

- macOS 12+ 或 Windows 10+
- Adobe After Effects 2022+
- Node.js 18+
- Claude Code（桌面版或命令行版均可）
