# dsh-desktop

语言：简体中文 | [English](./README.md)

> DSH 桌面 surface：一条命令启动 DSH + Electron 原生窗口，无本地 HTTP 服务，零定制复用 DSH Web 界面。

## 简介

`dsh-desktop` 是一个 DSH bundle patch 插件（`cordis.patch.yml`），为 DSH 提供一个名为 `desktop` 的 surface。以 `desktop` profile 启动 DSH 后，插件会禁掉 DSH 的 `node:http` webServer，提供一个不监听端口的 `webServer` 兼容服务，并拉起 Electron 原生窗口加载 DSH Web 界面。

与 `dsh web` 的区别：`dsh web` 启动一个本地 HTTP 服务，需要用户手动打开浏览器；`dsh --profile desktop` 则完全复用 DSH Web 前端与 Cordis 服务，但**不监听任何 TCP 端口**——Electron 通过自定义协议 `dsh-desktop://` 加载前端，`fetch` 与事件流经 IPC 桥接到宿主进程。

## 特性

- **一条命令开箱即用**：`dsh --profile desktop` 启动后自动打开桌面窗口，无需手动访问浏览器。
- **无本地 HTTP 服务**：不启动 `node:http`、不监听任何 TCP 端口；静态资源、API 与事件流全部走 Electron IPC/自定义协议。
- **完全复用 DSH Web**：前端 UI、会话/工作区持久化、agent、工具全部由 DSH 原有 Cordis 服务提供。
- **无边框原生窗口**：去掉原生标题栏，由 preload 注入顶部拖拽条和右上角自定义关闭按钮。
- **双向退出清理**：
  - 关闭 Electron 窗口 → DSH 侧自动 dispose（关闭 agent 与相关服务），不遗留孤儿进程；
  - DSH 父进程退出 → Electron 每 2 秒探测一次父进程，自动退出，不遗留孤儿窗口。

## 工作原理

```text
dsh --profile desktop
        │
        ▼
DSH boot（web-app bundle + desktop patch）
        │  patch 禁用 dsh-host-webserver；
        │  desktop 插件提供不监听的 webServer 兼容服务
        ▼
src/index.js apply(ctx)
        │  loader 结算后 spawn Electron，经 fd-3 管道建立 RPC
        ▼
Electron 创建无边框 BrowserWindow，加载 dsh-desktop://app/
        │  主进程 protocol.handle 把静态资源/API 请求经 fd-3 转发给 DSH
        ▼
preload.cjs 覆盖 fetch/WebSocket → ipcRenderer → 主进程 → fd-3 → DSH 服务
        │
        ▼
preload.cjs 注入顶部拖拽条 + 自定义关闭按钮
```

## 环境要求

- Node.js 24+（仓库为纯 ESM，`"type": "module"`）
- npm（用于安装依赖与运行开发脚本）
- DSH CLI（`dsh`，建议 rc.6 或更高）
- 运行真实会话前，需在 DSH 中配置模型凭据（如 `DEEPSEEK_API_KEY`）

## 安装

### 方式一：下载 Release（推荐，无需 npm install）

1. 在 [Releases](../../releases) 页下载与你的系统匹配的压缩包，例如
   `dsh-desktop-0.1.0-win32-x64.zip`（Windows）、
   `dsh-desktop-0.1.0-linux-x64.tar.gz`（Linux）或
   `dsh-desktop-0.1.0-darwin-*`（macOS）。
2. 解压到任意目录。
3. 将解压目录链接到 DSH 的 desktop profile：

```bash
# Windows
dsh plugin --profile desktop add link:D:\path\to\dsh-desktop-0.1.0-win32-x64

# macOS / Linux
dsh plugin --profile desktop add "link:/path/to/dsh-desktop-0.1.0-linux-x64"
```

Release 包已内置对应平台的 Electron 运行时（`dist/electron/runtime/`），插件会优先使用它，因此**不需要执行 `npm install`**。

### 方式二：源码安装（开发）

```bash
# 1. 克隆并进入项目
git clone <repo-url>
cd dsh-desktop

# 2. 安装开发依赖（包含 Electron；本包没有 dependencies）
npm install

# 3. 将本插件链接到 DSH 的 desktop profile
# Windows
dsh plugin --profile desktop add link:D:\path\to\dsh-desktop

# macOS / Linux
dsh plugin --profile desktop add "link:$(pwd)"
```

说明：

- `dsh plugin add` 会把剩余参数转发给 profile 目录下的 pnpm 执行，因此支持 pnpm 的 `link:` 协议。
- 开发态插件会从本仓库的 `node_modules` 解析 `electron`（因此第 2 步的 `npm install` 必须执行）；若检测不到，会回退到 `dist/electron/runtime/` 中打包好的 Electron 运行时。
- 除 Electron 外，DSH 宿主模块（web 前端、`dsh-web-app`、`dsh-client-connection`、`dsh-host-apiproxy` 等）由 DSH 运行时解析，本包无需声明运行时依赖。

## 使用

```bash
dsh --profile desktop
```

启动后 Electron 窗口会自动打开并加载 DSH Web 界面，直接在窗口中对话即可。

如需查看透传给 Web 应用的参数：

```bash
dsh --profile desktop --help
```

## 开发

在仓库根目录执行：

| 命令 | 说明 |
|------|------|
| `npm test` | 运行 `node:test` 单元测试 |
| `npm run lint` | ESLint 检查 |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run format` | Prettier 格式化 |
| `npm run format:check` | Prettier 格式检查（CI 同款） |
| `npm run package` | 将 `apps/electron` 打包为当前平台的 Electron 运行时到 `dist/electron/runtime/` |
| `npm run dist` | 打包运行时并生成发布压缩包到 `dist/release/`（可加 `-- --platform=win32 --arch=x64` 覆盖平台/架构） |

提交规范：

- `husky` 的 `commit-msg` 钩子会运行 `commitlint`，Commit message 需遵循 [Conventional Commits](https://www.conventionalcommits.org/)。
- GitHub Actions 在 push / PR 到 `main` 时执行 `lint`、`test`、`format:check`（Node 24）。

## 目录结构

```text
dsh-desktop/
├── src/
│   ├── index.js               # desktop surface 插件：提供 webServer 兼容服务、拉起 Electron
│   ├── electron-web-server.js # 不监听的 webServer 服务：route 注册 + IPC dispatch + fallback
│   ├── ipc-channel.js         # DSH ↔ Electron 主进程 fd-3 帧协议 + RPC
│   └── startup.js             # session 身份辅助模块（当前 patch 未引用）
├── apps/electron/
│   ├── main.js                # Electron 主进程：dsh-desktop:// 协议、fd-3 RPC、无边框窗口
│   ├── preload.cjs            # preload：fetch/WebSocket 桥 + 顶部拖拽条 + 自定义关闭按钮
│   └── package.json           # Electron 应用元数据
├── test/
│   ├── index.test.js
│   ├── electron-web-server.test.js
│   ├── ipc-channel.test.js
│   └── startup.test.js
├── scripts/
│   └── package.mjs            # 打包 Electron 运行时 + 生成发布压缩包
├── dist/                      # 打包产物（git 忽略；npm run package / dist 生成）
├── cordis.patch.yml           # DSH bundle patch：desktop 插件 + 禁用 webserver + 关闭假 URL
├── package.json               # 包元数据、npm scripts、dsh.bundle.patch 指向
├── eslint.config.js
├── .prettierrc.json
├── commitlint.config.js
├── .husky/commit-msg          # Conventional Commits 提交门禁
├── .github/workflows/ci.yml   # CI：lint + test + format check
├── .agent-workflow/           # Dev Agent Workflow 工作流文档
└── LICENSE                    # MIT
```

## 环境变量

以下变量由插件在拉起 Electron 时自动设置；仅在独立运行 `apps/electron` 时需要手动指定。

| 变量 | 说明 |
|------|------|
| `DSH_ELECTRON_MODE` | 插件自动设为 `offline`；Electron 主进程据此启用 `dsh-desktop://` 协议与 fd-3 IPC 桥 |
| `DSH_ELECTRON_IPC_FD` | fd-3 管道的文件描述符编号（默认 `3`），供 Electron 主进程与 DSH 父进程通信 |
| `DSH_ELECTRON_PARENT_PID` | 父进程 PID。Electron 每 2 秒探测一次，父进程退出后自动退出。插件自动设为 DSH 进程 PID；独立运行时默认 `process.ppid` |
| `DSH_ELECTRON_URL` | 独立运行 `apps/electron`（非 offline 模式）时加载的 URL，默认 `http://127.0.0.1:3080` |

## License

[MIT](./LICENSE)
