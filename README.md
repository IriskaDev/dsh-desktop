# dsh-desktop

A DSH bundle-patch plugin that launches a native **Electron** window (cross-platform Windows / macOS / Linux) loading the DSH web GUI — a DSH desktop client that is neither a browser tab nor a TUI.

[中文文档](README.zh-CN.md)

## What it is

When DSH starts with this plugin installed, its web server binds to a loopback port and the plugin opens an Electron window pointed at that URL. The agent still runs inside DSH; this plugin only adds the desktop window and keeps the two lifecycles in sync — closing the window shuts DSH down cleanly.

## How it works

The `desktop` plugin (`src/index.js`) injects `webServer` and waits for the loader to settle. Once the server has bound its port, it:

1. Resolves the Electron binary and spawns `apps/electron/main.js`, passing the loopback URL and parent PID through environment variables.
2. Opens a frameless window — the preload injects a drag strip and a custom close button — and loads the DSH web GUI.
3. On window close, disposes the DSH fiber and exits, leaving no orphan server or agent process.

`cordis.patch.yml` accompanies it by:

- binding the web server to `127.0.0.1` on an OS-assigned port, so it never collides with `dsh web` (which defaults to `3080`);
- setting DeepSeek thinking/reasoning defaults for the desktop surface.

## Install

No build step. Link the plugin into a DSH profile:

```powershell
dsh plugin --profile desktop add link:<path-to-dsh-desktop>
```

## Run

```powershell
dsh --profile desktop
```

An Electron window opens with the DSH web GUI.

## Develop

```powershell
npm install        # install dev tooling
npm test           # node --test (Node's built-in test runner)
npm run lint       # eslint
npm run format     # prettier --write
```

- Node.js `v26.2.0`, pnpm `11.21.0`
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint + husky.

## License

[MIT](LICENSE)
