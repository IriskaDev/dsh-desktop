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
import { createRemoteStreamFactory } from './remote-stream.js';

export const name = 'desktop';

const DESKTOP_ORIGIN = 'dsh-desktop://127.0.0.1';
const require = createRequire(import.meta.url);
const ELECTRON_MAIN = fileURLToPath(
  new URL('../apps/electron/main.js', import.meta.url)
);
const PACKAGED_RUNTIME_DIR = fileURLToPath(
  new URL('../dist/electron/runtime', import.meta.url)
);

/**
 * Longest Unix socket path `listen()` accepts. macOS `sockaddr_un.sun_path`
 * is a fixed-size buffer, and the default per-user tmpdir
 * (`/var/folders/<x>/<hash>/T`) plus the generated socket name overflows it,
 * which `listen()` rejects with `EINVAL`.
 */
const MAX_UNIX_SOCKET_PATH_BYTES = 104;

/** Fallback socket directory for tmpdirs too long to hold a socket path. */
const SHORT_IPC_DIR = '/tmp';

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
 * Resolve the local-only IPC path: a named pipe on Windows, a Unix socket
 * elsewhere. The socket path falls back to a short directory when `os.tmpdir()`
 * would push it past {@link MAX_UNIX_SOCKET_PATH_BYTES}; otherwise `listen()`
 * fails with `EINVAL` on macOS before Electron is ever spawned.
 * @param platform - the platform to resolve for; defaults to the current one.
 * @param tmpdir - the candidate directory; defaults to `os.tmpdir()`.
 * @returns the IPC path, shared with Electron through the environment.
 */
export function resolveIpcPath(
  platform = process.platform,
  tmpdir = os.tmpdir()
) {
  const stem = `dsh-desktop-${process.pid}-${randomUUID()}`;
  if (platform === 'win32') return `\\\\.\\pipe\\${stem}`;
  const name = `${stem}.sock`;
  const preferred = join(tmpdir, name);
  return Buffer.byteLength(preferred) > MAX_UNIX_SOCKET_PATH_BYTES
    ? join(SHORT_IPC_DIR, name)
    : preferred;
}

/**
 * Report a desktop-surface startup failure to the host logger and to stderr.
 * These failures all happen before a window exists, so a host-only log leaves
 * `dsh --profile dsh-desktop` looking alive while nothing happens on screen.
 * @param ctx - the plugin context whose logger receives the message.
 * @param message - the failure description, already scoped to this plugin.
 */
export function reportStartupFailure(ctx, message) {
  ctx.logger?.warn?.(message);
  process.stderr.write(`${message}\n`);
}

/**
 * Resolve the authenticated root URL for the desktop window. DSH 0.1.2
 * requires the process launch token on the first root request; Connection
 * exchanges it for a host-bound cookie before serving the frontend.
 */
export function resolveDesktopUrl(ctx) {
  const baseUrl = `${DESKTOP_ORIGIN}/`;
  const connection = ctx.get?.('connection');
  if (typeof connection?.authenticatedUrl === 'function') {
    try {
      const authenticated = connection.authenticatedUrl(baseUrl);
      if (typeof authenticated === 'string' && authenticated.length > 0) {
        return authenticated;
      }
    } catch {
      // Fall back to the unauthenticated root; the browser will surface any
      // 401 instead of hanging with a missing ready frame.
    }
  }
  return baseUrl;
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

  // DSH 0.1.2 removed ApiProxy. The desktop surface forwards Remote streams
  // (including the application `$events` stream) through the Typert Gateway.
  const remoteStreams = createRemoteStreamFactory(ctx);

  const channels = new Set();
  const sockets = new Set();
  let child;
  let ipcServer;
  let ready = false;
  let readyFailed = false;
  let desktopUrl = resolveDesktopUrl(ctx);

  const sendReady = (socket, url) => {
    if (!ready || socket.destroyed) return;
    try {
      sendFrame(socket, {
        type: 'ready',
        ...(url === undefined ? {} : { url })
      });
    } catch {
      // The socket may have closed between the destroyed check and the write.
    }
  };

  const launch = () => {
    const electron = resolveElectron();
    if (!electron) {
      reportStartupFailure(
        ctx,
        'desktop: electron is not available; skipping Electron launch'
      );
      return;
    }

    // Local-only IPC transport: a named pipe (Windows) or Unix socket
    // (macOS/Linux). This is not a TCP listener; the renderer talks to the
    // host through Electron's own IPC plus this single parent<->main channel.
    const ipcPath = resolveIpcPath();

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
        subscribe: (streamName, send, done, payload) => {
          if (streamName !== 'remote-mux') {
            done();
            return () => {};
          }
          const abort = new AbortController();
          const endpoint = payload?.endpoint;
          if (typeof endpoint !== 'string' || endpoint.length === 0) {
            send({
              kind: 'error',
              error: { message: 'remote-mux: stream endpoint is required' }
            });
            done();
            return () => {};
          }
          const pump = (async () => {
            try {
              const frames = await remoteStreams.open(
                endpoint,
                payload?.payload ?? { args: {} },
                abort.signal
              );
              try {
                for await (const frame of frames) {
                  if (abort.signal.aborted) break;
                  send({ kind: 'item', value: frame });
                }
              } finally {
                if (!abort.signal.aborted) send({ kind: 'end' });
              }
            } catch (error) {
              if (!abort.signal.aborted) {
                send({
                  kind: 'error',
                  error: {
                    message:
                      error instanceof Error ? error.message : String(error)
                  }
                });
              }
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
      sendReady(socket, desktopUrl);
    });

    ipcServer.on('error', (err) => {
      reportStartupFailure(ctx, `desktop: ipc server error: ${err.message}`);
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
        reportStartupFailure(
          ctx,
          `desktop: failed to launch Electron: ${err.message}`
        );
        ipcServer.close();
      });
      // When the window closes (Electron exits), shut down the whole dsh
      // instance so the agent and related services do not linger as orphans.
      child.on('exit', () => {
        for (const channel of channels) channel.close();
        ipcServer.close();
        // A loader/gateway boot failure already owns the DSH error path;
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
  // and the Typert Remote gateway is available.
  const settled = Promise.resolve().then(() => ctx.get('loader')?.await?.());
  void Promise.all([settled, remoteStreams.ready]).then(
    () => {
      if (ctx.get('webServer') === undefined) return;
      desktopUrl = resolveDesktopUrl(ctx);
      ready = true;
      for (const socket of [...sockets]) sendReady(socket, desktopUrl);
    },
    () => {
      readyFailed = true;
      for (const socket of [...sockets]) socket.destroy();
      ipcServer?.close();
      child?.kill();
    }
  );
}
