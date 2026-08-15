<!-- TASK_ID: 20260815-desktop-no-webserver -->
<!-- TASK_TYPE: feature -->
<!-- STATUS: IN_PROGRESS -->
<!-- CREATED: 2026-08-15 -->
<!-- LAST_UPDATED: 2026-08-15 20:05 -->
<!-- OWNER: IriskaDev -->
<!-- BRANCH: feature/desktop-no-webserver -->
<!-- RELATED_WORKFLOWS: 03,04,05,06,08,11,12,13 -->
<!-- 约束源：analyzer-instructions.md#约束常量表 表 A · RELATED_WORKFLOWS_FEATURE / TASK_STATUS_ENUM / TASK_TYPE_ENUM；修改本行前请先改常量表（D5.E1/E2 自检规则会校验）。 -->

# desktop 无后台服务形态：Electron 自定义协议 + IPC 桥接，不启动 `node:http` webServer

> 将现有 `desktop` surface 直接改造为无后台服务形态：用 Electron 自定义协议加载 DSH web 前端，前端 `fetch`/`WebSocket` 经 IPC 桥接到宿主进程内的 DSH 服务，完全复用 DSH web 前端与 Cordis 服务，不监听任何 TCP 端口，保留单形态。

---

## 1. 需求理解

<!-- CONTENT_START: requirement -->
- **背景 / 起源**：当前 `dsh-desktop` 的 `desktop` surface 依赖 `webServer`（`@deepseek-ai/dsh-host-webserver` 起的 `node:http` 服务），Electron 窗口加载 `http://127.0.0.1:<port>`。用户希望有“无后台服务”桌面形态：不监听端口，数据与功能仍复用 DSH web 形态。
- **目标用户 / 调用方**：偏好无本地 HTTP 监听、更简单的安全边界与进程模型的桌面用户。
- **核心交付物**：将现有 `desktop` surface 改造为无后台服务形态——`dsh --profile desktop` 启动后：无 `node:http` 监听端口；Electron 主进程经自定义协议 `dsh-desktop://` 加载 DSH web 前端；渲染进程的 `fetch` 与事件流经 IPC 桥接；工作区、会话缓存、agent、工具等全部复用 DSH 现有 Cordis 服务。
- **不做范围（Out of Scope）**：不改 DSH web 前端代码；不重写原生 UI；不实现 electron-builder 安装包；不做自动更新；不保留旧的 HTTP webServer 形态（单形态，直接替换）。
- **验收标准**：① `dsh --profile desktop` 能起 Electron 窗口并加载 DSH web UI；② 启动后本机无新增 TCP 监听（`netstat`/`Get-NetTCPConnection` 无 DSH 相关 listen）；③ 会话列表、工作区恢复、对话、工具审批等核心路径可用；④ 关闭窗口双向清理无孤儿进程；⑤ 单元测试覆盖 IPC 桥关键路径。
- **关联资料**：`dsh-host-webserver` 源码注释（“Electron loads dist over file:// and carries fetch over an IPC bridge”）、`dsh-client-connection`（`/api` fetch bridge + WebSocket downlink）、`dsh-web-app`（`resolveDistIndex`、`webRuntime` 服务）、`dsh-host-frontend-static`（SPA fallback 服务）。
<!-- CONTENT_END: requirement -->

---

## 2. 影响范围分析

<!-- CONTENT_START: impact -->
- **涉及模块**：desktop-surface（`src/index.js` 改造）；`apps/electron/`（主进程/preload 扩展）；`cordis.patch.yml`（disable 原 webserver、关闭假 URL 输出）。
- **涉及文件 / 路径**：
  - `src/index.js`（改造：提供 webServer 兼容服务、spawn Electron 走 offline 模式）
  - `src/electron-web-server.js`（新增，webServer 兼容服务：不 listen，route 注册 + IPC dispatch + fallback）
  - `src/ipc-channel.js`（新增，DSH ↔ Electron 主进程 fd-3 帧协议 + RPC）
  - `apps/electron/main.js`（扩展：offline 模式、`dsh-desktop://` 协议、IPC handler）
  - `apps/electron/preload.cjs`（扩展：覆盖 `window.fetch` / `WebSocket` 转发到 IPC）
  - `cordis.patch.yml`（`desktop` inject 改为 `[]`、`webserver` disabled、`web-runtime` 关闭 printUrl/surfaceContext）
  - `test/`（新增 electron-web-server 与 ipc-channel 单元测试）
  - `README.md` / `README.zh-CN.md`（更新架构说明）
  - `.agent-workflow/modules/desktop-surface.md`（同步）
- **涉及接口 / 数据结构**：
  - 新服务 `webServer` 兼容实现（`register`、`registerUpgrade`、`registerFallback`、`tapIndex`、`applyIndexTaps`、`host`、`port`）
  - IPC 协议：`dsh:fetch`（request/response 序列化）、`dsh:event`（mux/host 事件流）、`dsh:subscribe`/`dsh:unsubscribe`
- **依赖的上下游**：
  - 复用 DSH 插件：`dsh-web-app`（提供 `webRuntime` + mount `dsh-host-frontend-static`）、`dsh-client-connection`（`/api` route + downlink）、`dsh-host-apiproxy`（fetch handler）
  - 新增依赖：无（仅用 Electron 内建 `ipcMain`/`ipcRenderer`/`protocol`/`net` 与 Node 内建模块）
- **数据库 / 配置 / 环境变量变更**：
  - 无数据格式变更；复用 `~/.dsh/sessions`、`~/.dsh/storages`
  - 新增 `DSH_ELECTRON_MODE=offline`、`DSH_ELECTRON_IPC_PATH` 环境变量（插件 spawn Electron 时自动设置；IPC 路径为本机命名管道/Unix socket，非 TCP 端口）
- **兼容性影响**：单形态替换；旧的 `dsh --profile desktop` 语义变为“无后台服务桌面版”。
<!-- CONTENT_END: impact -->

---

## 3. 实施计划（Step List）

<!-- CONTENT_START: steps -->
> ✅ 关键区块：每完成一步勾选一项；中断恢复时从首个未勾选项继续。

- [x] 3.1 调研确认 DSH web transport 接口（已初步完成：`dsh-host-webserver` route/fallback/upgrade 语义、`dsh-client-connection` `/api` bridge 与 downlink、`dsh-web-app` 的 `webServer` 依赖点与 `resolveDistIndex`）
- [x] 3.2 设计并实现 `webServer` 兼容服务（无 listen）：
  - [x] 3.2.1 接口对齐 `dsh-host-webserver`：`register` / `registerUpgrade` / `registerFallback` / `tapIndex` / `applyIndexTaps` / `host` / `port`
  - [x] 3.2.2 实现 route 匹配（exact → longest-prefix → fallback）与 IPC 请求 dispatch
  - [x] 3.2.3 `port` 返回 0、`host` 返回 `127.0.0.1`；通过 patch 关闭 `dsh-web-app` 的 `printUrl` / `surfaceContext`，避免生成假 URL
- [x] 3.3 实现主进程 IPC 桥：
  - [x] 3.3.1 fetch 桥：渲染进程 `Request` 序列化 → 主进程经命名管道/Unix socket RPC 转发 → 按 webServer 路由 dispatch → 序列化 `Response` 回传
  - [x] 3.3.2 静态资源服务：`dsh-desktop://` 自定义协议全量转发到 DSH 侧 fallback（SPA dist + index taps），不本地碰文件
  - [x] 3.3.3 事件流桥：渲染进程订阅 mux/host 事件 → 主进程经 RPC 订阅 → DSH 侧注入 `apiProxy` 事件源 → `webContents.send` 推送帧
- [x] 3.4 实现 preload 桥：
  - [x] 3.4.1 覆盖 `window.fetch`：`dsh-desktop://` 请求转发 `ipcRenderer.invoke('dsh:fetch', ...)`
  - [x] 3.4.2 覆盖 `WebSocket`：识别 `/api/events.mux`、`/api/events.host`，改为 `ipcRenderer` 事件订阅
  - [x] 3.4.3 保持现有标题栏注入逻辑不变
- [x] 3.5 改造 `desktop` surface 插件为单形态：
  - [x] 3.5.1 改造 `src/index.js`（name 仍为 `desktop`；提供 webServer 兼容服务、spawn Electron 走 offline 模式）
  - [x] 3.5.2 `cordis.patch.yml`：`desktop` inject 改为 `[]`、disable `webserver`、关闭 `printUrl`/`surfaceContext`
  - [x] 3.5.3 确认 DSH loader 下 `dsh-web-app` 与 `dsh-client-connection` 仍能解析 `webServer` 兼容服务
- [x] 3.6 单元测试：
  - [x] 3.6.1 webServer 兼容服务 route 匹配与 fallback dispatch
  - [x] 3.6.2 fetch 桥 request/response 序列化往返
  - [x] 3.6.3 事件流帧序列化
  - [x] 3.6.4 静态文件路径安全（目录穿越防护）
- [x] 3.7 本地验证：
  - [x] 3.7.1 `dsh --profile desktop` 起窗口、加载 UI（窗口标题被前端改为 DeepSeek Harness，页面加载成功）
  - [x] 3.7.2 验证无 TCP 监听（`Get-NetTCPConnection` 无新增 DSH listen）
  - [x] 3.7.3 会话列表、工作区恢复、设置/模型清单等 API 层验证通过（`session.list/create/history`、`workspace.list`、`settings.describe` 等全部 200）；真实对话与审批需用户在真实桌面环境最终确认
- [x] 3.8 文档与台账：
  - [x] 3.8.1 更新 README 中英文
  - [x] 3.8.2 更新 `modules/desktop-surface.md` 与 `modules/index.md`
  - [ ] 3.8.3 任务书勾选 + 进度日志 + 归档（提交/PR 后完成）
- [ ] 3.9 提交 / PR / CI（lint、test、format:check 全绿）
<!-- CONTENT_END: steps -->

---

## 4. 关键决策记录

<!-- CONTENT_START: decisions -->
> 凡是有 A / B 取舍的，必须记录"选了什么、为什么"，避免后续重复讨论。

| # | 决策点 | 选项 | 选择 | 原因 | 时间 |
|:-:|-------|-----|-----|-----|------|
| 1 | transport 方案 | 原生 UI 重写 vs 自定义协议+IPC 桥 | 自定义协议 `dsh-desktop://` + IPC 桥 | 完全复用 DSH web 前端与 Cordis 服务；官方 webserver 注释已预留该形态 | 2026-08-15 |
| 2 | webServer 依赖处理 | patch DSH 包 vs 实现兼容服务 | 实现 webServer 兼容服务（无 listen） | 不改 DSH 任何包；`dsh-web-app`/`dsh-client-connection` 原样工作 | 2026-08-15 |
| 3 | 静态资源加载 | `loadFile` vs 自定义 protocol 全量转发 | 自定义 protocol `dsh-desktop://` 全量转发 | 静态资源与 index taps 全由 DSH 侧 fallback 处理，Electron 不碰文件路径 | 2026-08-15 |
| 4 | 事件流桥 | mock WebSocket socket vs 直接注入 `apiProxy` 推送 | 直接注入 `apiProxy` 推送 | 事件源是 fetch-shaped 的，绕开 websocket 握手更简单可靠 | 2026-08-15 |
| 5 | surface 形态 | 替换现有 desktop vs 新增 offline surface | 直接替换现有 `desktop`，保留单形态 | 用户确认；避免双形态维护成本 | 2026-08-15 |
| 6 | 假 URL 处理 | 保留 localWebUrl vs 关闭 printUrl/surfaceContext | patch 关闭 `printUrl` 与 `surfaceContext` | 无后台形态没有真实 URL，避免 systemPrompt/环境变量出现 `http://127.0.0.1:0` | 2026-08-15 |
<!-- CONTENT_END: decisions -->

---

## 5. 进度日志（Append-Only）

<!-- CONTENT_START: log -->
> 只追加、不删改。每次会话开始与结束、每次完成步骤、每次遇到阻塞都追加一条。

- `2026-08-15 20:00` 创建任务，完成先期规划与任务书（PLANNING）
- `2026-08-15 20:05` 用户确认，STATUS 转 IN_PROGRESS，开始执行
- `2026-08-15 20:30` 用户决定：不保留旧 HTTP 形态，直接改造现有 `desktop` surface 为单形态
- `2026-08-15 20:40` Step 3.2~3.5 完成：webServer 兼容服务、fd-3 RPC、主进程/preload 桥、desktop surface 改造与 patch 编排
- `2026-08-15 20:55` Step 3.6~3.7.2 完成：单元测试通过；`dsh --profile desktop` 实机启动 Electron 窗口、无新增 TCP 监听、退出无孤儿进程
- `2026-08-15 21:00` Step 3.8 文档台账完成：README 中英文、desktop-surface 模块档案与索引已同步
- `2026-08-15 21:10` 实机联调通过：`dsh --profile desktop` 加载 DSH web UI，API/事件流全通（host.describe/session/workspace/settings 等 200），无 TCP 监听；清理调试日志后回归通过
<!-- CONTENT_END: log -->

---

## 6. 风险与阻塞

<!-- CONTENT_START: risks -->
> 下方表中 `| - | - | ... |` 为表头示例占位行，创建任务时保留不动；遇到阻塞时**追加新行**，不要覆写占位行。

| 风险 / 阻塞点 | 影响 | 应对方案 | 状态 |
|-------------|-----|--------|------|
| 前端 bundle 未来引入浏览器本地存储（当前无） | `file://` origin 与 http origin 不互通，偏好类数据不共享 | Electron 固定 `session.partition` 或自定义 protocol 固定 origin | 跟进中 |
| `dsh-web-app`/`dsh-client-connection` 在无真实 `webServer` 下可能有未预见的服务依赖 | surface 启动失败 | 3.1 已通读源码；若出现，按报错在兼容服务补齐接口 | 跟进中 |
| IPC 流式响应（SSE）序列化复杂 | 长输出/流式消息性能或正确性问题 | 分块 `webContents.send` + 背压，单测覆盖 | 跟进中 |
| 本机沙箱无法验证真实 Electron 窗口 | 本地验收受限 | 单测 + 结构验证；完整验收在用户机器或 CI | 跟进中 |
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
