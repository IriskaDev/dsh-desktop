# dsh-desktop

A DSH bundle-patch plugin that runs DSH's `main` agent in a standalone process and streams its session events to stdout as JSON Lines. The next layer is a native **Electron** window (cross-platform Windows / macOS / Linux) — a DSH desktop client that is neither a browser nor a TUI.

[中文文档](README.zh-CN.md)

## What it proves

It answers one question — *can DSH be driven by a plugin inside a separate process and rendered to any sink (including a native window)?* Yes. This repo is the thinnest layer that proves it. Next, the Electron shell swaps stdout for a real renderer.

## How it works

`cordis.patch.yml` wires three plugin layers:

1. `desktop-startup` (`src/startup.js`) — mints the session identity (`configuredAgentIdentities`) and exposes a `desktopStartup` service.
2. `agent-loop` — creates the `main` agent (`provider: deepseek-official`, `model: deepseek-v4-pro`).
3. `desktop` (`src/index.js`) — the surface: subscribes to `session/event`, streams turns/chunks to stdout as JSONL, sends the first prompt from stdin, and disposes the tree once the turn settles.

### JSONL protocol

```jsonl
{"type":"turn/start","turn":1}
{"type":"delta","kind":"reasoning","text":"..."}
{"type":"delta","kind":"text","text":"..."}
{"type":"message"}
{"type":"turn/end","reason":"completed"}
```

The Electron shell consumes this exact protocol.

## Install

Zero runtime dependencies, no build step (pure ESM JS). Link the plugin into a DSH profile:

```powershell
dsh plugin --profile desktop add link:D:\workbench\projects\dsh-desktop
```

## Run

```powershell
"summarize the current directory" | dsh --profile desktop
```

stdout emits JSONL: `turn/start` → `delta` (reasoning/text) → `message` → `turn/end`.

> A real streaming run needs `DEEPSEEK_API_KEY` in `~/.dsh/.credentials.yaml`.

## Develop

```powershell
npm install        # install dev tooling
npm test           # node --test (Node's built-in test runner)
npm run lint       # eslint
npm run format     # prettier --write
```

- Node.js `v26.2.0`, pnpm `11.21.0`
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint + husky.

## Next step: Electron shell

Replace the `emit` target in `src/index.js` from `process.stdout` to a real renderer. The simplest bridge is a **sidecar process**: the Electron main process spawns `dsh --profile desktop`, reads the JSONL on stdout, renders it in the window, and writes user input back to stdin. DSH and the window stay fully decoupled and cross-platform.

## License

[MIT](LICENSE)
