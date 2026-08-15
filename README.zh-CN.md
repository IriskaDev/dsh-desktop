# dsh-desktop

语言：简体中文 | [English](./README.md)

> DSH 桌面 surface：一条命令启动 DSH + Web 服务 + Electron 原生窗口，零定制复用 DSH Web 界面。

## 简介

`dsh-desktop` 是一个 DSH bundle patch 插件（`cordis.patch.yml`），为 DSH 提供一个名为 `desktop` 的 surface。以 `desktop` profile 启动 DSH 后，插件会在 Web 服务绑定端口后自动拉起一个 Electron 原生窗口，加载 `http://127.0.0.1:<port>` 的 DSH Web 界面。

与 `dsh web` 的区别：`dsh web` 只启动 Web 服务，需要用户手动打开浏览器；`dsh --profile desktop` 则自带 agent、Web 服务与 Electron 窗口，开箱即用。Web 服务使用 OS 分配的空闲端口（`port 0`），不会与 `dsh web` 默认的 `3080` 冲突。

## 特性

- **一条命令开箱即用**：`dsh --profile desktop` 启动后自动打开桌面窗口，无需手动访问浏览器。
- **端口隔离**：Web 服务绑定 `port 0`（OS 分配空闲端口），避免与 `dsh web` 默认端口 `3080` 冲突。
- **无边框原生窗口**：去掉原生标题栏，由 preload 注入顶部拖拽条和右上角自定义关闭按钮。
- **双向退出清理**：
  - 关闭 Electron 窗口 → DSH 侧自动 dispose（关闭 Web 服务与 agent），不遗留孤儿进程；
  - DSH 父进程退出 → Electron 每 2 秒探测一次父进程，自动退出，不遗留孤儿窗口。

## 工作原理

```text
dsh --profile desktop
        │
        ▼
DSH boot（web-app bundle + desktop patch）
        │  webServer 绑定 127.0.0.1:<OS 分配的空闲端口>
        ▼
src/index.js apply(ctx)
        │  loader 结算后读取 ctx.webServer.port，拼接 loopback URL
        ▼
spawn electron apps/electron/main.js
        │  通过环境变量传入 URL 与父进程 PID（避免 Electron CLI 参数解析崩溃）
        ▼
Electron 创建无边框 BrowserWindow，加载 http://127.0.0.1:<port>
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
- 插件运行时会从本仓库的 `node_modules` 解析 `electron`，因此第 2 步的 `npm install` 必须执行。
- 除 Electron 外，`webServer` 等 DSH 宿主模块由 DSH 运行时解析，本包无需声明运行时依赖。

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

提交规范：

- `husky` 的 `commit-msg` 钩子会运行 `commitlint`，Commit message 需遵循 [Conventional Commits](https://www.conventionalcommits.org/)。
- GitHub Actions 在 push / PR 到 `main` 时执行 `lint`、`test`、`format:check`（Node 24）。

## 目录结构

```text
dsh-desktop/
├── src/
│   ├── index.js               # desktop surface 插件：webServer 就绪后拉起 Electron
│   └── startup.js             # session 身份辅助模块（当前 patch 未引用）
├── apps/electron/
│   ├── main.js                # Electron 主进程：无边框窗口、关闭 IPC、父进程存活探测
│   ├── preload.cjs            # preload：注入顶部拖拽条 + 自定义关闭按钮
│   └── package.json           # Electron 应用元数据
├── test/
│   ├── index.test.js
│   └── startup.test.js
├── cordis.patch.yml           # DSH bundle patch：desktop 插件 + webServer 端口 + llm-deepseek 默认值
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
| `DSH_ELECTRON_URL` | Electron 加载的 URL。插件自动设为 `http://127.0.0.1:<port>`；独立运行时默认 `http://127.0.0.1:3080` |
| `DSH_ELECTRON_PARENT_PID` | 父进程 PID。Electron 每 2 秒探测一次，父进程退出后自动退出。插件自动设为 DSH 进程 PID；独立运行时默认 `process.ppid` |

## License

[MIT](./LICENSE)
