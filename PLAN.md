# dsh-desktop · 项目计划与续接说明

> 用途：把「已定决策 + 当前现状 + 下一步计划 + 续接方法」固化在一处。到新工作区/新会话，直接读这份（配合根目录 `AGENTS.md`）即可续接，不必重复授权、重复摸索。
> 最后更新：2026-08-14

## 1. 一句话定位

**dsh-desktop = 一个 DSH bundle patch 插件**：把 DSH 的 `main` agent 跑在独立进程里、把 session 事件流式打成 JSON Lines；下一层接 **Electron 原生窗口**（跨平台 Windows/macOS/Linux），做成一个「不是浏览器、不是 TUI」的 DSH 桌面客户端。

## 2. 已定决策（不要再纠结，直接沿用）

| 决策 | 结论 |
|---|---|
| 用 dsh-tui 吗 | ❌ 不 fork、不改它源码（社区项目、跟着 dsh rc 线抖） |
| 用 web 吗 | ❌ 不要浏览器/网页 |
| 用 TUI 吗 | ❌ 不是终端 UI |
| 走什么路线 | ✅ 自写 surface 插件（= dsh-desktop）+ Electron 原生窗口 |
| 研发工作流 | ✅ Dev Agent Workflow（`AGENTS.md` + `.agent-workflow/`） |
| 工作流指令文件名 | ✅ `AGENTS.md`（DSH 原生就吃这个，与 Codex/Claude 同名同源，无需改名） |

## 3. 当前资产（都在哪、什么状态）

- **项目根**：`D:\workbench\projects\dsh-desktop`
- **Git**：已 init，分支 `main`，首次提交 `452315a`（`452315ae4df247cf077519c447db252581fee5ba`）
- **GitHub**：公开仓库 `https://github.com/IriskaDev/dsh-desktop`；`origin` 已设，`main` 已 push
- **gh CLI**：`D:\tools\gh\bin\gh.exe`（已写入用户 PATH；账号 `IriskaDev` 已登录，keyring，HTTPS 协议）
- **插件源码**：`src/startup.js` + `src/index.js`（零依赖、零 build、纯 ESM JS）
- **真实 profile**：`~/.dsh/profiles/desktop`，`link:` 指向本项目（已正确）
- **工作流**：`AGENTS.md` + `.agent-workflow/`（16 流程，阶段一 0/100 待 bootstrap）

## 4. 已验证的技术配方（最值钱的部分，抄走直接用）

### 插件三层（`cordis.patch.yml`）

1. `desktop-startup`（`src/startup.js`）：
   - `ctx.provide('configuredAgentIdentities', { main: { id: sessionId, resume: false } })`
   - `ctx.provide('desktopStartup', { sessionId })`
   - 其中 `sessionId = \`desktop-session-${randomUUID()}\``（`SessionId` 是编译期 brand，运行时就是个字符串）
2. `agent-loop`（`inject: [desktopStartup]`）：
   - `config.agents = [{ id: 'main', provider: 'deepseek-official', model: 'deepseek-v4-pro', cwd: !!js process.cwd() }]`
3. `desktop`（`inject: ['agents', 'desktopStartup']`）：surface 本体。

### 关键 API

- 等 agent：`ctx.on('agent/created', ({agent}) => start(agent))`，匹配 `agent.id === sessionId`（agent 的 id 就是 session id）
- 发消息：`agent.followup({ id: randomUUID(), role: 'user', content: [{ type: 'text', text }], source: { kind: 'user' } })`
- 订阅事件：`ctx.on('session/event', (session, event) => …)`，先过滤 `session === agent.session`
  - `assistant/chunk` → `event.data.chunk`（`text-delta` / `reasoning-delta`，取 `.text`）
  - `assistant/message` / `turn/start` / `turn/end`（`event.data.reason.kind`）
- 收尾退出：`ctx.root.fiber.dispose().then(() => process.exit(0))`（加个 timeout 兜底）

### JSONL 输出协议（Electron 就消费这个）

```
{"type":"turn/start","turn":N}
{"type":"delta","kind":"text"|"reasoning","text":"..."}
{"type":"message"}
{"type":"turn/end","reason":"completed"|"error"|...,"error":"..."}
```

### 运行

```powershell
"帮我看看当前目录" | dsh --profile desktop
```

已端到端验证流式通过（reasoning + text 都逐 token 出）。

### 关键机制备忘

- `SessionId` / `MessageId` 是编译期 brand（恒等函数），运行时 `randomUUID()` 即可，无需 import。
- `CONFIGURED_AGENT_IDENTITIES_KEY = 'configuredAgentIdentities'`（agent-loop 读它给每个 agent 定 session id）。
- `@deepseek-ai/*` 运行时经 `healProfilesModuleFallback` 在 `$DSH_HOME/profiles/node_modules` 建符号链接解析；profile 的 `pnpm-workspace.yaml` 有 `autoInstallPeers: false`，所以插件 peer 依赖不会被装进 profile。
- patch 语义：`- id: X` 是「改已存在行」（`config` 整体替换、`name`/`inject` 保留）；新行必须放 `insert:` 列表。

## 5. 下一步计划（按序）

1. **Electron 外壳（核心下一步）**：在 `electron/`（或 `apps/electron/`）建：
   - main 进程 spawn `dsh --profile desktop`；
   - 读 stdout 的 JSONL 渲染到窗口（正文 + reasoning + 状态）；
   - 用户输入写回 stdin（「旁车进程」桥，DSH 与窗口彻底解耦）。
   - 依赖：`electron`（`npm i -D electron`），main 进程就是 Node，可直接 `spawn`。
2. **阶段一 bootstrap**：跑「分析项目工作流」，把 01-13 流程按真实情况填掉；编译/测试/CI 等 Electron 基建落地后再补实。
3. 逐步做成完整桌面客户端（消息流、reasoning 折叠、工具卡、审批/提问弹窗）。

## 6. 新会话续接（重点：免重复授权）

- **把新会话的工作区设为 `D:\workbench\projects\dsh-desktop`** —— 之后项目内所有读写都在工作区内，**不再触发授权**。
- 仍会触发授权的少数场景（都很少发生）：
  - 写 `~/.dsh`（改 profile 配置 / 重新 `dsh plugin`）；
  - 写 `D:\tools`（装新工具）；
  - choco 装东西（需要 Windows 管理员提权，沙箱给不了）。
- **gh 用法**：沙箱进程的 PATH 是启动时缓存的，命令里用全路径 `D:\tools\gh\bin\gh.exe`；你自己终端里可直接敲 `gh`。
- git 身份已配：`IriskaDev / yet.iriska@gmail.com`；gh 已登录 IriskaDev（HTTPS）。

## 7. 环境速查

- dsh：`C:\Users\IriskaDev\AppData\Local\nvm\v26.2.0\node_modules\@deepseek-ai\dsh`（rc.6）
- `DSH_HOME`：`C:\Users\IriskaDev\.dsh`
- Node `v26.2.0`，pnpm `11.21.0`
- 模型 `deepseek-v4-pro`；`DEEPSEEK_API_KEY` 在 `~/.dsh/.credentials.yaml`（沙箱 env 里没有，跑真实流式要用真实 DSH_HOME）
- 参考源码（已不用，但可查配方）：`D:\workbench\projects\dsh-tui`
