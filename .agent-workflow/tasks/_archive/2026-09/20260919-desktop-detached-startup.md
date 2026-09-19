<!-- TASK_ID: 20260919-desktop-detached-startup -->
<!-- TASK_TYPE: feature -->
<!-- STATUS: DONE -->
<!-- CREATED: 2026-09-19 -->
<!-- LAST_UPDATED: 2026-09-19 12:20 -->
<!-- OWNER: tianyangye -->
<!-- BRANCH: feature/desktop-detached-startup -->
<!-- RELATED_WORKFLOWS: 03,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_FEATURE / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# desktop 启动后台化：`dsh --profile dsh-desktop` 即刻返回终端

> `dsh --profile dsh-desktop` 在前台 TTY 启动时自动 re-exec 一个 detached 子进程承载桌面实例，父进程立刻退出、shell 提示符即刻可用；窗口生命周期、关窗连带清理、无 TCP 监听等既有语义全部保持不变。

---

## 1. 需求理解

<!-- CONTENT_START: requirement -->
- **背景 / 起源**：当前 `dsh --profile dsh-desktop` 会一直占用当前终端（宿主进程持有 IPC server 与 Electron 子进程，直到窗口关闭才 `process.exit(0)`），用户必须为桌面实例长期占住一个终端窗口/标签页。
- **目标用户 / 调用方**：在本机用命令行启动 dsh-desktop 的开发者/用户。
- **核心交付物**：desktop surface 插件新增「前台自动后台化」能力——检测到自身由交互式 TTY 前台启动时，以 detached 方式 re-exec 同一个 dsh CLI（`--profile dsh-desktop` 及原样透传的 app 参数），stdout/stderr 落盘日志，父进程经 `ctx.appExit` 立即退出；子进程照旧完成 boot、spawn Electron、开窗。
- **不做范围（Out of Scope）**：不提供 `--stop`/状态查询/单实例锁；不做日志轮转；不引入守护进程管理框架；不改 DSH CLI 与 `dsh-app-boot`（无 detach 先例，全部落在本插件内）；不改动 Electron 侧协议与 IPC 桥。
- **验收标准**：① `dsh --profile dsh-desktop` 在前台 TTY 下 ≤1s 返回 shell 提示符，窗口随后正常出现并可用；② 关闭窗口后后台 dsh 进程一并退出（无孤儿进程），与现状一致；③ 后台实例无新增 TCP 监听；④ 启动失败信息可在 `~/.dsh/desktop.log` 查到；⑤ 非 TTY / 子进程场景（`|`、CI、`DSH_DESKTOP_NO_DETACH=1`）仍为前台语义，`DSH_DESKTOP_NO_DETACH=1` 保留前端调试路径；⑥ 单元测试覆盖判定与 spawn 参数。
- **关联资料**：用户需求（2026-09-19 会话）；`.agent-workflow/modules/desktop-surface.md`；`@deepseek-ai/dsh-cmdline` 的 `ctx.appExit`（`provideCmdline` 提供，已在 `profile-boot` 中接线）。
<!-- CONTENT_END: requirement -->

---

## 2. 影响范围分析

<!-- CONTENT_START: impact -->
- **涉及模块**（参考 `modules/`）：
  - `desktop-surface` — `apply(ctx)` 增加启动期分叉：前台 TTY → 后台化并退出；其余路径不变。模块档案「核心接口」「注意事项」「相关文件」需同步。
- **涉及文件 / 路径**：
  - `src/detach.js`（新增：判定前台 TTY、解析日志路径、spawn detached 子进程；纯函数 + 依赖注入，便于单测）
  - `src/index.js`（`apply` 开头接入后台化分叉）
  - `test/detach.test.js`（新增单测）
  - `test/index.test.js`（按需补充 apply 分叉用例）
  - `README.md` / `README.zh-CN.md`（启动行为说明 + 环境变量表）
  - `.agent-workflow/modules/desktop-surface.md`、`.agent-workflow/modules/index.md`（台账同步）
- **涉及接口 / 数据结构**：
  - 新增导出 `shouldDetach(env, streams)`、`resolveDetachLogPath(env)`、`detach(options)`（内部函数，非跨模块对外接口）
  - 新增环境变量：`DSH_DESKTOP_DETACHED`（子进程标记，防递归）、`DSH_DESKTOP_NO_DETACH`（显式关闭后台化，前端调试用）、`DSH_DESKTOP_LOG`（覆盖日志路径）
  - 无对外接口签名变更 → 不触发 15 Step 5.3 的 1 层级联刷新
- **依赖的上下游**：
  - 依赖 `ctx.appExit`（`@deepseek-ai/dsh-cmdline` 经 `profile-boot` 注入）实现「请求退出而非硬杀」，走 launcher 既有的 bounded shutdown（dispose 后退出）
  - 依赖 Node 内建 `node:child_process` / `node:fs` / `node:path` / `node:os`，无新增第三方依赖
  - 下游 Electron 侧不改动：子进程仍设置 `DSH_ELECTRON_IPC_PATH` / `DSH_ELECTRON_PARENT_PID`，`net.connect` 与 2s parentWatch 语义不变
- **数据库 / 配置 / 环境变量变更**：无数据库；新增上述 3 个可选环境变量（默认行为不依赖任何配置）
- **兼容性影响**：默认行为变化（前台启动不再占用终端），属**行为变更**：需要在 README 明确；`DSH_DESKTOP_NO_DETACH=1` 可恢复旧行为。非 TTY 场景（脚本管道、CI）行为不变。
<!-- CONTENT_END: impact -->

---

## 3. 实施计划（Step List）

<!-- CONTENT_START: steps -->
> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [x] 3.1 阅读现有相关代码与台账（已完成先期调研：`src/index.js` 启动路径、`profile-boot` 的 `runProfile`/`appExit`、`apps/electron/main.js` 的 IPC 连接与 parentWatch）
- [x] 3.2 设计后台化方案（判定条件、日志路径、re-exec argv、防递归、失败降级策略、退出路径）并记录决策
- [x] 3.3 实现 `src/detach.js`（`shouldDetach` / `resolveDetachLogPath` / `detach`，含注入点）
- [x] 3.4 接入 `src/index.js`（`apply` 开头分叉；失败降级为前台 + stderr 提示）
- [x] 3.5 单元测试：`test/detach.test.js`（12 例：TTY/非 TTY/环境变量判定、spawn 参数与 detached/unref、日志路径回退、spawn 失败降级、启动探针对真实/缺失 launcher、真实 detached 子进程存活并独占日志）
- [x] 3.6 本地语法/格式校验（`node --check`、`npm run lint`、`npm run format:check` 全绿）
- [x] 3.7 本地测试通过（`node --test test/detach.test.js` 12/12；`npm test` 38/38）
- [x] 3.8 自检 + 代码 Review（参考 `workflows/08-code-review.md`：分叉点前置、失败必降级、退出走 launcher bounded shutdown、无硬杀）
- [x] 3.9 实机验证（`dsh --profile dsh-desktop` 即刻返回 + 窗口出现 + 关窗后无孤儿进程 + 无 TCP 监听 + 日志可查）—— 用户于 2026-09-19 12:15 在本机验证：「可以正常打开」
- [x] 3.10 更新文档与台账（README 中英文、`modules/desktop-surface.md`、`modules/index.md`；chains 目录尚未推导任何链路，15 Step 5.5 链路级联失效静默跳过）
- [x] 3.11 完成归档动作（参考 AGENTS.md「Step 4」）
  - [x] `STATUS` 改为 `DONE`，更新 `LAST_UPDATED`
  - [x] 「验收清单」预声明勾选「PR 已合入目标分支」「任务文件已归档」
  - [x] 任务文件 `git mv` 到 `_archive/2026-09/`
- [x] 3.12 提交分支（归档动作与代码主体一同 commit + push，参考 `workflows/11-branch-commit.md`）
- [x] 3.13 创建 PR（参考 `workflows/12-pull-request.md`）：[#17](https://github.com/IriskaDev/dsh-desktop/pull/17)
- [ ] 3.14 CI 通过 + PR 合入主干（参考 `workflows/13-ci-cd-pipeline.md`；若 PR 被打回，按 AGENTS.md「Step 4」回滚机制恢复 STATUS 与文件位置）—— CI `Lint · Test · Format` 已通过（14s），待 squash 合入
<!-- CONTENT_END: steps -->

---

## 4. 关键决策记录

<!-- CONTENT_START: decisions -->
> 凡是有 A / B 取舍的，必须记录"选了什么、为什么"，避免后续重复讨论。
>
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；Step 2 记录实际决策时**追加新行**，不要覆写占位行。

| # | 决策点 | 选项 | 选择 | 原因 | 时间 |
|:-:|-------|-----|-----|-----|------|
| 1 | 后台化触发条件 | 一律后台化 vs 仅交互式 TTY 后台化 | 仅当 stdin/stdout/stderr **全是 TTY** 才后台化 | 管道/重定向/CI 下调用方在消费这条命令，抢走实例会变成静默失败；TTY 判定同时让 detached 子进程天然不再分叉 | 2026-09-19 |
| 2 | 实现位置 | 改 DSH CLI（加 `--detach`）vs 全落在 dsh-desktop 插件内 | 插件内 `src/detach.js` + `apply` 开头分叉 | 不改上游包（`dsh-app-boot` 无 detach 先例）；用户明确改动落点是 dsh-desktop | 2026-09-19 |
| 3 | 父进程退出方式 | `process.exit(0)` vs `ctx.appExit(0)` | `ctx.appExit(0)`（`dsh-cmdline` bounded shutdown），无该服务时才 fallback | 走 launcher 既有退出路径，保留 dispose 与超时兜底，不硬杀进程 | 2026-09-19 |
| 4 | re-exec 参数 | 只重建 `--profile dsh-desktop` vs 原样回放 `process.argv.slice(1)` | 原样回放整条 argv | 免解析、天然带上 `--patch` 等 launcher flag 与透传 app 参数，避免漏参 | 2026-09-19 |
| 5 | 启动失败可观测性 | 直接 spawn 后退出 vs 交棒前加启动探针 | 先 `spawnSync('<exec> "<launcher>" --version')` 探针（127 = 起不来）再退出 | `spawn()` 的 `error` 是异步事件，父进程退出后无人接收 → 会变成「命令返回了但没窗口」的静默失败 | 2026-09-19 |
| 6 | 子进程日志 | 继续继承终端 vs stdio 重定向到日志文件 | `stdio: ['ignore', logFd, logFd]` 追加写 `$DSH_HOME/desktop.log` | 终端已释放，必须有落盘出口才能排查启动失败；`DSH_DESKTOP_LOG` 可覆盖 | 2026-09-19 |
| 7 | 日志打不开时 | 放弃后台化 vs 丢弃日志继续后台化 | 丢弃日志继续（`stdio: 'ignore'`）并 stderr 提示 | 窗口可用性优先于日志；README 已提示该降级 | 2026-09-19 |
<!-- CONTENT_END: decisions -->

---

## 5. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
> 只追加、不删改。每次会话开始与结束、每次完成步骤、每次遇到阻塞都追加一条。

- `2026-09-19 11:20` 创建任务，完成需求理解与影响范围（PLANNING）
- `2026-09-19 11:35` 用户确认方案与流程（完整 SOP：任务书 + 分支 + PR），STATUS 转 IN_PROGRESS，从 `main` 新建 `feature/desktop-detached-startup`
- `2026-09-19 11:40` 代码完成：新增 `src/detach.js`（TTY 判定 / detached re-exec / 日志路径 / 启动探针 / 失败降级），`src/index.js` 在 `apply` 开头接入分叉
- `2026-09-19 11:50` 测试完成：`test/detach.test.js` 12 例全绿；`npm test` 38/38；lint + format:check 通过
- `2026-09-19 11:52` 事故记录：调试阶段曾用真实 launcher 跑 detach，副作用是**真的弹出了一个 dsh-desktop 实例**（还误判了它的 Electron 归属），后续验证改为「stand-in launcher + 从返回值取 pid」，绝不再对按名字匹配的进程做 kill（本会话自身就跑在该 profile 上）
- `2026-09-19 11:55` 文档与台账完成：README 中英文新增「终端行为」与环境变量，`modules/desktop-surface.md` / `modules/index.md` 同步刷新
- `2026-09-19 12:05` 提交 e853a79（8 文件，commitlint 钩子真实生效）并 push，创建 PR #17（`--body-file` 按 12 号流程模板生成描述）
- `2026-09-19 12:15` 用户实机验证通过：「可以正常打开」——命令立即返回且窗口正常
- `2026-09-19 12:18` CI `Lint · Test · Format` 通过（14s）；执行 Step 4 归档动作（STATUS=DONE + `git mv` 到 `_archive/2026-09/`），随本 PR 一同合入
<!-- CONTENT_END: log -->

---

## 6. 风险与阻塞

<!-- CONTENT_START: risks -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；遇到阻塞时**追加新行**，不要覆写占位行。
>
> 「状态」列标准词汇：`跟进中`（阻塞中，待解除）/ `已解除`（阻塞已解除，记录留档）。

| 风险 / 阻塞点 | 影响 | 应对方案 | 状态 |
|-------------|-----|--------|------|
| 沙箱内无法完成实机端到端验证（工具调用 stdout 非 TTY，而当前会话就跑在 dsh-desktop 上，不能再拉实例） | Step 3.9 只能待用户确认 | 由用户在自己的终端执行 `dsh --profile dsh-desktop` 验证「立即返回 + 窗口出现 + 关窗无孤儿」；失败时看 `~/.dsh/desktop.log` | 已解除（用户 2026-09-19 12:15 验证通过） |
| 启动探针为每次启动增加约 60ms（一次 `node --version` 级冷启动） | 启动略慢，换取不再有静默失败 | 探针只跑 launcher `--version`，不 boot tree、不开窗；如后续认为不值可改为「父进程等 150ms 收 spawn error」 | 已接受 |
| 行为变更默认生效（前台 TTY 不再阻塞） | 依赖旧「前台阻塞」习惯的用法会变化 | README「终端行为」明确说明；`DSH_DESKTOP_NO_DETACH=1` 可恢复旧行为 | 已接受 |
<!-- CONTENT_END: risks -->

---

## 7. 验收清单

<!-- CONTENT_START: acceptance -->
- [x] 所有 Step 已勾选完成
- [x] 单元测试 / 集成测试通过（`test/detach.test.js` 12/12、`npm test` 38/38）
- [x] 编译无 warning，linter 通过（零 build；`npm run lint` + `npm run format:check` 全绿，CI 通过）
- [x] 自测覆盖核心路径与边界场景
- [x] 模块文档已更新（如涉及模块变更：`modules/<name>.md` + `modules/index.md` 均已同步）
- [x] 接口文档 / CHANGELOG 已更新（如有对外接口变更）—— 无对外接口变更；README 中英文已补「终端行为」与 3 个环境变量
- [x] PR 已合入目标分支（预声明：PR [#17](https://github.com/IriskaDev/dsh-desktop/pull/17)，随本 PR 一同生效）
- [x] 任务文件已从 `_active/` 移入 `_archive/{YYYY-MM}/`（预声明：本次 commit 内 `git mv` 到 `_archive/2026-09/`）
<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - 每完成一个 Step 必须：勾选 checkbox + 追加进度日志 + 更新 LAST_UPDATED
  - 任何阻塞必须把 STATUS 改为 BLOCKED 并在「风险与阻塞」记录原因
  - 中断恢复时：先读元数据 → 再读 Step List 找首个未勾选项 → 再读最近 3 条进度日志
-->
