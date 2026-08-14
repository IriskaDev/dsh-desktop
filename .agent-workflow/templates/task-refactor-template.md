<!-- TASK_ID: {YYYYMMDD-task-slug} -->
<!-- TASK_TYPE: refactor -->
<!-- STATUS: PLANNING -->
<!-- CREATED: {YYYY-MM-DD} -->
<!-- LAST_UPDATED: {YYYY-MM-DD HH:MM} -->
<!-- OWNER: {负责人} -->
<!-- BRANCH: {refactor/xxx} -->
<!-- RELATED_WORKFLOWS: 10,08,04,05,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_REFACTOR / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# {重构任务标题}

> 一句话说明本次重构改造什么、要达到什么目标。
>
> 📐 **章节结构（共 8 节）**：1 重构目标 → 2 影响范围 → 3 实施计划 → 4 关键决策 → 5 进度日志 → 6 风险与阻塞 → 7 指标对比 → 8 **验收清单（最后一节）**

---

## 1. 重构目标

<!-- CONTENT_START: goal -->
> 重构必须有明确的可衡量目标，否则禁止开工。

- **痛点 / 现状问题**：{当前代码在什么场景下成为瓶颈}
- **目标**：{可衡量的改进，如：圈复杂度降到 ≤10、接口耗时 P99 < 200ms}
- **不改动的边界**：{对外行为 / 接口契约 / 数据库结构 是否保持不变}
- **回滚预案**：{如何快速回退}
- **关联资料**：技术评审文档 / 性能报告 / 架构图链接
<!-- CONTENT_END: goal -->

---

## 2. 影响范围分析

<!-- CONTENT_START: impact -->
> 重构通常牵一发动全身，影响范围必须梳理详尽。

- **改造模块**（参考 `modules/`）：
  - `{module-a}` — {改造点}
- **涉及文件 / 路径**：
- **接口契约变化**：{无变化 / 内部签名变化 / 对外契约变化}
- **数据库 / 数据结构变化**：{无 / Schema 变更 / 需要数据迁移}
- **下游调用方影响**：{需要联动改造的服务 / 模块清单}
- **配置 / 部署变化**：{是否需要新增环境变量、是否需要灰度}
<!-- CONTENT_END: impact -->

---

## 3. 实施计划（Step List）

<!-- CONTENT_START: steps -->
> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [ ] 3.1 现状分析与基线指标采集（参考 `workflows/10-code-optimization.md`）
- [ ] 3.2 设计目标架构 / 接口 / 数据结构
- [ ] 3.3 编写 / 补充测试用例（建立"行为不变"的安全网）
- [ ] 3.4 小步重构：第一阶段（{描述阶段范围}）
- [ ] 3.5 小步重构：第二阶段（{描述阶段范围}）
- [ ] 3.6 联动下游调用方
- [ ] 3.7 性能 / 复杂度对比验证（输出对比报告）
- [ ] 3.8 本地编译通过（参考 `workflows/04-build-process.md`）
- [ ] 3.9 全量测试通过（参考 `workflows/05-testing-process.md`）
- [ ] 3.10 代码 Review（参考 `workflows/08-code-review.md`）
- [ ] 3.11 完成归档动作（参考 AGENTS.md「Step 4」）
  - [ ] `STATUS` 改为 `DONE`，更新 `LAST_UPDATED`
  - [ ] 「验收清单」预声明勾选「PR 已合入目标分支」「任务文件已归档」
  - [ ] 任务文件 `git mv` 到 `_archive/<YYYY-MM>/`
- [ ] 3.12 提交分支（归档动作与代码主体一同 commit + push，参考 `workflows/11-branch-commit.md`）
- [ ] 3.13 创建 PR（参考 `workflows/12-pull-request.md`）
- [ ] 3.14 CI 通过 + PR 合入主干 + 灰度 / 全量上线（参考 `workflows/13-ci-cd-pipeline.md`；若 PR 被打回，按 AGENTS.md「Step 4」回滚机制恢复 STATUS 与文件位置）
<!-- CONTENT_END: steps -->

---

## 4. 关键决策记录

<!-- CONTENT_START: decisions -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；记录实际决策时**追加新行**，不要覆写占位行。

| # | 决策点 | 选项 | 选择 | 原因 | 时间 |
|:-:|-------|-----|-----|-----|------|
| 1 | - | - | - | - | - |
<!-- CONTENT_END: decisions -->

---

## 5. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
- `{YYYY-MM-DD HH:MM}` 创建任务，完成目标设定
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

## 7. 指标对比

<!-- CONTENT_START: metrics -->
> 重构必须有"前后对比"，否则无法证明价值。

| 指标 | 重构前 | 重构后 | 变化 |
|-----|------|------|------|
| 接口 P99 耗时 | - | - | - |
| 圈复杂度 | - | - | - |
| 代码行数 | - | - | - |
| 单元测试覆盖率 | - | - | - |
<!-- CONTENT_END: metrics -->

---

## 8. 验收清单

<!-- CONTENT_START: acceptance -->
- [ ] 全部测试通过（行为契约不变）
- [ ] 关键指标达成目标
- [ ] 下游调用方无回归
- [ ] 灰度 / 上线无异常告警
- [ ] 旧代码已清理（无僵尸分支 / TODO 残留）
- [ ] PR 已合入目标分支
- [ ] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`
<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - 重构必须"小步快跑"，每个阶段都能独立合入，禁止"大爆炸式"重写
  - 必须先建立测试安全网再动重构，否则禁止开工
  - 必须有可量化的前后对比指标
-->
