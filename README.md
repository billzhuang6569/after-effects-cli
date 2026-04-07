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
# 检查连接
ae-cli check

# 获取当前打开的合成和选中图层
ae-cli context

# 查看合成里的所有图层
ae-cli layers "合成名称"

# 查看某个图层的完整信息（包括效果和表达式）
ae-cli layer "合成名称" 3 --detail full
```

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
