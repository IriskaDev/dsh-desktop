# dsh-desktop

Languages: English | [简体中文](./README.zh-CN.md)

> DSH desktop surface: one command starts DSH + a native Electron window with no local HTTP server, reusing the DSH Web UI with zero customization.

## Overview

`dsh-desktop` is a DSH bundle patch plugin (`cordis.patch.yml`) that provides a surface named `desktop`. When DSH boots with the `desktop` profile, the plugin disables DSH's `node:http` web server, provides a non-listening `webServer`-shaped service, and launches a native Electron window that loads the DSH Web UI through a custom `dsh-desktop://` protocol.

Unlike `dsh web`, which starts a local HTTP server and requires you to open a browser manually, `dsh --profile desktop` reuses the entire DSH Web frontend and Cordis services with **no TCP listener**: Electron loads the frontend through a custom protocol, and `fetch` plus the event streams are bridged over IPC to the host process.

## Features

- **One command, ready to use**: `dsh --profile desktop` opens the desktop window automatically — no need to visit the browser.
- **No local HTTP server**: no `node:http` and no TCP listening port; static assets, APIs, and event streams all travel over Electron IPC / custom protocol.
- **Full DSH Web reuse**: the frontend UI, session/workspace persistence, agent, and tools are all provided by DSH's existing Cordis services.
- **Frameless native window**: the native title bar is removed; a preload script injects a top drag strip and a custom close button in the top-right corner.
- **Bidirectional shutdown cleanup**:
  - Closing the Electron window makes DSH dispose itself (shutting down the agent and related services), leaving no orphan processes;
  - If the DSH parent process exits, Electron detects it every 2 seconds and quits, leaving no orphan windows.

## How It Works

```text
dsh --profile desktop
        │
        ▼
DSH boot (web-app bundle + desktop patch)
        │  patch disables dsh-host-webserver;
        │  the desktop plugin provides a non-listening webServer-shaped service
        ▼
src/index.js apply(ctx)
        │  after the loader settles, spawns Electron and establishes an fd-3 pipe RPC
        ▼
Electron creates a frameless BrowserWindow and loads dsh-desktop://app/
        │  the main process forwards static/API requests over fd-3 to DSH
        ▼
preload.cjs bridges fetch/WebSocket → ipcRenderer → main process → fd-3 → DSH services
        │
        ▼
preload.cjs injects the top drag strip + custom close button
```

## Requirements

- Node.js 24+ (the repo is pure ESM, `"type": "module"`)
- npm (for installing dependencies and running development scripts)
- DSH CLI (`dsh`, rc.6 or later recommended)
- Model credentials configured in DSH before running real sessions (e.g. `DEEPSEEK_API_KEY`)

## Installation

### Option 1: Download a release (recommended, no npm install)

1. Download the archive matching your system from the [Releases](../../releases) page,
   e.g. `dsh-desktop-0.1.0-win32-x64.zip` (Windows),
   `dsh-desktop-0.1.0-linux-x64.tar.gz` (Linux), or
   `dsh-desktop-0.1.0-darwin-*` (macOS).
2. Extract it anywhere.
3. Link the extracted directory into DSH's desktop profile:

```bash
# Windows
dsh plugin --profile desktop add link:D:\path\to\dsh-desktop-0.1.0-win32-x64

# macOS / Linux
dsh plugin --profile desktop add "link:/path/to/dsh-desktop-0.1.0-linux-x64"
```

Release archives bundle a platform-specific Electron runtime under
`dist/electron/runtime/`, and the plugin prefers it, so **no `npm install` is
required**.

### Option 2: Install from source (development)

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd dsh-desktop

# 2. Install development dependencies (includes Electron; this package has no dependencies)
npm install

# 3. Link this plugin into DSH's desktop profile
# Windows
dsh plugin --profile desktop add link:D:\path\to\dsh-desktop

# macOS / Linux
dsh plugin --profile desktop add "link:$(pwd)"
```

Notes:

- `dsh plugin add` forwards the remaining arguments to pnpm inside the profile directory, so pnpm's `link:` protocol is supported.
- In development the plugin resolves `electron` from this repo's `node_modules` (so step 2, `npm install`, is required); if that is missing, it falls back to the packaged Electron runtime under `dist/electron/runtime/`.
- Apart from Electron, DSH host modules (the web frontend, `dsh-web-app`, `dsh-client-connection`, `dsh-host-apiproxy`, etc.) are resolved by the DSH runtime, so this package declares no runtime dependencies.

## Usage

```bash
dsh --profile desktop
```

After startup, the Electron window opens automatically and loads the DSH Web UI — just chat in the window.

To inspect arguments forwarded to the web app:

```bash
dsh --profile desktop --help
```

## Development

Run from the repository root:

| Command | Description |
|------|------|
| `npm test` | Run `node:test` unit tests |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier formatting |
| `npm run format:check` | Prettier format check (same as CI) |
| `npm run package` | Package `apps/electron` into a platform Electron runtime under `dist/electron/runtime/` |
| `npm run dist` | Package the runtime and create a release archive under `dist/release/` (override with `-- --platform=win32 --arch=x64`) |

Commit conventions:

- Husky's `commit-msg` hook runs `commitlint`; commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/).
- GitHub Actions runs `lint`, `test`, and `format:check` on pushes and PRs to `main` (Node 24).

## Project Structure

```text
dsh-desktop/
├── src/
│   ├── index.js               # desktop surface plugin: provides the webServer-shaped service and launches Electron
│   ├── electron-web-server.js # non-listening webServer service: route registry + IPC dispatch + fallback
│   ├── ipc-channel.js         # DSH ↔ Electron main-process fd-3 framing + RPC
│   └── startup.js             # session-identity helper (not referenced by the current patch)
├── apps/electron/
│   ├── main.js                # Electron main process: dsh-desktop:// protocol, fd-3 RPC, frameless window
│   ├── preload.cjs            # preload: fetch/WebSocket bridge + top drag strip + custom close button
│   └── package.json           # Electron app metadata
├── test/
│   ├── index.test.js
│   ├── electron-web-server.test.js
│   ├── ipc-channel.test.js
│   └── startup.test.js
├── scripts/
│   └── package.mjs            # packages the Electron runtime + creates release archives
├── dist/                      # build output (git-ignored; generated by npm run package / dist)
├── cordis.patch.yml           # DSH bundle patch: desktop plugin + disables webserver + suppresses fake URL
├── package.json               # package metadata, npm scripts, dsh.bundle.patch pointer
├── eslint.config.js
├── .prettierrc.json
├── commitlint.config.js
├── .husky/commit-msg          # Conventional Commits gate
├── .github/workflows/ci.yml   # CI: lint + test + format check
├── .agent-workflow/           # Dev Agent Workflow docs
└── LICENSE                    # MIT
```

## Environment Variables

The plugin sets the following variables automatically when launching Electron; they only need to be set manually when running `apps/electron` standalone.

| Variable | Description |
|------|------|
| `DSH_ELECTRON_MODE` | Set to `offline` by the plugin; makes the Electron main process use the `dsh-desktop://` protocol and the fd-3 IPC bridge |
| `DSH_ELECTRON_IPC_FD` | File descriptor number for the DSH ↔ Electron pipe (default `3`) |
| `DSH_ELECTRON_PARENT_PID` | Parent process PID. Electron probes it every 2 seconds and quits when the parent exits. The plugin sets it to the DSH process PID; standalone default is `process.ppid` |
| `DSH_ELECTRON_URL` | URL loaded by Electron when running `apps/electron` standalone in non-offline mode; default `http://127.0.0.1:3080` |

## License

[MIT](./LICENSE)
