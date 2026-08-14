<!-- TASK_ID: 20260815-electron-shell -->
<!-- TASK_TYPE: feature -->
<!-- STATUS: DONE -->
<!-- CREATED: 2026-08-15 -->
<!-- LAST_UPDATED: 2026-08-15 04:40 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: feature/electron-shell -->
<!-- RELATED_WORKFLOWS: 03,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_FEATURE / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# desktop surface 演进：`dsh --profile desktop` 拉起 Electron 窗口加载 DSH web

> 演进现有 `desktop` surface（src/index.js）：从「把 session 事件打成 JSONL 输出到 stdout」改为「dsh 启动后自动拉起一个 Electron 原生窗口，加载 DSH web 界面」，零定制复用。
>
> 📐 **章节结构（共 7 节）**：1 需求理解 → 2 影响范围 → 3 实施计划 → 4 关键决策 → 5 进度日志 → 6 风险与阻塞 → 7 **验收清单（最后一节）**

---

## 1. 需求理解

<!-- CONTENT_START: requirement -->
- **背景 / 起源**：DSH 已有完整 web 界面（`dsh web` 起 webserver + React 前端，默认 `http://127.0.0.1:3080`）。本项目（dsh-desktop）的 `desktop` surface 目前把 session 事件打成 JSONL 输出到 stdout；下一步演进为：`dsh --profile desktop` 启动后自动拉起原生 Electron 窗口，加载 DSH web 界面（「用户手动开浏览器」→「dsh 自动开原生窗口」）。
- **目标用户 / 调用方**：希望通过原生桌面窗口使用 DSH 的用户。
- **核心交付物**：`dsh --profile desktop` 命令（现有 profile）—— desktop surface 演进为「dsh 启动后拉起 Electron 窗口加载 `http://127.0.0.1:3080`」，零定制复用 DSH web 全部 UI（消息流 / reasoning / 工具卡 / 审批弹窗）。
- **不做范围（Out of Scope）**：不重写/定制 UI；不做「旁车进程 + 自定义 JSONL 渲染」（JSONL 协议保留不动）；不做 electron-builder 打包分发；不做原生菜单 / 多会话 / 托盘等。
- **验收标准**：① `dsh --profile desktop` 能启动 Electron 窗口；② 窗口加载的是 DSH web 界面且消息流 / reasoning / 工具卡可用；③ 关窗 / dsh 退出能正确清理（无孤儿进程）；④ 至少 Windows 验证通过。
- **关联资料**：`dsh --help`、`dsh web --help`、`dsh --profile web --dump-config`（web profile 结构）。
<!-- CONTENT_END: requirement -->

---

## 2. 影响范围分析

<!-- CONTENT_START: impact -->
- **涉及模块**：
  - dsh-desktop `desktop` surface（`src/index.js`，演进：新增「拉起 Electron 窗口」能力）
  - `~/.dsh/profiles/desktop`（现有 profile，可能需扩展以复用 web-app bundle）
  - `apps/electron/`（新增，Electron 主进程 main.js）
- **涉及文件 / 路径**：
  - `apps/electron/main.js`（新增，BrowserWindow 加载 web URL + 退出清理）
  - `apps/electron/package.json`（新增，electron devDependency + start 脚本）
  - dsh-desktop `src/index.js`（演进 desktop surface，拉起 Electron）
  - `~/.dsh/profiles/desktop/`（现有，可能调整 patch 以复用 web-app bundle）
- **涉及接口 / 数据结构**：desktop surface 演进（dsh 启动后 spawn Electron + 进程清理）
- **依赖的上下游**：`electron`（devDependency）；运行时依赖 DSH web-app bundle（起 webserver，机制在 Step 3.2 定）
- **数据库 / 配置 / 环境变量变更**：可能调整 profile 配置（`~/.dsh/profiles/desktop`）
- **兼容性影响**：JSONL 协议保留不动；纯增量演进，无破坏
<!-- CONTENT_END: impact -->

---

## 3. 实施计划（Step List）

<!-- CONTENT_START: steps -->
> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [x] 3.1 调研 DSH surface / profile 机制（`dsh --profile web --dump-config`、`dsh web --help`、现有 `src/index.js`，理解 web profile 组织 + surface 启动时机）
- [x] 3.2 设计 desktop surface 演进方案（如何复用 web-app 起 webserver + 何时拉起 Electron + 进程清理）
- [x] 3.3 搭建 `apps/electron/`（main.js：BrowserWindow 加载 URL + 退出清理）
- [x] 3.4 演进 desktop surface（dsh 启动后 spawn Electron 加载 web URL）
- [x] 3.5 调整 `~/.dsh/profiles/desktop`（复用 web-app bundle，机制按 3.2 定）
- [x] 3.6 本地验证：`dsh --profile desktop` 起窗 + 消息流可用 + 关窗无孤儿进程
- [x] 3.7 自检 + 代码 Review（参考 `workflows/08-code-review.md`）
- [x] 3.8 更新模块文档（新增 `modules/desktop-surface.md` 及 `modules/index.md`）
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
| 2 | 架构 | 新建 electron profile vs 演进 desktop surface | 演进 desktop surface（`dsh --profile desktop`） | 符合项目命名，dsh 是宿主 | 2026-08-15 |
| 3 | 加载方式 | URL 包装 vs 自定义 JSONL 渲染 | URL 包装（复用 dsh web） | 零定制，最薄 | 2026-08-15 |
| 4 | 打包 | 仅 dev vs electron-builder | 仅 dev | 先跑通壳，打包留后续 | 2026-08-15 |
<!-- CONTENT_END: decisions -->

---

## 5. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
> 只追加、不删改。每次会话开始与结束、每次完成步骤、每次遇到阻塞都追加一条。

- `2026-08-15 03:38` 创建任务，完成需求理解与用户对齐
- `2026-08-15 03:45` 用户修正：架构改为 dsh 是宿主、Electron 是 surface（非 Electron spawn dsh）
- `2026-08-15 03:50` 用户再修正：命名用 `desktop`（`dsh --profile desktop`，演进现有 desktop surface），非新建 electron profile
- `2026-08-15 04:10` Step 3.1/3.2 完成：确认 web profile = dsh-base + web-app；desktop surface 改为 `inject: ['webServer']`，服务就绪后拉起 Electron 加载 web URL
- `2026-08-15 04:40` Step 3.3~3.8 完成：Electron 窗口成功加载 DSH web（关 dsh 后自退出），lint/test/format 全绿，模块文档已建；关键坑：electron.exe 传 CLI 参数会崩（exit 0xFFFFFFFF），URL/父 PID 走环境变量
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
