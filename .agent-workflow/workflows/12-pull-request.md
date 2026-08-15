<!-- MODULE: pull-request -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# PR 提交与评审流程

> 分为两个独立的 Agent 操作流程：
> - **Part 1 · PR 提交**：对比分支差异，自动生成完整 PR 描述，通过 gh 提交 PR
> - **Part 2 · PR 评审**：根据 PR 链接，参照项目规范对变更内容做全面评审并给出评审意见

---

## 概述

<!-- CONTENT_START: overview -->
本项目托管于 **GitHub**（`IriskaDev/dsh-desktop`），使用 `gh` CLI 提交/评审 PR。当前无 PR 模板、无 CODEOWNERS、无分支保护规则（单人仓库）；已引入 CI 门禁（GitHub Actions）。

- PR 流程概要：GitHub PR（`gh pr create` / `gh pr review` / `gh pr merge`）
- 评审人规则：待补充（当前无）
- CI 门禁：GitHub Actions（lint + test + format，见下）
<!-- CONTENT_END: overview -->

---

## 项目 PR 配置

### 审批规则

<!-- CONTENT_START: approval_rules -->
> 未检测到审批配置（无 CODEOWNERS、无分支保护规则）。

- 最少审批人数：待补充（单人仓库，暂无）
- 必要评审人：无 CODEOWNER；可通过 GitHub 分支保护规则或 CODEOWNERS 配置
- 审批超时策略：待补充
<!-- CONTENT_END: approval_rules -->

### CI 门禁

<!-- CONTENT_START: ci_gates -->
> CI 门禁（`.github/workflows/ci.yml`，`pull_request` → `main` 时自动运行）。

| CI 检查项 | 是否必须通过 | 说明 |
|----------|:----------:|------|
| 代码编译 | - | 零 build，无 |
| 单元测试 | ✅ 必须 | `npm test`（node:test） |
| Lint 检查 | ✅ 必须 | `npm run lint`（ESLint） |
| 格式检查 | ✅ 必须 | `npm run format:check`（Prettier） |
| 覆盖率门禁 | - | 无 |
| 安全扫描 | - | 无 |
<!-- CONTENT_END: ci_gates -->

### 合并策略

<!-- CONTENT_START: merge_strategy -->
> 未检测到合并策略配置（无 `.mergify.yml`、无分支保护规则）。

- 合并方式：待补充（建议 Squash，保持线性历史）
- 合并前要求：CI 门禁通过（无审批要求）
- 自动删除源分支：待补充（`gh pr merge --delete-branch`）
<!-- CONTENT_END: merge_strategy -->

---

# Part 1 · PR 提交流程

> 根据源分支和目标分支的差异，自动分析变更内容，生成完整的 PR 描述，通过 gh 提交 PR。

## 触发指令

```
# 基本用法
提交 PR：<source_branch> → <target_branch>
创建 PR，从 feature/add-login 合并到 main

# 指定评审人
提交 PR：feature/xxx → main，评审人：@zhangsan @lisi

# 关联 Issue
提交 PR：feature/xxx → main，关联 Issue #123
```

## PR 提交 SOP

### Step 1 · 获取分支差异与文件历史

**1.1 获取两分支之间的完整差异**：
```bash
git diff <target_branch>...<source_branch>
# 已推送后也可用：
gh pr diff <PR编号> --repo IriskaDev/dsh-desktop
```

**1.2 获取源分支的提交历史**：
```bash
git log <target_branch>..<source_branch> --oneline
```

**1.3 获取每个变更文件的 git 历史作者**（用于后续自动推荐评审人）：

对 diff 中每个变更文件，查询该文件在目标分支上的最近提交历史，提取：
- **上一任作者**：该文件最近一次提交（非本次 PR 提交人）的 author
- **主要开发者**：该文件历史提交中提交次数最多的 author（top 1~2）

同时读取项目主要开发者配置（参考 [项目说明 - 主要开发者](../workflows/01-project-overview.md)）作为补充候选。

> 💡 用 `git log -- <file>` / `git blame <file>` 按文件查询历史，统计作者与提交次数。

---

### Step 2 · 分析变更内容

基于 diff 和 commit log，分析以下维度：

| 分析维度 | 说明 |
|---------|------|
| **变更类型** | 新功能 / Bug 修复 / 重构 / 文档 / 依赖升级 / 其他 |
| **涉及模块** | 根据变更文件路径，对应 `.agent-workflow/modules/` 中的模块文档 |
| **变更范围** | 新增/删除/修改的文件列表，变更行数统计 |
| **接口变更** | 是否修改了对外接口、公共头文件、导出符号（影响兼容性） |
| **修改原因** | 从 commit message 和分支名推断，结合模块文档中的背景信息 |
| **修改分析** | 核心改动逻辑说明，关键代码变更的意图分析 |
| **修改结果** | 改动达到的效果，新增/修复/优化了什么 |
| **风险评估** | 变更影响范围，潜在的副作用或需要注意的点 |
| **推荐评审人** | 基于变更文件历史提取：各文件上一任作者 + 主要开发者（提交最多者），去重后合并项目主要开发者名单 |

---

### Step 3 · 生成 PR 描述

根据分析结果，按以下模板生成 PR 描述：

```markdown
## 变更类型
- [ ] ✨ 新功能（Feature）
- [ ] 🐛 Bug 修复（Fix）
- [ ] ♻️ 代码重构（Refactor）
- [ ] 📝 文档更新（Docs）
- [ ] ⬆️ 依赖升级（Deps）
- [ ] 🔧 其他（Chore）

## 修改原因
<!-- 说明为什么要做这次改动：背景、问题、需求来源 -->

## 修改分析
<!-- 核心改动逻辑说明：改了什么、怎么改的、为什么这样改 -->

## 修改结果
<!-- 改动达到的效果 -->

## 影响范围
<!-- 列出受影响的模块/接口/功能，说明是否有兼容性变更 -->

## 测试结果
<!-- 验证方式和测试结论 -->

## 关联 Issue
<!-- GitHub Issue 编号 -->

## 变更文件清单
<!-- Agent 自动填充：列出主要变更文件 -->

## 推荐评审人
<!-- Agent 自动填充：基于变更文件历史生成，仅供参考，提交时可手动调整 -->
```

---

### Step 4 · 确认并提交 PR

**4.1 自动推荐评审人**

基于 Step 1.3 的文件历史分析结果，按以下规则合并评审人候选列表：

| 来源 | 说明 | 优先级 |
|------|------|--------|
| 变更文件上一任作者 | 各变更文件最近一次提交（排除本次 PR 提交人）的 author | 高 |
| 变更文件主要开发者 | 各变更文件历史提交中提交次数 top 1~2 的 author | 高 |
| 项目主要开发者 | 来自 [项目说明](../workflows/01-project-overview.md) 中的主要开发者名单 | 中 |
| 用户手动指定 | 触发指令中显式指定的评审人 | 最高（强制包含） |

**去重规则**：
- 排除 PR 提交人本身
- 同一个人只保留一次
- 最终推荐人数建议 2~3 人，超过时优先保留"变更文件作者"

**4.2 向用户确认**

将以下信息展示给用户确认后再提交：

```
待提交 PR 信息：
  标题：<type>(<scope>): <简短描述>
  源分支：<source_branch> → 目标分支：<target_branch>
  推荐评审人：<自动推荐列表>（可修改）
  关联 Issue：<issue 编号>

[确认提交 / 修改后提交]
```

**4.3 提交 PR**

用户确认后，通过 `gh` 提交：

```bash
gh pr create \
  --repo IriskaDev/dsh-desktop \
  --base <目标分支> \
  --head <源分支> \
  --title "<type>(<scope>): <简短描述>" \
  --body "<Step 3 生成的完整描述>" \
  --reviewer <推荐评审人列表（可调整）>
```

**提交后反馈**：
```
PR 已创建：
  标题：xxx
  链接：https://github.com/IriskaDev/dsh-desktop/pull/<N>
  评审人：xxx（自动推荐）
  状态：待评审
```

---

# Part 2 · PR 评审流程

> 根据用户提供的 PR 链接，以评审人身份参照项目规范对变更内容做全面评审，输出评审意见并通过 gh 提交评论。

## 触发指令

```
# 基本用法
评审 PR：https://github.com/IriskaDev/dsh-desktop/pull/123
对这个 PR 做代码评审：<PR链接>

# 指定评审重点
评审 PR <链接>，重点关注安全性
评审 PR <链接>，重点关注性能和接口兼容性
```

## PR 评审 SOP

### Step 1 · 获取 PR 信息

从 PR 链接解析出 PR 编号，获取完整信息：

```bash
gh pr view <PR编号> --repo IriskaDev/dsh-desktop
gh pr diff <PR编号> --repo IriskaDev/dsh-desktop
```

同时读取 PR 的标题、描述、源/目标分支信息。

---

### Step 2 · 加载评审参考资料

根据 PR 涉及的变更文件，加载对应的项目文档作为评审依据：

| 参考资料 | 路径 | 用途 |
|---------|------|------|
| 规则限制 | `.agent-workflow/workflows/02-rules-constraints.md` | 编码规范、命名约定、技术限制 |
| 涉及模块文档 | `.agent-workflow/modules/<module-name>.md` | 模块接口定义、数据结构、设计约定 |
| 分支提交规范 | `.agent-workflow/workflows/11-branch-commit.md` | commit 格式、分支命名 |
| 测试流程 | `.agent-workflow/workflows/05-testing-process.md` | 测试要求与覆盖率标准 |

---

### Step 3 · 执行代码评审

按以下维度逐一检查变更内容：

<!-- CONTENT_START: review_checklist -->

#### 3.1 正确性
- [ ] 逻辑实现是否与 PR 描述的意图一致
- [ ] 边界条件和异常情况是否处理
- [ ] 是否存在明显的逻辑错误或空指针风险

#### 3.2 规范符合性
- [ ] 命名规范（变量/函数/文件）是否符合 [规则限制](../workflows/02-rules-constraints.md)
- [ ] 代码格式是否符合项目 Lint/Format 配置
- [ ] Commit 消息格式是否符合规范

#### 3.3 接口与兼容性
- [ ] 对外接口变更是否向下兼容，或已在 PR 描述中明确说明为 Breaking Change
- [ ] 修改的接口签名是否与 `.agent-workflow/modules/` 中的文档一致（若不一致，文档是否同步更新）
- [ ] 数据结构变更是否影响序列化/持久化兼容性

#### 3.4 测试充分性
- [ ] 新增功能是否有对应的单元测试
- [ ] Bug 修复是否有对应的回归测试用例
- [ ] PR 描述中的测试结果是否完整（单元测试 + 全量测试 + 编译结果）

#### 3.5 安全性
- [ ] 是否存在敏感信息泄露（密钥、密码、Token 硬编码）
- [ ] 外部输入是否有适当的校验和转义
- [ ] 权限控制是否正确

#### 3.6 可维护性
- [ ] 代码复杂度是否合理，是否需要拆分
- [ ] 关键逻辑是否有必要的注释
- [ ] 是否引入了重复代码（DRY 原则）

#### 3.7 文档同步
- [ ] 若接口/模块结构有变化，`.agent-workflow/modules/` 下对应的文档是否同步更新
- [ ] 若构建/发布方式有变化，对应的 workflow 文档是否更新

<!-- CONTENT_END: review_checklist -->

---

### Step 4 · 输出评审意见

按严重程度分级输出评审意见：

| 级别 | 含义 | gh 评审命令 |
|------|------|-----------|
| 🔴 **必须修改**（Blocker） | 影响正确性/安全性/兼容性，必须修复才能合并 | `gh pr review --request-changes` |
| 🟠 **建议修改**（Major） | 规范问题或潜在风险，强烈建议修复 | `gh pr review --comment` |
| 🟡 **可选优化**（Minor） | 代码质量建议，可在本 PR 或后续处理 | `gh pr review --comment` |
| ✅ **认可**（Approve） | 整体评审通过 | `gh pr review --approve` |

**通过 gh 提交评审**：

```bash
# 整体评审结论
gh pr review <PR编号> --repo IriskaDev/dsh-desktop --approve          # 通过
gh pr review <PR编号> --repo IriskaDev/dsh-desktop --request-changes  # 需修改
gh pr review <PR编号> --repo IriskaDev/dsh-desktop --comment --body "整体评审总结"

# 针对具体代码行的评论：gh 不支持行级内联评论，需在 PR 页面手动提交
```

---

### Step 5 · 给出评审结论

评审完成后，向用户和 PR 输出总结：

```markdown
## 评审结论

**总体评价**：通过 / 需修改后重新评审 / 阻塞（需修复 Blocker 问题）

**问题汇总**：
| 级别 | 数量 | 主要问题 |
|------|------|---------|
| 🔴 Blocker | N | xxx |
| 🟠 Major | N | xxx |
| 🟡 Minor | N | xxx |

**评审详情**：已通过 gh / PR 页面提交评论，请查看 PR 评论列表。
```

---

## Git 平台 PR 操作速查

> 本项目以 GitHub（`IriskaDev/dsh-desktop`）为例，使用 `gh` CLI（全路径 `D:\tools\gh\bin\gh.exe`）。

<!-- CONTENT_START: github_pr -->

| 操作 | 命令 | 关键参数 | 可用状态 |
|------|------|---------|:-------:|
| 创建 PR | `gh pr create` | `--base`, `--head`, `--title`, `--body`, `--reviewer` | ✅ 可用 |
| 查看 PR 差异 | `gh pr diff <number>` | - | ✅ 可用 |
| 查看 PR 列表 | `gh pr list` | `--state` | ✅ 可用 |
| 查看 PR | `gh pr view <number>` | - | ✅ 可用 |
| 提交评审 | `gh pr review <number>` | `--approve` / `--request-changes` / `--comment` | ✅ 可用 |
| 合并 PR | `gh pr merge <number>` | `--squash` / `--merge` / `--rebase` / `--delete-branch` | ✅ 可用 |
| 读取文件内容 | `gh api repos/{owner}/{repo}/contents/{path}` | - | ✅ 可用 |

<!-- CONTENT_END: github_pr -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- 无 PR 模板 / CODEOWNERS / 分支保护配置；CI 门禁见 `.github/workflows/ci.yml`
- GitHub 仓库 `IriskaDev/dsh-desktop`（gh CLI）
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: .github/PULL_REQUEST_TEMPLATE.md
  - 检查文件: .gitlab-ci.yml, .github/workflows/*(PR 触发规则)
  - 检查文件: CODEOWNERS（必要评审人配置）
  - 检查文件: .mergify.yml, .kodiak.toml（自动合并配置）
  - 提取信息: CI 门禁列表, 审批规则, 合并策略, 必要评审人
  - 提取信息: PR 模板内容（用于补充 Step 3 的描述模板）
  - 评审阶段参考: .agent-workflow/workflows/02-rules-constraints.md（编码规范）
  - 评审阶段参考: .agent-workflow/modules/*.md（模块接口与数据结构定义）
  - 评审阶段参考: .agent-workflow/workflows/05-testing-process.md（测试要求）
  - 评审阶段参考: .agent-workflow/workflows/11-branch-commit.md（commit 规范）
-->
