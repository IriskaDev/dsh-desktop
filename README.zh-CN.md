# dsh-desktop

一个 DSH bundle patch 插件：把 DSH 的 `main` agent 跑在独立进程里，把 session 事件流式打到 stdout（JSON Lines）。下一层接 **Electron** 原生窗口（跨平台 Windows / macOS / Linux），做成一个「不是浏览器、不是 TUI」的 DSH 桌面客户端。

[English](README.md)

## 它证明了什么

回答一个问题——「DSH 能否通过插件跑在独立进程里、渲染到任意 sink（包括原生窗口）？」答案是能。这里给出最薄的那一层证明。下一步 Electron 外壳把 stdout 换成真正的 renderer。

## 工作原理

`cordis.patch.yml` 编排三层插件：

1. `desktop-startup`（`src/startup.js`）—— 铸 session 身份（`configuredAgentIdentities`），并暴露 `desktopStartup` 服务。
2. `agent-loop` —— 建 `main` agent（`provider: deepseek-official`，`model: deepseek-v4-pro`）。
3. `desktop`（`src/index.js`）—— surface 本体：订阅 `session/event`，把 turn/chunk 流式写成 JSONL，从 stdin 发首轮用户输入，turn 结束 dispose 退出。

### JSONL 输出协议

```jsonl
{"type":"turn/start","turn":1}
{"type":"delta","kind":"reasoning","text":"..."}
{"type":"delta","kind":"text","text":"..."}
{"type":"message"}
{"type":"turn/end","reason":"completed"}
```

Electron 外壳消费的就是这套协议。

## 安装

零运行时依赖、零 build（纯 ESM JS）。把插件 link 进 DSH profile：

```powershell
dsh plugin --profile desktop add link:D:\workbench\projects\dsh-desktop
```

## 跑一次

```powershell
"列一下当前目录并一句话总结" | dsh --profile desktop
```

stdout 会吐 JSONL：`turn/start` → `delta`(reasoning/text) → `message` → `turn/end`。

> 真实流式需要 `~/.dsh/.credentials.yaml` 里的 `DEEPSEEK_API_KEY`。

## 开发

```powershell
npm install        # 安装开发工具链
npm test           # node --test（Node 内置测试运行器）
npm run lint       # eslint
npm run format     # prettier --write
```

- Node.js `v26.2.0`、pnpm `11.21.0`
- Commit 遵循 [Conventional Commits](https://www.conventionalcommits.org/)，由 commitlint + husky 强制校验。

## 下一步：Electron 窗口

把 `src/index.js` 里 `emit` 的目标从 `process.stdout` 换成真正的 renderer。最省事的桥是**旁车进程**：Electron 主进程 spawn `dsh --profile desktop`，读 stdout 的 JSONL 渲染到窗口，把用户输入写回 stdin。DSH 进程与窗口彻底解耦，跨平台。

## License

[MIT](LICENSE)
