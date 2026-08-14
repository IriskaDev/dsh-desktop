<!-- MODULE: {module-id} -->
<!-- MODULE_GROUP: - -->
<!-- INVOLVED_CHAINS: - -->
<!-- STATUS: TODO -->
<!-- LAST_ANALYZED: -->
<!-- ANALYZER_VERSION: 1.6 -->

# {模块标题}

> {模块简要描述}
>
> **档案层级说明**（v1.9 新增）：
> - `MODULE_GROUP` = 所属大模块 Group ID；顶层单模块填 `-`
> - `INVOLVED_CHAINS` = 本模块参与的调用链 slug（英文逗号分隔），由 16 号 Step 6.7 反向索引自动维护；无涉及链路填 `-`

---

## 功能概述

<!-- CONTENT_START: overview -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。

简要描述该模块的职责和核心功能。
<!-- CONTENT_END: overview -->

---

## 入口点（Entry Points）

<!-- CONTENT_START: entry_points -->
> ⚠️ **待实现** - Agent 将扫描路由注册、RPC 定义、MQ 订阅、定时任务、CLI 入口自动填充。
> 供业务调用链推导（15 版 Step 8）作为链路起点使用；无入口的纯工具模块可填"无（被其他模块调用，非独立入口）"。

**填写规范**（表格形式，缺项省略行）：

| 类型 | 入口标识 | 触发函数 | 说明 |
|------|---------|---------|------|
| HTTP | `METHOD /path` | 处理函数名 | 用途 |
| RPC | `Service.Method` | 处理函数名 | 用途 |
| MQ 消费 | `topic 名` | 处理函数名 | 订阅用途 |
| 定时任务 | `cron 表达式` | 处理函数名 | 用途 |
| CLI | 命令名 | 入口函数 | 用途 |
| 内部函数 | 导出符号名 | 同名 | 供其他模块直接调用的公共入口 |
<!-- CONTENT_END: entry_points -->

---

## 数据流向

<!-- CONTENT_START: data_flow -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。

描述数据在模块内/模块间的流转过程（可附流程图）。
<!-- CONTENT_END: data_flow -->

---

## 核心接口

<!-- CONTENT_START: core_interfaces -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。

列出对外暴露的主要接口/API。
<!-- CONTENT_END: core_interfaces -->

---

## 上游依赖（我依赖谁）

<!-- CONTENT_START: upstream_dependencies -->
> ⚠️ **待实现** - Agent 通过扫描 import/require/use 语句自动填充。

**填写规范**：
- 仅列出**本仓库内的其他模块**，不包含标准库和第三方库
- 格式：`- <模块名>：使用其 xxx 接口/数据结构做 xxx`

**分叉标注约定（v1.7 新增，供 16 调用链推导消费）**：

若某个下游依赖存在分叉调用，请在依赖条目中显式标注分叉类型，方便 16 号工作流直接读档案生成分叉图，无需二次扫代码：

| 分叉类型 | 语义 | 标注示例 |
|---------|------|---------|
| `conditional` | 运行时按条件二选一 / 多选一 | `- payment：conditional 分派 channel==wechat → wechat-adapter；channel==alipay → alipay-adapter` |
| `sync fan-out` | 同步并发调用多个下游，任一失败 → 主链失败 | `- inventory / es：sync fan-out（Promise.all 同步等待）` |
| `async fan-out` | 异步扇出（MQ / EventBus / 协程投递），失败降级 | `- notification / points：async fan-out（通过 topic:order.paid，详见 _topics.md）` |
| `polymorphic` | 依赖是 interface，登记多个实现 | `- storage：polymorphic 接口，实现 = MySQLStorage / RedisStorage` |
| `event-bus` | 内存事件总线（非 MQ）触发多 handler | `- (event-bus) user.registered → SendWelcomeEmail / CreateProfile / RiskCheck` |

> 📌 无分叉的普通依赖不需要额外标注，保持原格式即可。
<!-- CONTENT_END: upstream_dependencies -->

---

## 下游调用方（谁依赖我） · 1 层直接调用

<!-- CONTENT_START: downstream_callers -->
> ⚠️ **待实现** - Agent 通过反向搜索本模块导出符号自动填充。

**填写规范**：
- 深度：仅记录 **1 层直接调用方**，不递归
- 格式：`- <调用方模块>：调用了本模块的 xxx / xxx 接口`
- 数量上限：Top 10 调用方模块，超出时末尾注明 `（另有 N 处调用未逐一列出）`
- 若无任何下游调用方 → 填写"无（本模块为叶子模块 / 独立入口）"
<!-- CONTENT_END: downstream_callers -->

---

## 下游数据/接口调用（我调用的外部资源） · 1 层

<!-- CONTENT_START: downstream_data_calls -->
> ⚠️ **待实现** - Agent 通过扫描 SQL / HTTP / Redis / MQ / 第三方 SDK 调用自动填充。

**填写规范**（分类列出，缺项标"无"）：
- **数据库表**：`表名`（读/写/读写）— 用途说明
- **外部 HTTP 接口**：`METHOD /path`（服务名）— 用途说明
- **Redis Key 模式**：`key:pattern:*`（读/写）— 用途说明
- **消息队列**：`topic 名`（发布/订阅）— 用途说明；发布/订阅关系统一由 15 Step 5.4 聚合到 `modules/_topics.md`
- **第三方 SDK**：`SDK 名`（能力说明）

> 📌 **分叉标注**：本段的 MQ 发布默认视为 `async fan-out` 分叉（16 号工作流推导时自动展开订阅方）；HTTP 若一次操作并发调用多个外部服务，可在说明中额外标注 `sync fan-out` / `async fan-out`。详见「上游依赖」段的分叉标注约定。
<!-- CONTENT_END: downstream_data_calls -->

---

## 关键数据结构

<!-- CONTENT_START: data_structures -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。

描述模块的核心数据模型。
<!-- CONTENT_END: data_structures -->

---

## 注意事项

<!-- CONTENT_START: caution -->
> ⚠️ **待实现** - 此部分将由 Agent 自动分析填充，或由开发者手动补充。

开发或修改该模块时需要注意的事项。
<!-- CONTENT_END: caution -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
> ⚠️ **待实现** - Agent 分析时将根据工程结构类型自动填充。

**填写规范**：
- 格式：`` `路径（相对于项目根）` — 说明 ``
- 按层/按职责分组展示（如分层架构按层分组，Monorepo 按子目录分组）
- 数量上限：不超过 20 条；超出时按重要性截取，末尾注明 `（共 N 个文件，仅列关键文件）`
- ✅ 列出：入口文件、核心逻辑文件、对外接口定义文件、配置文件、代表性测试文件
- ❌ 不列出：自动生成文件（`*.pb.go`、`*.generated.ts`）、临时文件、与模块功能无关的工具脚本

**示例（按功能目录）**：
```
src/auth/index.ts          — 模块入口，导出公共接口
src/auth/auth.service.ts   — 核心业务逻辑
src/auth/auth.controller.ts — HTTP 路由层
src/auth/auth.dto.ts       — 请求/响应数据结构
src/auth/auth.spec.ts      — 单元测试
```

**示例（分层架构）**：
```
controller/user.go         — HTTP 入口层
service/user_service.go    — 业务逻辑层
dao/user_dao.go            — 数据访问层
model/user.go              — 数据模型
```
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  以下是 Agent 分析时的探测提示（不会在渲染中显示）：
  - 需要检查的文件/目录: {待填写}
  - 需要检查的配置项: {待填写}
  - 关键字/模式匹配: {待填写}
-->
