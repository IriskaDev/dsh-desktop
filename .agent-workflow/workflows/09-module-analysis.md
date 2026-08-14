<!-- MODULE: module-analysis -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 模块分析流程

> 根据用户指令对项目业务模块进行分析，将分析结果写入 `.agent-workflow/modules/` 下对应的模块文档。

---

## 概述

<!-- CONTENT_START: overview -->
本项目为**扁平结构**的单包 DSH 插件，源码仅 `src/` 下 2 个文件（`startup.js` + `index.js`）。当前可视为「单模块 / 两层」：`desktop-startup`（身份铸造）+ `desktop`（surface）。模块文档存放于 `.agent-workflow/modules/`（v1.9 分层结构）。

- 项目整体模块划分：待正式业务模块分析（阶段二）
- 模块文档位置：`.agent-workflow/modules/`（详见下方 doc_path_rule）
<!-- CONTENT_END: overview -->

---

## 触发指令

通过以下方式触发 Agent 进行模块分析：

```
# 分析全部模块
分析所有业务模块

# 分析指定模块
分析 <模块名> 模块
分析用户认证模块
分析支付模块的数据流

# 更新指定模块文档
更新 <模块名> 的模块文档
重新分析 <模块名> 模块
```

---

## 模块分析 SOP

> Agent 收到模块分析指令后，按以下步骤执行。

### Step 1 · 确认分析范围

根据用户指令确定本次要分析的模块：

- **全量分析**：扫描整个项目，识别所有业务模块
- **单模块分析**：仅分析用户指定的模块
- **增量更新**：对已有文档进行补充/修订

**判断**：
- 用户指定了具体模块名 → 定位该模块路径，直接进入 Step 2
- 用户要求全量分析 → 先执行项目结构扫描（见下方"项目结构扫描"），再对每个模块依次执行 Step 2~5

---

### Step 2 · 识别工程结构 & 确定文件归属

在扫描模块代码之前，**必须先判断工程结构类型**，不同结构的模块边界和文件归属方式不同。

#### 2.1 识别工程结构类型

<!-- CONTENT_START: project_structure_type -->
> 识别结果：**扁平结构**。所有源文件集中在 `src/` 下（`startup.js`、`index.js`），无功能子目录、无分层目录、无 Monorepo 配置（无 `pnpm-workspace.yaml` / `lerna.json` / `nx.json` / `turbo.json`）。
<!-- CONTENT_END: project_structure_type -->

> 以下为工程结构识别规则（固定内容，Agent 分析时参考）：

| 工程结构类型 | 识别依据 | 模块边界划分方式 |
|------------|---------|---------------|
| **Monorepo**（多包） | `lerna.json` / `nx.json` / `turbo.json` / `pnpm-workspace.yaml` / `package.json(workspaces)` / `go.work` / `Cargo.toml(workspace.members)` / `settings.gradle(include)` | 每个子包/子项目 = 一个模块 |
| **按功能目录划分** | 顶层或 `src/` 下按功能命名子目录（`auth/`、`payment/`、`user/` 等） | `src/<feature>/` 下每个功能目录 = 一个模块 |
| **按层划分**（MVC/分层架构） | 存在 `controller/`、`service/`、`dao/`、`repository/`、`model/` 等层级目录 | 跨层的同一业务领域 = 一个模块（如 `user` 模块 = `controller/user` + `service/user` + `dao/user` 的集合） |
| **微服务**（多服务目录） | 顶层多个独立服务目录，每个目录下有独立构建文件 | 每个服务目录 = 一个模块 |
| **混合结构**（前后端同仓） | 同时存在前端目录（`frontend/`、`web/`）和后端目录（`backend/`、`server/`） | 前端/后端各为顶层模块，其下再按功能细分 |
| **扁平结构** | 所有源文件直接在根目录或 `src/` 下，无明显子目录 | 按文件命名前缀或功能聚类划分，或整体作为单一模块 |

> ⚠️ 同一项目可能混合多种结构（如 Monorepo 内的子包本身是分层架构），需递归识别。

#### 2.2 确定模块文件归属

识别工程结构后，按以下规则确定哪些文件属于同一个模块：

**规则 A — Monorepo / 微服务 / 混合结构**：
- 模块根目录下的所有文件均归属该模块（含子目录）
- 相关文件列表：列出模块根目录下 2~3 层的关键文件（入口、核心逻辑、配置、测试），不需要穷举

**规则 B — 按功能目录划分**：
- `src/<feature>/` 下的所有文件归属该功能模块
- 跨目录的共享文件（`src/shared/`、`src/common/`）在「依赖关系」中注明，不计入模块文件列表

**规则 C — 按层划分（分层架构）**：
- 同一业务领域跨多个层的文件**合并为一个模块**
- 相关文件列表需按层分组展示，例如：
  ```
  controller/user.go       — HTTP 入口层
  service/user_service.go  — 业务逻辑层
  dao/user_dao.go          — 数据访问层
  model/user.go            — 数据模型
  ```
- 识别方式：在各层目录下查找同名或同前缀的文件（如 `user_controller`、`user_service`、`user_dao`）

**文件列表粒度规范**：
- ✅ 列出：入口文件、核心逻辑文件、对外接口定义文件、配置文件、代表性测试文件
- ❌ 不列出：自动生成文件（`*.pb.go`、`*.generated.ts`）、临时文件、与模块功能无关的工具脚本
- 数量上限：单模块相关文件列表不超过 **20 条**；超出时按重要性截取，末尾注明 `（共 N 个文件，仅列关键文件）`

#### 2.3 扫描模块代码

确定文件归属后，对目标模块执行以下扫描：

**通用扫描项**：
- 模块入口文件（`index.*` / `main.*` / `mod.*` / `lib.*`）
- 对外暴露的接口/API/函数签名
- 对外暴露的数据结构/类型定义
- 模块内的 `README` 或注释文档

**依赖关系扫描**：
- `import` / `include` / `require` / `use` 语句 → 识别上游依赖
- 被其他模块引用的情况 → 识别下游使用方

**数据流扫描**：
- 关键数据结构的定义与流转
- 与外部服务/数据库的交互点（DB 调用、HTTP 请求、消息队列等）

---

### Step 3 · 分析模块信息

基于扫描结果，整理以下内容：

| 分析项 | 对应章节 | 说明 |
|--------|---------|------|
| 功能概述 | `## 功能概述` | 该模块的职责边界和核心功能 |
| 数据流向 | `## 数据流向` | 数据在模块内/模块间的流转过程 |
| 核心接口 | `## 核心接口` | 对外暴露的 API/函数/类及其签名 |
| 依赖关系 | `## 依赖关系` | 上游依赖（本模块依赖）+ 下游使用方（依赖本模块）|
| 关键数据结构 | `## 关键数据结构` | 模块的核心数据模型 |
| 注意事项 | `## 注意事项` | 开发或修改该模块时需要注意的事项 |

---

### Step 4 · 确定目标文档路径

<!-- CONTENT_START: doc_path_rule -->
> 模块文档统一存放在 `.agent-workflow/modules/` 目录下（v1.9 分层：L1 `index.md` → L2 `<group>/group.md` → L3 `<module>.md` 或 `<group>/<sub>.md`）。

模块文档统一存放在 `.agent-workflow/modules/` 目录下，命名规则：

```
.agent-workflow/modules/<module-name>.md
```

**示例**：
- 用户认证模块 → `.agent-workflow/modules/user-auth.md`
- 支付模块 → `.agent-workflow/modules/payment.md`
- 消息通知模块 → `.agent-workflow/modules/notification.md`
<!-- CONTENT_END: doc_path_rule -->

**判断**：
- 文档已存在 → 读取现有内容，在保留手动补充部分的前提下更新
- 文档不存在 → 从 `.agent-workflow/templates/module-template.md` 复制新建

---

### Step 5 · 写入模块文档

将 Step 3 的分析结果写入目标文档，格式严格参考 `.agent-workflow/templates/module-template.md`：

```markdown
# <模块名称>

<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: YYYY-MM-DD -->

## 功能概述
## 数据流向
## 核心接口
## 依赖关系（含上游依赖 + 下游使用方）
## 关键数据结构
## 注意事项
## 相关文件
## 备注
```

**写入原则**：
- **只写实际检测到的内容**，未能确定的项标注"待补充"，不要猜测
- **保留用户手动补充的内容**，仅更新 Agent 可自动检测的部分
- 对外接口使用代码块展示真实签名，不做改写

---

### Step 6 · 同步更新模块索引

每次完成模块文档写入后，**必须立即**更新 `.agent-workflow/modules/index.md`：

| 情况 | 操作 |
|------|------|
| 新增模块 | 在索引表追加一行，填写：模块ID / 模块名称 / 职责概述（一句话）/ 状态 / 关键词（≤8个，英文逗号分隔）/ 文件链接 |
| 更新模块 | 修改对应行的「职责概述」「关键词」「状态」字段 |
| 模块状态变更 | 仅更新「状态」列 |

> ⚠️ **硬性约束**：未更新 `index.md` 前，不得向用户报告模块分析完成。

**关键词提取规则**：模块英文名 + 核心功能词 + 关联实体名，例如：`login,token,oauth,jwt,session,auth`

---

### Step 7 · 反馈分析结果

分析完成后，向用户汇报：

```
## 模块分析完成：<模块名>

- 文档路径：.agent-workflow/modules/<module-name>.md
- 识别到的核心接口：N 个
- 识别到的依赖模块：xxx, xxx
- 未能自动检测的项（需手动补充）：xxx
- modules/index.md 已同步更新 ✅
```

如果是全量分析，输出汇总表：

```
## 全量模块分析完成

| 模块 | 文档路径 | 状态 | 需手动补充的项 |
|------|---------|------|--------------|
| xxx  | .agent-workflow/modules/xxx.md | ✅ 已完成 | - |
| xxx  | .agent-workflow/modules/xxx.md | ⚠️ 部分完成 | 数据流向 |

modules/index.md 已同步更新 ✅
```

---

## 项目结构扫描（全量分析前置步骤）

<!-- CONTENT_START: project_structure -->
**当前识别到的模块**：

```
src/startup.js   — desktop-startup（铸 session 身份，提供服务）
src/index.js     — desktop（surface，订阅 session/event 输出 JSONL）
cordis.patch.yml — 插件编排（desktop-startup → agent-loop → desktop）
```

**模块划分依据**：
- 按文件/职责聚类划分（扁平结构，非目录划分）
- 后续 Electron 外壳落地后，将新增 `electron/` 或 `apps/electron/` 模块
<!-- CONTENT_END: project_structure -->

---

## Monorepo 子包（如适用）

<!-- CONTENT_START: monorepo -->
> 非 Monorepo 项目（无 workspace 配置）。

| 子包名称 | 路径 | 说明 |
|---------|------|------|
| （无） | - | 单包项目 |
<!-- CONTENT_END: monorepo -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `src/startup.js`、`src/index.js` — 模块源码
- `cordis.patch.yml` — 模块编排
- `package.json` — 无 workspaces（确认非 Monorepo）
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 扫描: 顶层目录结构（一级和二级目录），识别业务模块边界
  - 检查文件: lerna.json, nx.json, turbo.json, pnpm-workspace.yaml（Monorepo 配置）
  - 检查文件: package.json(workspaces 字段)
  - 检查文件: go.work, go.mod（多模块 Go 项目）
  - 检查文件: Cargo.toml(workspace.members)（Rust workspace）
  - 检查文件: settings.gradle(include 项目)（Java 多模块）
  - 分析: 各模块入口文件（index.*, main.*, mod.*, lib.*）的导出内容
  - 分析: import/include/require/use 语句中的模块引用模式（识别依赖关系）
  - 分析: 模块内的 README / doc 文件获取已有说明
  - 分析: 与外部交互点（DB 调用、HTTP 请求、消息队列 publish/subscribe）
  - 提取信息: 模块名称与路径, 对外接口签名, 核心数据结构, 模块间依赖关系
  - 输出目标: .agent-workflow/modules/<module-name>.md（每个模块一个文档）
-->
