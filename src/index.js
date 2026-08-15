import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'desktop';
export const inject = ['webServer'];

const require = createRequire(import.meta.url);
const ELECTRON_MAIN = fileURLToPath(
  new URL('../apps/electron/main.js', import.meta.url)
);
const PACKAGED_RUNTIME_DIR = fileURLToPath(
  new URL('../dist/electron/runtime', import.meta.url)
);

function packagedElectronPath() {
  if (process.platform === 'win32') {
    return join(PACKAGED_RUNTIME_DIR, 'dsh-desktop-electron.exe');
  }
  if (process.platform === 'darwin') {
    return join(
      PACKAGED_RUNTIME_DIR,
      'dsh-desktop-electron.app',
      'Contents',
      'MacOS',
      'dsh-desktop-electron'
    );
  }
  return join(PACKAGED_RUNTIME_DIR, 'dsh-desktop-electron');
}

/**
 * Resolve how to launch Electron:
 * - DSH_ELECTRON_BIN: explicit override (packaged app, no extra args).
 * - node_modules/electron: development checkout.
 * - dist/electron/runtime: packaged runtime shipped in a release archive.
 */
function resolveElectron() {
  if (process.env.DSH_ELECTRON_BIN) {
    return { electronPath: process.env.DSH_ELECTRON_BIN, args: [] };
  }
  try {
    return { electronPath: require('electron'), args: [ELECTRON_MAIN] };
  } catch {
    // Fall through to the packaged runtime.
  }
  const packagedPath = packagedElectronPath();
  if (existsSync(packagedPath)) {
    return { electronPath: packagedPath, args: [] };
  }
  return null;
}

/**
 * The desktop surface: once the web server binds, launch an Electron window
 * loading the DSH web GUI at the bound loopback URL. The agent is driven by the
 * web-app bundle's dsh-base layer; this plugin only adds the Electron launcher.
 */
export function apply(ctx) {
  const launch = () => {
    const port = ctx.webServer?.port;
    if (port === undefined) {
      ctx.logger?.warn?.(
        'desktop: webServer port unavailable; skipping Electron launch'
      );
      return;
    }
    const url = `http://127.0.0.1:${String(port)}`;

    const electron = resolveElectron();
    if (!electron) {
      ctx.logger?.warn?.(
        'desktop: electron is not available; skipping Electron launch'
      );
      return;
    }

    // Pass the URL and parent PID via env vars: Electron's CLI arg parsing can
    // crash (exit 0xFFFFFFFF) when it sees URL-like arguments. Packaged apps
    // already bundle main.js, so they are spawned without extra args.
    const child = spawn(electron.electronPath, electron.args, {
      stdio: 'ignore',
      env: {
        ...process.env,
        DSH_ELECTRON_URL: url,
        DSH_ELECTRON_PARENT_PID: String(process.pid)
      }
    });
    child.on('error', (err) => {
      ctx.logger?.warn?.(`desktop: failed to launch Electron: ${err.message}`);
    });
    // When the window closes (Electron exits), shut down the whole dsh instance
    // so the web server and agent do not linger as orphans.
    child.on('exit', () => {
      const timer = setTimeout(() => process.exit(0), 2000);
      void ctx.root.fiber.dispose().then(() => {
        clearTimeout(timer);
        process.exit(0);
      });
    });
  };

  // Defer until the loader settles so the webServer has bound its port.
  const settled = ctx.get('loader')?.await?.();
  if (settled === undefined) {
    launch();
  } else {
    settled.then(
      () => {
        if (ctx.get('webServer') !== undefined) launch();
      },
      () => {}
    );
  }
}
