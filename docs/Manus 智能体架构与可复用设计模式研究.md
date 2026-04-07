# Manus 智能体架构与可复用设计模式研究

## 一、概览：Manus 在“模型–应用”之间加了什么层？

公开资料与技术社区的逆向分析显示，Manus 并不是一个“更聪明的大模型”，而是围绕主流基础模型（Claude 3.5/3.7、Qwen 等）之上，构建了一整套 **自治智能体框架（agent framework）与运行时**。[^1][^2]

其核心思想是：

- 用一个或多个通用大模型做“决策与思考核心”；
- 在模型与用户应用之间，加上一层 **“任务 OS / agent runtime”**，负责：
  - 任务理解与分解（Planner）
  - 工具与子代理调度（Orchestrator）
  - 文件系统与长期记忆（Memory & FS）
  - 外部知识检索（RAG / Retriever）
  - 验证与纠错（Verifier）
  - 资源/模型调度（Model & Resource Scheduler）[^3][^4][^5]
- 最上层才是对用户暴露的“对话 UI / 工作流产品（如 n8n、workflow 生成器等）”。[^6][^7]

这套“中间层”，本质上就是你想要借鉴的部分：不把“工具调度”直接交给基础模型，而是用 **显式的架构和状态机 + 模型作为决策模块** 来驱动整个任务闭环。[^8][^9]

## 二、Manus 的整体技术架构拆解

综合多份技术分析与官方介绍，可以抽象出如下分层架构：[^2][^1][^3]

1. **用户接口层（UI / API）**
   - 聊天界面、任务表单、Webhook 或第三方集成（如 n8n、企业系统）。[^10][^6]
   - 接收自然语言任务描述，返回最终可执行成果（报告、代码、JSON workflow 等）。[^6]

2. **任务 OS / Agent Runtime 层**
   - 封装为“一个任务对应一个数字工作空间（workspace）”，每个 workspace 内运行一个多代理系统：
     - Planner 子代理：分析任务、拆解步骤、生成执行计划。
     - Executor 子代理：调用工具、运行代码、访问网页、读写文件。
     - Verifier 子代理：检查结果是否满足目标、是否需要重试或修订计划。
   - 整体以 **“分析 → 计划 → 执行 → 观察 → 调整”** 的迭代循环运行，类似 AutoGPT / ReAct 但更加工程化。[^5][^8][^3]

3. **认知与记忆层（Memory & Knowledge）**
   - **短期工作记忆**：当前任务的 plan、todo 列表、观察（observation）、已完成步骤等，常驻在 prompt 上下文或结构化状态中。[^3][^5]
   - **长期记忆 / 文件系统**：
     - 通过虚拟文件系统，把中间结果、笔记、临时代码、原始搜索结果等落盘到文件，而不是全部塞进对话上下文；
     - 需要时让模型通过“打开文件”工具读取，而不是让模型记住全部内容，显著降低 token 占用。[^8][^3]
   - **知识检索（RAG）**：
     - 将文档、网页、历史对话等向量化，按需检索相关内容补充给当前 agent；
     - Manus 在复杂调研任务中表现出的“知识广度”，主要来自这一层的 RAG 与 Web 浏览工具，而不是模型本身“知道一切”。[^4][^2][^3]

4. **工具与模型调度层（Tools & Models Orchestration）**
   - **多工具协同**：浏览器自动化、代码执行、文件读写、API 调用等，以统一的工具调用协议暴露给 agent。[^11][^8]
   - **多模型调度**：
     - 运行时内集成多个基础模型（Claude、Qwen、自研 code 模型等）；
     - 根据任务类型、步骤属性，动态选择或切换模型，例如：代码执行/调试使用 code-heavy 模型，写报告用长上下文模型等。[^2][^4]
   - **动态负载均衡**：
     - 按任务复杂度和优先级分配算力；
     - 通过队列和并发控制实现多任务同时运行。[^4]

5. **系统基础设施层（Sandbox & Infra）**
   - 沙箱执行环境：使用容器（Docker）或隔离 runtime 运行模型生成的代码、脚本和浏览器实例，保证安全。[^8][^3]
   - 日志、监控与审计：记录每一步调用、错误信息、重试策略，用于问题分析和可观测性。[^8]
   - 配置与权限：为不同用户/租户隔离数据和权限，控制可用工具与外部系统访问范围。[^1][^10]

## 三、Manus 的“任务闭环”：从意图到交付品

多数资料都强调 Manus 的价值不在于“回答问题”，而在于 **端到端完成任务**，比如自动生成 n8n workflow、市场调研报告、教学课件等。[^9][^1][^6]

可以抽象为以下循环：

1. **意图理解（Task Understanding）**
   - 模型读取用户描述，识别：
     - 任务目标（Goal）
     - 约束条件（时间、成本、精度、风格等）
     - 输出形式（markdown 报告、JSON workflow、代码库等）[^1][^6]

2. **规划（Planning）**
   - Planner 子代理基于通用 prompt 模板和既有“agent skills（技能模块）”进行：
     - 任务分解：拆成多个可执行子任务和步骤；
     - 步骤排序：确定依赖关系与执行顺序；
     - 工具/子代理指派：决定哪一步使用哪类工具或子 agent。[^11][^3][^8]

3. **执行（Execution）**
   - Executor 子代理逐步读取 plan：
     - 选择合适模型；
     - 通过工具调用接口执行浏览器操作、代码运行、API 请求、文件操作；
     - 将每一步的输出写入文件系统或状态存储。
   - 可以并行执行部分相互独立的步骤（例如并行爬取多家竞品的网页）。[^6][^2][^8]

4. **观察与记忆（Observation & Memory）**
   - 每一步执行后，记录：
     - 执行结果的摘要；
     - 关键中间产物的存储位置（文件路径、数据标识等）；
     - 可能的异常和不确定点。[^3][^8]

5. **验证与调整（Verification & Refinement）**
   - Verifier 子代理或者 Planner 会：
     - 检查整体是否达到用户目标（如 workflow 能否跑通、报告是否覆盖所有要点）；
     - 发现缺漏或错误时，回滚到某一步重新执行，或追加新步骤修补；
     - 根据运行中的反馈动态修改 plan（增量式规划，而不是一次性规划到底）。[^5][^3][^8]

6. **交付与总结（Delivery）**
   - 将文件系统中的多个中间文件（如 n8n JSON、说明文档、截图等）组合成最终输出，并给出“这一步一步是怎么做的”的可读说明。[^7][^6]

这套闭环就是你在体验中感受到的“它好像真的在帮我做事，而不是只在聊天”。

## 四、Manus 的模型调度：为什么感觉“很聪明”？

### 4.1 多模型策略与负载均衡

资料显示，Manus 核心并非“一个超级大模型”，而是 **多模型协同**：

- 使用 Claude 3.5/3.7、阿里 Qwen 等大模型分别承担：
  - 复杂推理与长文本生成；
  - 中文场景与性价比友好的调用；
  - 代码生成与调试。[^2][^4]
- 通过中间的调度模块，按任务类型、语言和成本动态选择模型，并在长流程中切换使用。
- 对高并发与多任务场景，通过队列和池化管理，做近似“动态负载均衡”。[^4][^2]

这让用户感知为“它总是用合适的方式解决问题”，而不是一刀切地调用同一个模型做所有事。

### 4.2 规划与执行解耦带来的“聪明感”

- Manus 的主循环是“分析 → 计划 → 执行 → 观察 → 调整”，规划与执行被 **显式拆成不同角色与步骤**。[^5][^3][^8]
- 规划阶段更多地使用自然语言推理和长上下文能力来生成结构化 plan；执行阶段则依赖工具与代码、API 调用完成具体动作。
- 当某一步失败（如网页结构变化、API 报错），Verifier 可以让系统：
  - 局部重试；
  - 调整 plan（例如换另一种抓取方式或数据源）；
  - 在日志中记录经验，为下次同类任务优化 prompt 或策略。[^3][^8]

这种 “计划–执行–纠错” 的显式结构，使得系统表现出类似“经验积累”和“审慎行动”的特性，而不是一次性给出一大段容易出错的长答案。

## 五、Manus 用的是“记忆”、“知识”还是“经验”？

可以将其拆解成三个层次：

### 5.1 记忆（Memory）

- **短期记忆**：当前会话/任务的上下文，包括用户目标、已完成步骤、失败历史等，通常部分存放在模型上下文、部分存放在结构化状态（JSON / 状态机）。[^5][^3]
- **长期记忆**：
  - 以文件系统或数据库形式保存的中间产物、运行日志、任务配置；
  - 通过向量库（vector store）为长文档和历史任务建立索引，便于未来相似任务检索和复用。[^8][^3]

### 5.2 知识（Knowledge）

- Manus 自身不“内置全部知识”，而是通过：
  - Web 浏览与爬取获取开放信息；
  - 针对某些场景预置私有文档库与 RAG；
  - 使用外部 API（如 n8n 文档、SaaS API 文档）进行知识增强。[^11][^6][^2]
- 知识属于“共享资源”，在多个任务、多个用户之间复用。

### 5.3 经验（Experience / Policy）

- 在技术实现上，经验主要体现在：
  - Prompt 与 agent 模板的不断迭代（例如如何拆解任务、如何解释 n8n 节点、如何 debug workflow）；
  - 针对 GAIA 基准测试、真实业务场景不断调参与 prompt 调优；
  - 将高频场景沉淀为“Agent Skills / Playbooks”，在新任务中直接调用而不是每次从零思考。[^9][^7][^11]
- 这些“经验”更多是 **系统设计者与运营团队不断优化的结果**，而非模型自己在线上自动 finetune；不过在学术/媒体报道中，会被描述为“自适应学习”“持续优化”。[^1][^5]

## 六、可复用的关键设计模式

结合上述分析，如果要做一个“类似 Manus、但聚焦某个特定功能”的产品，可以抽象出以下可复用模式：

### 6.1 任务 OS + Agent Loop，而非“单轮调用大模型”

- 设计一个明确的 **Agent Loop**：
  - analyze（理解）→ plan（规划）→ act（执行工具）→ observe（观察结果）→ reflect / replan（反思重规划）。[^3][^5][^8]
- 将这个循环实现为：
  - 一个显式的状态机（如 Redis/DB/内存里的状态结构）；
  - 多个“角色提示词”（planner、executor、verifier），使用一个或多个模型实例来扮演。

### 6.2 显式文件系统与“外部化记忆”

- 不要把所有中间结果塞进 prompt，而应：
  - 为每个任务分配一个虚拟 workspace（目录）；
  - 所有中间文档、原始数据、临时代码都写入该 workspace；
  - 通过“read_file / list_files / write_file”这类工具让模型按需访问。[^8][^3]
- 你可以用：
  - 本地文件系统 + 路径规范；
  - 或对象存储（S3）+ 逻辑路径；
  - 再加简单的元数据表记录每个文件的用途、关联步骤等。

### 6.3 工具规范化与“技能模块化”

- 像 Manus 的 Agent Skills 一样，把复杂工作流封装成“技能”：
  - 每个技能 = 触发条件 + 所需工具 + 内部子流程（可以再用 LLM 细分）；
  - 对外暴露统一接口（输入/输出模式清晰）。[^9][^11]
- 比如做“n8n workflow 生成器”这一类功能时：
  - 一个 skill 专门负责分析业务需求并生成节点列表；
  - 一个 skill 专门负责根据节点列表生成 n8n JSON；
  - 一个 skill 负责在沙箱里模拟运行并 debug。

### 6.4 模型与成本调度策略

- 定义策略而不是把选择交给模型自由发挥：
  - 短 prompt、对话类 → 便宜中型模型；
  - 复杂规划、长文内容 → 长上下文高能力模型；
  - 结构化代码生成 → code-specialized 模型。
- 在系统层记录每一次调用的耗时与 token 成本，为后续自动调参打基础。[^2][^4]

### 6.5 验证–纠错闭环而非“一发完事”

- 为“是否达标”单独设计一个 verifier：
  - 输入：当前产物（报告/JSON/代码）+ 用户目标描述；
  - 输出：打分 + 问题列表 + 建议修改点；
  - 若未达标，则将建议回流给 planner/executor 继续迭代。[^5][^3][^8]
- 对于可执行 artefacts（如 workflow/脚本）：
  - 在沙箱中实际运行一次；
  - 收集运行日志、错误堆栈，再交给模型分析和修复。

## 七、示例：为“某一特定功能”设计 Manus 风格架构

假设你要做的是“**自动为企业生成并部署一个数据分析报表系统**”（只是示例，方便对齐结构），可以借鉴如下架构：

### 7.1 分层设计

1. **接口层**
   - Web 表单 + 自然语言描述（如“帮我搭一个销售漏斗分析报表系统，数据源是 XXX”）。
   - 提供任务创建 API，供其他系统调用。

2. **任务 OS / Agent Runtime**
   - 为每个任务创建 workspace：`/workspace/{task_id}`。
   - 在 DB 中维护任务状态：pending / planning / executing / verifying / completed / failed。

3. **Agent 角色设计**

| 角色 | 职责 |
|------|------|
| Planner | 解析业务目标，输出分步计划：数据接入、清洗、建模、可视化、部署等。|
| Architect | 选择技术栈（如 Superset / Metabase / 自研）、云资源方案。|
| Executor | 调用代码生成工具、基础设施 API、CI/CD pipeline 等完成实际搭建。|
| Verifier | 从“能运行”“指标正确性”“用户体验”三个维度打分，给出修改建议。|

4. **工具与基础设施**
   - 文件工具：读写配置文件、SQL 模板、脚本等。
   - Web/API 工具：访问云厂商 API、BI 工具接口、数据库。
   - 代码执行沙箱：跑 ETL/DDL/单元测试等。

5. **记忆与知识**
   - 内部知识库：
     - 常见报表模板；
     - 企业行业 best practice；
     - 各 BI/数据库的文档摘要。
   - 长期记忆：
     - 历史任务的成功配置作为“案例库”，后续类似项目可以先检索、再微调。

### 7.2 调度策略示例

- 第一次创建任务：使用大模型解析需求，生成初始 plan 和架构设计文档，落盘到 `plan.md`；
- Executor 读取 `plan.md`，逐步执行每个步骤：
  - 调用“生成 SQL 模型”的 skill；
  - 调用“部署 BI 工具” skill；
  - 调用“生成 dashboard JSON” skill。
- 每个 skill 内部再用更小的 LLM 调用 + 模板代码拼装，以提高可控性和复用性。
- Verifier 在沙箱里跑一遍数据流和 dashboard，看是否能正常出图；若不行，则连同错误日志交给 LLM 生成新的修订计划。

## 八、如何做到“不让大模型直接调工具”，而是中间层调度？

这是你问题中的关键目标：借鉴 Manus 的做法，把“调度权”尽量收回到系统本身，而非无约束的 LLM。

可以采用以下策略：

1. **系统只暴露“有限可组合的高层动作”给模型**
   - 不是让模型随便调用任意 HTTP/API，而是：
     - 给它定义高层 action，如：`search_competitors`、`generate_workflow_nodes`、`run_sandbox_test`；
     - 这些 action 在系统中由真实工具和服务实现，模型只是在 plan 中提出“调用该 action，并给出参数”。

2. **Plan 由模型生成，但执行由系统完成**
   - 让模型输出一个结构化 plan（JSON / YAML），如：
     ```json
     [
       {"step": 1, "action": "search_competitors", "args": {"industry": "SaaS CRM"}},
       {"step": 2, "action": "summarize_results", "input_from": 1},
       {"step": 3, "action": "generate_dashboard_config", "input_from": 2}
     ]
     ```
   - Runtime 解析这个 plan：
     - 校验 action 是否在白名单；
     - 注入必要的安全策略和幂等控制；
     - 再真正去调用底层工具或服务。

3. **执行结果再被喂回模型，但不直接让模型发起工具调用**
   - 每一步执行完，把结果摘要与 artefact 位置（文件路径或 ID）喂给模型，请它：
     - 判断是否需要下一步；
     - 调整 plan 或输出最终结果。
   - 模型从头到尾只是在“写计划”“写说明”“写修订建议”，而不是直接动生产系统。

4. **对关键资源与外部系统统一加一层 Adapter**
   - 无论是数据库、n8n、还是你的内部业务系统，都通过 Adapter 暴露有限的、安全的 API 给 Agent Runtime；
   - Agent Runtime 再根据 plan 决定是否允许、以及如何调用这些 API。

## 九、对你的产品设计的具体建议

1. 明确你要解决的“端到端任务”是什么（例如：生成某类自动化工作流、搭建某种数据系统、批量制作某种内容资产等），然后：
   - 借鉴 Manus 的“需求理解→规划→执行→验证”的闭环，哪怕先做一个最小可行版本；
   - 把你熟悉的行业知识、流程用“Agent Skills / Playbook”的形式显式编码，而不是全部塞进一个大 prompt。

2. 在架构上，优先搭出：
   - 任务 OS / Runtime（状态机 + workspace + 日志）；
   - Planner / Executor / Verifier 三角色；
   - 基础的文件系统工具、Web/API 工具和代码执行沙箱。

3. 在“安全与可控性”上，采用：
   - 白名单 action + plan–execute–verify 模式，
   - 避免让大模型直接访问敏感接口。

4. 在“聪明感”上，重点投入在：
   - 任务分解 prompt 的打磨；
   - 针对你目标垂直场景的“高质量 Agent Skills 模版”；
   - 以及记录失败案例与成功案例，用来不断迭代这些模板，而不是急于做在线 finetune。

只要这几个核心设计原则跑通，即便一开始只接了一个基础模型，你也能做出“在特定功能上看起来极其聪明”的 Manus 风格产品雏形。

---

## References

1. [Manus AI: Revolutionizing Autonomy in Artificial Intelligence](https://opencv.org/blog/manus-ai/) - Manus AI represents the forefront of autonomous artificial intelligence, offering unprecedented oppo...

2. [Manus AI Agent: What It Is, How It Works, & Its Impact [2025]](https://www.leanware.co/insights/manus-ai-agent) - Manus AI, recognized as the world’s first fully autonomous AI agent, is transforming AI-driven autom...

3. [In-depth technical investigation into the Manus AI agent, focusing on ...](https://gist.github.com/renschni/4fbc70b31bad8dd57f3370239dccd58f) - Manus is an autonomous AI agent built as a wrapper around foundation models (primarily Claude 3.5/3....

4. [Manus：开启AI智能体的新时代-腾讯云开发者社区-腾讯云](https://cloud.tencent.com/developer/article/2503086) - Manus 是北京蝴蝶效应科技 2025 年 3 月 6 日发布的全球首款通用型 AI 智能体产品。它寓意“手脑并用”，能独立思考规划执行任务，在多领域应用前景广阔，与同类产品相比有优势，但也面临挑战...

5. [The Rise of Manus AI as a Fully Autonomous Digital Agent - arXiv](https://arxiv.org/html/2505.02024v2) - In summary, Manus AI's inner workings combine a powerful general AI model with a clever agent framew...

6. [How to Generate Ready-to-Use n8n Agents INSTANTLY with Manus AI](https://www.youtube.com/watch?v=h2Az_4T1JSg) - 🚀 Gumroad Link to Assets in the Video: https://bit.ly/4j04Byr
 🤖 Join Our Community for All Resource...

7. [The Complete Guide to AI Multi-Agent Orchestration with Manus AI](https://natesnewsletter.substack.com/p/the-complete-guide-to-ai-multi-agent) - A Quick Readable Summary Plus 178 Pages of Manus Use Cases, an Agentic AI Framework, Live Dashboards...

8. [In-depth technical investigation into the Manus AI agent, focusing on its architecture, tool orchestration, and autonomous capabilities.](https://gist.github.com/WSDzju/3dd38d6e3e5426907675605eee353d9a) - In-depth technical investigation into the Manus AI agent, focusing on its architecture, tool orchest...

9. [Manus 智能体底层能力拆解：技术架构、产品形态、插件调用](https://www.betteryeah.com/blog/manus-intelligent-agent-architecture-capability-analysis) - BetterYeah是一站式AI智能体开发平台，助力企业智能化转型，快速部署高效AI解决方案。

10. [Manus - Experience AI that acts | The AI agent that gets things ...](https://www.manus.is) - Manus is an AI agent that executes your tasks effortlessly, with the power to get things done while ...

11. [Build custom AI workflows with Manus Agent Skills | AI automation](https://manus.im/features/agent-skills)

