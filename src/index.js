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
import { createParentIpcChannel, sendFrame } from './ipc-channel.js';

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
  const webServer = createElectronWebServer(ctx);
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

  const channels = new Set();
  const sockets = new Set();
  let child;
  let ipcServer;
  let ready = false;
  let readyFailed = false;

  const sendReady = (socket) => {
    if (!ready || socket.destroyed) return;
    try {
      sendFrame(socket, { type: 'ready' });
    } catch {
      // The socket may have closed between the destroyed check and the write.
    }
  };

  const launch = () => {
    const electron = resolveElectron();
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

    ipcServer = net.createServer((socket) => {
      sockets.add(socket);
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
      socket.on('close', () => {
        sockets.delete(socket);
        channels.delete(channel);
      });
      // If the parent finished booting before this socket connected, the
      // shell would otherwise wait forever; deliver the ready frame now.
      sendReady(socket);
    });

    ipcServer.on('error', (err) => {
      ctx.logger?.warn?.(`desktop: ipc server error: ${err.message}`);
    });

    ipcServer.listen(ipcPath, () => {
      child = spawn(electron.electronPath, electron.args, {
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
        // A loader/apiProxy boot failure already owns the DSH error path;
        // exiting here would mask it with a clean 0 exit.
        if (readyFailed) return;
        const timer = setTimeout(() => process.exit(0), 2000);
        void ctx.root.fiber.dispose().then(() => {
          clearTimeout(timer);
          process.exit(0);
        });
      });
    });
  };

  // Launch Electron immediately: its cold start now overlaps with the DSH
  // loader settling. The shell waits for the `ready` frame before loadURL,
  // so routes are still registered before the first request.
  launch();

  // Send `ready` once the loader has settled (webServer routes registered)
  // and the apiProxy event streams are available.
  const settled = Promise.resolve().then(() => ctx.get('loader')?.await?.());
  void Promise.all([settled, apiReady]).then(
    () => {
      if (ctx.get('webServer') === undefined) return;
      ready = true;
      for (const socket of [...sockets]) sendReady(socket);
    },
    () => {
      readyFailed = true;
      for (const socket of [...sockets]) socket.destroy();
      ipcServer?.close();
      child?.kill();
    }
  );
}
