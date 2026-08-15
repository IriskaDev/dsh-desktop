import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import { createElectronWebServer } from './electron-web-server.js';
import { createParentIpcChannel } from './ipc-channel.js';

export const name = 'desktop';

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
 * The desktop surface: a native Electron window loading the DSH web UI with no
 * HTTP server. This plugin provides a `webServer`-shaped service that never
 * listens; `dsh-web-app` and `dsh-client-connection` register their routes
 * against it, and the Electron main process forwards renderer requests to
 * those routes over the fd-3 IPC pipe.
 */
export function apply(ctx) {
  const webServer = createElectronWebServer();
  ctx.provide('webServer', webServer);

  // The /api event downlinks (`mux` and `host`) are exposed by apiProxy as
  // async iterables. Register them as soon as apiProxy is available.
  const streams = new Map();
  const apiReady = new Promise((resolve, reject) => {
    try {
      ctx.inject(['apiProxy'], (apiCtx) => {
        streams.set('mux', apiCtx.apiProxy.events.mux);
        streams.set('host', apiCtx.apiProxy.events.host);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });

  const launch = () => {
    const electron = resolveElectron();
    const channels = new Set();
    if (!electron) {
      ctx.logger?.warn?.(
        'desktop: electron is not available; skipping Electron launch'
      );
      return;
    }

    // Local-only IPC transport: a named pipe (Windows) or Unix socket
    // (macOS/Linux). This is not a TCP listener; the renderer talks to the
    // host through Electron's own IPC plus this single parent<->main channel.
    const ipcPath =
      process.platform === 'win32'
        ? `\\\\.\\pipe\\dsh-desktop-${process.pid}-${randomUUID()}`
        : join(os.tmpdir(), `dsh-desktop-${process.pid}-${randomUUID()}.sock`);

    const ipcServer = net.createServer((socket) => {
      const channel = createParentIpcChannel(socket, {
        request: async (payload) => {
          const body =
            payload.bodyBase64 === undefined
              ? undefined
              : Buffer.from(payload.bodyBase64, 'base64');
          return webServer.dispatch({
            method: payload.method,
            path: payload.path,
            headers: {
              ...(payload.headers ?? {}),
              // The offline bridge has no browser HTTP carrier; the /api
              // browser-trust fence expects a loopback Host and no Origin
              // (Origin absent = non-browser caller on loopback).
              host: '127.0.0.1'
            },
            body
          });
        },
        subscribe: (streamName, send, done) => {
          const open = streams.get(streamName);
          if (open === undefined) {
            done();
            return () => {};
          }
          const abort = new AbortController();
          const frames = open(
            { rpcId: randomUUID(), payload: {} },
            abort.signal
          );
          const pump = (async () => {
            try {
              for await (const frame of frames) {
                if (abort.signal.aborted) break;
                send(frame);
              }
            } catch {
              // Stream closed; fall through.
            } finally {
              done();
            }
          })();
          return () => {
            abort.abort();
            void pump;
          };
        }
      });
      channels.add(channel);
      socket.on('close', () => channels.delete(channel));
    });

    ipcServer.on('error', (err) => {
      ctx.logger?.warn?.(`desktop: ipc server error: ${err.message}`);
    });

    ipcServer.listen(ipcPath, () => {
      const child = spawn(electron.electronPath, electron.args, {
        stdio: ['ignore', 'inherit', 'inherit'],
        env: {
          ...process.env,
          DSH_ELECTRON_MODE: 'offline',
          DSH_ELECTRON_IPC_PATH: ipcPath,
          DSH_ELECTRON_PARENT_PID: String(process.pid)
        }
      });

      child.on('error', (err) => {
        ctx.logger?.warn?.(
          `desktop: failed to launch Electron: ${err.message}`
        );
        ipcServer.close();
      });
      // When the window closes (Electron exits), shut down the whole dsh
      // instance so the agent and related services do not linger as orphans.
      child.on('exit', () => {
        for (const channel of channels) channel.close();
        ipcServer.close();
        const timer = setTimeout(() => process.exit(0), 2000);
        void ctx.root.fiber.dispose().then(() => {
          clearTimeout(timer);
          process.exit(0);
        });
      });
    });
  };

  // Defer until the loader settles so the webServer routes are registered.
  const settled = ctx.get('loader')?.await?.();
  const ready = Promise.all([settled ?? Promise.resolve(), apiReady]);
  void ready.then(
    () => {
      if (ctx.get('webServer') !== undefined) launch();
    },
    () => {}
  );
}
