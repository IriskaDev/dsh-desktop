# dsh-desktop

Languages: English | [简体中文](./README.zh-CN.md)

> DSH desktop surface: one command starts DSH + the web server + a native Electron window, reusing the DSH Web UI with zero customization.

## Overview

`dsh-desktop` is a DSH bundle patch plugin (`cordis.patch.yml`) that provides a surface named `desktop`. When DSH boots with the `desktop` profile, the plugin waits for the web server to bind its port and then launches a native Electron window that loads the DSH Web UI at `http://127.0.0.1:<port>`.

Unlike `dsh web`, which only starts the web server and requires you to open a browser manually, `dsh --profile desktop` ships with the agent, web server, and Electron window out of the box. The web server binds an OS-assigned free port (`port 0`), so it never collides with `dsh web`'s default `3080`.

## Features

- **One command, ready to use**: `dsh --profile desktop` opens the desktop window automatically — no need to visit the browser.
- **Port isolation**: the web server binds `port 0` (OS-assigned), avoiding conflicts with `dsh web`'s default `3080`.
- **Frameless native window**: the native title bar is removed; a preload script injects a top drag strip and a custom close button in the top-right corner.
- **Bidirectional shutdown cleanup**:
  - Closing the Electron window makes DSH dispose itself (shutting down the web server and agent), leaving no orphan processes;
  - If the DSH parent process exits, Electron detects it every 2 seconds and quits, leaving no orphan windows.

## How It Works

```text
dsh --profile desktop
        │
        ▼
DSH boot (web-app bundle + desktop patch)
        │  webServer binds 127.0.0.1:<OS-assigned free port>
        ▼
src/index.js apply(ctx)
        │  after the loader settles, reads ctx.webServer.port and builds the loopback URL
        ▼
spawn electron apps/electron/main.js
        │  URL and parent PID are passed via environment variables (avoids Electron CLI arg parsing crashes)
        ▼
Electron creates a frameless BrowserWindow and loads http://127.0.0.1:<port>
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
- Apart from Electron, DSH host modules such as `webServer` are resolved by the DSH runtime, so this package declares no runtime dependencies.

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
│   ├── index.js               # desktop surface plugin: launches Electron once webServer is ready
│   └── startup.js             # session-identity helper (not referenced by the current patch)
├── apps/electron/
│   ├── main.js                # Electron main process: frameless window, close IPC, parent liveness probe
│   ├── preload.cjs            # preload: injects the top drag strip + custom close button
│   └── package.json           # Electron app metadata
├── test/
│   ├── index.test.js
│   └── startup.test.js
├── scripts/
│   └── package.mjs            # packages the Electron runtime + creates release archives
├── dist/                      # build output (git-ignored; generated by npm run package / dist)
├── cordis.patch.yml           # DSH bundle patch: desktop plugin + webServer port + llm-deepseek defaults
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
| `DSH_ELECTRON_URL` | URL loaded by Electron. The plugin sets it to `http://127.0.0.1:<port>`; standalone default is `http://127.0.0.1:3080` |
| `DSH_ELECTRON_PARENT_PID` | Parent process PID. Electron probes it every 2 seconds and quits when the parent exits. The plugin sets it to the DSH process PID; standalone default is `process.ppid` |

## License

[MIT](./LICENSE)
