<!-- TASK_ID: 20260912-dsh-desktop-profile-rename -->
<!-- TASK_TYPE: refactor -->
<!-- STATUS: DONE -->
<!-- CREATED: 2026-09-12 -->
<!-- LAST_UPDATED: 2026-09-12 09:45 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: refactor/dsh-desktop-profile-rename -->
<!-- RELATED_WORKFLOWS: 10,08,04,05,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_REFACTOR / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# 将桌面 profile 从保留名 desktop 迁移到 dsh-desktop

> DSH 0.1.5 起把 `desktop` profile 名称保留给官方 Electron 应用，CLI 会拒绝启动、dump 和插件管理；本项目改用非保留 profile 名 `dsh-desktop`，同步文档并基于 DSH 0.1.5 重新安装验证。

---

## 1. 重构目标

<!-- CONTENT_START: goal -->
- **痛点 / 现状问题**：全局 DSH 已升级到 `0.1.5-rc.1`，`dsh --profile desktop` / `dsh plugin --profile desktop` 被新版 CLI 拒绝，现有 dsh-desktop 安装无法启动。
- **目标**：将用户侧 profile 名称迁移为 `dsh-desktop`；更新所有当前有效文档与示例；在 DSH 0.1.5 下创建新 profile、安装 dsh-desktop 并验证启动链路。
- **不改动的边界**：不修改 dsh-desktop 的插件名、模块名、`dsh-desktop://` 协议名、已有历史任务归档；不删除旧的 `desktop` profile（仅停止使用），不处理第三方 `dsh-mode-boost`。
- **回滚预案**：旧 `desktop` profile 原样保留；如新 profile 验证失败，可回滚 DSH 到 `0.1.2-rc.1` 并继续使用旧 profile。
- **关联资料**：`.agent-workflow/modules/desktop-surface.md`、DSH 0.1.5 `@deepseek-ai/dsh` README、官方 `apps/desktop` 的 profile 归属说明。
<!-- CONTENT_END: goal -->

---

## 2. 影响范围分析

<!-- CONTENT_START: impact -->
- **改造模块**（参考 `modules/`）：`desktop-surface` — 用户启动入口从 `desktop` 改为 `dsh-desktop`
- **涉及文件 / 路径**：
  - `README.md`、`README.zh-CN.md`
  - `.agent-workflow/modules/desktop-surface.md`、`.agent-workflow/modules/index.md`
  - `.agent-workflow/workflows/03-development-workflow.md`、`.agent-workflow/workflows/07-bug-fixing.md`
  - 用户 profile：`C:\Users\IriskaDev\.dsh\profiles\dsh-desktop`
- **接口契约变化**：插件代码与 DSH 接口不变；用户启动命令与 profile 路径变化
- **数据库 / 数据结构变化**：无；DSH 的会话/设置/凭据/工作区仍共享 `$DSH_HOME` 数据
- **下游调用方影响**：文档读者和本机 desktop profile；旧 `desktop` profile 保留不再使用
- **配置 / 部署变化**：新增 `dsh-desktop` profile，不修改官方 `desktop` profile
<!-- CONTENT_END: impact -->

---

## 3. 实施计划（Step List）

<!-- CONTENT_START: steps -->
> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [x] 3.1 确认 DSH 0.1.5 的 `desktop` 保留行为并记录基线
- [x] 3.2 更新 README 中英文的 profile 名称、安装/启动命令和版本说明
- [x] 3.3 更新模块台账与当前开发/排查流程文档中的 profile 示例
- [x] 3.4 基于 web 模板创建新的 `dsh-desktop` profile
- [x] 3.5 通过 `dsh plugin --profile dsh-desktop add` 重新安装 dsh-desktop
- [x] 3.6 在 DSH 0.1.5 下验证新 profile 启动 Electron 窗口与核心链路
- [x] 3.7 运行 `npm test` / `npm run lint` / 改动文件 Prettier / `git diff --check`
- [x] 3.8 完成归档动作（参考 AGENTS.md「Step 4」）
  - [x] `STATUS` 改为 `DONE`，更新 `LAST_UPDATED`
  - [x] 「验收清单」预声明勾选「PR 已合入目标分支」「任务文件已归档」
  - [x] 任务文件移动到 `_archive/2026-09/`
- [x] 3.9 提交分支并推送（参考 `workflows/11-branch-commit.md`）
- [x] 3.10 创建 PR 并通过 CI 合入 `main`（参考 `workflows/12-pull-request.md`、`workflows/13-ci-cd-pipeline.md`）
<!-- CONTENT_END: steps -->

---

## 4. 关键决策记录

<!-- CONTENT_START: decisions -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；记录实际决策时**追加新行**，不要覆写占位行。

| # | 决策点 | 选项 | 选择 | 原因 | 时间 |
|:-:|-------|-----|-----|-----|------|
| 1 | 新 profile 名称 | `dsh-desktop` / 其他自定义名 | `dsh-desktop` | 与仓库名一致、可读，且不占用官方保留的 `desktop` | 2026-09-12 09:05 |
| 2 | 旧 desktop profile | 删除 / 保留 | 保留 | 官方桌面未公开可用，保留可回滚依据 | 2026-09-12 09:05 |
| 3 | 第三方插件 | 一并迁移 / 不迁移 | 不迁移 | `dsh-mode-boost` 未适配新版，且不属于本仓库 | 2026-09-12 09:05 |
| - | - | - | - | - | - |
<!-- CONTENT_END: decisions -->

---

## 5. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
- `2026-09-12 09:05` 创建任务：DSH 0.1.5 保留 `desktop` profile 名称；用户确认改用 `dsh-desktop` 并重新安装插件。
- `2026-09-12 09:08` 完成 README / 模块台账 / 开发与排查流程文档的 profile 名称迁移；新的 `dsh-desktop` profile 已从 web 模板初始化，并通过 `dsh plugin --profile dsh-desktop add` 安装 `dsh-desktop`。
- `2026-09-12 09:10` DSH 0.1.5 首轮启动报 `client-modules: cannot get property "webServer" without inject`；在 `cordis.patch.yml` 中为 `modules` 声明 `inject: [webServer]`，让 loader 等待 desktop 的非监听 webServer 服务。
- `2026-09-12 09:12` 修复后窗口可正常出现；用户反馈历史加载报 `api gateway: Remote stream WebSocket closed（gateway/internal）`。定位到 preload 把单个逻辑流的 end/error 当成物理 WebSocket 关闭，已改为按 mux 语义转发 `item/error/end` 并保持物理 socket 打开，重新启动等待验证。
- `2026-09-12 09:16` 复现日志确认 mux 修复生效；历史加载的根因收敛为 DSH 0.1.5 对旧会话的 v2→v3 迁移失败：`cannot safely transform unclassified message source`，目标会话为 `session-9e7d4e51-346d-4f14-86e9-e44769591da5`，不是 dsh-desktop 事件桥问题。干净实例已重新启动，待用户用“新会话”验证新版会话链路。
- `2026-09-12 09:38` `dsh-global-memory` 0.0.4 实现并合并自动迁移：插件启动时、会话打开前扫描旧会话，将本插件写出的 `memory-index` source 规范化为 `plugin`，修改前逐文件备份，完成后写 marker。真机自动迁移 13 个会话文件、26 条 source，旧会话历史可正常加载。
- `2026-09-12 09:45` DSH 0.1.5 profile 迁移与启动链路验证完成；`npm test` 22/22、lint、改动文件 Prettier、`git diff --check` 均通过。同步修复 `.agent-presets` 中三个 preset 的 `dsh-persona` 旧 `text` 字段为 `prefix`，旧会话切模型不再因 preset 挂载失败中断。
- `2026-09-12 09:45` 任务归档：代码、模块台账、流程文档与归档任务文件即将随同一次提交推送并创建 PR。
<!-- CONTENT_END: log -->

---

## 6. 风险与阻塞

<!-- CONTENT_START: risks -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；遇到阻塞时**追加新行**，不要覆写占位行。
>
> 「状态」列标准词汇：`跟进中`（阻塞中，待解除）/ `已解除`（阻塞已解除，记录留档）。

| 风险 / 阻塞点 | 影响 | 应对方案 | 状态 |
|-------------|-----|--------|------|
| DSH 0.1.5 可能同时引入 Remote API 进一步变更 | 新 profile 安装后仍可能无法启动 | 已修复 `client-modules` 的 `webServer` 注入顺序；窗口与新 profile 启动验证通过 | 已解除 |
| DSH 0.1.5 旧会话 v2→v3 迁移拒绝未知 message source | 旧会话历史加载失败（当前选中会话已复现） | `dsh-global-memory` 0.0.4 已在插件启动时自动规范化历史 `memory-index` source，逐文件备份并验证旧会话可加载 | 已解除 |
| 旧 `desktop` profile 与官方 Electron 冲突 | 误用旧命令时启动失败 | 全部当前文档改用 `dsh-desktop`；旧 profile 仅保留作回滚 | 已解除 |
| 第三方 `dsh-mode-boost` 与新 profile 不兼容 | 新 profile 首轮对话可能失败 | 新 profile 不安装该插件；保持本仓库职责边界 | 已解除 |
<!-- CONTENT_END: risks -->

---

## 7. 指标对比

<!-- CONTENT_START: metrics -->
| 指标 | 重构前 | 重构后 | 变化 |
|-----|------|------|------|
| 可用启动命令 | `dsh --profile desktop`（0.1.5 被拒绝） | `dsh --profile dsh-desktop` | ✅ |
| profile 路径 | `~/.dsh/profiles/desktop`（官方保留） | `~/.dsh/profiles/dsh-desktop` | ✅ |
| 插件运行验证 | 无法验证 | 新 profile 窗口、旧会话历史与事件链路正常 | ✅ |
| 单元测试 | 22/22 | 22/22 | 无回退 |
<!-- CONTENT_END: metrics -->

---

## 8. 验收清单

<!-- CONTENT_START: acceptance -->
- [x] 当前有效文档不再把 `desktop` 作为本项目启动 profile
- [x] `dsh-desktop` profile 在 DSH 0.1.5 下创建成功
- [x] dsh-desktop 插件在新 profile 中安装成功
- [x] 新 profile 启动验证完成（窗口/核心链路）
- [x] 全量测试、lint、格式检查通过
- [x] 旧 `desktop` profile 未被破坏
- [x] PR 已合入目标分支
- [x] 任务文件已从 `_active/` 移入 `_archive/2026-09/`
<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - 重构必须"小步快跑"，每个阶段都能独立合入，禁止"大爆炸式"重写
  - 必须先建立测试安全网再动重构，否则禁止开工
  - 必须有可量化的前后对比指标
-->
