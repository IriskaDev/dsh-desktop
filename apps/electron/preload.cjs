/* global require */

// Preload for the desktop window. Runs with `contextIsolation: false` so it
// can touch the page DOM; it injects a visible DSH-styled title bar (the OS
// title bar is hidden via `titleBarStyle: 'hidden'`, with the native
// min/max/close controls shown as a colored overlay from the main process).

const { ipcRenderer } = require('electron');

const TITLEBAR_ID = 'dsh-desktop-titlebar';

// Must match TITLEBAR_HEIGHT in main.js (`titleBarOverlay.height`).
const TITLEBAR_HEIGHT = 36;

// The title bar is styled with DSH's own theme tokens so it follows the app's
// light/dark palette; the fallbacks are DSH's dark boot tokens. On macOS the
// native traffic lights occupy the top-left corner, so the title text shifts
// right of them.
const LEFT_PADDING = process.platform === 'darwin' ? '78px' : '12px';
const STYLE = [
  `#${TITLEBAR_ID}{`,
  'position:fixed;',
  'left:env(titlebar-area-x,0);',
  'top:env(titlebar-area-y,0);',
  'width:env(titlebar-area-width,100%);',
  `height:env(titlebar-area-height,${TITLEBAR_HEIGHT}px);`,
  'z-index:2147483647;box-sizing:border-box;',
  'display:flex;align-items:center;',
  `padding:0 12px 0 ${LEFT_PADDING};`,
  '-webkit-app-region:drag;user-select:none;',
  'background:var(--dsw-alias-bg-base,#151517);',
  'color:var(--dsw-alias-label-primary,#f9fafb);',
  'border-bottom:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,0.12));',
  'font:13px/1 system-ui,-apple-system,"Segoe UI",sans-serif;',
  '}',
  `#${TITLEBAR_ID} .dsh-desktop-titlebar-title{`,
  'font-weight:600;letter-spacing:.02em;',
  'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
  '}'
].join('');

function inject() {
  if (document.getElementById(TITLEBAR_ID)) return;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  // Push the web app below the title bar. `box-sizing: border-box` keeps the
  // app's `height: 100%` from overflowing the viewport.
  const layout = document.createElement('style');
  layout.textContent = `body{padding-top:env(titlebar-area-height,${TITLEBAR_HEIGHT}px)!important;box-sizing:border-box}`;
  document.head.appendChild(layout);

  const bar = document.createElement('div');
  bar.id = TITLEBAR_ID;

  const title = document.createElement('span');
  title.className = 'dsh-desktop-titlebar-title';
  title.textContent = 'DeepSeek Harness';

  bar.appendChild(title);
  document.body.appendChild(bar);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inject, { once: true });
} else {
  inject();
}

// ---- offline transport bridge -------------------------------------------
if (process.env.DSH_ELECTRON_MODE === 'offline') {
  installFetchBridge();
  installWebSocketBridge();
}

function installFetchBridge() {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' ? input : input?.url;
    if (requestUrl === undefined || requestUrl === 'undefined') {
      return nativeFetch(input, init);
    }
    const absolute = new URL(requestUrl, window.location.href).href;
    if (!absolute.startsWith('dsh-desktop://')) {
      return nativeFetch(input, init);
    }

    let body;
    if (init?.body != null) {
      if (typeof init.body === 'string') body = init.body;
      else if (init.body instanceof Blob) body = await init.body.text();
      else if (init.body instanceof Uint8Array)
        body = new TextDecoder().decode(init.body);
      else body = String(init.body);
    }

    const result = await ipcRenderer.invoke('dsh:fetch', {
      url: absolute,
      init: {
        method: init?.method ?? 'GET',
        headers: init?.headers ?? {},
        body
      }
    });

    const bytes = Uint8Array.from(atob(result.bodyBase64), (ch) =>
      ch.charCodeAt(0)
    );
    return new Response(bytes.length === 0 ? null : bytes, {
      status: result.status,
      headers: result.headers
    });
  };
}

function installWebSocketBridge() {
  const NativeWebSocket = window.WebSocket;

  class IpcWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url) {
      const parsed = new URL(url, window.location.href);
      this.url = parsed.href;
      this.readyState = IpcWebSocket.CONNECTING;
      this._listeners = new Map();
      this._id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      this._closed = false;
      this._subscriptions = new Map();
      this._subscriptionByIpc = new Map();

      if (parsed.pathname !== '/api/remote.mux') {
        queueMicrotask(() => this._dispatch('error', { type: 'error' }));
        return;
      }

      this._onIpcEvent = (event, payload) => this._handleIpcEvent(payload);
      ipcRenderer.on('dsh:event', this._onIpcEvent);
      queueMicrotask(() => {
        if (this._closed) return;
        this.readyState = IpcWebSocket.OPEN;
        this._dispatch('open', { type: 'open' });
      });
    }

    _handleIpcEvent(payload) {
      const streamId = this._subscriptionByIpc.get(payload.id);
      if (streamId === undefined || payload.frame == null) return;
      const frame = payload.frame;
      if (frame.kind === 'item') {
        this._sendFrame({
          type: 'item',
          streamId,
          value: frame.value
        });
        return;
      }
      if (frame.kind === 'error') {
        this._sendFrame({
          type: 'error',
          streamId,
          error: frame.error
        });
        this._unsubscribe(streamId);
        return;
      }
      if (frame.kind === 'end') {
        this._sendFrame({ type: 'end', streamId });
        this._unsubscribe(streamId);
      }
    }

    _sendFrame(frame) {
      this._dispatch('message', {
        type: 'message',
        data: JSON.stringify(frame)
      });
    }

    _subscribe(streamId, message) {
      const ipcId = `${this._id}:${streamId}`;
      this._subscriptions.set(streamId, ipcId);
      this._subscriptionByIpc.set(ipcId, streamId);
      ipcRenderer.send('dsh:subscribe', {
        id: ipcId,
        stream: 'remote-mux',
        payload: {
          endpoint: message.endpoint,
          payload: message.payload ?? { args: {} }
        }
      });
    }

    _unsubscribe(streamId) {
      const ipcId = this._subscriptions.get(streamId);
      if (ipcId === undefined) return;
      this._subscriptions.delete(streamId);
      this._subscriptionByIpc.delete(ipcId);
      ipcRenderer.send('dsh:unsubscribe', {
        id: ipcId,
        stream: 'remote-mux'
      });
    }

    _finish() {
      if (this._closed) return;
      this._closed = true;
      this.readyState = IpcWebSocket.CLOSED;
      ipcRenderer.off('dsh:event', this._onIpcEvent);
      for (const ipcId of this._subscriptions.values()) {
        ipcRenderer.send('dsh:unsubscribe', {
          id: ipcId,
          stream: 'remote-mux'
        });
      }
      this._subscriptions.clear();
      this._subscriptionByIpc.clear();
      this._dispatch('close', { type: 'close' });
    }

    _dispatch(type, event) {
      if (this.onmessage !== undefined && type === 'message')
        this.onmessage(event);
      if (this.onopen !== undefined && type === 'open') this.onopen(event);
      if (this.onclose !== undefined && type === 'close') this.onclose(event);
      if (this.onerror !== undefined && type === 'error') this.onerror(event);
      for (const fn of this._listeners.get(type) ?? []) fn(event);
    }

    addEventListener(type, fn) {
      if (!this._listeners.has(type)) this._listeners.set(type, []);
      this._listeners.get(type).push(fn);
    }

    removeEventListener(type, fn) {
      const list = this._listeners.get(type) ?? [];
      this._listeners.set(
        type,
        list.filter((item) => item !== fn)
      );
    }

    send(data) {
      if (this._closed) return;
      if (typeof data !== 'string') data = String(data);
      let message;
      try {
        message = JSON.parse(data);
      } catch {
        return;
      }
      if (message == null || typeof message !== 'object') return;
      if (message.type === 'open' && typeof message.streamId === 'string') {
        if (message.streamId.length > 0)
          this._subscribe(message.streamId, message);
        return;
      }
      if (
        message.type === 'cancel' &&
        typeof message.streamId === 'string' &&
        message.streamId.length > 0
      ) {
        this._unsubscribe(message.streamId);
      }
    }

    close() {
      this._finish();
    }
  }

  window.WebSocket = IpcWebSocket;
  window.WebSocket.CONNECTING = IpcWebSocket.CONNECTING;
  window.WebSocket.OPEN = IpcWebSocket.OPEN;
  window.WebSocket.CLOSING = IpcWebSocket.CLOSING;
  window.WebSocket.CLOSED = IpcWebSocket.CLOSED;
  void NativeWebSocket;
}
