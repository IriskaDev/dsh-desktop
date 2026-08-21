import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElectronWebServer } from '../src/electron-web-server.js';

test('registers exact and prefix routes and dispatches to the right handler', async () => {
  const server = createElectronWebServer();

  server.register({
    kind: 'exact',
    path: '/api/ping',
    handler: async (req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('pong');
    }
  });
  server.register({
    kind: 'prefix',
    path: '/api',
    handler: async (req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    }
  });

  const exact = await server.dispatch({
    method: 'GET',
    path: '/api/ping',
    headers: {},
    body: undefined
  });
  assert.equal(exact.status, 200);
  assert.equal(exact.body.toString('utf8'), 'pong');

  const prefix = await server.dispatch({
    method: 'POST',
    path: '/api/echo',
    headers: { 'content-type': 'application/json' },
    body: Buffer.from('hello')
  });
  assert.equal(prefix.status, 200);
  assert.equal(prefix.body.toString('utf8'), '{"ok":true}');
});

test('returns 404 when no route or fallback matches', async () => {
  const server = createElectronWebServer();
  const result = await server.dispatch({
    method: 'GET',
    path: '/nope',
    headers: {},
    body: undefined
  });
  assert.equal(result.status, 404);
});

test('fallback answers unmatched paths and applyIndexTaps transforms index html', async () => {
  const server = createElectronWebServer();
  server.tapIndex((html) => html.replace('__TITLE__', 'DSH'));
  server.registerFallback(async (req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(server.applyIndexTaps('<title>__TITLE__</title>'));
      return;
    }
    res.writeHead(404);
    res.end('nope');
  });

  const root = await server.dispatch({
    method: 'GET',
    path: '/',
    headers: {},
    body: undefined
  });
  assert.equal(root.status, 200);
  assert.equal(root.body.toString('utf8'), '<title>DSH</title>');

  const other = await server.dispatch({
    method: 'GET',
    path: '/assets/app.js',
    headers: {},
    body: undefined
  });
  assert.equal(other.status, 404);
});

test('renderIndex renders structured injections then applies raw taps', () => {
  const rows = [];
  const ctx = {
    emit(event, table) {
      assert.equal(event, 'webserver/index-inject');
      table.push(...rows);
    }
  };
  const server = createElectronWebServer(ctx);
  server.tapIndex((html) => html.replace('__TITLE__', 'DSH'));
  rows.push({
    kind: 'script-src',
    placement: 'head',
    src: '/plugins/app.js'
  });
  rows.push({
    kind: 'html',
    placement: 'body',
    html: '<div id="root"></div>'
  });

  const html = server.renderIndex(
    '<html><head><title>__TITLE__</title></head><body></body></html>'
  );
  assert.match(html, /<script src="\/plugins\/app\.js"><\/script>/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /<title>DSH<\/title>/);
  // Head injections land after <head>, body injections after <body>.
  assert.ok(html.indexOf('<head>') < html.indexOf('<script src'));
  assert.ok(html.indexOf('</head>') > html.indexOf('<script src'));
  assert.ok(html.indexOf('<body>') < html.indexOf('<div id="root">'));
});

test('fallback renders index through renderIndex like dsh-host-frontend-static', async () => {
  const rows = [];
  const ctx = {
    emit(event, table) {
      assert.equal(event, 'webserver/index-inject');
      table.push(...rows);
    }
  };
  const server = createElectronWebServer(ctx);
  server.tapIndex((html) => html.replace('__APP__', 'dsh-desktop'));
  rows.push({
    kind: 'script-src',
    placement: 'head',
    src: '/plugins/app.js'
  });
  server.registerFallback(async (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(
      server.renderIndex('<html><head></head><body>__APP__</body></html>')
    );
  });

  const root = await server.dispatch({
    method: 'GET',
    path: '/',
    headers: {},
    body: undefined
  });
  assert.equal(root.status, 200);
  const html = root.body.toString('utf8');
  assert.match(html, /<script src="\/plugins\/app\.js"><\/script>/);
  assert.match(html, /<body>dsh-desktop<\/body>/);
});

test('renderIndex works without a context (no injection subscribers)', () => {
  const server = createElectronWebServer();
  const html = server.renderIndex('<html><head></head><body>hi</body></html>');
  assert.equal(html, '<html><head></head><body>hi</body></html>');
});

test('collectIndexInjections emits one fresh table per call', () => {
  const seen = [];
  const ctx = {
    emit(event, table) {
      seen.push(table);
    }
  };
  const server = createElectronWebServer(ctx);
  assert.deepEqual(server.collectIndexInjections(), []);
  assert.deepEqual(server.collectIndexInjections(), []);
  assert.equal(seen.length, 2);
  assert.notEqual(seen[0], seen[1]);
});

test('duplicate route registration throws', () => {
  const server = createElectronWebServer();
  const route = {
    kind: 'exact',
    path: '/dup',
    handler: async () => {}
  };
  server.register(route);
  assert.throws(() => server.register(route), /duplicate exact route/);
});

test('duplicate fallback registration throws', () => {
  const server = createElectronWebServer();
  const handler = async () => {};
  server.registerFallback(handler);
  assert.throws(
    () => server.registerFallback(handler),
    /fallback already registered/
  );
});
