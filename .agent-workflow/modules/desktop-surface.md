<!-- MODULE: desktop-surface -->
<!-- MODULE_GROUP: - -->
<!-- INVOLVED_CHAINS: - -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-17 -->
<!-- ANALYZER_VERSION: 1.6 -->

# desktop surface（Electron 桌面外壳，无后台服务）

> dsh-desktop 的 surface 插件：`dsh --profile desktop` 启动后，禁用 DSH 的 `node:http` webServer，提供一个不监听的 `webServer` 兼容服务，并拉起 Electron 原生窗口经 `dsh-desktop://` 协议 + IPC 加载 DSH web 界面，零定制复用 web UI。

---

## 功能概述

<!-- CONTENT_START: overview -->
desktop surface 是 dsh-desktop 的核心插件（`src/index.js`），是 DSH 的一个**独立 surface**（与 `web`/`tui`/`headless` 并列）：`dsh --profile desktop` 自带 agent + Electron 原生窗口，**不监听任何 TCP 端口**。它通过 `ctx.provide('webServer', ...)` 提供一个不监听的 webServer 兼容服务（`src/electron-web-server.js`），`dsh-web-app`/`dsh-client-connection`/`dsh-host-frontend-static` 等 DSH 插件原样把 route/fallback 注册到该服务上；插件随后 spawn Electron（`apps/electron/main.js`，offline 模式），Electron 主进程用 `dsh-desktop://` 协议加载前端，并把所有请求经本地 IPC（命名管道/Unix socket）RPC 转发给 DSH 侧 dispatch。事件流（mux/host）由 DSH 侧注入 `apiProxy` 获取，经同一 IPC 通道推送给渲染进程。agent 由 web-app bundle 的 dsh-base 层驱动。窗口隐藏系统原生标题栏（`titleBarStyle: 'hidden'` / macOS `hiddenInset`），但保留原生最小化/最大化/关闭按钮（Windows/Linux 以 `titleBarOverlay` 同色 overlay 呈现）；preload 注入一条 36px 可见的 DSH 风格标题栏（使用 DSH 主题 CSS 变量），并把页面内容下移，不遮挡 DSH 头部。
<!-- CONTENT_END: overview -->

---

## 入口点（Entry Points）

<!-- CONTENT_START: entry_points -->
| 类型 | 入口标识 | 触发函数 | 说明 |
|------|---------|---------|------|
| CLI | `dsh --profile desktop` | `apply(ctx)` | boot desktop profile，拉起 Electron 窗口 |
| 内部函数 | `desktop`（插件 name） | `apply` | 提供 `webServer` 兼容服务，apply 时立即 spawn Electron，loader 结算后发 `ready` 帧再开窗 |
<!-- CONTENT_END: entry_points -->

---

## 数据流向

<!-- CONTENT_START: data_flow -->
`dsh --profile desktop` → boot（web-app bundle：dsh-base + web-app；patch 禁用 dsh-host-webserver，并关闭 web-runtime 的 openBrowser/printUrl/surfaceContext）→ desktop surface 提供不监听的 `webServer` 服务 → apply 时立即 spawn `electron apps/electron/main.js`（命名管道/Unix socket 路径 + 父 PID 经环境变量传入）→ `dsh-web-app`/`dsh-client-connection` 注册 route/fallback，loader 结算且 apiProxy 就绪后 DSH 侧发 `ready` 帧 → Electron 主进程才创建窗口并加载 `dsh-desktop://127.0.0.1/` → 主进程 `protocol.handle` 把静态/API 请求经 IPC RPC 转发给 DSH → preload 覆盖 `fetch`/`WebSocket` 桥接到 ipcRenderer，并注入 DSH 风格标题栏 → 渲染进程显示 DSH web 前端。
<!-- CONTENT_END: data_flow -->

---

## 核心接口

<!-- CONTENT_START: core_interfaces -->
- `name = 'desktop'` — 插件名
- `apply(ctx)` — 提供 `webServer` 兼容服务、注册 `apiProxy` 事件源、spawn Electron
- `createElectronWebServer(ctx)` — 不监听的 webServer 服务：`register` / `registerUpgrade` / `registerFallback` / `tapIndex` / `applyIndexTaps` / `collectIndexInjections` / `renderIndex` / `dispatch`；`renderIndex` 与真实 `dsh-host-webserver` 一致（先结构化注入行、后原始 tap），`collectIndexInjections` 经 `ctx.emit('webserver/index-inject')` 收集 boot manifest / theme 等注入行
- `createParentIpcChannel(socket, handlers)` — DSH 侧 IPC 帧协议与 RPC（4 字节 little-endian 长度 + UTF-8 JSON）
- `sendFrame(socket, message)` — DSH 侧发送 IPC 帧，含 `{ type: 'ready' }` 就绪帧
<!-- CONTENT_END: core_interfaces -->

---

## 上游依赖（我依赖谁）

<!-- CONTENT_START: upstream_dependencies -->
- `apiProxy`（`@deepseek-ai/dsh-api-gateway`）：`events.mux` / `events.host` 事件源，经 `ctx.inject(['apiProxy'])` 获取
- `electron`（第三方，devDependency）：开发态 `require('electron')` 得到 electron 可执行文件路径用于 spawn；若解析失败则回退到 `dist/electron/runtime/` 打包好的 Electron 运行时（Release 包内置）
- `dsh-web-app` / `dsh-client-connection` / `dsh-host-frontend-static`（DSH 宿主）：依赖本插件提供的 `webServer` 服务注册路由
<!-- CONTENT_END: upstream_dependencies -->

---

## 下游调用方（谁依赖我） · 1 层直接调用

<!-- CONTENT_START: downstream_callers -->
- `dsh-web-app` / `dsh-client-connection` / `dsh-host-frontend-static` 依赖本插件提供的 `webServer` 兼容服务（route 注册/fallback/tapIndex）
<!-- CONTENT_END: downstream_callers -->

---

## 下游数据/接口调用（我调用的外部资源） · 1 层

<!-- CONTENT_START: downstream_data_calls -->
- 无数据库 / MQ / 外部 HTTP 调用；无 TCP 监听
- **spawn 子进程**：`electron`（`apps/electron/main.js`，offline 模式）— 经 fd-3 管道与 DSH 通信；发布态直接 spawn `dist/electron/runtime/` 内打包好的 Electron 可执行文件
<!-- CONTENT_END: downstream_data_calls -->

---

## 关键数据结构

<!-- CONTENT_START: data_structures -->
- `DSH_ELECTRON_MODE=offline`（env）— 通知 Electron 主进程启用无后台模式
- `DSH_ELECTRON_IPC_PATH`（env）— DSH ↔ Electron 的命名管道/Unix socket 路径
- `DSH_ELECTRON_PARENT_PID`（env）— 传给 Electron 的父进程 PID（用于自退出检测）
- IPC 帧：4 字节 little-endian 长度 + UTF-8 JSON；新增 `{ type: 'ready' }` 帧用于通知 Electron 路由已就绪
<!-- CONTENT_END: data_structures -->

---

## 注意事项

<!-- CONTENT_START: caution -->
- **electron CLI 参数坑**：传给 `electron.exe` 的 CLI 参数（尤其 URL 类）会触发崩溃（exit 0xFFFFFFFF），URL/父 PID 一律走环境变量，不走 argv。
- **本地 IPC**：DSH 与 Electron 主进程经命名管道（Windows `\\.\pipe\...`）或 Unix socket 通信；Electron 侧用 `net.connect(DSH_ELECTRON_IPC_PATH)` 接入。父进程先退出时该通道自动关闭。
- **启动并行化**：`apply` 阶段即 spawn Electron，让 Electron 冷启动与 DSH loader 结算重叠；DSH 侧在 loader 结算 + `apiProxy` 就绪后发送 `ready` 帧，Electron 收到后才创建窗口，避免路由未注册就发起首屏请求。
- **事件流不走 WebSocket**：渲染进程的 `WebSocket` 被 preload 覆盖为 IPC 订阅，主进程经 fd-3 向 DSH 订阅 `apiProxy.events.mux/host`，帧经 `webContents.send` 推送。
- **patch 编排**：`cordis.patch.yml` 禁用 `webserver`（`dsh-host-webserver`），并关闭 `web-runtime` 的 `openBrowser`/`printUrl`/`surfaceContext`，避免打印/打开假 URL 或向模型注入 loopback URL（`openBrowser` 漏关会导致系统浏览器打开 `http://127.0.0.1:0` 打不开）。
- electron 开发态作为 dsh-desktop 的 devDependency 安装（`require('electron')` 从工作区 node_modules 解析）；Release 包无需 npm install，插件回退到 `dist/electron/runtime/`（`scripts/package.mjs` 打包生成）。
- `scripts/package.mjs` 用 `@electron/packager` 把 `apps/electron` 打成各平台运行时（`asar: false`），`npm run dist` 额外生成发布压缩包到 `dist/release/`。
- Electron 窗口通过 parentWatch 每 2s 探测父进程（dsh）存活，父进程退出即 `app.quit()`，避免孤儿窗口。
- **双向清理**：dsh 侧监听 Electron 的 `exit` 事件，窗口关闭 → `ctx.root.fiber.dispose()` 关掉整个 dsh 实例（agent + 相关服务一并退出），避免孤儿进程。
- **APP_ORIGIN 必须用 `127.0.0.1`**：Electron 用 `dsh-desktop://127.0.0.1/` 加载前端（不是 `dsh-desktop://app/`）。DSH 客户端的 `connection.isLoopback` 按 `location.hostname` 判定，只有 `localhost`/`[::1]`/`127.x` 才算 loopback；`app` 会被判为远程，settings 持久化会退化为 memory，导致语言/主题等设置重启后重置。
- **DSH 风格标题栏**：不再用 `frame: false` 全无边框；`apps/electron/main.js` 用 `titleBarStyle: 'hidden'`（Windows/Linux）+ `titleBarOverlay`（`#151517` 背景 / `#f9fafb` 图标 / 36px），macOS 用 `hiddenInset` 保留红绿灯。`apps/electron/preload.cjs`（`contextIsolation: false`）注入 36px 可见标题栏（`#dsh-desktop-titlebar`）：标题 `DeepSeek Harness`、`-webkit-app-region: drag`、用 DSH 主题变量 `--dsw-alias-bg-base` / `--dsw-alias-label-primary` / `--dsw-alias-border-l2` 着色（跟随浅色/深色主题），以 `env(titlebar-area-*)` 避开原生窗口按钮，并给 `body` 加 `padding-top` + `box-sizing: border-box` 把页面内容下移。原生关闭按钮由 overlay 提供，preload 不再注入自定义「✕」，`dsh-desktop:close` IPC 已移除。
- `src/startup.js`（旧 desktop-startup）已不再被 patch 引用，属遗留代码。
<!-- CONTENT_END: caution -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `src/index.js` — desktop surface（提供 webServer 兼容服务 + 拉起 Electron）
- `src/electron-web-server.js` — 不监听的 webServer 服务（route 注册 + dispatch + fallback）
- `src/ipc-channel.js` — DSH ↔ Electron fd-3 帧协议与 RPC
- `apps/electron/main.js` — Electron 主进程（dsh-desktop:// 协议 + fd-3 RPC + titleBarStyle/titleBarOverlay 窗口选项）
- `apps/electron/preload.cjs` — preload（fetch/WebSocket 桥 + DSH 风格标题栏注入）
- `apps/electron/package.json` — Electron 应用元数据
- `scripts/package.mjs` — 打包 Electron 运行时 + 生成发布压缩包
- `.github/workflows/release.yml` — 推 `v*` tag 时构建三平台产物并创建 GitHub Release
- `dist/electron/runtime/` — 打包产物（git 忽略），发布态 Electron 运行时
- `cordis.patch.yml` — 插件编排（desktop surface + 禁用 webserver + 关闭假 URL）
- `test/index.test.js`、`test/electron-web-server.test.js`、`test/ipc-channel.test.js`、`test/startup.test.js` — 单元测试
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->
