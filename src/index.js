import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const name = 'desktop';
export const inject = ['webServer'];

const require = createRequire(import.meta.url);
const ELECTRON_MAIN = fileURLToPath(
  new URL('../apps/electron/main.js', import.meta.url)
);

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

    let electronPath;
    try {
      electronPath = require('electron');
    } catch {
      ctx.logger?.warn?.(
        'desktop: electron is not installed; skipping Electron launch'
      );
      return;
    }

    // Pass the URL and parent PID via env vars: Electron's CLI arg parsing can
    // crash (exit 0xFFFFFFFF) when it sees URL-like arguments.
    const child = spawn(electronPath, [ELECTRON_MAIN], {
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
