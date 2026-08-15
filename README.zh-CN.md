# dsh-desktop

一个 DSH bundle patch 插件：启动一个原生 **Electron** 窗口（跨平台 Windows / macOS / Linux），加载 DSH 的 Web GUI —— 一个「不是浏览器标签页、不是 TUI」的 DSH 桌面客户端。

[English](README.md)

## 它是什么

装上这个插件后，DSH 启动时其 Web 服务器会绑定到回环端口，插件随即打开一个指向该地址的 Electron 窗口。Agent 仍然跑在 DSH 内部；本插件只负责加上桌面窗口，并让两者的生命周期同步 —— 关掉窗口即干净地关闭 DSH。

## 工作原理

`desktop` 插件（`src/index.js`）注入 `webServer`，并等待 loader 就绪。服务器绑定端口后，它会：

1. 解析 Electron 可执行文件并启动 `apps/electron/main.js`，通过环境变量传入回环地址与父进程 PID。
2. 打开一个无边框窗口 —— preload 注入顶部拖拽条与自定义关闭按钮 —— 并加载 DSH Web GUI。
3. 窗口关闭时 dispose DSH 的 fiber 并退出，不残留孤儿服务器或 Agent 进程。

配套的 `cordis.patch.yml` 负责：

- 把 Web 服务器绑定到 `127.0.0.1` 的 OS 分配端口，避免与 `dsh web`（默认 `3080`）冲突；
- 为桌面 surface 设置 DeepSeek 的思考/推理默认值。

## 安装

无需 build。把插件 link 进 DSH profile：

```powershell
dsh plugin --profile desktop add link:<path-to-dsh-desktop>
```

## 跑一次

```powershell
dsh --profile desktop
```

会弹出一个加载 DSH Web GUI 的 Electron 窗口。

## 开发

```powershell
npm install        # 安装开发工具链
npm test           # node --test（Node 内置测试运行器）
npm run lint       # eslint
npm run format     # prettier --write
```

- Node.js `v26.2.0`、pnpm `11.21.0`
- Commit 遵循 [Conventional Commits](https://www.conventionalcommits.org/)，由 commitlint + husky 强制校验。

## License

[MIT](LICENSE)
