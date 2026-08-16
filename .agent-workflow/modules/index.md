# 📦 业务模块索引

> ⚠️ **Agent 强制规则**：每次完成任何模块分析或更新后，**必须立即同步更新本文件的索引表**。
> - 新增大模块 Group 或顶层单模块 → 在索引表追加一行，填写全部字段
> - 更新 Group 或顶层单模块 → 修改对应行的「职责概述」「关键词」「状态」「时效」字段
> - **禁止**在未更新本索引的情况下结束模块分析任务
> - **v1.9 分层规则（硬性）**：本索引**只列 Group + 顶层单模块**，不列 Group 内的子模块（子模块清单在 `<group>/group.md`）

> 本文件是 `modules/` 目录的**顶层入口索引**，是 Agent **三级下钻**加载的第一站。
>
> **Agent 使用规则**（v1.9 三级加载协议）：
> 1. **L1 · 顶层匹配**：接到任务时先读本文件，通过「关键词」列匹配相关模块，识别命中的是 Group 还是顶层单模块（看「类型」列）
> 2. **L2 · 组内下钻**：命中 Group → 加载 `<group>/group.md`，用二级关键词匹配到具体子模块
> 3. **L3 · 精准加载**：命中顶层单模块 → 直接加载对应 `.md` 文件；命中子模块 → 加载 `<group>/<sub>.md`

---

## 顶层模块索引表

| 模块ID | 名称 | 类型 | 职责概述 | 状态 | 时效 | 最后更新 | 关键词 | 文件链接 |
|--------|------|:----:|---------|:----:|:----:|:--------:|--------|----------|
| desktop-surface | desktop surface（Electron 桌面外壳，无后台服务） | MODULE | `dsh --profile desktop` 起 Electron 原生窗口加载 DSH web（无本地 HTTP 监听，IPC 桥接），零定制复用；支持打包 Electron 运行时发 Release | 🟢 已完成 | 🟢 有效 | 2026-08-17 | desktop,electron,surface,web,launcher,release,startup,ipc | [desktop-surface.md](./desktop-surface.md) |

**类型说明**：`GROUP`（大模块，含 ≥3 个子模块） · `MODULE`（顶层单模块，无子模块）
**状态说明**：🔴 待分析 | 🟡 部分完成 | 🟢 已完成
**时效说明**：🟢 有效 | 🟡 待验证 | 🔴 已过期 | ⚪ 未建档（详见 [15-module-inventory.md](../workflows/15-module-inventory.md) Step 6）

---

## Agent 按需加载规则（v1.9 三级下钻）

```
[任务开始]
   ↓
① L1 读 modules/index.md，用关键词匹配「关键词」列
   ↓
② 命中「类型」= GROUP  → L2 读 <group>/group.md，二次匹配「子模块清单」
                         → L3 加载具体子模块档案
   命中「类型」= MODULE → L3 直接加载顶层单模块档案
   ↓
③ 若无匹配，直接执行任务或提示用户补充模块分析
```

**三级加载 Token 收益（示例）**：
- 需精确定位单个子模块 → 读 index.md（≤ 20 行）+ group.md（≤ 30 行）+ 子模块档案（1 份），远小于加载全部 100+ 模块档案
- 需全局影响面 → 通过 chains 档案 + group.md 快速定位相关 Group，不用扫全部子模块

**示例**：用户说"修复 Agent 循环执行 Bug" → 匹配关键词 `agent,loop,runtime` → 命中 `core` Group → 读 `core/group.md` → 匹配到 `agent-loop` 子模块 → 加载 `core/agent-loop.md`

---

## 维护规则

每次完成模块分析或更新模块文件后，Agent **必须**同步更新本索引表：

| 操作 | 需更新的字段 |
|------|------------|
| 新增大模块 Group | 追加一行，「类型」= GROUP，填全字段（职责概述来自 group.md「Group 概览」的一句话） |
| 新增顶层单模块 | 追加一行，「类型」= MODULE，填全字段 |
| Group 内新增/删除子模块 | **不修改本文件**（子模块清单由 `<group>/group.md` 维护），仅在 Group 的 SUB_MODULE_COUNT 变更时可能影响本文件的「职责概述」摘要 |
| 更新模块内容 | 更新「职责概述」「关键词」「状态」「时效」「最后更新」 |
| 检测到模块代码有 commit 但未刷新台账 | 将「时效」置为 🟡 或 🔴（详见 [15-module-inventory.md](../workflows/15-module-inventory.md) Step 6） |
| 代码修改任务完成 | 对涉及的 Group 或顶层模块，「时效」= 🟢、「最后更新」= 今日 |
| Group 降级为顶层单模块（子模块 < 3 或不再高内聚） | 将「类型」从 GROUP 改为 MODULE，并同步在 `modules/` 目录做物理迁移（详见 [15-module-inventory.md](../workflows/15-module-inventory.md) Step 5.6） |

> ⚠️ 禁止删除索引行（即使模块文件被删除），应将状态改为 🔴 并备注"文件已移除"。

---

## 关键词填写规范

关键词用于 Agent 语义匹配，填写时遵循：

- 用英文逗号分隔，**不超过 8 个**
- 大模块 Group 关键词：包含 Group 英文名 + 组内主要业务术语（覆盖组内所有子模块共有主题）
- 顶层单模块关键词：模块英文名 + 核心功能词 + 关联实体名
- 示例（Group）：`core,agent,runtime,loop,multi-agent,self-heal`
- 示例（顶层单模块）：`login,token,oauth,jwt,session,auth`

---

## 目录结构约定（v1.9 分层结构）

```
modules/
├── index.md                    # ← 本文件，顶层导航
├── modules-guide.md            # 目录使用指南
├── _topics.md                  # MQ topic 反查表
├── _example.md                 # 顶层单模块档案示例
│
├── <group-a>/                  # 大模块 Group 目录
│   ├── group.md                # ← Group 索引（含子模块清单）
│   ├── <sub-1>.md              # 子模块档案
│   ├── <sub-2>.md
│   └── ...
│
├── <group-b>/
│   ├── group.md
│   └── ...
│
└── <top-level-module>.md       # 顶层单模块（无 Group）
```

**深度约束（硬性）**：只支持 2 层（`modules/<group>/<module>.md`），禁止 3 层及以上嵌套。

---

> 💡 模块文件详细说明见 [modules-guide.md](./modules-guide.md)；模块分析指令见 [analyzer-instructions.md](../analyzer-instructions.md)。
