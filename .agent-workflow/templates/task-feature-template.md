<!-- TASK_ID: {YYYYMMDD-task-slug} -->
<!-- TASK_TYPE: feature -->
<!-- STATUS: PLANNING -->
<!-- CREATED: {YYYY-MM-DD} -->
<!-- LAST_UPDATED: {YYYY-MM-DD HH:MM} -->
<!-- OWNER: {负责人} -->
<!-- BRANCH: {feature/xxx} -->
<!-- RELATED_WORKFLOWS: 03,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_FEATURE / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# {任务标题}

> 一句话描述本次要交付什么功能。
>
> 📐 **章节结构（共 7 节）**：1 需求理解 → 2 影响范围 → 3 实施计划 → 4 关键决策 → 5 进度日志 → 6 风险与阻塞 → 7 **验收清单（最后一节）**

---

## 1. 需求理解

<!-- CONTENT_START: requirement -->
> 由 Agent 在「接到任务」阶段填写，与用户对齐目标。

- **背景 / 起源**：{为什么要做这件事}
- **目标用户 / 调用方**：{谁会用到}
- **核心交付物**：{接口、页面、能力清单}
- **不做范围（Out of Scope）**：{明确不做什么，避免范围蔓延}
- **验收标准**：{可量化的完成定义}
- **关联资料**：GitHub Issue / 工单 / 设计稿 / 群消息链接
<!-- CONTENT_END: requirement -->

---

## 2. 影响范围分析

<!-- CONTENT_START: impact -->
> 在动手前必须填写完整，便于 Agent 中断恢复时快速重建上下文。

- **涉及模块**（参考 `modules/`）：
  - `{module-a}` — {如何变更}
  - `{module-b}` — {如何变更}
- **涉及文件 / 路径**：
  - `path/to/file1.ts`
  - `path/to/file2.go`
- **涉及接口 / 数据结构**：{新增 / 修改 / 删除}
- **依赖的上下游**：{其它服务、第三方库}
- **数据库 / 配置 / 环境变量变更**：{如有}
- **兼容性影响**：{是否破坏现有调用方}
<!-- CONTENT_END: impact -->

---

## 3. 实施计划（Step List）

<!-- CONTENT_START: steps -->
> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [ ] 3.1 阅读现有相关代码（参考 `modules/` 与 `workflows/03-development-workflow.md`）
- [ ] 3.2 设计方案 / 数据结构 / 接口定义
- [ ] 3.3 实现核心逻辑
- [ ] 3.4 单元测试覆盖
- [ ] 3.5 本地编译通过（参考 `workflows/04-build-process.md`）
- [ ] 3.6 本地测试通过（参考 `workflows/05-testing-process.md`）
- [ ] 3.7 自检 + 代码 Review（参考 `workflows/08-code-review.md`）
- [ ] 3.8 更新模块文档（如涉及模块变更，同步更新 `modules/<name>.md` 及 `modules/index.md`）
- [ ] 3.9 完成归档动作（参考 AGENTS.md「Step 4」）
  - [ ] `STATUS` 改为 `DONE`，更新 `LAST_UPDATED`
  - [ ] 「验收清单」预声明勾选「PR 已合入目标分支」「任务文件已归档」
  - [ ] 任务文件 `git mv` 到 `_archive/<YYYY-MM>/`
- [ ] 3.10 提交分支（归档动作与代码主体一同 commit + push，参考 `workflows/11-branch-commit.md`）
- [ ] 3.11 创建 PR（参考 `workflows/12-pull-request.md`）
- [ ] 3.12 CI 通过 + PR 合入主干（参考 `workflows/13-ci-cd-pipeline.md`；若 PR 被打回，按 AGENTS.md「Step 4」回滚机制恢复 STATUS 与文件位置）
<!-- CONTENT_END: steps -->

---

## 4. 关键决策记录

<!-- CONTENT_START: decisions -->
> 凡是有 A / B 取舍的，必须记录"选了什么、为什么"，避免后续重复讨论。
>
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；Step 2 记录实际决策时**追加新行**，不要覆写占位行。

| # | 决策点 | 选项 | 选择 | 原因 | 时间 |
|:-:|-------|-----|-----|-----|------|
| 1 | - | - | - | - | - |
<!-- CONTENT_END: decisions -->

---

## 5. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
> 只追加、不删改。每次会话开始与结束、每次完成步骤、每次遇到阻塞都追加一条。

- `{YYYY-MM-DD HH:MM}` 创建任务，完成需求理解
<!-- CONTENT_END: log -->

---

## 6. 风险与阻塞

<!-- CONTENT_START: risks -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；遇到阻塞时**追加新行**，不要覆写占位行。
>
> 「状态」列标准词汇：`跟进中`（阻塞中，待解除）/ `已解除`（阻塞已解除，记录留档）。

| 风险 / 阻塞点 | 影响 | 应对方案 | 状态 |
|-------------|-----|--------|------|
| - | - | - | - |
<!-- CONTENT_END: risks -->

---

## 7. 验收清单

<!-- CONTENT_START: acceptance -->
- [ ] 所有 Step 已勾选完成
- [ ] 单元测试 / 集成测试通过
- [ ] 编译无 warning，linter 通过
- [ ] 自测覆盖核心路径与边界场景
- [ ] 模块文档已更新（如涉及模块变更：`modules/<name>.md` + `modules/index.md` 均已同步）
- [ ] 接口文档 / CHANGELOG 已更新（如有对外接口变更）
- [ ] PR 已合入目标分支
- [ ] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`
<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - 每完成一个 Step 必须：勾选 checkbox + 追加进度日志 + 更新 LAST_UPDATED
  - 任何阻塞必须把 STATUS 改为 BLOCKED 并在「风险与阻塞」记录原因
  - 中断恢复时：先读元数据 → 再读 Step List 找首个未勾选项 → 再读最近 3 条进度日志
-->
