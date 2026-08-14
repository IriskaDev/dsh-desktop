# 模板变更日志

本文件记录 `AGENTS.md` + `.agent-workflow/` 模板自身的版本演进。
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

---

## [1.12.0] - 2026-07-02

### 新增（守护进程进阶为「激进执行员」· 自问闸门 + 操作报告）

针对用户诉求——"希望 daemon 不断自动扫描完善，模块结构越来越细分和精确"，将 daemon 从 v1.11 的「审计员 + 有限执行员」升级为「激进执行员」：在保留"只增不删 / 不碰 USER_EDITED / 不改骨架"底线的前提下，授权 daemon 对**纠错自愈**与**调用链闭环**做真实写入，并引入两道防错机制兜底。

#### 变更文件

- **`daemon/daily-refinement-sop.md`**（主要改动，v1.11 → v1.12）：
  - **Step 3 优先级表新增 5 个动手类象限**：
    - **Q4b 纠错自愈**：对已打 `<!-- STALE -->` 且 ≥ 3 天的段落，覆盖式重写该段（保留其它段）
    - **Q5 链路未建档**：业务模块无链路引用时，按 16 号 SOP 自动推 1 条 `DERIVED` 链路草稿
    - **Q6 链路陈旧修复**：链路 `STALE` 或 `LAST_VERIFIED ≥ 60` 天，覆盖 `DERIVED` 段
    - **Q7 链路补完整**：链路缺 entry/exit 或 steps < 3 时补齐缺失段落
    - **Q8 胖模块自动拆分**：`SPLIT_SUGGESTED ≥ 7` 天且能映射独立子目录时，拆成 `group.md` + 子档案
  - **新增 🚦 自问闸门 · 6 问**：Q4b/Q5/Q6/Q7/Q8 动手前必跑（USER_EDITED / LOCKED / 双证据 / 长度偏差 / 只增不删 / 预算 45）；任一为否 → 降级为"只标不改"
  - **新增 🔒 拆分双重确认（Q8 专用 4 问）**：冷却 7 天 / 独立子目录 / 不破坏排序 / 内容不丢失；任一为否 → 追加 `SPLIT_BLOCKED_BY_SELFCHECK` 等人工
  - **新增 📝 操作报告制（强制）**：每次运行（成功/跳过/被拦截）均落盘 `TARGET_PROJECT/.agent-workflow/.daemon/reports/<YYYYMMDD-HHmm>.md`，含证据链与自问闸门逐条结果，供出错复盘；报告写出不计入 60 次工具预算
  - **铁律 3 条 → 4 条**：新增"动手前必自问"
  - daemon-state.md 状态值新增 `BLOCKED_BY_SELFCHECK`
- **`AGENTS.md`**：`WORKFLOW_VERSION` 1.11 → **1.12**（daemon 治理能力增强，向后兼容）
- **`.agent-workflow/CHANGELOG.md`**：追加本条目

#### 设计取舍
- **不做备份**：信任自问闸门 + 只增不删原则，靠 `.daemon/reports/` 操作报告 + git diff 复盘兜底
- **默认冷却**：Q8 拆分需 `SPLIT_SUGGESTED ≥ 7` 天，每次运行只做 1 个动手类任务，降低单点爆炸风险
- **向后兼容**：使用项目的 daemon-state.md / AGENTS.md / workflows 无需改动，首次运行自动创建 `.daemon/reports/`

### 变更
- `WORKFLOW_VERSION`：1.11 → **1.12**（daemon 升级为激进执行员，向后兼容）
- 顶层 `ANALYZER_VERSION`：**1.7 保持不变**（未修改 15/16 分析器协议）
- 使用项目：**无需改动**，下次定时器唤醒自然按 v1.12 SOP 执行

---

## [1.11.0] - 2026-07-01

### 新增（守护进程发现能力增强 · 方案 X：A + 执行员的最小交集）

针对 v1.10 落地后暴露的**发现盲区**——守护进程只针对"已建档模块"做精化 / 纠错 / 胖模块下钻，对**新增未建档代码目录**与**已建档模块目录膨胀**这两类"新入侵领土"完全无感——本轮为 daemon SOP 补齐**发现能力**：新增 Q1.5「未建档目录扫描」与 Q2.6「目录膨胀预警」两个象限。

同时确立**"审计员 + 有限执行员"**的 daemon 定位：只对**纯新增**（Q1.5 建档）授权自动执行；涉及**改结构**（拆分胖模块）的动作仍守着"只加标记，人工决策"的安全底线。

#### 变更文件（3 个）

- **`daemon/daily-refinement-sop.md`**（主要改动）：
  - **Step 3 优先级表新增 Q1.5「未建档目录扫描」象限**：扫描目标项目源码根下未被任何模块档案覆盖的一级/二级代码目录，命中后**自动**按 15 号 Step 3 建档并触发 Step 1.6 递归下钻；单次运行只处理 1 个新目录，其余进入待办发现队列
  - **Step 3 优先级表新增 Q2.6「目录膨胀预警」象限**：已建档模块对应源码目录一级子目录数比档案「## 备注 · 下钻审计记录」快照增加 ≥ 3 个时，只在档案「## 备注」段追加 `<!-- DIR_GROWTH_DETECTED: +N ... @日期 -->` 标记 + 同步写待办发现，**不擅自拆分**
  - **Step 4 执行护栏升级**：新增 Q1.5 例外允许"新建 `modules/<name>.md`"（这是纯新增，不破坏已有内容）；追加 2 条硬禁令："不擅自拆分已有胖模块（Q2.5 / Q2.6 只加标记）"、"不修改 `modules/index.md` / `<group>/group.md` 的用户自定义排序（只允许追加新行）"
  - **Step 4 新增 Q1.5 具体动作段**：源码根识别默认忽略清单（`.agent-workflow/` / `.git/` / `node_modules/` / `vendor/` / `dist/` / `build/` / `out/` / `target/` / `.idea/` / `.vscode/` / `tmp/`）；候选优先级（近 30 天 git 修改 > 有 README/入口 > 字母序）；单次限额 1 个 + 剩余进队列
  - **Step 4 新增 Q2.6 具体动作段**：无历史快照时"仅登记不打标记"；标记格式 `<!-- DIR_GROWTH_DETECTED: +N 个新子目录 (<目录名清单>) @日期 -->`；同步写 daemon-state 「待办发现」建议人工触发"审计模块粒度"
- **`AGENTS.md`**：`WORKFLOW_VERSION` 1.10 → **1.11**，`ANALYZER_VERSION` 保持 1.7（daemon SOP 属于治理层能力，不动 15/16 分析器协议）
- **`.agent-workflow/CHANGELOG.md`**：追加本条目

### 变更
- `WORKFLOW_VERSION`：1.10 → **1.11**（daemon 发现能力增强，向后兼容）
- 顶层 `ANALYZER_VERSION`：**1.7 保持不变**（未修改 15/16 分析器协议；daemon 是纯调度层，不参与 workflow 检测协议）
- `workflows/14-workflow-self-check.md` `ANALYZER_VERSION`：**1.7 保持不变**（本轮无 workflows 骨架变更，META 跟随规则不触发升级）
- `workflows/15-module-inventory.md` / `workflows/16-call-chain-derivation.md` `ANALYZER_VERSION`：**1.6 保持不变**

### 影响范围
- **每日发现效率**：daemon 每天真正能"看见新增的代码目录 → 立刻建档"，模块粒度会随代码演进自动细化，不再依赖用户手动触发 `建立模块台账`
- **单次运行时长**：Q1.5 建档命中新目录时会走完整的 15 号 Step 3（含 Step 1.6 递归下钻），本次运行工具调用数会接近 60 次预算上限；受"每次只做 1 个任务"铁律保护，不会挤占其他象限
- **Q2.6 首次运行**：因为历史档案未记录一级子目录快照，Q2.6 首次触发时会**只登记不打标记**（登记本次快照到「## 备注 · 下钻审计记录」，供下次 diff）
- **不动手边界**：Q2.5（胖模块下钻）与 Q2.6（目录膨胀）依然只加建议标记，daemon 不改已有档案主体、不做拆分决策、不修改 `<!-- USER_EDITED -->` 段落

### 迁移建议
- 无破坏性变更；已有 daemon-state.md 与 correction-log.md 无需改造
- 下游项目升级路径：clone 新模板后，下次守护进程唤醒即自动应用新规则；无需人工干预
- 若希望立即体验：直接触发一次守护进程（按 `daemon/cron-prompt.txt` 唤醒），首轮命中 Q1.5 的可能性较高

### 备注
- 需求来源：用户反馈"当前 daemon 流程能否让模块结构越来越细分和精确"，发现两大盲区（未建档目录、已建档目录膨胀）
- 设计权衡（用户对齐结论 · 方案 X）：
  - **A + 执行员最小交集**：只对 Q1.5（纯新增建档）解锁自动执行；Q2.5 / Q2.6（涉及改结构）保持只加标记
  - **单次限额 1 个新目录**：即使发现 N 个未建档目录，一次也只建 1 个，避免预算耗尽后半途而废
  - **Q2.6 首次仅登记不打标记**：历史档案无快照数据，首次运行避免误报，从下次起才形成 diff 基线
  - **不同步下游**：仅升级模板仓库自身，下游使用项目按用户指示暂不同步
- 涉及 3 个变更文件（daemon SOP + AGENTS.md + CHANGELOG）

---

## [1.10.0] - 2026-07-01

### 新增（模块粒度递归下钻硬标准）

针对 v1.9 落地后暴露的**扫描广度偏好**问题——Agent 面对目录树时容易"扫一层就下结论"，导致 `services/`（内含 order/user/payment 等 3+ service）被当作单一 services 模块建档，胖模块内部隐藏的子模块从未被识别 —— 本轮为 15 号补齐**深度自证机制**。

#### 变更文件（3 个）

- **`workflows/15-module-inventory.md`**（主要改动，`ANALYZER_VERSION: 1.6 → 1.7`）：
  - **新增 Step 1.6「递归下钻硬标准」**，5 条硬性触发条件（T1 目录深度 / T2 文件规模 / T3 一句话职责含并列词 / T4 入口分散 / T5 档案膨胀），任一命中即触发下钻
  - **1.6.2 子域抽样验证流程**：候选模块目录 ≤ 5 二级子目录时全部验证；6~15 至少验证 5 个；> 15 直接判需拆分
  - **1.6.3 反向审计**：针对已建档的胖模块（`.md` > 800 行）做能力标题反查，判定是否需要降级为 Group
  - **1.6.4 下钻审计记录格式**：强制在模块档案「## 备注」章节留痕
  - **1.6.5 豁免规则**：4 类明确豁免场景（技术分层内聚 / DTO 集合 / 迁移过渡态 / 框架强制目录），必须显式声明依据
  - **Step 3 首次建档流程升级**：新增 Step 2.5 强制递归下钻，未过 1.6 的候选不允许进入 Step 2 扫描
  - **Step 5 增量更新**：新增 3.4 复检下钻触发条件；档案 `.md` > 800 行触发反向审计
  - **Step 7 首次报告**：新增「下钻审计统计」段（触发数 / 因下钻新增子模块数 / 因下钻新建 Group 数）

- **`AGENTS.md`**（版本头联动）：`WORKFLOW_VERSION: 1.9 → 1.10`，`ANALYZER_VERSION: 1.6 → 1.7`

- **`daemon/daily-refinement-sop.md`**（守护进程联动）：新增 Q2.5 象限「胖模块下钻」，专治历史遗留的 T5 场景（守护进程只加 `<!-- SPLIT_SUGGESTED -->` 建议标记，不擅自拆分）

### 影响范围

- 首次建档场景：Agent 会强制打开每个候选模块目录内的二级子目录做抽样验证，档案生成时间可能增加 20~40%，但换来更精细的模块粒度
- 增量更新场景：档案膨胀（.md > 800 行）会触发反向审计，可能导致单模块被降级为 Group（保留原档案作为 group.md，能力拆为子模块）
- 下游项目：升级到本版本后建议对现有的胖模块做一次人工触发的下钻复审（触发词：`审计模块粒度`）

### 迁移建议

- 无破坏性变更；旧版建档的模块**不会被自动重扫**
- 若下游项目希望立即受益，可在下次全量刷新时（`刷新模块台账`）自动应用新规则；也可通过守护进程 Q2.5 象限逐步收敛
- 已声明「豁免」的模块（在「## 备注 · 下钻审计记录」中说明豁免依据）不会重复触发

---

## [1.9.0] - 2026-07-01

### 新增（模块台账分层结构 + 三级下钻加载 + 双向反向索引）

针对 v1.8 落地后的下一个瓶颈——"扁平 modules/ 目录在中大型项目上会出现 100+ 档案，index.md 主表膨胀本身就耗 token；大模块内部结构无法自然表达；模块档案与链路档案缺少反向导航"，本轮为 15/16 补齐**分层组织能力**：

- 支持 2 层结构 `modules/<group>/<module>.md`，把 ≥3 个高内聚子模块聚合到 Group
- Agent 采用 L1 → L2 → L3 三级下钻加载，只读需要的档案
- 模块档案头部新增 `INVOLVED_CHAINS` 字段，与链路档案的 `SOURCE_MODULES_SNAPSHOT` 形成双向反向索引
- Group 索引档案（`<group>/group.md`）作为组内导航中心，含子模块清单 + 内部结构图 + 涉及的调用链聚合视图

#### 新增文件（1 个）

- **`templates/module-group-template.md`**（新增）：Group 索引档案模板
  - 头部 5 个必填元数据字段（MODULE_GROUP / STATUS / LAST_ANALYZED / SUB_MODULE_COUNT / ANALYZER_VERSION）
  - 6 个正文段落（Group 概览 / 内部结构关系图 / 子模块清单 / Group 级对外接口 / Group 级上下游 / 涉及的调用链档案 / 备注）

#### 变更文件（10 个）

- **`workflows/15-module-inventory.md`**（主要改动）：
  - **新增 Step 1.4「大模块识别与分组决策」**：3 条判定条件（内聚性 + 数量阈值 `SUB_MODULE_COUNT ≥ 3` + 对外收敛）；层级深度硬性上限 2 层
  - **Step 3 首次台账建立流程重写**：先扫扁平候选 → 再应用 1.4 分组决策 → 生成 group.md → 生成子模块档案 → 回填 group.md 「子模块清单」表 → 更新顶层 index.md（v1.9 只列 Group + 顶层单模块）
  - **Step 5.5 链路档案级联失效**升级：快照匹配规则从"按模块名"升级为"按 `<group>/<module>` 完整路径匹配，避免 Group 内同名子模块误伤"
  - **新增 Step 5.6「双向反向索引维护」**：模块迁移路径时更新链路档案 `SOURCE_MODULES_SNAPSHOT`；模块删除时联动置为 STALE
  - **新增 Step 5.7「Group 索引联动更新」**（硬性）：子模块新增/删除/职责/关键词/时效变化时同步更新 `<group>/group.md` 的「子模块清单」表 + `SUB_MODULE_COUNT` 头部字段
  - Step 7.2 增量更新报告输出模板补"Group 索引更新"清单
  - `ANALYZER_VERSION`：1.5 → **1.6**（v1.9 分层结构主体改动）

- **`workflows/16-call-chain-derivation.md`**：
  - **Step 1.2 关键词匹配升级为三级下钻协议**（L1 顶层匹配 → L2 组内下钻 → L3 精准加载 + 入口点二次匹配）
  - **Step 6.3 SOURCE_MODULES_SNAPSHOT 生成方式**升级：格式从 `<module>@<date>` 扩展为 `<group>/<module>@<date>`（Group 内子模块）或 `<module>@<date>`（顶层单模块），保持向后兼容
  - **新增 Step 6.7「反向索引维护」**（硬性）：每次落档后必须往沿途模块头部 `INVOLVED_CHAINS` 追加 slug；同步更新 Group 档案「涉及的调用链档案」表；作废链路时反向移除
  - `ANALYZER_VERSION`：1.5 → **1.6**（v1.9 三级下钻 + 反向索引）

- **`templates/module-template.md`**：
  - 头部新增 `MODULE_GROUP` 字段（顶层单模块填 `-`）
  - 头部新增 `INVOLVED_CHAINS` 字段（涉及的链路 slug 列表，无涉及链路填 `-`；由 16 Step 6.7 反向注入）
  - `ANALYZER_VERSION`：1.0 → **1.6**（v1.9 头部字段扩展）

- **`templates/chain-template.md`**：
  - 头部 `SOURCE_MODULES_SNAPSHOT` 示例升级为带路径格式（`<group>/<module>@<date>`）
  - `ANALYZER_VERSION`：1.5 → **1.6**

- **`analyzer-instructions.md`**：
  - **约束常量表新增表 H · GROUP_META**：登记 `MODULE_LAYER_DEPTH` / `GROUP_THRESHOLD` / `GROUP_FILE_NAMING` / `MODULE_HEADER_FIELDS` / `GROUP_HEADER_FIELDS` / `INVOLVED_CHAINS_FORMAT` / `THREE_LEVEL_LOAD_PROTOCOL` / `TOP_INDEX_SCOPE` 8 条常量
  - 表 G · CHAIN_META 升级：`CHAIN_SNAPSHOT_FORMAT` 支持带路径；`CHAIN_STALE_TRIGGER_RULE` 匹配规则升级为路径优先；新增 `CHAIN_REVERSE_INDEX_RULE`
  - 模块映射表新增 `module-layer` 一行

- **`modules/index.md`**（重写）：
  - 表结构变更：新增「类型」列区分 `GROUP` / `MODULE`
  - **只列 Group + 顶层单模块**，不列子模块（子模块清单在 `<group>/group.md`）
  - 加载规则改为 L1 → L2 → L3 三级下钻协议
  - 新增目录结构约定与深度硬约束说明

- **`modules/modules-guide.md`**（重写）：
  - 说明 v1.9 分层结构与文件命名规范
  - 三级下钻加载协议图与 Token 收益说明
  - Group 建组决策速查表（分层架构合并模块 vs Group 的关键区分）
  - 双向反向索引使用姿势 3 场景

- **`chains/chains-guide.md`**：
  - 联动契约段说明 v1.9 快照带路径格式
  - **新增「双向反向索引」段**：三方（链路 / 模块 / Group）互相导航的字段清单 + Agent 使用姿势 3 场景

- **`AGENTS.md`**：
  - `WORKFLOW_VERSION` 1.8 → **1.9**、`ANALYZER_VERSION` 1.5 → **1.6**
  - 「业务模块文档」段升级为 v1.9 三级下钻入口清单（L1/L2/L3 分级说明）
  - Agent 硬性约束新增 5.7 Group 索引联动
  - 目录结构树补 `<group>/group.md` + `<sub-module>.md` 层级；templates/ 补 `module-group-template.md`

- **`README.md`**：
  - Badge：v1.8 → **v1.9**
  - "这是什么"段：能力描述强调"模块分层结构与三级下钻加载"
  - 目录结构补 `<group>/`、`group.md`、`module-group-template.md`

- **`.agent-workflow/guide.md`**：
  - 「模块台账与调用链推导」章节新增「15/16 v1.9 模块分层结构与三级下钻加载」小节：目录结构 + 三级加载协议 + 建 Group 3 条判定 + 双向反向索引 + Token 收益

### 变更
- `WORKFLOW_VERSION`：1.8 → **1.9**（15/16 分层结构主体改动，向后兼容）
- 顶层 `ANALYZER_VERSION`：1.5 → **1.6**（新增表 H GROUP_META；表 G CHAIN_META 升级）
- `workflows/14-workflow-self-check.md` `ANALYZER_VERSION`：1.5 → **1.6**（META 跟随规则）
- `workflows/15-module-inventory.md` `ANALYZER_VERSION`：1.5 → **1.6**（本轮 Step 1.4/3/5.6/5.7 主体改动）
- `workflows/16-call-chain-derivation.md` `ANALYZER_VERSION`：1.5 → **1.6**（本轮 Step 1.2/6.3/6.7 主体改动）
- `templates/module-template.md` `ANALYZER_VERSION`：1.0 → **1.6**（头部字段扩展）
- `templates/chain-template.md` `ANALYZER_VERSION`：1.5 → **1.6**（快照格式升级）

### 兼容性
- **向后兼容（可选升级）**：01-13 项目侦察类流程 `ANALYZER_VERSION` 保持 `1.0`，无需重新分析
- **旧扁平结构可继续用**：v1.9 未强制所有项目采用分层，`SUB_MODULE_COUNT < 3` 的项目继续保留扁平模块结构；只有 ≥3 个高内聚子模块才建议分组
- **旧快照格式仍可读**：v1.8 及之前的 `SOURCE_MODULES_SNAPSHOT` 不带路径（`<module>@<date>`）在 v1.9 下仍可读；15 Step 5.5 匹配时优先按带路径匹配，退化后按单模块名匹配；重推链路时自动升级为带路径格式
- **旧 modules 头部无 MODULE_GROUP / INVOLVED_CHAINS 字段**：v1.9 加载时视为 `MODULE_GROUP: -`（顶层单模块）与 `INVOLVED_CHAINS: -`（无涉及链路）；用户可通过 `刷新模块台账` 增量补齐字段
- **旧项目升级路径**：clone 新模板后：
  1. 已有 `modules/*.md` 无需改造，全部视为顶层单模块
  2. 用户可选择性地对某些高内聚模块组执行 `git mv` 到 `modules/<group>/`，然后手动创建 `group.md`
  3. 或运行 `建立模块台账 --auto` 让 15 号重新扫描并按 v1.9 分层规则重建
  4. 无需运行破坏性迁移脚本

### 备注
- 需求来源：v1.8 落地后用户提问"关于模块的信息，现在正式情况是会有大模块中有很多小模块，现在全存在一个目录下 modules/ 感觉比较多也不方便查询，还有调用链我希望他们形成一个相互补充的管理"，暴露了 4 个缺口：分层组织、Group 索引导航、模块↔链路反向导航、Token 效率
- 设计权衡（用户对齐结论）：
  - **可选分层 vs 强制分层**：选择可选分层（`SUB_MODULE_COUNT ≥ 3` 才建议建 Group），避免小项目为了合规硬拆结构
  - **2 层 vs N 层嵌套**：只支持 2 层，避免 `core/loop/agent/agent-loop.md` 冗长路径与复杂加载协议；真的需要 3 层用 group.md 内二级标题分块表达
  - **反向索引存储位置**：模块档案头部字段 `INVOLVED_CHAINS`（数据靠近用户），而非独立 `_chain-index.md` 文件（避免加载模块时多读一个文件）
  - **反向索引维护方**：16 Step 6.7 落档时反向注入（自然时机），15 日常刷新不做全量反扫（避免开销）；只在模块迁移/删除时做兜底
  - **顶层 index.md 收敛**：只列 Group + 顶层单模块，不列子模块；子模块清单集中到 `<group>/group.md`——避免顶层表膨胀
- 涉及 1 新增文件 + 10 变更文件

---

## [1.8.0] - 2026-07-01

### 新增（16 号调用链推导：链路档案落档 + 跨会话复用 + 15/16 级联失效）

针对 v1.7 落地后暴露的问题——"16 号推导的调用链只在对话中出现，跨会话就丢了；下一个 Agent 接手同一入口的问题时，还得从头扫一遍代码"，本轮为 16 号补齐**长期记忆**能力：把每次推导的产物**落档**到 `.agent-workflow/chains/*.md`，形成可复用的链路库；同时新增 15 → 16 的级联失效机制，保证链路档案与模块档案的一致性。

#### 新增文件（4 个）

- **`chains/index.md`**（新增）：链路档案总索引
  - 类比 `modules/index.md`，含链路ID / 类型 / 起点 / 沿途模块 / STATUS / 时效 / 最后推导 / 最后核对 / 关键词 9 列
  - Agent 复用命中检查入口：先按 `CHAIN_TYPE + ENTRY_POINT` 精确匹配 → 命中且 STATUS ∈ {DERIVED, VERIFIED} → 直接加载复用
- **`chains/chains-guide.md`**（新增）：目录使用指南
  - 说明 `<chain-type>-<entry-slug>.md` 命名规范
  - 生命周期状态图（DERIVED → VERIFIED / STALE / ABANDONED）
  - 与 15 模块台账的联动契约（SOURCE_MODULES_SNAPSHOT + Step 5.5 级联失效）
- **`chains/_example.md`**（新增）：订单支付主链完整示例（v1.7 分叉图的档案化落地版），覆盖 5 类分叉表达
- **`templates/chain-template.md`**（新增）：链路档案模板骨架
  - 头部 8 个必填元数据字段（CHAIN / CHAIN_TYPE / ENTRY_POINT / DEPTH / STATUS / LAST_DERIVED / LAST_VERIFIED / SOURCE_MODULES_SNAPSHOT / ANALYZER_VERSION）
  - 6 个正文段落（元信息 / Mermaid 时序图 / 沿途外部资源 / 分叉分析 / 断点与风险 / 变更历史）

#### 变更文件（7 个）

- **`workflows/16-call-chain-derivation.md`**（主要改动）：
  - 「概述」新增第 8 项"落档与复用"与 v1.8 关键增强说明
  - **Step 0 前置门禁**新增第 4 项**「已推导链路复用」**：读 `chains/index.md`，命中 → 直接加载；命中 STALE → 提示用户是否重推；命中 ABANDONED → 视为无匹配走完整推导
  - **新增 Step 0.4 复用命中处理协议**：Agent 加载已有档案时必须显式声明加载来源与 STATUS
  - **Step 5 输出格式**从"不写入新文件"**改为"必须同时对话输出 + 落档 `chains/<slug>.md`"**（用户可用 `--no-persist` 关闭）
  - **新增 Step 6「落档规范」**（硬性）：slug 命名规则（6.1）/ 文件头元数据（6.2）/ SOURCE_MODULES_SNAPSHOT 生成方式（6.3）/ STATUS 状态机（6.4）/ 变更历史追加规则（6.5）/ `--no-persist` 例外（6.6）
  - **新增 Step 7「时效性维护」**：时效判定算法（7.1）/ STALE 加载协议——只提示不重推（7.2）/ 触发词汇总（7.3，含 `列出已推导的调用链` / `刷新调用链档案 <slug>` / `确认调用链 <slug>` / `作废调用链 <slug>`）
  - **原 Step 6「与其他工作流的协作」重编号为 Step 8**，并补 15 → 16 级联失效联动、PR/CR 引用链路档案的说明
  - 「相关文件」补 `chains/index.md` / `chains/*.md` / `templates/chain-template.md` 三条
  - 「触发指令」补 v1.8 5 条新触发词（含 `--no-persist`）
  - `DETECTION_HINTS` 补复用契约与新的输出目标
  - `ANALYZER_VERSION`：1.4 → **1.5**（新增落档协议，非破坏性升级）
- **`workflows/15-module-inventory.md`**：
  - **新增 Step 5.5「链路档案级联失效」**（硬性）：模块档案刷新完成后，扫 `chains/index.md`，把所有 `SOURCE_MODULES_SNAPSHOT` 中包含该模块的链路 STATUS 置为 STALE，同时在链路档案「变更历史」追加一行；只降级不重推
  - Step 7.2 增量更新报告输出模板补"级联失效链路"清单
  - 与其他工作流协作段：明确 15 → 16 级联失效的双向数据流
  - 「相关文件」补 `chains/index.md` 一条
  - `ANALYZER_VERSION`：1.4 → **1.5**（META 跟随规则）
- **`AGENTS.md`**：
  - `WORKFLOW_VERSION` 1.7 → **1.8**、`ANALYZER_VERSION` 1.4 → **1.5**
  - 顶部入口引用补 `chains/`
  - 快速开始 · 阶段二触发词表补 v1.8 4 条（列出/刷新/确认/作废调用链、`--no-persist`）
  - 引用关系图新增 `CHAINS[(chains/)]` 节点、MI → CHAINS 级联失效虚线、CD ↔ CHAINS 读写虚线
  - **新增「🔗 业务调用链档案」段**：4 条 Agent 硬性约束（默认落档 / 命中复用 / 显式确认 / STALE 只提示不重推）
  - 目录结构树补 `chains/` 3 项
  - 引用关系图注释同步 v1.8 强化说明
- **`README.md`**：
  - Badge：v1.7 → **v1.8**
  - "这是什么"段：能力描述强调"链路档案跨会话复用"
  - 目录结构补 `chains/` 3 项 + `templates/` 说明补 chain-template.md
- **`.agent-workflow/guide.md`**：
  - 「模块台账与调用链推导」章节常用指令表补 v1.8 触发词
  - **新增「16 v1.8 链路落档与复用」小节**：状态机表 + 关键行为 4 条（默认落档 / 命中复用 / 只降级不重推 / 人工担保升级）
- **`.agent-workflow/analyzer-instructions.md`**：
  - 模块映射表新增 `call-chain-persistence` 一行（v1.8 落档协议）
  - 触发指令词典表补 v1.8 5 条新触发词
  - **约束常量表新增表 G · CHAIN_META**：登记 `CHAIN_STATUS_ENUM` / `CHAIN_TYPE_ENUM` / `CHAIN_FILE_NAMING` / `CHAIN_SNAPSHOT_FORMAT` / `CHAIN_STALE_TRIGGER_RULE` / `CHAIN_PERSIST_DEFAULT` / `CHAIN_VERIFY_TRIGGER` 7 条常量
  - 16 号模块检测规则段落补 v1.8 落档协议 4 条（默认落档 / 复用命中 / 级联失效 / 人工担保升级）+ 输出目标修订

### 变更
- `WORKFLOW_VERSION`：1.7 → **1.8**（16 号工作流新增落档协议 + 15 新增级联失效，向后兼容）
- 顶层 `ANALYZER_VERSION`：1.4 → **1.5**（新增表 G · CHAIN_META，Agent 需按新协议落档）
- `workflows/14-workflow-self-check.md` `ANALYZER_VERSION`：1.4 → **1.5**（META 跟随规则）
- `workflows/15-module-inventory.md` `ANALYZER_VERSION`：1.4 → **1.5**（本轮 Step 5.5 主体改动 + META 跟随）
- `workflows/16-call-chain-derivation.md` `ANALYZER_VERSION`：1.4 → **1.5**（本轮 Step 5-8 主体改动 + META 跟随）

### 兼容性
- **完全向后兼容**：01-13 项目侦察类流程 `ANALYZER_VERSION` 保持 `1.0`，无需重新分析
- **旧项目升级路径**：clone 新模板后：
  1. `chains/` 目录自动可用，首次推导即开始积累链路库
  2. 原有 `modules/*.md` 无需改造；15 Step 5.5 在 `chains/` 为空时静默跳过
  3. 无需运行迁移脚本
- **旧对话产物不追溯**：v1.7 及之前在对话中输出的调用链**不追溯落档**；用户可显式触发 `画出 <入口> 的调用链` 让 Agent 重新推导并首次落档
- **`--no-persist` 保底**：临时探索场景仍可关闭落档，与 v1.7 行为一致

### 备注
- 需求来源：v1.7 落地后用户提问"当前工作流的 SOP 中，做调用链推导的时候没有落档吗？下次其他 Agent 来完成工作时没有对应已经推导的数据吗？"，暴露了 3 个缺口：跨会话共享、审计追溯、变更感知
- 设计权衡（用户对齐结论）：
  - **默认落档 vs 默认关闭**：选择默认落档，只有 `--no-persist` 才关闭 —— 否则用户经常忘记落档，链路库永远起不来
  - **STATUS 从 DERIVED 到 VERIFIED**：用户显式确认才升级 —— Agent 不得自作主张，避免"未核对"变"已核对"的信任污染
  - **STALE 后自动重推 vs 只提示**：只提示不自动重推 —— 避免为一次改动触发多条链路重推消耗大量 tokens
  - **级联失效级联深度**：只做 1 层级联（模块变更 → 链路 STALE），不做 2 层（链路 STALE → 引用该链路的其他文档 STALE），避免复杂化
  - **ABANDONED 不删档案**：软删除保留审计，可追溯"这条链路曾经是什么样的"
- 涉及 4 新增文件 + 7 变更文件

---

## [1.7.0] - 2026-07-01

### 新增（16 号调用链推导：分叉表达约定 + 成环剪枝）

针对 v1.6 落地后暴露的问题——"调用链在真实项目中经常从单链分叉成多链，但 v1.6 没有规范分叉的语义标签，不同 Agent 输出的分叉图差异很大"，本轮为 16 号工作流补齐 4 个关键缺口：条件分叉标签、同步 vs 异步扇出区分、多态实现的置信度标注、成环检测与剪枝。

#### 变更文件（6 个）

- **`workflows/16-call-chain-derivation.md`**（主要改动）：
  - 「概述」新增第 4 项"分叉表达约定"与 v1.7 关键增强说明
  - Step 2.1 正向遍历算法**加入 visited + path 双集合 + 成环剪枝**（`current ∈ path` → 画 `cycle-back` 边并终止；`current ∈ visited 但 ∉ path` → 短路 `↩ 已访问`）
  - Step 2.4 短路条件补"成环"分支（v1.7 新增）
  - **新增 Step 2.5「分叉表达约定」**（硬性规范）：
    - 2.5.1 四类分叉识别与 mermaid 图形约定表（conditional / sync fan-out / async fan-out / polymorphic / event-bus）
    - 2.5.2 档案侧分叉标注建议（写入 `modules/*.md` 时）
    - 2.5.3 mermaid 输出最小规范示例（alt/else / sync 与 async 前缀 / possible 前缀 + Note / cycle-back）
    - 2.5.4 常见误用负面清单
  - Step 4 断点表新增「成环」行 + 补"分叉处理"列（多态/事件按 Step 2.5 处理）
  - **新增 Step 5.4「分叉图输出示例」**：一个覆盖 5 类分叉的完整 mermaid 时序图 + 分叉分析表
  - `ANALYZER_VERSION`：1.0 → **1.4**（协议扩展，META 跟随顶层）
- **`templates/module-template.md`**：
  - 「上游依赖」段新增「分叉标注约定」表（5 种分叉类型的档案标注示例）
  - 「下游数据/接口调用」段补充分叉标注说明（MQ 默认视为 async fan-out；HTTP 并发调用需显式标 sync/async fan-out）
- **`analyzer-instructions.md`**：
  - 约束常量表**新增表 F · 分叉语义常量表（FORK_SEMANTICS）**：登记 `FORK_TYPE_ENUM` / `FORK_EDGE_PREFIX` / `FORK_MERMAID_SYNTAX` / `CYCLE_DETECTION_RULE` 4 条常量
  - 16 号模块检测规则补 v1.7 分叉与成环处理段落
- **`AGENTS.md`**：`WORKFLOW_VERSION` 1.6 → **1.7**、`ANALYZER_VERSION` 1.3 → **1.4**
- **`README.md`**：badge v1.6 → **v1.7**
- **`.agent-workflow/guide.md`**：「模块台账与调用链推导」章节新增「16 v1.7 分叉表达能力」小节

### 变更
- `WORKFLOW_VERSION`：1.6 → **1.7**（16 号工作流协议扩展，向后兼容）
- 顶层 `ANALYZER_VERSION`：1.3 → **1.4**（新增分叉语义常量表 F，Agent 需按新协议输出分叉图）
- `workflows/14-workflow-self-check.md` `ANALYZER_VERSION`：1.3 → **1.4**（META 跟随规则）
- `workflows/15-module-inventory.md` `ANALYZER_VERSION`：1.3 → **1.4**（META 跟随规则）
- `workflows/16-call-chain-derivation.md` `ANALYZER_VERSION`：1.0 → **1.4**（本轮主体改动，同时 META 跟随规则对齐顶层）

### 兼容性
- **完全向后兼容**：01-13 项目侦察类流程 `ANALYZER_VERSION` 保持 `1.0`，无需重新分析
- **旧版分叉图仍可读**：v1.6 之前用平铺箭头画的调用链在 v1.7 下依然合法；v1.7 只是**要求新推导必须使用规范化的语义标签**（sync/async/possible/条件表达式），旧图不强制回溯改造
- **旧 modules/*.md 仍可用**：v1.6 档案未标注分叉类型时，16 推导会退化为"无分叉信息"处理，用户可通过 `刷新模块台账` 增量补充分叉标注
- **成环检测是新增能力，非破坏性**：v1.6 的推导若遇到环会无限展开或漏画，v1.7 会主动剪枝并 ⚠️ 标注

### 备注
- 需求来源：v1.6 落地后用户反馈"调用链是否有单链后可能出现多链的情况"，暴露了 4 个缺口：条件分叉标签、同步 vs 异步扇出区分、多态实现的置信度、成环检测
- 设计权衡：
  - **成环是必须修的正确性问题**（其他 3 个是精度问题），本轮一次性一起补齐
  - 分叉类型枚举**克制在 5 类**（conditional / sync fan-out / async fan-out / polymorphic / event-bus + normal），不引入更细粒度的子类型（如"策略模式"独立成类），避免规范复杂化
  - mermaid 图形约定**优先用原生语法**（alt/else、实线/虚线箭头），仅在语义无法用图形区分时用**边标签前缀**（sync:/async:/possible:）作为约定
  - 档案侧标注是**建议式**而非强制（不打断 15 台账刷新），Agent 推导时若档案未标注则退化为"未知分叉类型"
- 涉及 6 个文件改动（详见上方文件清单）

---

## [1.6.0] - 2026-07-01

### 新增（模块台账 + 调用链推导两个治理层元流程）

针对"Agent 改代码前需要花大量 tokens 重新理解模块结构、且改完之后无处沉淀"的痛点，本轮引入**分析→维护→消费**的三段闭环：09（首次分析）→ 15（持续维护 + 强制挂钩）→ 16（按需消费推导）。设计目标是让模块档案成为 Agent 的"长期记忆索引"而非"一次性产物"。

#### 新增文件（3 个）

- **`workflows/15-module-inventory.md`**（新增，META 元流程）：模块台账的**持续维护 SOP**
  - 5 大 Step：粒度规范（150-800 行 + 逻辑闭合）→ 反向调用扫描（Step 4 定位 + Step 5 刷新）→ 时效状态机（🟢 Fresh / 🟡 Stale / 🔴 Missing）→ 与代码同频的双向门禁 → 顺带聚合 `_topics.md`
  - 通过在 03/11 三个挂钩点强制驱动：**03 Step 3.1 查台账**（改前）+ **03 Step 10.1 刷台账**（改后）+ **11 提交前置门禁**（commit 前必过）
  - `LAST_ANALYZED: N/A`（META 元流程规约）
- **`workflows/16-call-chain-derivation.md`**（新增，META 元流程）：**按需**启动的调用链推导器
  - 3 大能力：入口→落库全链路推导、指定接口影响面分析、数据资源反查（表/topic/接口的所有调用来源）
  - 数据源纯读 15 台账产物（`modules/*.md` 三段依赖 + `_topics.md`），不修改任何文件
  - 触发词：`画出 <入口> 的调用链` / `<接口> 的影响面` / `谁写入了 <表名/topic>` 等
- **`modules/_topics.md`**（新增，Data Fixture）：MQ topic 反查表
  - 由 15 Step 5.4 顺带聚合、16 消费；解决"消费者-生产者"隐式调用在纯代码扫描中无法发现的痛点

#### 变更文件（8 个）

- **`templates/module-template.md`**：模板内容深度扩展
  - 新增「入口点」章节（含 HTTP / RPC / MQ Consumer / Cron / CLI 5 类）
  - 「三段依赖」章节（上游依赖 / 下游调用方 / 下游数据调用），替代原扁平化"调用方 / 依赖"两段
  - 新增「时效元数据」头部字段：`FRESHNESS_STATUS: 🟢/🟡/🔴` + `LAST_VERIFIED: <日期>`
  - 新增「已知坑点」「变更历史（Change Log）」两个补白区
- **`modules/_example.md`**（重写）：`user-auth` 完整示例，覆盖新模板 4 个新章节的最佳填法（含真实的输入输出示例、时效状态标注、坑点沉淀）
- **`modules/index.md`**：索引表新增 `FRESHNESS_STATUS` 列 + `LAST_VERIFIED` 列，Agent 侦察渲染规则同步更新
- **`workflows/03-development-workflow.md`**：新增 3 个强制挂钩点
  - Step 3.1「先查台账」（进入实现前，`grep modules/index.md`）
  - Step 10.1「刷新受影响模块」（提交前，触发 15 Step 5）
  - Step 11「时效体检」提示（用 emoji 显示当前 Fresh/Stale 分布）
- **`workflows/11-branch-commit.md`**：commit 前置门禁章节新增 2 条硬校验
  - `.agent-workflow/modules/*.md` 与本次 diff 的对齐性（受影响模块必须已刷新）
  - `FRESHNESS_STATUS` 全部为 🟢 或已在本次 commit 中修复
- **`analyzer-instructions.md`**：模块映射表补 15/16 两条；「约束常量表」新增 15/16 触发词与文件路径
- **`AGENTS.md`**：6 处同步（版本号 → 1.6；触发词表补 15/16；状态总览补 15/16 行；引用图新增 MI/CD/TOPICS 节点；业务模块章节硬约束由 1 条扩到 4 条；目录树补 `_topics.md`）
- **`README.md`**：3 处同步（badge → v1.6；能力介绍段明确"3 治理层元流程"；目录树补 15/16/`_topics.md`）
- **`.agent-workflow/guide.md`**：新增「模块台账与调用链推导」章节；自定义扩展编号示例 `15-` → `17-`（因 14/15/16 已占用）

### 变更
- `WORKFLOW_VERSION`：1.5 → **1.6**（新增 15/16 两个 META 元流程能力，向后兼容）
- 顶层 `ANALYZER_VERSION`：1.3（保持不变，未修改分析器基础协议）
- `workflows/15-module-inventory.md` `ANALYZER_VERSION`：**1.3**（按 META 跟随规则同顶层）
- `workflows/16-call-chain-derivation.md` `ANALYZER_VERSION`：**1.3**（同上）

### 兼容性
- **完全向后兼容**：01-13 项目侦察类流程 `ANALYZER_VERSION` 保持 `1.0`，无需重新分析
- **09 与 15 分工**：09 保留"首次全量分析"角色，15 承担"增量维护 + 时效追踪"，二者产物写入同一份 `modules/<name>.md`
- **老项目升级路径**：clone 新模板后，若 `modules/*.md` 缺少「入口点/三段依赖/时效元数据」新章节，运行 `刷新模块台账` 会增量补全（不覆盖已有内容）
- **未生成过任何 modules/*.md 的项目**：15 Step 4 会提示"台账缺失，建议先跑 09 全量分析"，不阻塞常规开发流程；11 提交门禁在 `modules/` 完全为空时降级为"仅提示不阻断"

### 备注
- 需求来源：用户反馈 "Agent 改代码时要重新扫代码理解模块结构，浪费 tokens 且沉淀不下来"；治理理念是**把 Agent 的短期记忆变成项目的长期记忆索引**
- 设计权衡（用户对齐结论）：
  - 粒度采用"逻辑功能闭合"而非硬性行数上限（150-800 行仅作参考区间）
  - 双层触发（Agent 自动 + 用户手动 `刷新模块台账`）
  - 三段依赖仅记 1 层（不做全链路展开，链路推导由 16 按需组合）
  - 15 强制挂钩驱动（03/11 三处硬门禁），16 按需启动（不干预主流程）
  - `_topics.md` 独立文件而非合并入 `index.md`（MQ 反查是高频独立场景）
- 涉及 11 个文件改动（详见上方文件清单）
- 后续可选迭代：E3 使用本仓库自身跑 dogfood 建台账；未来可考虑给 15 加"批量健康度扫描"命令

---

## [1.5.0] - 2026-06-23

### 修复（SOP Step 4 归档动作产生冗余 PR 的问题）

#### 问题

原 Step 4 要求"PR 合入后才能 `STATUS=DONE` / 归档"，但归档动作本身需要 commit 进主干，又需要二次 PR——每个任务因此要走"代码 PR + 纯归档 PR"两轮才能真正闭环，产生冗余流程。三轮 D4 自检均未发现此问题（因为模板从未真正走完一遍 Step 4 的归档动作）。

#### 修复

- **#1 [Critical/D5] AGENTS.md SOP Step 4 重写**：归档动作（`STATUS=DONE` + `git mv` 到 `_archive/` + 「验收清单」预声明勾选）在**创建 PR 之前**完成，与代码主体一同 commit + push，**归档动作随 PR 合入主干一同生效**。新流程共 5 步（完成 + 归档）+ 4 步（回滚机制）
- **#2 [Critical/D5] 回滚机制（新增）**：PR 被打回 / 关闭未合入时，把 `STATUS` 回退到 `IN_PROGRESS` 或 `ABANDONED`，文件 `git mv` 回 `_active/`，解开「PR 已合入」「任务文件已归档」预声明勾选，进度日志追加 PR 退回根因
- **#3 [Critical/D5] 硬性约束更新**：删除旧禁令"❌ PR 未合入目标分支时把 STATUS 改为 DONE"（与新流程直接冲突），新增 4 条更精确禁令：
  - `STATUS=DONE` 但任务文件仍留在 `_active/`
  - 任务文件已 mv 到 `_archive/` 但 `STATUS` 仍是 `IN_PROGRESS` / `BLOCKED` / `PLANNING`
  - 跳过 PR 流程直接把 `STATUS=DONE` 推到主干
  - PR 被打回 / 关闭未合入时仍把任务保持 `STATUS=DONE` / 文件留在 `_archive/`
- **#4 [Critical/D5] mermaid 流程图同步调整**：原"全部完成 → PR 合入? → STATUS=DONE+归档"改为"全部完成 → 归档 commit → 创建 PR → PR 合入? → 完成 / 回滚"
- **#5 [High/D5] 3 个 task 模板 Step List 调整**：
  - `task-bugfix-template.md`：Step 4.10 拆为"完成归档动作"含 3 个子项；4.11 提交分支强调"含归档动作 commit"；4.13 改为"CI + PR 合入主干"附回滚机制提醒
  - `task-feature-template.md` Step 3.9 / 3.10 / 3.11 / 3.12 同模式调整
  - `task-refactor-template.md` Step 3.11 / 3.12 / 3.13 / 3.14 同模式调整
- **#6 [High/D5] analyzer-instructions.md 表 C 关键流 8 跳重排**：原"7→13 CI / 8→Step 4 归档"，改为"1→需求理解→Step 4 归档动作 / 2→归档→11 分支 / ... / 7→11 提交→12 PR / 8→12 PR→13 CI + 合入"

#### 设计依据

归档动作的本质是"任务状态变更 + 文件位置变更"，属于代码工作单元的一部分——把它和代码修复合并到同一个 PR 才能保证"任务真正完成 = PR 合入"的一一对应。回滚机制覆盖 PR 失败的尾部情况，保证任务状态可恢复。

---

## [1.4.0] - 2026-06-01

### 新增（D5 一致性治本：约束常量表 + 6 条机械校验规则）

针对三轮自检暴露的"D5 一致性缺陷占 56%、且呈高复发"的根本问题，本次从源头治理——把散落在多文件中的"约束常量"集中到唯一定义处，并给 14 自检装上机械巡检规则。

- **#A1 [D5/常量表]** `analyzer-instructions.md` 模块映射表后新增「**约束常量表（SSOT）**」章节，含 5 张表：
  - **表 A · TASK_META**：3 类任务的 `RELATED_WORKFLOWS_*`、`TASK_STATUS_ENUM`、`TASK_TYPE_ENUM`、`RISK_STATUS_ENUM`、`TASK_FILE_NAMING`、`TASK_ARCHIVE_PATH`、`BLOCKED_TO_DONE_FORBIDDEN`
  - **表 B · LIFECYCLE_SCORING**：核心/扩展模块清单、解锁阈值、解锁宣告语、`LIFECYCLE_PHASES` 枚举（仅做索引，唯一定义处仍是 `lifecycle.md`）
  - **表 C · KEY_FLOW**：关键流 8 跳的上下游 + 衔接处文字（速查索引，唯一定义处仍是 14 自检 Step 3）
  - **表 D · COMMANDS**：所有触发指令的统一词典（阶段一/阶段二/阶段三/治理）
  - **表 E · TASK_SECTIONS**：3 个 task 模板的章节数与序列（不强行对齐，但顶部 quote 必须显式标注）

- **#A2 [D5/机械规则]** `workflows/14-workflow-self-check.md` D5 维度新增 6 条机械校验规则（D5.E1 ~ D5.E6）：
  - **D5.E1**：`RELATED_WORKFLOWS:` 元数据值必须完整等于表 A 对应常量
  - **D5.E2**：`STATUS=` / `TASK_TYPE=` 必须属于表 A 枚举集合
  - **D5.E3**：「风险与阻塞」表「状态」列只能 `跟进中` / `已解除` / `-`
  - **D5.E4**：触发指令出现在表 D 之外的位置时必须是已登记词，不得引入新词
  - **D5.E5**：3 个 task 模板顶部 quote 必须标注章节数与"验收清单为最后一节"
  - **D5.E6**：跨文件出现 shell 命令时只允许 04 定义为权威来源，他处仅引用不复述

- **#A3 [D5/引用约束]** 3 个 task 模板的 `RELATED_WORKFLOWS:` 行尾追加 `<!-- 约束源：analyzer-instructions.md#约束常量表 -->` 注释，建立"硬编码值 → 常量表"的反向索引（D5.E1/E2 自检规则按此路径校验）

- **#A4 [D5/漂移防护]** `tasks/_example.md` 头部新增 `<!-- GENERATED_FROM: templates/task-feature-template.md -->` + `<!-- DRIFT_CHECK: enabled -->` 元数据 + 顶部 quote 显式说明"漂移检查"机制；从根上防止 1.3.3 那种"修了模板忘了示例"的回归性遗漏

- **#A5 [D5/双源弱化]** `tasks/tasks-guide.md` 三处显式声明引用关系：「Agent 执行规约」「触发指令」「状态字段说明」均加常量源指针，强调本文件不重复定义枚举集合，仅做语义说明

- **#A6 [F/治理飞轮]** `templates/templates-guide.md` 末尾新增「**新增 / 修改工作流时的常量同步清单**」（6 步有序清单），把"先改常量表 → 再改引用点 → 再跑自检"固化为治理 SOP；CHANGELOG 增条目时强制标注 `[D5/常量更新]` 标签

### 变更
- `WORKFLOW_VERSION`：1.3 → **1.4**（新增"约束常量表 + D5.E1~E6 机械规则"模板能力，向后兼容）
- 顶层 `ANALYZER_VERSION`：1.2 → **1.3**（D5 自检协议扩展）
- `workflows/14-workflow-self-check.md` `ANALYZER_VERSION`：1.2 → **1.3**（按 META 跟随规则同步升级）
- `workflows/14-workflow-self-check.md`「模板工程模式」段补充对 D5.E1~E6 的提及

### 兼容性
- **完全向后兼容**：13 个 `01` ~ `13` 项目侦察类 workflow 文件 `ANALYZER_VERSION` 仍为 `1.0`，无需重新分析（D5.E1~E6 仅作用于 task 元数据 / 触发词 / 跨文件命令引用，不改变 01-13 的检测协议）
- 已生成的真实任务文件（`tasks/_active/*.md`）无需迁移：旧任务的 `RELATED_WORKFLOWS` 值若不在表 A 范围内，自检会报 D5.E1 但不影响任务执行
- 旧版工作流模板 clone 后跑 `自检工作流` 会输出新增 D5.E1~E6 的检查结果，可通过 `忽略缺陷 #N` 写入 `audit-baseline.md` 豁免

### 备注
- 治理路径选择：上一轮方案讨论中考虑过 `${CONST_NAME}` 占位符 + INCLUDE 共享片段，但 markdown 不原生支持模板展开，强行引入会变成"未实现的展开协议"。本次采用**务实变体**——不引入新协议，而是用"常量表 + 反向索引注释 + 机械检查规则"三件套实现等效约束
- 预期收益（基于 CHANGELOG 三轮自检趋势线推算）：未来每轮自检 D5 维度缺陷数从 5~7 条 → 0~1 条
- 涉及 7 个文件改动：`AGENTS.md` + `analyzer-instructions.md` + `14-workflow-self-check.md` + 3 个 task 模板 + `_example.md` + `tasks-guide.md` + `templates-guide.md` + `CHANGELOG.md`（即本文件）

---

## [1.3.4] - 2026-06-01

### 修复（语义修正：META 元流程的元数据中性化）

发现 14 自检流程在模板出厂状态下携带了"项目侦察后"才应填充的字段值，造成"模板自带能力" vs "项目侦察后已完成"两种语义混淆。本次彻底中性化：

- **#S1 [Minor/D5]** `workflows/14-workflow-self-check.md` 头部 `LAST_ANALYZED: 2026-06-01` 修正为 `LAST_ANALYZED: N/A`，并补充注释说明"META 流程不参与项目侦察，STATUS=DONE 表示模板自带能力"
- **#S2 [Minor/D5]** `AGENTS.md` 状态总览表第 14 行：状态列「🟢 已完成」→「🟢 模板自带」，最后更新列「2026-06-01」→「N/A」；状态说明行追加第 4 个状态项「🟢 模板自带（META，不计入完善度评分）」，明确视觉区分
- **#S3 [Minor/D1]** `.agent-workflow/analyzer-instructions.md` 元流程说明段追加一条契约：`LAST_ANALYZED` 字段固定为 `N/A`，不写入实际日期；状态总览表对应行最后更新列亦填 `N/A`、状态显示为"🟢 模板自带"

### 备注

- 根因：1.3.0 引入 14 自检时，按惯性给 META 流程也填了项目侦察时间戳，未意识到 META 出厂即"完成"是常态而非分析结果。该字段在 META 上下文中本就语义错位
- 治理价值：消除"模板出厂自带状态"与"项目侦察后产出状态"的视觉混淆——未来真实项目侦察 13 个流程完成时，14 行的"🟢 模板自带"会与 01-13 的"🟢 已完成"在视觉上自然区分，避免误读
- 顺带修复了 `LAST_ANALYZED` 在 META 场景下的字段语义债（隐藏了 4 个版本，本次随治理一并清理）
- 补丁版本号 `1.3.4`：纯文档语义修正，不涉及版本元数据 (`WORKFLOW_VERSION` / `ANALYZER_VERSION`) 升级，不变更任何契约，向后完全兼容

---

## [1.3.3] - 2026-06-01

### 修复（第三轮自检 → 1 个回归性缺陷收尾）

第三轮自检全面验证 1.3.2 治理效果，确认 7 项修复全部生效；新发现 1 个回归性缺陷并立即治理：

- **#R1 [Major/D5]** `tasks/_example.md` 元数据 `RELATED_WORKFLOWS` 缺 `13`：1.3.2 治理时同步了 3 个 task 模板的 RELATED_WORKFLOWS 加 13，但**漏改了示例任务文件**——这是典型的"修了模板忘了示例"的回归性遗漏。本次补全为 `03,04,05,08,11,12,13`，与 feature 模板对齐。

### 第三轮自检确认（治理效果验证报告）

| 验证项 | 期望状态 | 实际状态 |
|------|:------:|:------:|
| 三 task 模板 RELATED_WORKFLOWS 含 13 | ✅ | ✅ feature/bugfix/refactor 全部对齐 |
| 三 task 模板 Step List 显式跳 13-ci-cd-pipeline | ✅ | ✅ 三模板 Step CI 行均带 `参考 workflows/13-ci-cd-pipeline.md` |
| bugfix 模板 RELATED_WORKFLOWS 含 08 | ✅ | ✅ 已含 |
| 三 task 模板顶部有"章节结构"标注 | ✅ | ✅ feature(7 节)/bugfix(8 节)/refactor(8 节) 各自标注 |
| tasks-guide.md 目录图修正为 tasks-guide.md | ✅ | ✅ 已修 |
| templates-guide.md 字段说明含 META 例外 | ✅ | ✅ "4 个必填 + META 额外 1 个 WORKFLOW_TYPE" 完整 |
| 14 自检 Step 1 有"模板工程模式"段落 | ✅ | ✅ 三条规则完整落地（明确告知/建议替代/视角调整） |
| _example.md 顶部 quote 含"对应模板"+ 历史差异免责 | ✅ | ✅ 完整 |
| 关键流 8 跳全闭环 | 8 ✅ | **8 ✅**（task 模板内部已显式跳 13） |
| 三 task 模板 + _example.md 的 RELATED_WORKFLOWS 严格对齐 | ✅ | ❌ → ✅（修复 #R1 后达成） |

### 备注

- 第三轮自检健康度：治理 #R1 前 **88/100 🟡 亚健康**（因 1 个 Major），治理后 **100/100 🟢 健康**
- 关键洞见：**回归性缺陷的根源还是"双源真相"**——示例文件的元数据应当作为"模板的克隆"，但缺少机械检查导致漏同步。这再次印证了"约束常量表 + 自动检查"的长期建议
- 三轮自检累计治理：8 缺陷（首轮）+ 7 缺陷（第二轮）+ 1 缺陷（第三轮）= **16 个**
- 14 自检 SOP 三轮狗粮验证证明：D5 是高复发维度（占 9 / 16 = 56%），但**每轮都能逐步收敛**（缺陷数 8 → 7 → 1）
- 补丁版本号 `1.3.3`：不涉及版本元数据升级，与 1.3.2 性质相同

---

## [1.3.2] - 2026-06-01

### 修复（第二轮实战自检 → 路径 A'：7 缺陷一次性治理）

第二轮自检（路径 A 修复后复检）健康度回升至 71/100 但又挖到 7 个新缺陷，本次治理后预期回到 🟢 健康。修复明细：

- **#1 [Critical/D5]** 三 task 模板章节数不一致（feature 7 节 / bugfix & refactor 8 节）：不强行对齐章节数（三种任务结构本就不同），改为在三模板顶部 quote 中**显式标注总章节数 + 验收清单为最后一节**，消除阅读混淆
- **#2 [Critical/D4]** 关键流第 7 跳"PR → CI"在 task 模板内部从未显式跳转：3 个模板的 `RELATED_WORKFLOWS` 元数据全部补加 `13`；Step List 把"CI 通过、合入主干、归档"三步合一拆为"CI 通过（参考 13-ci-cd-pipeline，按 CI 失败策略修复直至全绿）+ 合入主干并归档（参考 AGENTS.md SOP Step 4）"，闭合任务模板内部对 13 / SOP 的显式引用
- **#3 [Major/D5]** `task-bugfix-template.md` 的 `RELATED_WORKFLOWS` 缺 `08 Code Review`：补全为 `07,04,05,08,11,12,13`，与 feature/refactor 模板对齐（Bug 修复同样需要 Code Review）
- **#4 [Minor/D1]** `tasks/tasks-guide.md:23` 目录结构示意图标注 `README.md`（实际文件已重命名为 `tasks-guide.md`）：同步更新示意图
- **#5 [Minor/D5]** `templates/templates-guide.md:21` 仅说"4 个 HTML 注释字段"，未注明 META 流程（如 14）需额外声明 `WORKFLOW_TYPE: META`：澄清为"必填 4 个 + META 流程额外 1 个"，并补充 META 跟随顶层版本的引用指针
- **#6 [Minor/D5]** `workflows/14-workflow-self-check.md` 的 Step 1 加载范围未对"模板工程模式"做特别说明：补充 `📦 模板工程模式` 子段，规定当 01-13 全部 STATUS=TODO 时 Agent 应明确告知用户、建议替代动作、聚焦 D4/D5 维度（避免在空模板上给"健康度大幅扣分"的错误感知）
- **#7 [Minor/D5]** `tasks/_example.md` 与 `task-feature-template.md` 章节对应关系不直观：顶部 quote 块追加"📐 对应模板"说明 + Step List 历史性差异免责声明，让新人一眼看懂示例与最新模板的关系

### 备注

- 第二轮狗粮验证关键发现：**D5 一致性是高复发维度**（首轮修了 4 个，第二轮又挖到 5 个），印证了"模板演进会持续制造跨文件矛盾"的判断；长远建议把"约束常量"提取为唯一可引用的真相源（如 `analyzer-instructions.md` 增加"约束常量表"）
- 关键流闭环 8 跳从首轮的 6 ✅ / 2 ⚠️ → 第二轮的 7 ✅ / 1 ❌ → 治理后预计 8 ✅
- 补丁版本号 `1.3.2`：仅文档矛盾治理，无新增/删除能力，无契约变更，向后完全兼容；不涉及版本号升级（按 META 跟随规则，纯治理性修复属 patch）
- 本次治理涉及 6 个文件改动：3 个 task 模板 + tasks-guide + templates-guide + 14 自检 + _example

---

## [1.3.1] - 2026-06-01

### 修复（首次实战自检 → 路径 A：8 缺陷一次性治理）

应用 `workflows/14-workflow-self-check.md` 对当前模板仓库执行**首次全量自检**，检出 8 个缺陷（3 Critical / 2 Major / 3 Minor），健康度 **61 / 100 → 🔴 病态**；本次一次性治理后预期回升至 🟢 健康（≥ 90 分）。修复明细：

- **#1 [Critical/D5]** `templates/task-bugfix-template.md`：章节编号错乱（`5 → 6 → 6 → 8`），纠正为 `5 决策 / 6 日志 / 7 风险与阻塞 / 8 验收清单`
- **#2 [Critical/D4]** `AGENTS.md` 工作流引用关系图：补 `TASK[tasks/_active/*]` 节点串联 `TASK → 11/04/05`，并新增脚注明确"关键流闭环以任务 SOP 的 Step List 为准"，`SC` 节点新增 `SC -.审计.-> TASK` 虚线
- **#3 [Critical/D4]** `templates/templates-guide.md`：删除"在 AGENTS.md 的『进行中的任务』表格中追加一行"过期指引（该表已改为动态视图），改写为"无需修改 AGENTS.md，由 `查看进行中的任务` 实时扫描"
- **#4 [Major/D3]** `README.md` 顶部 badge：`template-v1.0` → `template-v1.3`，并补充"+ 1 个元自检流程"以反映 14 自检的存在
- **#5 [Major/D5]** `templates/templates-guide.md`「新增工作流的步骤」第 2 步：示例编号 `14-your-workflow.md` → `15-your-workflow.md`（与 `guide.md` 对齐，避免与已占用的 14 自检流程冲突）
- **#6 [Minor/D5]** `tasks/tasks-guide.md` SOP 速查表：Step 4 / Step 5 行尾补注"（无需改 AGENTS.md）"，与 AGENTS.md 任务 SOP 措辞对齐
- **#7 [Minor/D1]** `AGENTS.md`「版本兼容性」章节：补充 META 元流程（如 14）`ANALYZER_VERSION` 跟随顶层 `WORKFLOW_VERSION` 的特殊规则，避免误升 01-13 的版本
- **#8 [Minor/D5]** `tasks/_example.md`：顶部 quote 块明确"静态示例，不会真正流转状态、不会被实际归档"，并指引到正确的模板文件

### 备注

- 本次修复是 14 自检流程的**首次实战狗粮验证**：7 维度划分有效（D4/D5 为重灾区符合预期）、健康度算法可解释（61 分对应 3 个文档矛盾陷阱）、闭环 8 跳能精确定位"跳1 需求→分支"和"跳7 PR→CI"两处⚠️
- 补丁版本号 `1.3.1`：仅文档矛盾治理，无新增/删除能力，无契约变更，向后完全兼容
- 不涉及 `WORKFLOW_VERSION` / `ANALYZER_VERSION` 升级——参见本文件「版本兼容性」补充的 META 跟随规则

---

## [1.3.0] - 2026-06-01

### 新增
- **工作流自检（META 元流程）**：新增 `workflows/14-workflow-self-check.md`，对 01-13 流程文档与任务 SOP 做质量审计（"SOP 的 Code Review"）
  - 7 个检查维度：D1 完整性 / D2 歧义性 / D3 可执行性 / D4 闭环性 / D5 一致性 / D6 可验证性 / D7 可恢复性
  - 健康度评分算法：`100 - Σ缺陷扣分`（Critical -10 / Major -5 / Minor -2 / Style -0.5）
  - 关键流 8 跳闭环检查：需求 → 分支 → 编译 → 用例 → 测试 → 提交 → PR → CI → 归档
  - 5 条触发指令：`启动工作流自检` / `自检 <模块名>` / `自检 关键流` / `查看自检报告` / `忽略缺陷 #N`
  - 报告缓存：`.agent-workflow/.audit-cache.md`；豁免基线：`.agent-workflow/audit-baseline.md`
- `AGENTS.md`：「快速开始」新增「🩺 治理：工作流自检」章节；状态总览表追加第 14 行（带 🔧 META 标记）；引用关系图新增虚线审计节点
- `.agent-workflow/guide.md`：新增「工作流自检（治理）」章节，含适用场景、与阶段一完善度的差异、7 维度速览
- `.agent-workflow/analyzer-instructions.md`：模块映射表新增 `workflow-self-check` 一行，并明确元流程不参与分析器自动重写、不计入完善度评分

### 变更
- `WORKFLOW_VERSION`：1.2 → **1.3**（新增 META 元流程能力，向后兼容）
- `ANALYZER_VERSION`（顶层）：1.1 → **1.2**（分析器协议扩展：新增对 META 类型流程的边界约定）
- `guide.md` 自定义扩展示例编号修正：`14-your-workflow.md` → `15-your-workflow.md`（避免与新加入的 14 自检流程冲突，由 14 自检规则自身的狗粮测试发现）

### 兼容性
- 向后兼容：13 个已生成的 workflow 文件（`01` ~ `13`）的 `ANALYZER_VERSION` 仍为 `1.0`，**无需重新分析**——本次未改变其检测协议或填充规则
- META 元流程是新增正交能力，对已有阶段一/阶段二/阶段三流程零侵入
- `.audit-cache.md` 建议加入 `.gitignore`；`audit-baseline.md` 建议入库（豁免基线需团队共享）

### 备注
- 历史版本号 `[1.2.x]` 在 CHANGELOG 中无显式条目，本次 `1.3.0` 接续累计；未来如需考据 1.2 变更，可参考 git log
- 本次未实现 `--fix` 自动修复能力，自检仅输出报告 + 修复建议，避免误改文档；后续迭代可考虑

---

## [1.1.0] - 2026-05-26

### 新增
- **任务目录机制**：新增 `.agent-workflow/tasks/` 目录，为每份研发任务提供独立的“作战地图 + 进度档案”，支持 Agent 中断后无损恢复
  - `tasks/README.md`：任务目录使用指南与 Agent 执行规约
  - `tasks/_example.md`：已填好的样例任务（功能开发，进行到 Step 3.4）
  - `tasks/_active/`：进行中的任务存放区
  - `tasks/_archive/`：已完成 / 已废弃任务按月归档
- **3 个任务模板**（统一放于 `templates/` 目录）：
  - `templates/task-feature-template.md`：功能 / 需求开发任务模板
  - `templates/task-bugfix-template.md`：Bug 修复任务模板（含复现 / 根因 / 回归）
  - `templates/task-refactor-template.md`：重构 / 性能优化任务模板（含安全网 / 前后指标对比）
- `AGENTS.md` 新增「📋 进行中的任务」总览表与「📋 任务执行 SOP」章节，明确“接到任务 → 生成任务文件 → 推进 → 归档”标准流程
- `.agent-workflow/README.md` 新增「任务目录使用方法」章节
- `templates/README.md` 新增「新增研发任务的步骤（Task Templates）」章节

### 变更
- `WORKFLOW_VERSION`：1.0 → **1.1**（新增能力，向后兼容）
- `AGENTS.md` 「目录结构」示意同步补充 `tasks/` 目录

### 兼容性
- 向后兼容：`ANALYZER_VERSION` 仍为 1.0，13 个已生成的 workflow 文件无需重新分析
- 仅增量新增任务执行实例层，对已有流程与模块文档零侵入

---

## [1.0.1] - 2026-05-25

### 新增
- 顶层 `README.md`：模板项目对外说明门面
- 顶层 `LICENSE`（MIT）：明确许可范围，便于复用
- `.agent-workflow/CHANGELOG.md`：模板自身版本变更记录（即本文件）
- `.agent-workflow/templates/README.md`：模板骨架使用说明
- `.agent-workflow/modules/_example.md`：业务模块文档示例
- `AGENTS.md` 增补章节：「快速开始」「工作流引用关系」「业务模块文档」「版本兼容性」
- `AGENTS.md` 元数据补充 `ANALYZER_VERSION` 字段

### 修复
- `AGENTS.md` 第 09 行流程名称由「模块结构分析」统一为「模块分析」，与 `analyzer-instructions.md` 模块映射表和 09 工作流文件标题保持一致

### 兼容性
- `WORKFLOW_VERSION`：1.0（不变）
- `ANALYZER_VERSION`：1.0（不变）
- 仅文档增补与命名修正，不影响已生成的分析结果，无需重新执行分析

---

## [1.0.0] - 2026-04-16

### 新增
- 入口索引文件 `AGENTS.md`，含 13 个工作流状态总览表
- 13 个标准化工作流骨架文件（`workflows/01` ~ `workflows/13`）
- 业务模块目录 `modules/` 与 `modules/README.md` 模板说明
- 模板骨架 `templates/workflow-template.md` 与 `templates/module-template.md`
- 自动分析指令 `analyzer-instructions.md`，覆盖 13 个模块的检测规则
- 使用指南 `.agent-workflow/README.md`，包含手动填写、自动分析、模板复用、Git 集成、自定义扩展等说明
- GitHub平台分支 / PR 操作集成示例
