<!-- MODULE: code-review -->
<!-- STATUS: PARTIAL -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 代码 Review 规范

> 本文档定义项目的 **Code Review 规范配置**，包括 Review 标准、代码所有权、自动化检查和评审人规则。
>
> **与 12-PR 评审的分工**：
> - 本文档（08）：**是什么** —— 项目 Review 的规则、标准和工具配置（静态规范）
> - [PR 评审流程（12）](../workflows/12-pull-request.md) Part 2：**怎么做** —— Agent 实际执行 PR 评审的操作 SOP

---

## 概述

<!-- CONTENT_START: overview -->
单人仓库，无 CODEOWNERS、无 PR 模板、无 CI review 门禁。Review 目前依赖提交者自查 + 后续引入的自动化检查。

- 目标与原则：保证正确性、无敏感信息、接口兼容、有测试（待建立）
- 覆盖范围：所有合并到 `main` 的 PR（待补充）
<!-- CONTENT_END: overview -->

---

## 代码所有权（CODEOWNERS）

<!-- CONTENT_START: code_ownership -->
> 未检测到 `CODEOWNERS` 文件（项目为单人仓库）。

```
# 待补充：如需建立 CODEOWNERS，格式如下
# <路径模式>  <owner1> <owner2>
```

> 💡 当前唯一提交者为 IriskaDev（`yet.iriska@gmail.com`），无必要评审人配置。
<!-- CONTENT_END: code_ownership -->

---

## Review 标准

> 以下为本项目的 Review 检查标准，[PR 评审流程](../workflows/12-pull-request.md) 执行评审时以此为依据。

<!-- CONTENT_START: review_standards -->
> 以下为通用 Review 标准（项目无特定配置，沿用模板默认项；可据 [规则限制](../workflows/02-rules-constraints.md) 微调）。

### 必须通过项（Blocker）

- [ ] 代码逻辑正确性，无明显 Bug
- [ ] 边界条件和异常情况已处理
- [ ] 无敏感信息泄露（密钥、密码硬编码）
- [ ] 对外接口变更向下兼容，或已明确标注 Breaking Change
- [ ] 新功能/Bug修复有对应的测试用例

### 强烈建议修改项（Major）

- [ ] 命名规范符合 [规则限制](../workflows/02-rules-constraints.md)
- [ ] 函数复杂度合理（无超长函数、过深嵌套）
- [ ] 无明显重复代码（DRY 原则）
- [ ] 关键逻辑有必要注释

### 可选优化项（Minor）

- [ ] 代码格式符合项目 Lint/Format 配置
- [ ] TODO/FIXME 注释有对应跟踪单据
- [ ] 文档同步更新（接口变更时）
<!-- CONTENT_END: review_standards -->

---

## 审批规则

<!-- CONTENT_START: approval_rules -->
> 未检测到审批配置（无 CODEOWNERS、无分支保护规则）。单人仓库。

| 场景 | 最少审批人数 | 必要评审人 | 说明 |
|------|:----------:|---------|------|
| 普通功能分支 → main | 待补充 | - | 单人仓库，暂无审批要求 |
| release → main | 待补充 | - | 待补充 |
| hotfix → main | 待补充 | - | 待补充 |
| 涉及核心模块变更 | 待补充 | - | 无 CODEOWNER |
<!-- CONTENT_END: approval_rules -->

---

## 自动化检查（CI 门禁）

<!-- CONTENT_START: automated_checks -->
> 未检测到 CI 自动化检查配置（无 `.github/workflows/`）。

| 检查项 | 工具 | 触发时机 | 是否阻塞合并 |
|-------|------|---------|:----------:|
| 代码风格（Lint） | （无） | - | - |
| 静态分析 | （无） | - | - |
| 单元测试 | （无） | - | - |
| 覆盖率门禁 | （无） | - | - |
| 安全扫描 | （无） | - | - |
| 编译检查 | （无，零 build） | - | - |
<!-- CONTENT_END: automated_checks -->

---

## PR 描述模板

<!-- CONTENT_START: mr_template -->
> 未检测到 PR 模板文件（无 `.github/PULL_REQUEST_TEMPLATE.md`、无 `.gitlab/`）。

**模板文件路径**：无（待建立）

> 💡 [PR 提交流程](../workflows/12-pull-request.md) 的 Step 3 会使用内置模板自动生成 PR 描述。
<!-- CONTENT_END: mr_template -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- 无 CODEOWNERS / PR 模板 / CI review 配置
- `README.md` / `README.zh-CN.md` — 项目背景
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: CODEOWNERS, .github/CODEOWNERS, docs/CODEOWNERS（提取各路径 Owner 列表）
  - 检查文件: .github/PULL_REQUEST_TEMPLATE.md, .github/pull_request_template.md
  - 检查文件: .github/workflows/*lint*, .github/workflows/*review*, .gitlab-ci.yml(lint/review job)
  - 检查文件: .pre-commit-config.yaml, lint-staged 配置（package.json 或 .lintstagedrc）
  - 检查文件: sonar-project.properties, .sonarcloud.properties
  - 检查文件: .danger.js, dangerfile.ts, reviewdog.yml
  - 检查文件: 分支保护规则相关配置（.gitlab 设置 / .github/branch-protection）
  - 提取信息: CODEOWNERS 规则（路径 → Owner 映射）, PR 模板内容
  - 提取信息: CI 自动化检查列表（工具名、触发时机、是否阻塞合并）
  - 提取信息: 审批规则（最少人数、必要评审人角色）
  - 注意: 本文档聚焦"规范配置"，不包含 PR 评审执行逻辑（见 12-pull-request.md Part 2）
-->
