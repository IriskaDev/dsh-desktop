import { Buffer } from 'node:buffer';

/**
 * A `webServer`-shaped service that never listens. It mirrors the route
 * registry contract of `@deepseek-ai/dsh-host-webserver` closely enough for
 * `dsh-web-app` / `dsh-host-frontend-static` / `dsh-client-connection` to run
 * unchanged: routes and the SPA fallback are registered exactly as they would
 * be against the real HTTP server, while requests arrive through Electron IPC
 * (see `dispatch`) instead of a TCP socket.
 */

export function createElectronWebServer() {
  const exact = new Map();
  const prefixes = new Map();
  const upgrades = new Map();
  const indexTaps = [];
  let fallback;

  function match(pathname) {
    const hit = exact.get(pathname);
    if (hit !== undefined) return hit;
    let best;
    for (const [prefix, route] of prefixes) {
      if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) continue;
      if (best === undefined || prefix.length > best.path.length) best = route;
    }
    return best;
  }

  /**
   * Mock node:http ServerResponse with just enough surface for the DSH route
   * handlers (`dsh-client-connection` bridge and `dsh-host-frontend-static`).
   */
  function createMockResponse() {
    const chunks = [];
    const listeners = new Map();
    const state = {
      statusCode: 200,
      headers: {},
      headersSent: false,
      writableEnded: false
    };
    return {
      get headersSent() {
        return state.headersSent;
      },
      get writableEnded() {
        return state.writableEnded;
      },
      writeHead(status, headers) {
        state.statusCode = status;
        if (headers !== undefined) Object.assign(state.headers, headers);
        state.headersSent = true;
        return this;
      },
      write(chunk) {
        if (chunk !== undefined) chunks.push(Buffer.from(chunk));
        return true;
      },
      end(chunk) {
        if (chunk !== undefined) chunks.push(Buffer.from(chunk));
        state.writableEnded = true;
        for (const fn of listeners.get('finish') ?? []) fn();
      },
      once(event, fn) {
        return this.on(event, fn);
      },
      on(event, fn) {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(fn);
        return this;
      },
      off(event, fn) {
        const list = listeners.get(event) ?? [];
        listeners.set(
          event,
          list.filter((item) => item !== fn)
        );
        return this;
      },
      removeListener(event, fn) {
        return this.off(event, fn);
      },
      destroy() {},
      toResult() {
        return {
          status: state.statusCode,
          headers: state.headers,
          body: Buffer.concat(chunks)
        };
      }
    };
  }

  /**
   * Dispatch one IPC request through the registered routes/fallback. The
   * request object is already fetch-shaped (`method`, `path`, `headers`,
   * `body`); this adapts it to the node:http handler contract.
   */
  async function dispatch(request) {
    const rawPath = new URL(request.path, 'http://dsh.internal').pathname;
    const matched = match(rawPath);
    const route = matched !== undefined ? matched.handler : fallback;
    if (route === undefined) {
      return { status: 404, headers: {}, body: Buffer.alloc(0) };
    }
    const res = createMockResponse();
    const chunks = request.body === undefined ? [] : [request.body];
    const req = {
      url: request.path,
      method: request.method,
      headers: request.headers,
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) yield chunk;
      }
    };
    await route(req, res);
    return res.toResult();
  }

  return {
    get port() {
      return 0;
    },
    get host() {
      return '127.0.0.1';
    },
    register(route) {
      const table = route.kind === 'exact' ? exact : prefixes;
      if (table.has(route.path)) {
        throw new Error(
          `webserver: duplicate ${route.kind} route "${route.path}"`
        );
      }
      table.set(route.path, route);
      return () => {
        table.delete(route.path);
      };
    },
    registerUpgrade(route) {
      if (upgrades.has(route.path)) {
        throw new Error(`webserver: duplicate upgrade route "${route.path}"`);
      }
      upgrades.set(route.path, route);
      return () => {
        upgrades.delete(route.path);
      };
    },
    registerFallback(handler) {
      if (fallback !== undefined) {
        throw new Error('webserver: fallback already registered');
      }
      fallback = handler;
      return () => {
        fallback = undefined;
      };
    },
    tapIndex(transform) {
      indexTaps.push(transform);
      return () => {
        const at = indexTaps.indexOf(transform);
        if (at !== -1) indexTaps.splice(at, 1);
      };
    },
    applyIndexTaps(html) {
      let out = html;
      for (const transform of indexTaps) out = transform(out);
      return out;
    },
    dispatch
  };
}
