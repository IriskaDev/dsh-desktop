import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  closeSync,
  existsSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import {
  name,
  detach,
  isInteractiveTty,
  resolveDetachLogPath,
  shouldDetach
} from '../src/detach.js';

const ttyStreams = {
  stdin: { isTTY: true },
  stdout: { isTTY: true },
  stderr: { isTTY: true }
};

/** A spawn seam that records its call and returns a minimally child-shaped object. */
function fakeSpawn() {
  const calls = [];
  const child = {
    pid: 4242,
    killed: false,
    unreffed: false,
    errorsHandled: 0,
    on(event) {
      if (event === 'error') this.errorsHandled += 1;
      return this;
    },
    kill() {
      this.killed = true;
      return true;
    },
    unref() {
      this.unreffed = true;
    }
  };
  const spawnChild = (command, args, options) => {
    calls.push({ command, args, options });
    return child;
  };
  return { spawnChild, child, calls };
}

/** A startup probe seam; the default one is replaced so no shell is started. */
const probeOk = () => ({ status: 0 });
const probeMissing = () => ({ status: 127 });

test('module name is desktop-detach', () => {
  assert.equal(name, 'desktop-detach');
});

test('isInteractiveTty needs all three streams to be terminals', () => {
  assert.equal(isInteractiveTty(ttyStreams), true);
  assert.equal(
    isInteractiveTty({ ...ttyStreams, stdout: { isTTY: false } }),
    false
  );
  assert.equal(isInteractiveTty({ ...ttyStreams, stdin: undefined }), false);
  assert.equal(isInteractiveTty({}), false);
});

test('shouldDetach only fires for an interactive terminal', () => {
  assert.equal(shouldDetach({}, ttyStreams), true);
  assert.equal(shouldDetach({}, {}), false);
});

test('shouldDetach honors the opt-out and the detached marker', () => {
  assert.equal(shouldDetach({ DSH_DESKTOP_NO_DETACH: '1' }, ttyStreams), false);
  assert.equal(
    shouldDetach({ DSH_DESKTOP_NO_DETACH: '1' }, { isTTY: true }),
    false
  );
  assert.equal(shouldDetach({ DSH_DESKTOP_DETACHED: '1' }, ttyStreams), false);
  // An empty value means "unset", matching how the launcher reads env vars.
  assert.equal(shouldDetach({ DSH_DESKTOP_NO_DETACH: '' }, ttyStreams), true);
  assert.equal(shouldDetach({ DSH_DESKTOP_DETACHED: '' }, ttyStreams), true);
});

test('resolveDetachLogPath defaults to the harness home', () => {
  assert.equal(
    resolveDetachLogPath({}, '/home/tester'),
    join('/home/tester', '.dsh', 'desktop.log')
  );
});

test('resolveDetachLogPath follows DSH_HOME and the explicit override', () => {
  assert.equal(
    resolveDetachLogPath({ DSH_HOME: '/srv/dsh' }, '/home/tester'),
    join('/srv/dsh', 'desktop.log')
  );
  assert.equal(
    resolveDetachLogPath(
      { DSH_HOME: '/srv/dsh', DSH_DESKTOP_LOG: '/tmp/custom.log' },
      '/home/tester'
    ),
    '/tmp/custom.log'
  );
  assert.equal(
    resolveDetachLogPath({ DSH_HOME: '  ' }, '/home/tester'),
    join('/home/tester', '.dsh', 'desktop.log')
  );
});

test('detach re-executes the same command line detached, leaving the terminal', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-detach-'));
  const spawn = fakeSpawn();
  try {
    const result = detach({
      argv: [
        '/usr/bin/node',
        '/usr/lib/node_modules/dsh/lib/bin.js',
        '--profile',
        'dsh-desktop'
      ],
      execPath: '/usr/bin/node',
      env: { PATH: '/usr/bin' },
      logPath: join(dir, 'desktop.log'),
      spawnChild: spawn.spawnChild,
      probe: probeOk
    });

    assert.equal(result.pid, 4242);
    assert.equal(result.logPath, join(dir, 'desktop.log'));
    assert.equal(spawn.calls.length, 1);
    assert.equal(spawn.calls[0].command, '/usr/bin/node');
    // argv[0] is dropped: the child re-runs the CLI script with every flag.
    assert.deepEqual(spawn.calls[0].args, [
      '/usr/lib/node_modules/dsh/lib/bin.js',
      '--profile',
      'dsh-desktop'
    ]);
    assert.equal(spawn.calls[0].options.detached, true);
    assert.equal(spawn.calls[0].options.env.DSH_DESKTOP_DETACHED, '1');
    assert.equal(spawn.calls[0].options.env.PATH, '/usr/bin');
    assert.equal(spawn.child.unreffed, true);
    assert.equal(spawn.child.killed, false);
    // stdio[0] is closed so the child can never read the released terminal.
    const stdio = spawn.calls[0].options.stdio;
    assert.equal(stdio[0], 'ignore');
    assert.equal(typeof stdio[1], 'number');
    assert.equal(stdio[1], stdio[2]);
    assert.equal(existsSync(result.logPath), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detach aborts when the child never really starts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-detach-'));
  const spawn = fakeSpawn();
  const reported = [];
  try {
    const result = detach({
      argv: ['/usr/bin/node', '/usr/bin/dsh', '--profile', 'dsh-desktop'],
      execPath: '/usr/bin/node',
      env: {},
      logPath: join(dir, 'desktop.log'),
      spawnChild: spawn.spawnChild,
      probe: probeMissing,
      report: (message) => reported.push(message)
    });

    assert.equal(result, null);
    assert.equal(spawn.child.killed, true);
    assert.equal(spawn.child.unreffed, false);
    assert.equal(reported.length, 1);
    assert.match(reported[0], /could not be launched/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detach reports a synchronous spawn failure and closes the log', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-detach-'));
  const reported = [];
  try {
    const result = detach({
      argv: ['/usr/bin/node', '/usr/bin/dsh'],
      execPath: '/usr/bin/node',
      env: {},
      logPath: join(dir, 'desktop.log'),
      spawnChild: () => {
        throw new Error('spawn EACCES');
      },
      probe: probeOk,
      report: (message) => reported.push(message)
    });

    assert.equal(result, null);
    assert.equal(reported.length, 1);
    assert.match(reported[0], /spawn EACCES/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('detach still hands off when the log cannot be opened', () => {
  // A file where the directory should be makes openSync fail with ENOTDIR.
  const dir = mkdtempSync(join(tmpdir(), 'dsh-detach-'));
  const blocker = join(dir, 'blocker');
  const spawn = fakeSpawn();
  const reported = [];
  try {
    closeSync(openSync(blocker, 'w'));
    const result = detach({
      argv: ['/usr/bin/node', '/usr/bin/dsh'],
      execPath: '/usr/bin/node',
      env: {},
      logPath: join(blocker, 'desktop.log'),
      spawnChild: spawn.spawnChild,
      probe: probeOk,
      report: (message) => reported.push(message)
    });

    assert.equal(result.pid, 4242);
    assert.equal(spawn.calls[0].options.stdio, 'ignore');
    assert.equal(reported.length, 1);
    assert.match(reported[0], /cannot open the detached log/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the startup probe accepts a real launcher and rejects a missing one', () => {
  // The probe runs the launcher with `--version`, which exits without booting
  // the surface. A missing executable is reported by the wrapper shell as 127.
  const dir = mkdtempSync(join(tmpdir(), 'dsh-detach-'));
  const launcher = join(dir, 'launcher.cjs');
  try {
    writeFileSync(
      launcher,
      'if (process.argv.includes("--version")) process.exit(0);\n'
    );
    const runs = [];
    const probing = (script) => {
      runs.push(script);
      return spawnSync(script, { shell: true, stdio: 'ignore' });
    };
    const handOff = (execPath) =>
      detach({
        argv: [process.execPath, launcher, '--profile', 'dsh-desktop'],
        execPath,
        env: {},
        logPath: join(dir, 'desktop.log'),
        spawnChild: fakeSpawn().spawnChild,
        probe: probing,
        report: () => {}
      });

    assert.notEqual(handOff(process.execPath), null);
    assert.equal(handOff(join(dir, 'does-not-exist')), null);
    assert.equal(runs.length, 2);
    assert.equal(
      spawnSync(runs[0], { shell: true, stdio: 'ignore' }).status,
      0
    );
    assert.equal(
      spawnSync(runs[1], { shell: true, stdio: 'ignore' }).status,
      127
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a detached child outlives its parent and owns the log', async () => {
  // End-to-end proof of the hand-off: the real spawn runs a stand-in launcher
  // (never the desktop surface itself), so this test can never open a window.
  const dir = mkdtempSync(join(tmpdir(), 'dsh-detach-'));
  const launcher = join(dir, 'launcher.cjs');
  const logPath = join(dir, 'desktop.log');
  const marker = join(dir, 'child-ran.txt');
  let pid;
  try {
    writeFileSync(
      launcher,
      [
        '// Stand-in for the dsh launcher: `--version` exits before any startup,',
        '// which is exactly what the hand-off probe relies on.',
        'if (process.argv.includes("--version")) process.exit(0);',
        'const { writeFileSync } = require("node:fs");',
        'writeFileSync(process.env.DSH_TEST_MARKER, "ran");',
        'console.log("launcher started detached");'
      ].join('\n')
    );

    const started = detach({
      argv: [process.execPath, launcher, '--profile', 'dsh-desktop'],
      execPath: process.execPath,
      env: { ...process.env, DSH_TEST_MARKER: marker },
      logPath
    });

    assert.notEqual(started, null);
    pid = started.pid;
    assert.equal(typeof pid, 'number');

    for (let attempt = 0; attempt < 50 && !existsSync(marker); attempt += 1) {
      await delay(20);
    }
    assert.equal(existsSync(marker), true, 'detached child never ran');
    assert.match(readFileSync(logPath, 'utf8'), /launcher started detached/);
  } finally {
    if (typeof pid === 'number') {
      try {
        process.kill(pid);
      } catch {
        // The stand-in launcher already exited; nothing to clean up.
      }
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
