---
name: voltmind-conventions
description: Use when 使用 voltmind 领域技能（voltcell/data-analysis/opt-design/sim-calc/report-gen/test-plan 等）产出产物、展示进度、澄清需求或选择图表机制——提供统一的产物登记/交互约定，含 mermaid 图、3D 场景、quiz 教学、timeline、file-tree 等补充展示形态。触发词：产物、登记、进度、图表、需求澄清、harness 约定、交互约定、mermaid、3D、quiz、时间线、文件树。
version: "1.2.0"
lastUpdated: 2026-08-22
---

# VoltMind 产物与交互约定（共享层）

领域技能只描述领域内容；**本技能承载全部 harness 交互约定**。每项约定给出 **DSH 实现**（当前平台）与**非 DSH 替代说明**（迁移到其他 agent/harness 时按此替换，领域技能本身无需改动）。

## 1. 产物登记（全部可点）

- **原则**：所有产出的文件（报告/图表/数据）必须登记为可点产物，供用户打开/预览/下载；不要只写进对话。
- **DSH 实现**：调用 `voltmind_emit(files:[{path,title,kind}])`，path 相对当前工作区，kind 填 html/csv/xlsx/md/png 等。工具会校验路径在工作区内、文件存在。
- **非 DSH 替代**：换成目标 harness 的产物/附件声明机制（如可点文件链接、附件列表）；没有则用行内 basename 链接 + 说明文件位置。

## 2. 产物数量（≤6，重要置前）

- **原则**：一次回合登记的产物**最多 6 个**；超出的会被折叠成不可点（平台限制），关键产物放最前。
- **DSH 实现**：ui-deliverables 每回合显示上限 6（SHOWN_LIMIT）。多产物时合并（多图拼一个 HTML、多 csv 合并）或分回合登记。
- **非 DSH 替代**：无平台硬限制时仍建议 ≤6 保持可读；有折叠限制的平台同样适用第 1 条原则。

## 3. 产物形态（HTML 报告自包含 + 图表内联 + 纵向布局）

- **原则**：HTML 报告必须**单个自包含文件**（离线可打开）；图表**内联**进报告，**禁止 iframe 相对引用、禁止 fetch 外链**（沙箱预览下图表会空白）。
- **报告布局**：用**从上到下的纵向布局**（标题/概况 → 结论摘要 → 图表依次 → 明细），**不用左右分栏**（侧栏窄宽预览下左右栏挤、不便滚动）；页面 max-width ~1000px 居中，图表高 ~450–500px，避免横向溢出。
- **DSH 实现**：plotly 用 `fig.to_html(include_plotlyjs=..., full_html=False)` 生成片段拼进报告（首图带 plotly.js），或小数据量用 dsh-ui 内联。禁止 `full_html=True` 独立图 + iframe 内嵌。
- **非 DSH 替代**：图表内联与纵向布局原则通用（多数预览是 sandbox iframe、窄面板）；渲染库按 harness 换（如 Chart.js/Matplotlib 转 PNG 内嵌 base64）。

## 4. 需求澄清（原生弹窗，一问一答）

- **原则**：需要用户输入时，用**原生弹窗**一次只问一个关键参数，收到答复再问下一个；用户已明确的参数不重复问；全部齐备才进入执行。
- **DSH 实现**：`ask_user_question`（一次一问，选项或数值）。
- **非 DSH 替代**：换成目标 harness 的询问机制（表单/选择题/输入框）；"一问一答、不重复问"原则通用。

## 5. 进度显示（todo 清单随进度更新）

- **原则**：多步骤任务开始时用 todo 清单展示步骤，每完成一步立即整表更新；正在做的一步标 in_progress（至多一个）；状态枚举 pending / in_progress / completed。单步/琐碎请求可跳过。
- **DSH 实现**：`todo_write`（整表替换更新）。
- **非 DSH 替代**：换成目标 harness 的进度/任务机制；"整表更新、串行 in_progress、即时标记"原则通用。

## 6. 图表选型（按数据量分档）

- **原则**：按数据量选择图表机制：
  - **小数据量**（≤2000 行或已聚合）：内联交互图表（趋势 line / 对比 bars / 占比 donut / 表格 / 进度），富图表（双 Y 轴/雷达/仪表）按需。
  - **大数据量**（>2000 行或 10 万级点）：脚本生成自包含 HTML 图表（可缩放、可悬停），**不要**在对话里硬塞大数据。
- **DSH 实现**：小数据 dsh-ui `chart`（line/bars/donut）+ `visualize` 富图表；大数据 Python+plotly（`to_html` 片段内联进报告）。
- **非 DSH 替代**：渲染机制按 harness 换（内联 HTML/PNG 均可）；"按数据量分档"原则通用。

## 7. 产物命名

- **原则**：产物文件名带日期与短标识，便于检索：`<前缀>_<yyyyMMdd>_<key>.<ext>`，key 用 kebab-case 描述用途。
- **DSH 实现**：领域前缀如 `analysis_`（数据分析）、`design_`（电芯设计）；例 `analysis_20260818_cycle-decay.html`。
- **非 DSH 替代**：命名规则通用；前缀按领域/项目调整。

## 8. 补充展示形态（mermaid / 3D / quiz / timeline / file-tree）

常规图表（趋势/对比/占比）用 dsh-ui，富图表用 visualize，大数据用 plotly——**这五种形态常规图表表达不了**，按场景选用（渲染引擎 GenUI 已在平台就绪，直接内联）：

| 形态 | 何时用 | DSH 实现 | 非 DSH 替代 |
|---|---|---|---|
| **mermaid 图** | 流程 / 架构 / 数据流 / 时序 / 甘特进度：如分析流程、电芯设计流程、测试序列、项目阶段 | `mermaid` 节点（flowchart/sequence/gantt/pie/class 等，`code` 字段写图源） | 换成目标 harness 的图渲染（Mermaid/Graphviz/文本 ASCII） |
| **3D 场景** | 几何/结构示意：电芯卷绕或叠片结构、电池包排布、台架布局——三维比平面图直观 | `scene3d` 节点（box/sphere/cone/cylinder/torus 组合，position/rotation/scale，可拖拽旋转缩放） | 换成目标 harness 的 3D/几何示意（无则用二维剖面图） |
| **quiz 教学** | 验证理解 / 培训 / 自查：概念问答、参数含义、方法选择——可本地判分+解析+重做 | `quiz` 节点（question/options/answer/explanation；点选即判，id 变化重置） | 换成目标 harness 的问答/测验机制（无则用选择题文字交互） |
| **timeline 时间线** | 事件序列：测试流程节点、项目里程碑、问题排查经过 | `timeline` 节点（title/desc/time 列表） | 换成目标 harness 的时间线/列表展示 |
| **file-tree 产物树** | 产物/目录结构总览：交付物清单、数据目录结构 | `file-tree` 节点（file/dir 嵌套，可折叠） | 换成目标 harness 的树/列表展示 |

**规则**：

- 这些形态**按需选用**（流程复杂才用 mermaid、有几何结构才用 3D、教学场景才用 quiz），不强制每个任务都用。
- 与其他展示不重复：同一内容只用一种形态（如流程既不要 mermaid 又不要 steps）。
- 富交互（可拖拽 3D、判分 quiz、可折叠 file-tree）在支持 GenUI 的平台才完整；不支持时降级为静态图/文本。

## 9. 知识引用链接化（可点击溯源）

领域技能通过 VoltKnow MCP 检索知识库（wiki_search / hybrid_search / agent_chat）时，引用必须**可点击溯源**——用户点击即在浏览器打开 VoltKnow 对应页面，而非纯文字标注。

- **原则**：
  - 检索返回的 **wiki 页面**（含 `slug`）→ 必须渲染为可点击链接。
  - **原始文献 chunk**（hybrid_search 返回，无独立页面深链）→ 保持文本引用（`<kb doc=.../>`）；若该文献有对应 wiki 页（source_refs 关联）则同时给 wiki 页链接。
  - 每条推荐参数/方案必须有出处；无引用不推荐（沿用领域技能「引用约定」）。
- **链接格式**：`<web_host>/platform/knowledge-bases/<kb_id>?slug=<page_slug>`
  - `web_host` = VoltKnow Web 前端地址。当前生产：`http://8.149.246.29`（更换部署时更新此值；多个环境时可取 MCP 工具返回/配置中的 host）。
  - `kb_id` = 本次 MCP 调用使用的知识库 ID（wiki_search/hybrid_search 的 `kb_id` 参数；上下文拿不到时先调 `mcp__voltknow__list_knowledge_bases` 按名称匹配）。
  - `page_slug` = wiki_search 返回结果中的 `slug` 字段（如 `entity/ncm811`）。
- **DSH 实现**：方案正文中每条 wiki 引用用 dsh-ui `link` 组件（href 仅 http(s)/mailto，必须完整含 `http://` 前缀）：
  ```dsh-ui
  {"type":"link","label":"<页面标题>","href":"<完整链接>"}
  ```
  多个链接用 list / table 容器组织（如「相关页面」「数据来源」列表）。
- **非 DSH 替代**：换成目标 harness 的可点击链接渲染（markdown 链接 / 富文本）；链接格式与「slug 深链」原则通用。

> 关键事实：VoltKnow WikiBrowser 支持 `?slug=<page_slug>` 深链参数（打开知识库详情页即直达该 wiki 页），浏览器登录后可用；知识库 ID 通过 MCP 工具参数 / `list_knowledge_bases` 获取。

## 保证清单（快速自查）

- 产物已登记且可点、≤6 个、关键产物最前？
- HTML 报告单文件自包含、图表内联（无 iframe/外链 fetch）？
- 需求用弹窗一问一答、没重复问已明确参数？
- 多步骤有 todo 进度并随做随更？
- 图表按数据量选型（小→内联，大→自包含 HTML）？
- 文件名带日期 + kebab-case key？
- 流程/架构/3D/教学/时间线/产物树是否用了合适的补充形态（mermaid/scene3d/quiz/timeline/file-tree），且与常规图表不重复？
- 知识引用可点击溯源？——wiki 页用 dsh-ui link（`/platform/knowledge-bases/<kb_id>?slug=<slug>`），文献无深链时文本引用 + 尽量关联 wiki 页链接