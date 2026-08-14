<!-- MODULE: project-overview -->
<!-- STATUS: DONE -->
<!-- LAST_ANALYZED: 2026-08-15 -->
<!-- ANALYZER_VERSION: 1.0 -->

# 项目说明

> 项目基本信息、技术栈、架构概览和核心依赖说明。

---

## 概述

<!-- CONTENT_START: overview -->
**dsh-desktop** 是一个 DSH bundle patch 插件：把 DSH 的 `main` agent 跑在独立进程里，把 session 事件流式打成 JSON Lines（stdout）。当前是最薄的一层验证（证明「DSH 能通过插件跑在独立进程、渲染到任意 sink」），下一层接 Electron 原生窗口，做成一个非浏览器、非 TUI 的 DSH 桌面客户端。

- **项目名称**：`dsh-desktop`（`package.json` name 字段）
- **项目用途**：验证并落地「DSH main agent 独立进程 + JSONL 事件流 → Electron 原生窗口」的桌面客户端路线
- **核心功能**：`desktop-startup`（铸 session 身份）→ `agent-loop`（建 main agent）→ `desktop`（surface，流式输出 JSONL）
<!-- CONTENT_END: overview -->

---

## 技术栈

<!-- CONTENT_START: tech_stack -->
- **编程语言**：JavaScript（纯 ESM，`"type": "module"`），无 TypeScript
- **运行时**：Node.js `v26.2.0`；DSH `rc.6`（`@deepseek-ai/dsh`）
- **核心框架 / 库**：无第三方运行时依赖（零依赖）。`@deepseek-ai/*` 运行时经 `healProfilesModuleFallback` 在 `$DSH_HOME/profiles/node_modules` 符号链接解析
- **包管理器**：pnpm `11.21.0`（profile 侧 `pnpm-workspace.yaml` 设 `autoInstallPeers: false`）
- **构建工具**：无（零 build，纯 ESM JS 直接运行）
- **环境要求**：`DSH_HOME` 指向 `~/.dsh`；真实流式需 `DEEPSEEK_API_KEY`（存于 `~/.dsh/.credentials.yaml`）
<!-- CONTENT_END: tech_stack -->

---

## 架构概览

<!-- CONTENT_START: architecture -->
- **整体架构**：扁平单包（非 Monorepo、非微服务），一个 DSH bundle patch 插件
- **插件三层**（`cordis.patch.yml`）：
  1. `desktop-startup`（`src/startup.js`）— `ctx.provide('configuredAgentIdentities', { main: { id: sessionId, resume: false } })` + `ctx.provide('desktopStartup', { sessionId })`
  2. `agent-loop`（`inject: [desktopStartup]`）— `agents: [{ id: 'main', provider: 'deepseek-official', model: 'deepseek-v4-pro', cwd: process.cwd() }]`
  3. `desktop`（`inject: ['agents', 'desktopStartup']`，`src/index.js`）— surface 本体
- **数据流向**：用户输入（stdin / `config.prompt`）→ `agent.followup()` 发给 main agent → `session/event` 事件 → `emit()` 打成 JSONL 写 stdout → `turn/end` 后 dispose 退出
<!-- CONTENT_END: architecture -->

---

## 目录结构说明

<!-- CONTENT_START: directory_structure -->
```
项目根目录/
├── src/
│   ├── startup.js        # desktop-startup 服务：铸 session 身份
│   └── index.js          # desktop surface：订阅 session/event，输出 JSONL
├── cordis.patch.yml      # bundle patch（三层插件编排）
├── package.json          # 插件包元数据（dsh.bundle.patch 指向 patch）
├── README.md             # 项目说明与运行方式
├── PLAN.md               # 决策固化与续接说明
├── AGENTS.md             # Dev Agent Workflow 入口
├── .agent-workflow/      # 16 流程工作流模板
├── LICENSE               # MIT
└── .gitignore
```
<!-- CONTENT_END: directory_structure -->

---

## 核心依赖

<!-- CONTENT_START: dependencies -->
本项目**零运行时依赖**（`package.json` 无 `dependencies` / `devDependencies` / `peerDependencies` 声明）。

| 依赖名称 | 版本 | 用途 |
|---------|------|------|
| （无第三方依赖） | - | 仅用 Node 内置 `node:crypto` 的 `randomUUID` |

> `@deepseek-ai/*`（agent-loop 等）由 DSH 运行时经 `healProfilesModuleFallback` 解析，不在本包依赖声明内。
<!-- CONTENT_END: dependencies -->

---

## 主要开发者

<!-- CONTENT_START: main_developers -->
> 由 `git log` 统计（共 2 次提交）；无 `CODEOWNERS` 文件。

| 姓名 | 邮箱 | 负责模块 | 说明 |
|------|------|---------|------|
| IriskaDev | yet.iriska@gmail.com | 整体（全部） | 唯一提交者 / 项目 Owner |

> 💡 提交统计：`IriskaDev <yet.iriska@gmail.com>` 2 次（100%）。
<!-- CONTENT_END: main_developers -->

---

## 相关文件

<!-- CONTENT_START: related_files -->
- `package.json` — 包元数据、ESM 声明、dsh bundle 配置
- `README.md` — 项目说明与安装/运行方式
- `cordis.patch.yml` — 插件编排（三层）
- `src/startup.js`、`src/index.js` — 插件源码
- `PLAN.md` — 决策与续接说明
- `AGENTS.md`、`.agent-workflow/` — 研发工作流
<!-- CONTENT_END: related_files -->

---

## 备注

<!-- CONTENT_START: notes -->
<!-- CONTENT_END: notes -->

---

<!-- DETECTION_HINTS:
  探测规则（Agent 分析时使用）：
  - 检查文件: README.md, README, readme.md
  - 检查文件: package.json, go.mod, go.sum, Cargo.toml, pom.xml, build.gradle, requirements.txt, Pipfile, pyproject.toml, composer.json, Gemfile, mix.exs, pubspec.yaml
  - 检查文件: .nvmrc, .python-version, .ruby-version, .tool-versions, .node-version
  - 检查文件: tsconfig.json, webpack.config.*, vite.config.*, rollup.config.*
  - 检查文件: Dockerfile, docker-compose.yml
  - 检查目录: src/, lib/, app/, cmd/, pkg/, internal/
  - 提取信息: 项目名称(name字段), 描述(description字段), 版本(version字段), 依赖列表(dependencies), 语言版本
  - 主要开发者分析: 执行 git log --format='%ae %an' | sort | uniq -c | sort -rn | head -10 统计提交频次最高的开发者
  - 主要开发者分析: 检查 CODEOWNERS 文件，提取各路径的 Owner 列表
  - 主要开发者分析: 两种来源合并去重后填入"主要开发者"表格，标注负责模块（来自 CODEOWNERS）
-->
