import { spawn, spawnSync } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const name = 'desktop-detach';

/** Marker telling a re-executed child it is already the detached instance. */
const DETACHED_ENV = 'DSH_DESKTOP_DETACHED';

/** Opt-out: keep the legacy foreground behavior (terminal stays attached). */
const NO_DETACH_ENV = 'DSH_DESKTOP_NO_DETACH';

/** Optional override for the detached instance's log file. */
const LOG_ENV = 'DSH_DESKTOP_LOG';

/** Log file name under the harness home when no override is set. */
const LOG_FILENAME = 'desktop.log';

/** Default harness home directory name, matching `@deepseek-ai/dsh-home-paths`. */
const DSH_HOME_DIR = '.dsh';

/**
 * Whether this process owns an interactive terminal. Every stream must be a
 * TTY: a piped or redirected stream means a caller or another process is
 * consuming this invocation (`... | dsh --profile dsh-desktop`), and detaching
 * would silently steal the instance from it.
 * @param streams - the stdio streams to inspect; defaults to the process ones.
 * @returns true when stdout, stderr, and stdin are all terminals.
 */
export function isInteractiveTty(streams = process) {
  return (
    streams.stdin?.isTTY === true &&
    streams.stdout?.isTTY === true &&
    streams.stderr?.isTTY === true
  );
}

/**
 * Whether this invocation should re-exec itself as a detached instance. The
 * opt-out env wins over everything so a user can always get the foreground
 * surface back; the marker keeps the detached child from forking forever.
 * @param env - environment mapping; defaults to `process.env`.
 * @param streams - the stdio streams to inspect; defaults to the process ones.
 * @returns true when the launch should hand off to a detached instance.
 */
export function shouldDetach(env = process.env, streams = process) {
  const optOut = env[NO_DETACH_ENV];
  if (optOut !== undefined && optOut !== '') return false;
  const marker = env[DETACHED_ENV];
  if (marker !== undefined && marker !== '') return false;
  return isInteractiveTty(streams);
}

/**
 * Resolve the log file a detached instance appends stdout/stderr to. There is
 * no terminal behind it, so this file is the only place its startup failures
 * can surface.
 * @param env - environment mapping; defaults to `process.env`.
 * @param home - OS home directory; defaults to `os.homedir()`.
 * @returns the absolute log file path.
 */
export function resolveDetachLogPath(env = process.env, home = homedir()) {
  const override = env[LOG_ENV];
  if (override !== undefined && override.trim() !== '') return override;
  const dshHome = env.DSH_HOME;
  const base =
    dshHome !== undefined && dshHome.trim() !== ''
      ? dshHome
      : join(home, DSH_HOME_DIR);
  return join(base, LOG_FILENAME);
}

/**
 * Hand the desktop instance to a detached copy of this same invocation: the
 * child re-runs the identical command line (launcher flags included), so the
 * caller's terminal is released while the window keeps running. Only called
 * once {@link shouldDetach} agreed, so passing the command line through
 * verbatim cannot recurse — the child's stdio is not a terminal.
 * @param options - child argv, log path, environment, and seam for tests.
 * @returns the spawned child pid and log path, or null when the spawn failed.
 */
export function detach(options = {}) {
  const {
    argv = process.argv,
    execPath = process.execPath,
    env = process.env,
    logPath = resolveDetachLogPath(env),
    spawnChild = spawn,
    probe = (script) => spawnSync(script, { shell: true, stdio: 'ignore' }),
    report = (message) => process.stderr.write(`${message}\n`)
  } = options;

  let logFd;
  try {
    logFd = openSync(logPath, 'a');
  } catch (error) {
    // Dropping the log must not cancel the detach: the window matters more.
    report(
      `desktop: cannot open the detached log at ${logPath} (${error.message}); stdout and stderr are discarded`
    );
  }

  let child;
  try {
    child = spawnChild(execPath, argv.slice(1), {
      detached: true,
      stdio: logFd === undefined ? 'ignore' : ['ignore', logFd, logFd],
      env: { ...env, [DETACHED_ENV]: '1' }
    });
  } catch (error) {
    report(`desktop: failed to detach: ${error.message}`);
    if (logFd !== undefined) closeQuietly(logFd);
    return null;
  }

  // A spawn failure is reported asynchronously. That report would land after
  // this process is already gone — a silent no-op launch — so confirm the
  // child actually started by waiting for it in a shell wrapper (127 = not
  // found) before handing over the terminal.
  child.on('error', () => {});
  const started = probe(`${quote(execPath)} ${quote(argv[1])} --version`);
  if (started.error !== undefined || started.status !== 0) {
    child.kill();
    report(
      `desktop: failed to detach: ${execPath} could not be launched; staying in the foreground`
    );
    if (logFd !== undefined) closeQuietly(logFd);
    return null;
  }

  // The child owns the log descriptor from here on.
  if (logFd !== undefined) closeQuietly(logFd);
  child.unref();
  return { pid: child.pid, logPath };
}

/**
 * Quote one argument for the POSIX/`cmd.exe` shell the startup probe uses.
 * @param value - the raw argument.
 * @returns the argument wrapped in double quotes, with inner quotes escaped.
 */
function quote(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function closeQuietly(fd) {
  try {
    closeSync(fd);
  } catch {
    // Closing an already-broken descriptor is not worth reporting.
  }
}
