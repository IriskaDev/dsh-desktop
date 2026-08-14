# 项目业务模块说明（v1.9 分层结构）

> 本目录用于存放当前项目的**业务模块**说明文档，包括各模块的功能设计、数据流向、接口定义、依赖关系等。
>
> 与 `workflows/` 目录的区别：
> - `workflows/`：描述**如何做**（开发流程、编译步骤、发布规范等操作性说明）
> - `modules/`：描述**是什么**（项目业务模块的功能设计与结构说明）

---

## 分层结构（v1.9 新增）

从 v1.9 开始，`modules/` 支持 2 层分层组织，帮助 Agent 三级下钻按需加载：

- **Group（大模块）**：把 ≥3 个高内聚的子模块聚合到一个子目录（如 `modules/core/`），并生成 `group.md` 作为组内索引
- **顶层单模块**：无子模块的独立模块直接放在 `modules/` 顶层（如 `modules/payment.md`）

**深度约束**：只支持 2 层（`modules/<group>/<module>.md`），**禁止** 3 层嵌套。若真的需要 3 层结构，用 `group.md` 内的 Markdown 二级标题分块表达。

## 目录文件说明

| 文件 | 类型 | 说明 |
|------|:----:|------|
| [`index.md`](./index.md) | ⭐ 顶层入口 | Group + 顶层单模块的总索引，Agent L1 加载入口，每次分析后必须同步更新 |
| [`modules-guide.md`](./modules-guide.md) | 使用指南 | 本文件 |
| [`_topics.md`](./_topics.md) | MQ 反查表 | 15 Step 5.4 顺带聚合，供 16 调用链推导使用 |
| [`_example.md`](./_example.md) | 单模块示例 | 顶层单模块档案完整样例，`_` 开头不被扫描 |
| `<top-module>.md` | 顶层单模块 | 无 Group 归属的独立模块档案 |
| `<group>/group.md` | Group 索引 | ⭐ 大模块索引，L2 下钻入口，含子模块清单 |
| `<group>/<sub-module>.md` | 子模块档案 | Group 下的具体子模块档案，L3 加载目标 |

> 📖 **想看完整样例？** 顶层单模块参考 [`_example.md`](./_example.md)（用户认证模块）；Group 结构参考模板 [`../templates/module-group-template.md`](../templates/module-group-template.md)。以 `_` 开头的文件会被分析器忽略。

---

## Agent 三级下钻加载协议（v1.9）

```
L1 · 顶层匹配：读 modules/index.md，按关键词命中 Group 或顶层单模块
   ↓
L2 · 组内下钻：命中 Group 后读 <group>/group.md，二级关键词命中子模块
   ↓
L3 · 精准加载：读单个模块档案（<group>/<sub>.md 或 <top-module>.md）
```

**Token 收益**：需精确定位单个子模块时，只需加载 `index.md`（≤20 行）+ `group.md`（≤30 行）+ 子模块档案（1 份），远小于扫全部 100+ 档案。

---

## 文件命名规范

| 场景 | 命名 | 示例 |
|------|------|------|
| 顶层单模块 | `<module-name>.md`（kebab-case）| `payment.md` / `user-auth.md` |
| Group 目录 | `<group-name>/`（kebab-case）| `core/` / `llm/` / `gui/` |
| Group 索引 | `<group-name>/group.md`（**必须**叫 `group.md`）| `core/group.md` |
| 子模块 | `<group-name>/<sub-name>.md` | `core/agent-loop.md` |
| 保留文件 | `_` 开头不被扫描 | `_example.md` / `_topics.md` |

---

## Group 建组决策（15 Step 1.4）

一组模块**同时满足**下列 3 条才建议建 Group 目录：

| 判定项 | 通过条件 |
|-------|---------|
| **内聚性** | 该组的子模块协同解决**同一个大问题域**（如「用户体系」「订单系统」「Agent Runtime」）|
| **数量阈值** | `SUB_MODULE_COUNT ≥ 3`；只有 1~2 个子模块时保留为顶层单模块，无需嵌套 |
| **对外收敛** | 组内子模块对外调用主要通过少数几个入口子模块暴露，其他子模块基本只被组内引用 |

**决策速查**：

| 场景 | 处置 |
|-----|------|
| 独立单模块（如通用工具库） | `modules/<name>.md` |
| 只有 2 个协同子模块 | 各自 `modules/<name>.md`（顶层），不建 Group |
| 3 个及以上高内聚子模块 | `modules/<group>/group.md` + `modules/<group>/<sub>.md` |
| 分层架构下的同一业务域（controller/service/dao 三件套） | 合并为**单一模块**（不是 Group），归入 `modules/<domain>.md` |

> 📌 **关键区分**：**Group** 是"多个独立子模块的容器"；**分层架构合并模块** 是"跨层的同一实体聚合成单模块"。二者不要混淆。

---

## 双向反向索引（v1.9 新增）

模块档案 ↔ 链路档案互相可导航：

- **模块档案头部** `INVOLVED_CHAINS` = 涉及的调用链 slug 列表（由 16 号 Step 6.7 反向注入）
- **链路档案头部** `SOURCE_MODULES_SNAPSHOT` = 沿途模块及其推导时的 `LAST_ANALYZED` 快照（`<group>/<module>@<date>` 格式）
- **Group 档案的「涉及的调用链档案」表** = Group 级聚合视图

Agent 使用姿势：
- 从模块出发看它参与哪些业务链 → 读模块档案头部 `INVOLVED_CHAINS`
- 从链路出发看每一跳的模块细节 → 读链路档案 `SOURCE_MODULES_SNAPSHOT`
- 从 Group 看它参与了哪些跨模块业务 → 读 `group.md`「涉及的调用链档案」表

---

## 档案模板

- **顶层单模块**：使用 [`../templates/module-template.md`](../templates/module-template.md)
- **Group 索引**：使用 [`../templates/module-group-template.md`](../templates/module-group-template.md)（v1.9 新增）
- **Group 内子模块**：使用 [`../templates/module-template.md`](../templates/module-template.md)（与顶层单模块共用模板，头部 `MODULE_GROUP` 字段填对应 group 名）

---

> 💡 可通过 Agent 对话自动分析项目模块结构并生成文档（参考 [analyzer-instructions.md](../analyzer-instructions.md)）：
> ```
> 分析项目模块结构      # 首次全量
> 建立模块台账          # 15 号首次分组建库
> 刷新模块台账          # 15 号增量更新
> ```
