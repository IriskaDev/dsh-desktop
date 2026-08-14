# dsh-desktop

最小可行性验证：**用一个 bundle patch 把 DSH 的 `main` agent 驱动起来，并把
session 事件流式打到 stdout（JSON Lines）**。回答一个问题——「DSH 能否通过
插件跑在独立进程里、渲染到任意 sink（包括原生窗口）？」答案是能，这里给出
最薄的那一层证明。下一层是 Electron 外壳（原生窗口、跨平台）。

## 结构

- `cordis.patch.yml` — bundle patch：`desktop-startup`（铸 session 身份）→
  `agent-loop`（建 `main` agent）→ `desktop`（surface）。
- `src/startup.js` — 提供 `configuredAgentIdentities` + `desktopStartup` 服务。
- `src/index.js` — surface：订阅 `session/event`，把 turn/chunk/… 流式写成
  JSONL；从 stdin 读首个用户输入，`turn/end` 后 dispose 退出。

零依赖、零 build（纯 ESM JS，`@deepseek-ai/*` 运行时经 `healProfilesModuleFallback`
在 `$DSH_HOME/profiles/node_modules` 的符号链接解析）。

## 安装

```powershell
dsh plugin --profile desktop add link:D:\workbench\projects\dsh-tui\dsh-desktop
```

## 跑一次

```powershell
"列一下当前目录并一句话总结" | dsh --profile desktop
```

stdout 会吐 JSONL：`turn/start` → `delta`(text/reasoning) → `message` →
`turn/end`。

## 下一步：Electron 窗口

把 `src/index.js` 里 `emit` 的目标从 `process.stdout` 换成一个真正的 renderer
即可。最省事的桥是**旁车进程**：Electron 主进程 spawn
`dsh --profile desktop`，读 stdout 的 JSONL 渲染到窗口，把用户输入写回 stdin。
DSH 进程与窗口进程彻底解耦，跨平台（Windows/macOS/Linux）。
