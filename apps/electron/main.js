import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import net from 'node:net';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';

const offline = process.env.DSH_ELECTRON_MODE === 'offline';
const url = process.env.DSH_ELECTRON_URL ?? 'http://127.0.0.1:3080';
const parentPid = Number(process.env.DSH_ELECTRON_PARENT_PID ?? process.ppid);
const preload = fileURLToPath(new URL('./preload.cjs', import.meta.url));

const APP_PROTOCOL = 'dsh-desktop';
const APP_ORIGIN = `${APP_PROTOCOL}://app`;

// Must run before app.whenReady(); marks the custom scheme as a standard,
// secure origin so relative URLs, fetch, and subresource loading behave like
// they do under http(s).
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

// ---- fd-3 frame transport (offline mode only) -----------------------------
const HEADER = 4;

function createFrameStream(socket, onFrame) {
  let pending = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    pending = Buffer.concat([pending, chunk]);
    while (pending.length >= HEADER) {
      const length = pending.readUInt32LE(0);
      if (pending.length < HEADER + length) return;
      const body = pending.subarray(HEADER, HEADER + length);
      pending = pending.subarray(HEADER + length);
      try {
        onFrame(JSON.parse(body.toString('utf8')));
      } catch {
        // Ignore malformed frames.
      }
    }
  });
}

function sendFrame(socket, message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(HEADER);
  header.writeUInt32LE(body.length, 0);
  socket.write(Buffer.concat([header, body]));
}

class ParentRpc {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.eventHandlers = new Map();
    createFrameStream(socket, (message) => {
      if (message.type === 'response') {
        const pending = this.pending.get(message.id);
        if (pending === undefined) return;
        this.pending.delete(message.id);
        pending.resolve(message);
        return;
      }
      if (message.type === 'event') {
        const onFrame = this.eventHandlers.get(message.id);
        if (onFrame !== undefined) onFrame(message.frame);
      }
    });
  }

  request(payload) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      sendFrame(this.socket, { type: 'request', id, payload });
    });
  }

  subscribe(stream, onFrame) {
    const id = this.nextId++;
    this.eventHandlers.set(id, onFrame);
    sendFrame(this.socket, { type: 'subscribe', id, stream });
    return () => {
      this.eventHandlers.delete(id);
      sendFrame(this.socket, { type: 'unsubscribe', id });
    };
  }
}

let parentRpc;

function offlineRequest(payload) {
  return parentRpc.request(payload);
}

async function requestFromPayload(payload) {
  let bodyBase64;
  if (payload.body !== undefined) {
    bodyBase64 = Buffer.from(payload.body).toString('base64');
  }
  const response = await offlineRequest({
    method: payload.method,
    path: payload.url,
    headers: payload.headers ?? {},
    bodyBase64
  });
  return new Response(
    response.bodyBase64 === ''
      ? null
      : Uint8Array.from(Buffer.from(response.bodyBase64, 'base64')),
    {
      status: response.status,
      headers: response.headers
    }
  );
}

// ---- IPC wiring (offline mode) --------------------------------------------
const subscriptions = new Map();

function setupOfflineIpc(win) {
  ipcMain.handle('dsh:fetch', async (event, payload) => {
    const request = await requestFromPayload({
      method: payload.init?.method ?? 'GET',
      url: payload.url,
      headers: payload.init?.headers ?? {},
      body: payload.init?.body
    });
    const body = await request.arrayBuffer();
    return {
      status: request.status,
      headers: Object.fromEntries(request.headers.entries()),
      bodyBase64: Buffer.from(body).toString('base64')
    };
  });

  ipcMain.on('dsh:subscribe', (event, payload) => {
    const key = `${event.sender.id}:${payload.stream}:${payload.id}`;
    const disposer = parentRpc.subscribe(payload.stream, (frame) => {
      if (!win.isDestroyed()) {
        win.webContents.send('dsh:event', {
          id: payload.id,
          stream: payload.stream,
          frame
        });
      }
    });
    subscriptions.set(key, disposer);
  });

  ipcMain.on('dsh:unsubscribe', (event, payload) => {
    const key = `${event.sender.id}:${payload.stream}:${payload.id}`;
    const disposer = subscriptions.get(key);
    if (disposer !== undefined) {
      disposer();
      subscriptions.delete(key);
    }
  });
}

// ---- window management ----------------------------------------------------
ipcMain.on('dsh-desktop:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

app.whenReady().then(() => {
  let win;
  if (offline) {
    const ipcPath = process.env.DSH_ELECTRON_IPC_PATH;
    if (!ipcPath) {
      console.error('[dsh-desktop] DSH_ELECTRON_IPC_PATH is not set');
      app.quit();
      return;
    }
    const socket = net.connect(ipcPath);
    socket.on('error', (err) => {
      console.error(`[dsh-desktop] ipc connect error: ${err.message}`);
      app.quit();
    });
    parentRpc = new ParentRpc(socket);

    protocol.handle(APP_PROTOCOL, async (request) => {
      const body = await request.arrayBuffer();
      return requestFromPayload({
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body: body.byteLength === 0 ? undefined : Buffer.from(body)
      });
    });

    socket.on('connect', () => {
      win = new BrowserWindow({
        width: 1280,
        height: 860,
        title: 'dsh-desktop',
        frame: false,
        webPreferences: {
          preload,
          contextIsolation: false,
          nodeIntegration: false
        }
      });
      setupOfflineIpc(win);
      win.webContents.on('did-fail-load', (event, code, desc, failedUrl) => {
        console.error(
          `[dsh-desktop] did-fail-load ${failedUrl}: ${code} ${desc}`
        );
      });
      win.loadURL(`${APP_ORIGIN}/`).catch((err) => {
        console.error(`[dsh-desktop] loadURL failed: ${err?.message ?? err}`);
      });
    });
  } else {
    win = new BrowserWindow({
      width: 1280,
      height: 860,
      title: 'dsh-desktop',
      frame: false,
      webPreferences: {
        preload,
        contextIsolation: false,
        nodeIntegration: false
      }
    });
    win.loadURL(url).catch((err) => {
      console.error(
        `[dsh-desktop] failed to load ${url}: ${err?.message ?? err}`
      );
    });
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

// Self-terminate when the dsh parent process exits, avoiding orphan windows.
const parentWatch = setInterval(() => {
  try {
    process.kill(parentPid, 0);
  } catch {
    clearInterval(parentWatch);
    app.quit();
  }
}, 2000);
