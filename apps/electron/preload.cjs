/* global require */

// Preload for the frameless desktop window. Runs with `contextIsolation: false`
// so it can touch the page DOM; it injects a top drag strip and a custom close
// button (the native title bar is removed via `frame: false`).

const { ipcRenderer } = require('electron');

const CLOSE_CHANNEL = 'dsh-desktop:close';
const TITLEBAR_ID = 'dsh-desktop-titlebar';
const CLOSE_ID = 'dsh-desktop-close';

// The DSH web header reserves a 12px empty top padding above its title row
// (where the Session log button lives). Keep the drag strip inside that dead
// zone so it does not cover the Session log button, and keep the close button
// in the header's 28px right padding so it sits beside the button instead of
// on top of it.
const TITLEBAR_HEIGHT = 12;
const CLOSE_WIDTH = 28;
const CLOSE_HEIGHT = 32;

const STYLE = [
  `#${TITLEBAR_ID}{`,
  'position:fixed;top:0;left:0;right:0;',
  `height:${TITLEBAR_HEIGHT}px;z-index:2147483647;`,
  '-webkit-app-region:drag;display:flex;align-items:stretch;justify-content:flex-end;',
  '}',
  `#${CLOSE_ID}{`,
  'position:absolute;top:0;right:0;',
  `width:${CLOSE_WIDTH}px;height:${CLOSE_HEIGHT}px;`,
  '-webkit-app-region:no-drag;border:0;padding:0;',
  'background:transparent;color:#9aa0a6;font-size:15px;line-height:1;',
  'cursor:pointer;appearance:none;-webkit-appearance:none;',
  '}',
  `#${CLOSE_ID}:hover{background:#e81123;color:#fff;}`
].join('');

function inject() {
  if (document.getElementById(TITLEBAR_ID)) return;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = TITLEBAR_ID;

  const close = document.createElement('button');
  close.id = CLOSE_ID;
  close.type = 'button';
  close.title = 'Close';
  close.setAttribute('aria-label', 'Close window');
  close.textContent = '\u2715';
  close.addEventListener('click', () => ipcRenderer.send(CLOSE_CHANNEL));

  bar.appendChild(close);
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

      if (parsed.pathname === '/api/events.mux') this._stream = 'mux';
      else if (parsed.pathname === '/api/events.host') this._stream = 'host';
      else this._stream = null;

      this._onIpcEvent = (event, payload) => {
        if (payload.id !== this._id) return;
        const envelope = {
          type: 'server-request',
          rpcId: payload.frame.rpcId,
          method: payload.frame.payload?.type,
          payload: payload.frame.payload
        };
        this._dispatch('message', {
          type: 'message',
          data: JSON.stringify(envelope)
        });
      };

      if (this._stream === null) {
        queueMicrotask(() => this._dispatch('error', { type: 'error' }));
        return;
      }
      ipcRenderer.on('dsh:event', this._onIpcEvent);
      ipcRenderer.send('dsh:subscribe', { id: this._id, stream: this._stream });
      queueMicrotask(() => {
        this.readyState = IpcWebSocket.OPEN;
        this._dispatch('open', { type: 'open' });
      });
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

    send() {
      // Downlink-only streams: upstream messages are a protocol violation.
    }

    close() {
      if (this.readyState === IpcWebSocket.CLOSED) return;
      this.readyState = IpcWebSocket.CLOSED;
      ipcRenderer.off('dsh:event', this._onIpcEvent);
      ipcRenderer.send('dsh:unsubscribe', {
        id: this._id,
        stream: this._stream
      });
      this._dispatch('close', { type: 'close' });
    }
  }

  window.WebSocket = IpcWebSocket;
  window.WebSocket.CONNECTING = IpcWebSocket.CONNECTING;
  window.WebSocket.OPEN = IpcWebSocket.OPEN;
  window.WebSocket.CLOSING = IpcWebSocket.CLOSING;
  window.WebSocket.CLOSED = IpcWebSocket.CLOSED;
  void NativeWebSocket;
}
