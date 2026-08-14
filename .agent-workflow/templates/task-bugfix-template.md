<!-- TASK_ID: {YYYYMMDD-task-slug} -->
<!-- TASK_TYPE: bugfix -->
<!-- STATUS: PLANNING -->
<!-- CREATED: {YYYY-MM-DD} -->
<!-- LAST_UPDATED: {YYYY-MM-DD HH:MM} -->
<!-- OWNER: {负责人} -->
<!-- BRANCH: {bugfix/xxx} -->
<!-- SEVERITY: P0 | P1 | P2 | P3 -->
<!-- RELATED_WORKFLOWS: 07,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_BUGFIX / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# {Bug 标题}

> 一句话描述 Bug 现象。
>
> 📐 **章节结构（共 8 节）**：1 问题描述 → 2 复现步骤 → 3 根因分析 → 4 修复计划 → 5 关键决策 → 6 进度日志 → 7 风险与阻塞 → 8 **验收清单（最后一节）**

---

## 1. 问题描述

<!-- CONTENT_START: issue -->
- **现象**：{用户看到了什么错误}
- **预期行为**：{应该是什么样}
- **影响范围**：{影响的用户 / 场景 / 数据量}
- **严重等级**：P0（线上故障） / P1（核心阻塞） / P2（功能可用） / P3（体验问题）
- **首次发现**：{时间 + 渠道，如：监控告警 / 用户反馈 / 自测}
- **关联资料**：GitHub Issue / 告警链接 / 用户反馈截图
<!-- CONTENT_END: issue -->

---

## 2. 复现步骤

<!-- CONTENT_START: reproduce -->
> 如果不能稳定复现，必须在「进度日志」记录每一次尝试与结果。

**环境**：{环境 / 版本 / 数据条件}

**步骤**：
1. {步骤 1}
2. {步骤 2}
3. {步骤 3}

**实际结果**：{粘贴日志 / 错误堆栈 / 截图链接}

**复现率**：{100% / 偶现 概率：xx%}
<!-- CONTENT_END: reproduce -->

---

## 3. 根因分析（RCA）

<!-- CONTENT_START: rca -->
> 必须找到代码层面的根因，禁止"治标不治本"。

- **直接原因**：{出错的那行代码 / 配置}
- **底层原因**：{为什么会写成这样，是设计缺陷还是边界场景遗漏}
- **触发条件**：{什么条件下才会被触发}
- **类似风险点**：{其他地方是否有同类问题}
- **影响数据**：{是否产生脏数据、是否需要数据修复}
<!-- CONTENT_END: rca -->

---

## 4. 修复计划（Step List）

<!-- CONTENT_START: steps -->
> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [ ] 4.1 在本地稳定复现（参考 `workflows/07-bug-fixing.md`）
- [ ] 4.2 定位根因，确认修复方案
- [ ] 4.3 实施代码修复
- [ ] 4.4 添加回归测试用例（必须能在修复前失败、修复后通过）
- [ ] 4.5 本地编译通过（参考 `workflows/04-build-process.md`）
- [ ] 4.6 本地完整测试通过（参考 `workflows/05-testing-process.md`）
- [ ] 4.7 同类风险点排查与修复
- [ ] 4.8 数据修复（如需）
- [ ] 4.9 更新模块文档（如涉及模块变更，同步更新 `modules/<name>.md` 及 `modules/index.md`）
- [ ] 4.10 完成归档动作（参考 AGENTS.md「Step 4」）
  - [ ] `STATUS` 改为 `DONE`，更新 `LAST_UPDATED`
  - [ ] 「验收清单」预声明勾选「PR 已合入目标分支」「任务文件已归档」
  - [ ] 任务文件 `git mv` 到 `_archive/<YYYY-MM>/`
- [ ] 4.11 提交分支（归档动作与代码主体一同 commit + push，参考 `workflows/11-branch-commit.md`）
- [ ] 4.12 创建 PR（参考 `workflows/12-pull-request.md`）
- [ ] 4.13 CI 通过 + PR 合入主干（参考 `workflows/13-ci-cd-pipeline.md`；若 PR 被打回，按 AGENTS.md「Step 4」回滚机制恢复 STATUS 与文件位置）
<!-- CONTENT_END: steps -->

---

## 5. 关键决策记录

<!-- CONTENT_START: decisions -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；记录实际决策时**追加新行**，不要覆写占位行。

| # | 决策点 | 选项 | 选择 | 原因 | 时间 |
|:-:|-------|-----|-----|-----|------|
| 1 | - | - | - | - | - |
<!-- CONTENT_END: decisions -->

---

## 6. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
- `{YYYY-MM-DD HH:MM}` 创建任务，记录初始现象
<!-- CONTENT_END: log -->

---

## 7. 风险与阻塞

<!-- CONTENT_START: risks -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；遇到阻塞时**追加新行**，不要覆写占位行。
>
> 「状态」列标准词汇：`跟进中`（阻塞中，待解除）/ `已解除`（阻塞已解除，记录留档）。

| 风险 / 阻塞点 | 影响 | 应对方案 | 状态 |
|-------------|-----|--------|------|
| - | - | - | - |
<!-- CONTENT_END: risks -->

---

## 8. 验收清单

<!-- CONTENT_START: acceptance -->
- [ ] 在原复现环境下问题不再出现
- [ ] 回归测试用例已加入并通过
- [ ] 同类风险点已排查与修复
- [ ] 脏数据已修复（如有）
- [ ] 监控 / 告警已恢复正常
- [ ] 模块文档已更新（如涉及模块变更：`modules/<name>.md` + `modules/index.md` 均已同步）
- [ ] PR 已合入目标分支
- [ ] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`
<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - P0 / P1 必须在「进度日志」中维护"分钟级"更新，便于跨人协作
  - 修复前必须先复现，复现不出来时不要盲目改代码
  - 回归测试用例必须能在"修复前失败、修复后通过"，否则不算闭环
-->
