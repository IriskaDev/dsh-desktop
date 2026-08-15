<!-- MODULE: desktop-surface -->
<!-- MODULE_GROUP: - -->
<!-- INVOLVED_CHAINS: - -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.6 -->

# desktop surface（Electron 桌面外壳）

> dsh-desktop 的 surface 插件：`dsh --profile desktop` 启动后，在 web 服务绑定端口后拉起一个 Electron 原生窗口，加载 DSH web 界面，零定制复用 web UI。

---

## 功能概述

<!-- CONTENT_START: overview -->
desktop surface 是 dsh-desktop 的核心插件（`src/index.js`），是 DSH 的一个**独立 surface**（与 `web`/`tui`/`headless` 并列）：`dsh --profile desktop` 自带 agent + webserver + Electron 原生窗口，不依赖 `dsh web`。它在 `webServer` 服务绑定端口后 spawn Electron（`apps/electron/main.js`）加载 `http://127.0.0.1:<port>`；webserver 用 `port 0`（OS 分配空闲端口）避免与 `dsh web`（默认 3080）冲突。agent 由 web-app bundle 的 dsh-base 层驱动，本插件只负责拉起窗口。窗口为无边框（`frame: false`）：无原生标题栏/关闭按钮，由 preload 注入顶部 12px 透明拖拽条 + 右上角自定义「✕」关闭按钮（关闭按钮放在 DSH 头部右侧 28px padding 内，不压住 Session log 按钮）。
<!-- CONTENT_END: overview -->

---

## 入口点（Entry Points）

<!-- CONTENT_START: entry_points -->
| 类型 | 入口标识 | 触发函数 | 说明 |
|------|---------|---------|------|
| CLI | `dsh --profile desktop` | `apply(ctx)` | boot desktop profile，拉起 Electron 窗口 |
| 内部函数 | `desktop`（插件 name） | `apply` | 注入 `webServer`，服务就绪后 spawn Electron |
<!-- CONTENT_END: entry_points -->

---

## 数据流向

<!-- CONTENT_START: data_flow -->
`dsh --profile desktop` → boot（web-app bundle：dsh-base + web-app，webserver 绑定端口）→ desktop surface `inject: ['webServer']`，在 loader 结算后读取 `ctx.webServer.port` → spawn `electron apps/electron/main.js`（URL + 父 PID 经环境变量传入）→ Electron 窗口加载 `http://127.0.0.1:<port>`（DSH web 前端）。
<!-- CONTENT_END: data_flow -->

---

## 核心接口

<!-- CONTENT_START: core_interfaces -->
- `name = 'desktop'` — 插件名
- `inject = ['webServer']` — 依赖 webServer 服务（由 web-app 的 webserver 提供）
- `apply(ctx)` — 服务就绪后 spawn Electron
<!-- CONTENT_END: core_interfaces -->

---

## 上游依赖（我依赖谁）

<!-- CONTENT_START: upstream_dependencies -->
- `webServer`（`@deepseek-ai/dsh-host-webserver`）：读其 `.port` 得到绑定端口，拼出 loopback URL
- `electron`（第三方，devDependency）：`require('electron')` 得到 electron.exe 路径用于 spawn
<!-- CONTENT_END: upstream_dependencies -->

---

## 下游调用方（谁依赖我） · 1 层直接调用

<!-- CONTENT_START: downstream_callers -->
无（本模块为 surface 叶子，无其他模块调用）
<!-- CONTENT_END: downstream_callers -->

---

## 下游数据/接口调用（我调用的外部资源） · 1 层

<!-- CONTENT_START: downstream_data_calls -->
- 无数据库 / MQ / 外部 HTTP 调用
- **spawn 子进程**：`electron`（`apps/electron/main.js`）— 加载 DSH web 前端
<!-- CONTENT_END: downstream_data_calls -->

---

## 关键数据结构

<!-- CONTENT_START: data_structures -->
- `DSH_ELECTRON_URL`（env）— 传给 Electron 的 web URL
- `DSH_ELECTRON_PARENT_PID`（env）— 传给 Electron 的父进程 PID（用于自退出检测）
<!-- CONTENT_END: data_structures -->

---

## 注意事项

<!-- CONTENT_START: caution -->
- **electron CLI 参数坑**：传给 `electron.exe` 的 CLI 参数（尤其 URL 类）会触发崩溃（exit 0xFFFFFFFF），URL/父 PID 一律走环境变量（`DSH_ELECTRON_URL` / `DSH_ELECTRON_PARENT_PID`），不走 argv。
- electron 需作为 dsh-desktop 的 devDependency 安装（`require('electron')` 从工作区 node_modules 解析）。
- Electron 窗口通过 parentWatch 每 2s 探测父进程（dsh）存活，父进程退出即 `app.quit()`，避免孤儿窗口。
- **双向清理**：dsh 侧监听 Electron 的 `exit` 事件，窗口关闭 → `ctx.root.fiber.dispose()` 关掉整个 dsh 实例（webserver + agent 一并退出），避免 webserver 成为孤儿进程。
- **无边框窗口**（`frame: false`）：去掉了原生标题栏与原生关闭按钮；`apps/electron/preload.cjs`（`contextIsolation: false`）注入顶部 12px 透明拖拽条（`-webkit-app-region: drag`，用于移动窗口）和右上角「✕」关闭按钮（28×32，位于 DSH 头部右侧 28px padding 内；点按经 `ipcRenderer` 发 `dsh-desktop:close`，主进程 `win.close()`）。顶部 12px 为拖拽区，会拦截该区域的页面鼠标事件，但该区域是 DSH 头部的空白 padding，不遮挡 Session log 按钮。
- `src/startup.js`（旧 desktop-startup）已不再被 patch 引用，属遗留代码。
<!-- CONTENT_END: caution -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `src/index.js` — desktop surface（electron launcher）
- `apps/electron/main.js` — Electron 主进程（无边框 BrowserWindow + 关闭 IPC + 退出清理）
- `apps/electron/preload.cjs` — preload（注入顶部拖拽条 + 自定义关闭按钮）
- `apps/electron/package.json` — Electron 应用元数据
- `cordis.patch.yml` — 插件编排（desktop surface + llm-deepseek）
- `test/index.test.js`、`test/startup.test.js` — 单元测试
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->
