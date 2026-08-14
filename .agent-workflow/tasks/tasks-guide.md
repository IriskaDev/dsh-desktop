# 📋 任务目录（Tasks）

> 本目录存放**正在进行的研发任务实例**。每个任务对应一份 Markdown "任务引导文件"，作为 Agent 执行该任务的"作战地图 + 进度档案"。
>
> 即使 Agent 中途崩溃 / 切换会话 / 换人接手，凭这份文件即可无损恢复。

---

## 与其他目录的关系

| 目录 | 描述层 | 时间属性 | 数量 |
|------|-------|---------|------|
| `workflows/` | **怎么做**（流程 SOP） | 长期稳定 | 固定 13 个 |
| `modules/` | **是什么**（业务模块） | 中期稳定 | 按业务模块数 |
| **`tasks/`** | **正在做什么**（任务实例） | **短期、一次性** | 每个任务一个文件 |

---

## 目录结构

```
tasks/
├── tasks-guide.md     # 本文件：使用指南 + Agent 执行规约
├── _example.md        # 已填好的样例任务（_ 开头不被覆盖）
├── _active/           # 进行中的任务（STATUS = PLANNING / IN_PROGRESS / BLOCKED）
└── _archive/          # 已完成 / 已废弃的任务（按 YYYY-MM 分子目录）
    └── 2026-05/
        └── 20260520-xxx.md
```

> 📖 **想看完整样例？** 参考 [`_example.md`](./_example.md)（功能开发任务示例，展示进行中的最终形态）。以 `_` 开头的文件会被分析器忽略。

---

## 文件命名规范

```
YYYYMMDD-<kebab-case-slug>.md
```

例如：
- `20260526-add-oauth-login.md`
- `20260527-fix-payment-deadlock.md`
- `20260528-refactor-cache-layer.md`

---

## 任务模板

任务模板统一放在 [`templates/`](../templates/) 目录：

| 模板文件 | 适用场景 |
|---------|---------|
| [`task-feature-template.md`](../templates/task-feature-template.md) | 新功能 / 需求开发 |
| [`task-bugfix-template.md`](../templates/task-bugfix-template.md) | Bug 修复（含 P0 故障） |
| [`task-refactor-template.md`](../templates/task-refactor-template.md) | 重构 / 性能优化 |

---

## Agent 执行规约（重要）

> ⚠️ **完整 SOP 唯一真相源**：[`AGENTS.md`](../../AGENTS.md) 的「📋 任务执行 SOP」章节。
>
> 本文件只列出最关键的速查信息，详细步骤、流程图、硬性约束等请以 AGENTS.md 为准。**严禁在此处重复 SOP 细节，避免双源真相导致行为不一致。**
>
> 📌 **常量引用约定**：本节涉及 `STATUS` / `TASK_TYPE` 等枚举值时，仅复用 [`analyzer-instructions.md#约束常量表`](../analyzer-instructions.md#约束常量表ssot--single-source-of-truth) 表 A 的取值，不另行定义；任何枚举值变更**必须**先改常量表（D5.E2 自检规则会校验）。

### SOP 速查（5 个步骤 + 1 个前置）

| 步骤 | 关键动作 |
|:----:|---------|
| **Step 0**：前置检查 | 读 `AGENTS.md` 的 `LIFECYCLE_PHASE`，未完成阶段一时软阻断（可 `--force` 跳过） |
| **Step 1**：接到任务（Intake） | 识别类型 → 复制模板 → 填三个必填区块（需求理解 / 影响范围 / Step List）→ 等用户确认 |
| **Step 2**：执行任务（Execute） | `STATUS=IN_PROGRESS`，每完成一步勾选 + 记日志；遇阻塞 → `BLOCKED`；阻塞解除 → 改回 `IN_PROGRESS` |
| **Step 3**：中断恢复（Resume） | 扫 `_active/` → 读元数据 + 首个未勾选项 + 近 3 条日志 → 与用户确认起点 |
| **Step 4**：任务完成（Finalize） | 全部勾选 + 验收过 + PR 已合入 → `DONE` → 移入 `_archive/<YYYY-MM>/`（无需改 AGENTS.md） |
| **Step 5**：任务废弃（Abandon） | `STATUS=ABANDONED` → 进度日志记原因 → 移入 `_archive/<YYYY-MM>/`（无需改 AGENTS.md） |

> 详细步骤、mermaid 流程图、硬性约束清单见 [`AGENTS.md`](../../AGENTS.md) 的「📋 任务执行 SOP」章节。

---

## 触发指令

> 📌 触发指令统一登记在 [`analyzer-instructions.md#约束常量表`](../analyzer-instructions.md#约束常量表ssot--single-source-of-truth) 表 D。本节仅列出本目录最常用的 5 条以便速查；新增触发词请先改表 D（D5.E4 自检规则会校验）。

| 指令 | 说明 |
|------|------|
| `创建任务: <描述>` | Agent 识别类型 → 复制模板 → 填充任务文件 → 等用户确认计划 |
| `继续任务` / `继续任务 <task-id>` | 恢复进行中的任务 |
| `查看进行中的任务` | 列出 `tasks/_active/` 下所有任务 |
| `归档任务 <task-id>` | 把任务移入 `_archive/<YYYY-MM>/`（无需修改 `AGENTS.md`，任务列表为动态视图） |
| `废弃任务 <task-id>` | 标记 `ABANDONED` 并归档 |

---

## 状态字段说明

> 📌 取值集合的唯一真相源：[`analyzer-instructions.md#约束常量表`](../analyzer-instructions.md#约束常量表ssot--single-source-of-truth) 表 A（`TASK_STATUS_ENUM` / `TASK_TYPE_ENUM`）。本表仅做语义说明，不重复定义枚举集合。

| 字段 | 取值 | 含义 |
|-----|------|------|
| `STATUS` | `PLANNING` | 已创建任务文件，需求理解 / 影响范围 / 计划尚在讨论 |
|  | `IN_PROGRESS` | 正在执行 Step List |
|  | `BLOCKED` | 遇到外部阻塞，等待解除 |
|  | `DONE` | 全部完成，准备归档 |
|  | `ABANDONED` | 已废弃 |
| `TASK_TYPE` | `feature` / `bugfix` / `refactor` | 决定使用哪个模板 |
| `RELATED_WORKFLOWS` | 如 `03,04,05,11,12` | 引用 `workflows/` 中相关 SOP，便于 Agent 跳转；具体取值见表 A |
| `BRANCH` | 如 `feature/add-login` | 与 `workflows/11-branch-commit.md` 联动校验 |

---

> 💡 **设计原则**：任务文件是"人 + Agent"共同维护的**单一真相源（Single Source of Truth）**。所有讨论结论、决策、进度都沉淀于此，避免散落在群聊、IM、Issue 等异构渠道。
