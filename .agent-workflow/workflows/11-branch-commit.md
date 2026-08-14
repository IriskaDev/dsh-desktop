<!-- MODULE: branch-commit -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 分支提交规范

> 定义项目的分支命名策略、Commit 消息规范、提交前检查和通过 gh 执行分支操作的完整 SOP。
>
> **本文档是唯一权威来源**：[开发流程](../workflows/03-development-workflow.md) Step 2 和 [Bug修复流程](../workflows/07-bug-fixing.md) Step 2 均引用本文档，不在各自文件中重复定义。

---

## 概述

<!-- CONTENT_START: overview -->
当前仅 `main` 单分支（trunk-based），提交消息实测使用 Conventional Commits。无 commitlint / husky / commitizen 等强制配置，规范靠约定。

- 分支管理模型：Trunk-based（单 `main` + 短期 feature/fix/hotfix 分支）
- 提交规范：Conventional Commits（已实测）
<!-- CONTENT_END: overview -->

---

## 分支策略

<!-- CONTENT_START: branch_strategy -->
> 实测：当前仅 `main` 分支（+ `origin/main`），无 `develop`，分支模型接近 Trunk-based / GitHub Flow（单主干 + 短期功能分支）。

**分支模型**：Trunk-based（单 `main` 主干 + 短期 feature/fix/hotfix 分支）

**分支命名规范**：

| 分支类型 | 命名格式 | 基础分支 | 说明 |
|---------|---------|---------|------|
| 主分支 | `main` / `master` | — | 生产环境代码，禁止直接推送 |
| 开发分支 | `develop` / `dev` | — | 开发集成分支 |
| 功能分支 | `feature/<issue-id>-<desc>` | develop | 新功能开发 |
| 修复分支 | `fix/<issue-id>-<desc>` | develop | 普通 Bug 修复 |
| 紧急修复 | `hotfix/<desc>` | main/master | 生产紧急故障 |
| 发布分支 | `release/<version>` | develop | 版本发布准备 |

> 💡 `<desc>` 使用小写字母和连字符，如 `feature/123-add-user-auth`
<!-- CONTENT_END: branch_strategy -->

---

## Commit 规范

<!-- CONTENT_START: commit_convention -->
> 未检测到 commitlint / commitizen / husky 配置；但 `git log` 实测使用 Conventional Commits（`chore:`、`docs:`），以下为采用的规范。

**Commit 消息格式**（Conventional Commits）：
```
<type>(<scope>): <subject>

[可选 body：详细说明]

[可选 footer：关联单据、Breaking Change 说明]
```

**Type 类型**：

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(auth): add OAuth2 login` |
| `fix` | Bug 修复 | `fix(payment): correct amount calculation` |
| `docs` | 文档更新 | `docs(readme): update build instructions` |
| `style` | 代码格式（不影响逻辑） | `style: format with prettier` |
| `refactor` | 代码重构 | `refactor(user): extract validation logic` |
| `perf` | 性能优化 | `perf(list): use virtual scroll` |
| `test` | 测试相关 | `test(auth): add unit tests for login` |
| `chore` | 构建/工具/依赖变更 | `chore(deps): upgrade lodash to 4.17.21` |
| `ci` | CI 配置变更 | `ci: add coverage check to pipeline` |
| `revert` | 回滚提交 | `revert: feat(auth): add OAuth2 login` |

**Breaking Change 写法**：
```
feat(api)!: remove deprecated /v1/users endpoint

BREAKING CHANGE: /v1/users has been removed, use /v2/users instead
```
<!-- CONTENT_END: commit_convention -->

---

## 提交前检查

<!-- CONTENT_START: pre_commit_hooks -->
> 未检测到 Git hooks（无 `.husky/`、`.pre-commit-config.yaml`、commitlint）。提交前检查依赖人工 + 本工作流「提交代码前置校验」。

| 检查项 | 工具 | 触发时机 | 说明 |
|-------|------|---------|------|
| （无） | - | - | 待引入 lint/commitlint hooks |
<!-- CONTENT_END: pre_commit_hooks -->

---

## 分支操作 SOP

> 以下为创建/切换分支的标准步骤，供 [开发流程](../workflows/03-development-workflow.md) 和 [Bug修复流程](../workflows/07-bug-fixing.md) 调用。

### 新建功能/修复分支

```bash
# 1. 切换到基础分支并拉取最新代码
git checkout <基础分支>       # feature/fix → develop；hotfix → main
git pull origin <基础分支>

# 2. 创建新分支
git checkout -b <分支名>      # 按"分支命名规范"表格中的格式

# 3. 确认当前状态
git branch                   # 确认当前在新分支上
git status                   # 确认工作区干净
```

### 提交代码前置校验（模块档案同步）

> ⚠️ 本校验是 [15-module-inventory.md](./15-module-inventory.md) Step 5 的**执行门禁**，凡代码修改类提交必须通过本校验才能进入 `git add`。

**校验清单**（提交前逐项确认）：

1. **本次改动映射到的模块清单**：通过 `git diff --name-only` 得到变更文件列表，逆向映射到 `.agent-workflow/modules/index.md` 中对应模块
2. **对每个受影响模块**：
   - [ ] 模块档案 `LAST_ANALYZED` 头 = 今日日期
   - [ ] 三段依赖章节（上游依赖 / 下游调用方 / 下游数据调用）已按最新代码扫描重写
   - [ ] 若对外接口签名有变更，「下游调用方」列表中的模块档案「上游依赖」章节已同步刷新（1 层级联，见 [15 Step 5.3](./15-module-inventory.md#53-更新粒度)）
3. **`modules/index.md`**：
   - [ ] 受影响行的「最后更新」= 今日
   - [ ] 「时效状态」= 🟢 有效
4. **模块边界变化检查**：
   - [ ] 新增/删除对外入口文件时，已完成模块档案的新建/合并/拆分决策

**未通过时**：
- 补齐 [15 Step 5 增量更新](./15-module-inventory.md#step-5--增量更新流程自动--手动共用) 后再执行 `git add`
- 模块档案与代码变更**必须在同一次 commit 内提交**，禁止分开提交（防止台账与代码短暂不一致）

---

### 提交代码

```bash
# 精确 add，避免提交无关文件
git add <变更文件>
# 或按目录
git add src/module-name/

# 提交（commit 消息遵循上方"Commit 规范"）
git commit -m "<type>(<scope>): <subject>"

# 推送到远端
git push origin <当前分支>
# 首次推送（建立追踪）
git push -u origin <当前分支>
```

### 同步主干最新代码（避免冲突积累）

```bash
# 方式一：merge（保留合并历史）
git fetch origin
git merge origin/<基础分支>

# 方式二：rebase（保持线性历史，推荐）
git fetch origin
git rebase origin/<基础分支>
```

### 分支合并后清理

```bash
# 删除本地分支
git branch -d <已合并分支名>

# 删除远端分支
git push origin --delete <已合并分支名>
```

---

## GitHub 平台操作指引

<!-- CONTENT_START: github_branch -->

> 本项目托管于 **GitHub**（`IriskaDev/dsh-desktop`），使用 `gh` CLI（沙箱内用全路径 `D:\tools\gh\bin\gh.exe`）。以下为 GitHub 等价操作示例。

**通过 gh 创建 PR（等价「创建分支 + 提交」）**：
```bash
git checkout -b feature/<desc>
git push -u origin feature/<desc>
D:\tools\gh\bin\gh.exe pr create --base main --head feature/<desc> --title "feat(<scope>): <desc>"
```

**查看分支提交历史**：
```bash
git log --oneline -20
```

**比较分支差异**：
```bash
git diff main...feature/<desc>
```

**查看 Tag 列表**：
```bash
git tag --list
```

<!-- CONTENT_END: github_branch -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- 无 commitlint / husky / commitizen / .gitflow 配置
- `git log` — 实测 commit 格式（`chore:`、`docs:`）
- `git branch -a` — 当前分支（仅 `main`）
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: .gitflow（Git Flow 配置）
  - 检查文件: commitlint.config.js, commitlint.config.ts, .commitlintrc, .commitlintrc.json
  - 检查文件: .czrc, .cz.json, package.json(config.commitizen)（Commitizen 配置）
  - 检查文件: .husky/, .husky/pre-commit, .husky/commit-msg（Husky hooks）
  - 检查文件: .pre-commit-config.yaml（pre-commit 框架配置）
  - 检查文件: package.json(husky, lint-staged 配置)
  - 检查文件: lefthook.yml（Lefthook hooks）
  - 分析: git branch -a 列表，识别现有分支命名模式（feature/fix/hotfix/release）
  - 分析: git log --oneline 最近 20 条，识别实际使用的 commit 消息格式
  - 提取信息: 分支命名规则（各类型格式）, commit 消息格式规范
  - 提取信息: Git hooks 配置（pre-commit/commit-msg 检查项）
  - 提取信息: 分支保护规则（哪些分支禁止直接推送）
-->
