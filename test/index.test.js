import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {
  name,
  apply,
  electronEnv,
  reportStartupFailure,
  resolveDesktopUrl,
  resolveIpcPath
} from '../src/index.js';

test('module name is desktop', () => {
  assert.equal(name, 'desktop');
});

test('apply is exported', () => {
  assert.equal(typeof apply, 'function');
});

test('resolveDesktopUrl uses the DSH connection launch token', () => {
  const ctx = {
    get(key) {
      assert.equal(key, 'connection');
      return {
        authenticatedUrl(baseUrl) {
          return `${baseUrl}?token=test-token`;
        }
      };
    }
  };
  assert.equal(
    resolveDesktopUrl(ctx),
    'dsh-desktop://127.0.0.1/?token=test-token'
  );
});

test('resolveDesktopUrl falls back to the plain desktop root', () => {
  assert.equal(resolveDesktopUrl({}), 'dsh-desktop://127.0.0.1/');
});

test(
  'resolveIpcPath yields a listenable socket under a long macOS tmpdir',
  { skip: process.platform === 'win32' && 'Unix sockets only' },
  async () => {
    // The default macOS per-user tmpdir pushes the generated socket path
    // past the sun_path limit, which `listen()` rejects with EINVAL.
    const longTmpdir = '/var/folders/ab/0123456789abcdefghijklmnopqrst/T';
    const socketPath = resolveIpcPath('darwin', longTmpdir);
    assert.ok(
      Buffer.byteLength(socketPath) <= 104,
      `${socketPath} exceeds the Unix socket path limit`
    );

    const server = net.createServer();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, resolve);
    });
    await new Promise((resolve) => server.close(resolve));
  }
);

test('resolveIpcPath keeps a tmpdir that already fits', () => {
  const socketPath = resolveIpcPath('linux', '/tmp');
  assert.ok(socketPath.startsWith('/tmp/'));
  assert.ok(socketPath.endsWith('.sock'));
});

test('resolveIpcPath uses a named pipe on Windows', () => {
  assert.match(resolveIpcPath('win32', '/tmp'), /^\\\\\.\\pipe\\dsh-desktop-/);
});

test('reportStartupFailure reports on the host logger and stderr', () => {
  const warnings = [];
  const chunks = [];
  const write = process.stderr.write;
  process.stderr.write = (chunk) => {
    chunks.push(String(chunk));
    return true;
  };
  try {
    reportStartupFailure(
      { logger: { warn: (message) => warnings.push(message) } },
      'desktop: ipc server error: EINVAL'
    );
    // A context without a logger still reaches the terminal.
    reportStartupFailure({}, 'desktop: no logger available');
  } finally {
    process.stderr.write = write;
  }

  assert.deepEqual(warnings, ['desktop: ipc server error: EINVAL']);
  assert.equal(
    chunks.join(''),
    'desktop: ipc server error: EINVAL\ndesktop: no logger available\n'
  );
});

/**
 * Apply environment overrides for the duration of `body`, restoring every
 * touched variable afterwards. `undefined` removes a variable.
 * @param overrides - the variables to set or remove.
 * @param body - the assertions to run.
 */
function withEnv(overrides, body) {
  const previous = new Map();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    body();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('electronEnv clears an inherited ELECTRON_RUN_AS_NODE', () => {
  withEnv(
    { ELECTRON_RUN_AS_NODE: '1', DSH_DESKTOP_KEEP_RUN_AS_NODE: undefined },
    () => {
      const env = electronEnv({ DSH_ELECTRON_MODE: 'offline' });
      assert.equal(env.ELECTRON_RUN_AS_NODE, undefined);
      assert.equal(env.DSH_ELECTRON_MODE, 'offline');
      // The parent environment is left untouched.
      assert.equal(process.env.ELECTRON_RUN_AS_NODE, '1');
    }
  );
});

test('electronEnv keeps the launch mode when the opt-out is set', () => {
  withEnv(
    { ELECTRON_RUN_AS_NODE: '1', DSH_DESKTOP_KEEP_RUN_AS_NODE: '1' },
    () => {
      assert.equal(electronEnv({}).ELECTRON_RUN_AS_NODE, '1');
    }
  );
});

test('electronEnv inherits the rest of the environment', () => {
  withEnv({ DSH_DESKTOP_TEST_MARKER: 'kept' }, () => {
    assert.equal(electronEnv({}).DSH_DESKTOP_TEST_MARKER, 'kept');
  });
});
