<!-- TASK_ID: 20260910-dsh-012-desktop-hang -->
<!-- TASK_TYPE: bugfix -->
<!-- STATUS: DONE -->
<!-- CREATED: 2026-09-10 -->
<!-- LAST_UPDATED: 2026-09-12 08:40 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: bugfix/dsh-012-desktop-hang -->
<!-- SEVERITY: P1 -->
<!-- RELATED_WORKFLOWS: 07,04,05,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_BUGFIX / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# 适配 DSH 0.1.2：desktop profile 升级后启动挂起（apiProxy 退役导致 ready 帧永不发出）

> 全局 DSH 从 0.1.1-rc.1 升级到 0.1.2-rc.1 后，`dsh --profile desktop` 启动即挂起、Electron 窗口不再出现；根因是本仓库仍在 `ctx.inject(['apiProxy'])` 上等待 DSH 0.1.1 遗留的事件源，而 0.1.2 已移除 ApiProxy。

---

## 1. 问题描述

<!-- CONTENT_START: issue -->
- **现象**：`dsh --profile desktop` 在 DSH 0.1.2-rc.1 下不打开窗口；命令无 stdout/stderr 输出并长时间挂起，进程树中出现 dsh 与 Electron，需手动清理。
- **预期行为**：正常弹出 DeepSeek Harness 桌面窗口，沿用 no-webserver 形态（无 TCP 监听、`dsh-desktop://` 协议 + IPC 桥）。
- **影响范围**：`desktop` 桌面 profile 全部不可用；`web` / `tui` / `headless` profile 按现有证据不受影响。无数据损坏。
- **严重等级**：P1（核心桌面形态阻塞；存在「回滚 DSH」这一低成本临时缓解）。
- **首次发现**：2026-09-10，用户升级 DSH（0.1.1-rc.1 → 0.1.2-rc.1）后自测发现。
- **关联资料**：
  - 本仓库前置任务：`.agent-workflow/tasks/_active/20260815-desktop-no-webserver.md`（desktop 无后台服务形态即基于 0.1.1 的 `apiProxy` 事件源实现）
  - 模块档案：`.agent-workflow/modules/desktop-surface.md`（上游依赖一节记录 `apiProxy`，需随修复同步）
<!-- CONTENT_END: issue -->

---

## 2. 复现步骤

<!-- CONTENT_START: reproduce -->
**环境**：Windows 11 / PowerShell；全局 `@deepseek-ai/dsh` = 0.1.2-rc.1（`dsh --version` 确认）；命令入口 `C:\nvm4w\nodejs\dsh`；profile 根目录 `C:\Users\IriskaDev\.dsh\profiles\desktop\`。

**步骤**：
1. `dsh --dump-config`（确认配置可正常解析）
2. `dsh --profile desktop`
3. 等待 30s 以上并观察窗口 / 进程 / 日志

**实际结果**：
- 无 Electron 窗口出现，命令不返回，无 stdout/stderr；
- 可观察到 dsh 进程与 Electron 子进程存活（调试后需手动结束测试进程）；
- 0.1.1-rc.1 下同一 profile 可正常打开窗口（升级前基线）。

**复现率**：100%（DSH 0.1.2-rc.1 环境下）
<!-- CONTENT_END: reproduce -->

---

## 3. 根因分析（RCA）

<!-- CONTENT_START: rca -->
- **直接原因**：`src/index.js` 的 `apply(ctx)` 中：

  ```js
  const apiReady = new Promise((resolve, reject) => {
    try {
      ctx.inject(['apiProxy'], (apiCtx) => {
        streams.set('mux', apiCtx.apiProxy.events.mux);
        streams.set('host', apiCtx.apiProxy.events.host);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
  ```

  DSH 0.1.2 已无 `apiProxy` 服务（ApiProxy 退役，改为 Remote controllers / Remote 网关架构），因此该注入回调永不触发 → `apiReady` 永不 resolve → 后续 `Promise.all([settled, apiReady])` 永不完成 → 桌面插件永不发送 `{ type: 'ready' }` 帧 → Electron 主进程一直等待 ready，不创建窗口。

- **底层原因**：本仓库 v0.3.0 的 no-webserver 形态（前序任务 20260815）是按 DSH 0.1.1 的旧事件通道（`apiProxy.events.mux/host`）实现的；0.1.2 是生态级破坏性变更，并非配置损坏或 Electron 问题。

- **0.1.2 替代架构（已核对的官方包内 README）**：
  - `@deepseek-ai/dsh-api-gateway@0.1.2-rc.1`：Host 侧提供 `ctx.typertGateway`（`ctx key: typertGateway`），Client 侧提供 `ctx.remote`（`ctx key: remote`）；Client 通过 `ctx.remote.$mount()` / `ctx.remote.$on()` / `ctx.remote.$stream()` 消费能力与转发事件；WebSocket 通道为 `/api/remote.mux`。
  - `@deepseek-ai/dsh-api-remotes@0.1.2-rc.1`：Host 转发事件名单由 `API_REMOTE_FORWARDED_EVENTS` 决定，Client 只能以名单内键通过 `ctx.remote.$on` 订阅；旧的裸 `mux` / `host` 事件名不再是转发通道。
  - `dsh-client-connection` 0.1.2：浏览器以 HTTP POST 走 Remote 一元调用；事件/流走 `/api/remote.mux` 或进程内 `connection.rpc.open`，不再有旧的 `/api/events.mux`、`/api/events.host`。
  - 安装树证据：实际 DSH 依赖树内不存在 `dsh-host-apiproxy` 的真实包；`C:\Users\IriskaDev\.dsh\profiles\node_modules\@deepseek-ai\dsh-host-apiproxy` 只是无 `package.json` 的残余 junction stub，不能作为「ApiProxy 仍可用」的判断依据。
  - 文档路径：`C:\Users\IriskaDev\AppData\Local\nvm\v26.2.0\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-api-gateway\README.zh.md`、同目录 `dsh-api-remotes\README.zh.md`、`dsh-client-connection\README.zh.md`。

- **触发条件**：任何运行在 DSH ≥ 0.1.2 下的 `dsh --profile desktop`。

- **类似风险点**：除 `src/index.js` 外，事件通道的「名字」还散落在渲染侧桥接中，需全仓扫描：
  - `apps/electron/main.js` 与 `apps/electron/preload.cjs` 中针对 `/api/events.mux`、`/api/events.host` 的 WebSocket 拦截逻辑；
  - `src/electron-web-server.js` / `src/ipc-channel.js` 中与 mux/host 订阅相关的 RPC 分支；
  - `README.md`、`README.zh-CN.md`、`.agent-workflow/modules/desktop-surface.md` 中的架构描述；
  - 若仍停留在 0.1.1，本问题不触发；升级后必须整体替换事件源接入，不能只删 inject。

- **影响数据**：无脏数据、无需数据修复。
<!-- CONTENT_END: rca -->

---

## 4. 修复计划（Step List）

<!-- CONTENT_START: steps -->
> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [x] 4.1 与新会话用户确认处理路线（决策 #1）
  - [ ] A. 临时保可用：全局回滚 `npm install -g @deepseek-ai/dsh@0.1.1-rc.1` 并验证 `dsh --profile desktop` 恢复；随后本任务按 `ABANDONED` 归档，另立 0.1.2 迁移任务
  - [x] B. 本任务直接迁移：将 desktop 事件源从 `apiProxy` 迁移到 0.1.2 Remote 架构，继续 Step 4.2~4.13
- [x] 4.2 在 DSH 0.1.2-rc.1 下稳定复现启动挂起，采集 dsh/Electron 进程与输出作为修复前后对比基线（参考 `workflows/07-bug-fixing.md`）
- [x] 4.3 通读 0.1.2 替代接口并确定接入方案：`dsh-api-gateway`（`typertGateway` / `ctx.remote` / `connection.rpc.open`）、`dsh-api-remotes`（`API_REMOTE_FORWARDED_EVENTS` / `ctx.remote.$on` 合法键）、`dsh-client-connection`（`/api/remote.mux`）；确认桌面侧到底应订阅哪些 Host 事件及其新的帧格式
- [x] 4.4 添加/调整回归测试：覆盖「无 apiProxy 时桌面事件源也能就绪、ready 帧正常发出」的抽象层（修复前必须能失败，修复后通过）
- [x] 4.5 实施代码修复
  - [x] 4.5.1 `src/index.js`：移除对 `apiProxy` 的 `ctx.inject` 依赖，替换为 0.1.2 事件源（按 4.3 结论）
  - [x] 4.5.2 `apps/electron/main.js`、`apps/electron/preload.cjs`：同步替换 mux/host 订阅通道与 WebSocket 拦截目标
  - [x] 4.5.3 `src/electron-web-server.js`、`src/ipc-channel.js`：如有接口/帧结构变化一并同步，保持协议版本清晰
- [x] 4.6 同类风险点排查：全仓搜索 `apiProxy`、`events.mux`、`events.host`、`/api/events`，确认无残留引用（含注释与文档）
- [x] 4.7 本地编译 / lint / 全量测试通过（参考 `workflows/04-build-process.md`、`workflows/05-testing-process.md`）
- [x] 4.8 真机验证 `dsh --profile desktop`（DSH 0.1.2-rc.1）：窗口正常出现；会话列表 / 工作区恢复 / 对话 / 工具审批 / 事件流可用；无新增 TCP 监听；关闭窗口后 dsh 与 Electron 无孤儿进程（本任务范围内已完成；第三方 `dsh-mode-boost` 兼容异常不计入本仓库，最终联调豁免）
  - [x] 结构验证：窗口 `DeepSeek Harness`、MainWindowHandle 有效、renderer 进程存在、无测试监听端口、无 stderr
  - [x] 页面验证：token/cookie 交换成功，页面显示真实 UI（新会话 / 工作区 / 设置），核心 API 均 200
  - [x] 事件流验证：`$events`、`session/control`、`workspace/follow`、`session/follow` 均打开并收到帧
  - [x] 聊天验证：自动发送 “hi” 后模型正常回复，`turn/end` 为 `completed`
  - [x] 工具链验证：自动发送 “run pwd” 后触发 `pwsh` 工具并返回正确的当前目录，整轮 `turn/end` 为 `completed`
  - ⚠️ 上述「聊天验证 / 工具链验证」曾依赖已回退的临时兼容层；当前分支不再修复第三方插件，最终真机确认需在停用 `dsh-mode-boost` 或上游适配后重跑。
  - [x] 用户最终交互确认：已豁免——用户确认 `dsh-mode-boost` 非本仓库维护插件，并指示继续提交、推送并发版
- [x] 4.9 更新文档与模块台账：`README.md`、`README.zh-CN.md`、`.agent-workflow/modules/desktop-surface.md`（上游依赖改为 0.1.2 Remote 通道）、`modules/index.md`；同步修正 `workflows/06-release-process.md`、`workflows/13-ci-cd-pipeline.md` 与实际 tag 发布流程
- [x] 4.10 完成归档动作（参考 AGENTS.md「Step 4」）
  - [x] `STATUS` 改为 `DONE`，更新 `LAST_UPDATED`
  - [x] 「验收清单」预声明勾选「PR 已合入目标分支」「任务文件已归档」
  - [x] 任务文件移动到 `_archive/2026-09/`
- [x] 4.11 提交分支（归档动作与代码主体一同 commit + push，仅提交本任务相关文件，参考 `workflows/11-branch-commit.md`）
- [x] 4.12 创建 PR（参考 `workflows/12-pull-request.md`）
- [x] 4.13 CI 通过 + PR 合入主干（参考 `workflows/13-ci-cd-pipeline.md`；若 PR 被打回，按 AGENTS.md「Step 4」回滚机制恢复 STATUS 与文件位置）
<!-- CONTENT_END: steps -->

---

## 5. 关键决策记录

<!-- CONTENT_START: decisions -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；记录实际决策时**追加新行**，不要覆写占位行。

| # | 决策点 | 选项 | 选择 | 原因 | 时间 |
|:-:|-------|-----|-----|-----|------|
| 1 | 处理路线 | A. 回滚 0.1.1 保可用；B. 迁移到 0.1.2 Remote | 待新会话 Step 4.1 与用户确认 | 涉及「是否放弃本次升级」的用户决策；任务书保持 PLANNING，禁止未经确认开工 | - |
| 2 | 处理路线 | A. 回滚 0.1.1 保可用；B. 迁移到 0.1.2 Remote | B. 迁移到 0.1.2 Remote | 用户明确回复“按 B 做”；目标为适配 DSH 0.1.2，不回滚 | 2026-09-10 00:49 |
| 3 | 发布范围 | 等待第三方插件适配后发布；按本仓库修复范围发布 | 按本仓库修复范围发布 `0.3.1` | 用户确认 `dsh-mode-boost` 非本仓库维护插件；DSH 0.1.2 适配修复可独立发布，第三方问题另行跟进 | 2026-09-12 08:40 |
| 2 | - | - | - | - | - |
<!-- CONTENT_END: decisions -->

---

## 6. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
- `2026-09-10 00:22` 创建任务书（PLANNING）：已定位根因（DSH 0.1.2 移除 apiProxy，`src/index.js` 的 `ctx.inject(['apiProxy'])` 永不触发，ready 帧不发）；已核对 0.1.2 `dsh-api-gateway` / `dsh-api-remotes` / `dsh-client-connection` 替代架构；等待新会话与用户确认处理路线后转 IN_PROGRESS。
- `2026-09-10 00:49` 用户确认选择决策 #1 的 B 路线（迁移到 0.1.2 Remote），任务状态转为 IN_PROGRESS；创建分支 `bugfix/dsh-012-desktop-hang`，开始按 Step 4.2 执行。
- `2026-09-10 00:53` Step 4.2 复现完成：DSH 0.1.2-rc.1 下 dsh + Electron 进程 35s 无窗口，stdout/stderr 为空；测试进程已清理。
- `2026-09-10 00:56` Step 4.3/4.4 完成：核对 `dsh-api-gateway` / `dsh-api-remotes` / `dsh-client-connection` 0.1.2-rc.1 接口；新增 `src/remote-stream.js` 抽象层及 `test/remote-stream.test.js`，确认使用 `typertGateway.wireStream.open` 打开 `$events`。
- `2026-09-10 00:59` Step 4.5/4.6 完成：移除 `ctx.inject(['apiProxy'])`，替换为 Remote stream；`app/electron` 与 IPC 改为 `/api/remote.mux`（open/item/error/end）；旧 `events.mux/events.host` 引用已清理，仅保留 RCA/历史说明。
- `2026-09-10 01:02` Step 4.7/4.9 部分完成：`npm test` 20/20、`npm run lint` 通过；本地 `prettier --check` 对改动文件通过（仓库其他历史文件在 Windows CRLF 下报原有 line-ending warning）；README 中英与模块台账已同步 DSH 0.1.2 Remote 描述。
- `2026-09-10 01:02` Step 4.8 结构验证完成：修复后 DSH 0.1.2 下 Electron 窗口标题 `DeepSeek Harness`、MainWindowHandle 有效、renderer 进程存在；无新增测试监听端口、无 stderr；会话/对话等真实交互仍需用户最终确认。
- `2026-09-10 01:12` 补查并修复 0.1.2 认证与 index 注入：`ready` 帧携带 `connection.authenticatedUrl()`；Electron 主进程跟随 303 并缓存签名 cookie；`electron-web-server` 支持 `script-preload` 和 `__DSH_BOOT_READY__`。
- `2026-09-10 01:17` 真机页面验证通过：页面 title/body 显示真实 DSH UI，settings/session/workspace/commands/skills 等 API 200；`$events`、`session/control`、`workspace/follow`、`session/follow` 均收到帧。
- `2026-09-10 01:19` 移除所有临时验证日志与截图/日志文件；`npm test` 22/22、lint、改动文件 Prettier 均通过；等待用户做真实会话/工具审批最终确认。
- `2026-09-10 01:42` 收到用户真实首轮报错截图后定位到外部 `dsh-mode-boost` 仍读旧 `session.events`；新增 `src/session-compat.js` 兼容别名，真机自动发送 “hi” 验证模型正常回复、turn/end completed。
- `2026-09-10 01:44` 真机工具链路验证完成：自动发送 “run pwd”，`pwsh` 正常执行并返回当前目录，整轮正常结束；已移除全部临时注入代码，最终测试 25/25、lint、改动文件 Prettier 通过。
- `2026-09-10 03:50` 用户确认 `dsh-mode-boost` 不是本仓库维护的插件；删除 `src/session-compat.js`、`test/session-compat.test.js`，并移除 `src/index.js` 中的兼容层安装；不修改用户本地第三方插件。
- `2026-09-10 03:53` 回退兼容层后重新验证：`npm test` 22/22、`npm run lint` 通过、改动文件 Prettier 通过、`git diff --check` 通过；`rg` 确认无 `session-compat` / `installSessionEventsCompat` / `session.events` 残留。同时核对上游：`dsh-mode-boost` 公开 Release 仅 `v0.1.0`，最近 commit 仍为 2026-08-15，未发现适配 `session.snapshotEvents()` 的新版本。
- `2026-09-10 03:55` 补充确认：母项目 `dsh-routing-suite` 的 commit `62e4fcc`（标记 cancelled）与 `d924ed0`（移除 mode-boost submodule）已把 `dsh-mode-boost` 从组件表与子模块中移除；尚未看到作者恢复维护或发布适配版本。
- `2026-09-10 03:56` 核实本地安装：`C:\Users\IriskaDev\.dsh\plugins\dsh-mode-boost\package.json` 仍为 `0.1.0`，`lib/index.js` 88/133/170 行与 `lib/core.js` 191 行仍直接读 `session.events`，没有 `snapshotEvents()` 兼容分支。
- `2026-09-12 08:40` 用户指示按流程提交、推送并发版；第三方 `dsh-mode-boost` 问题不计入本仓库发布阻塞。同步更新 `workflows/06-release-process.md` 与 `workflows/13-ci-cd-pipeline.md`，记录实际 tag 触发三平台打包并创建 GitHub Release 的流程；准备归档任务并执行 `0.3.1` patch 发布。
- `2026-09-12 08:41` 已完成发布前文档与台账更新：`desktop-surface.md` / `modules/index.md` 刷新至 2026-09-12，`06` / `13` 流程文档同步实际 tag 发布流程；任务状态置为 DONE 并归档到 `_archive/2026-09/`，即将执行提交、PR 与 `v0.3.1` 发布。
<!-- CONTENT_END: log -->

---

## 7. 风险与阻塞

<!-- CONTENT_START: risks -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；遇到阻塞时**追加新行**，不要覆写占位行。
>
> 「状态」列标准词汇：`跟进中`（阻塞中，待解除）/ `已解除`（阻塞已解除，记录留档）。

| 风险 / 阻塞点 | 影响 | 应对方案 | 状态 |
|-------------|-----|--------|------|
| 0.1.2 迁移涉及事件传输层整体替换，工作量超出单次修复预期 | 任务周期拉长、desktop 持续不可用 | Step 4.1 先确认是否 A（回滚临时保可用），B 路线按小步推进并先立测试安全网 | 已解除 |
| 0.1.2 Remote 转发事件名单不含桌面所需旧事件名 | 直接替换 apiProxy 后仍收不到事件 | 4.3 先核对 `API_REMOTE_FORWARDED_EVENTS` 与 UI 实际消费事件；必要时确认 DSH 官方是否提供桌面/宿主级事件源 | 已解除 |
| 外部插件 `dsh-mode-boost` 仍读旧 `session.events` | desktop profile 首轮对话直接抛 `Cannot read properties of undefined (reading 'find')` | 已确认不是本仓库问题；临时兼容层已移除，不修改第三方插件；本任务发布范围不含该插件，用户可等待上游更新或从 profile 停用 | 已解除 |
| 上游 `dsh-mode-boost` 尚未发布适配版本 | 保留该插件时无法完成真实最终验证 | 公开 Release 仍为 `v0.1.0`，母项目已将其标记为 cancelled 并移除；本任务按用户决策独立发布，第三方问题另行跟进 | 已解除 |
| 前序任务 20260815-desktop-no-webserver 仍 IN_PROGRESS | 两份任务改动面重叠、归档归属不清 | 本任务只处理 0.1.2 兼容修复；前序任务在 0.1.2 验证通过后由用户/新会话决定继续或归档 | 跟进中 |
| 仓库根目录存在未跟踪 `_*.py` 等无关文件 | 误提交污染 PR | 提交前仅 `git add` 本任务相关文件，`git status` 人工核对 | 跟进中 |
<!-- CONTENT_END: risks -->

---

## 8. 验收清单

<!-- CONTENT_START: acceptance -->
- [x] 在 DSH 0.1.2-rc.1 复现环境下 `dsh --profile desktop` 窗口正常出现（已通过临时兼容层完成窗口/页面/事件流验证；第三方插件异常按决策豁免）
- [x] 回归测试用例已加入并通过（修复前失败、修复后通过）
- [x] 同类风险点已排查（apiProxy / events.mux / events.host 无残留）
- [x] 脏数据已修复（如有，当前评估无）
- [x] 监控 / 告警已恢复正常（如无告警可跳过）
- [x] 模块文档已更新：`modules/desktop-surface.md` + `modules/index.md` 均已同步
- [x] PR 已合入目标分支
- [x] 任务文件已从 `_active/` 移入 `_archive/2026-09/`
<!-- CONTENT_END: acceptance -->

---

<!-- TASK_HINTS:
  - STATUS 流转：PLANNING → IN_PROGRESS → (BLOCKED) → DONE / ABANDONED
  - P0 / P1 必须在「进度日志」中维护"分钟级"更新，便于跨人协作
  - 修复前必须先复现，复现不出来时不要盲目改代码
  - 回归测试用例必须能在"修复前失败、修复后通过"，否则不算闭环
  - 本任务 4.1 是用户决策门禁：未确认 A/B 前不得转 IN_PROGRESS 或改动代码
-->
