import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const rootPackage = JSON.parse(
  readFileSync(path.join(ROOT, 'package.json'), 'utf8')
);

const args = process.argv.slice(2);
function argValue(name) {
  const prefix = `--${name}=`;
  for (const arg of args) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  const flagIndex = args.indexOf(`--${name}`);
  if (
    flagIndex !== -1 &&
    args[flagIndex + 1] &&
    !args[flagIndex + 1].startsWith('--')
  ) {
    return args[flagIndex + 1];
  }
  return undefined;
}

const makeArchive = args.includes('--archive');

const platform = argValue('platform') ?? process.platform;
const arch = argValue('arch') ?? process.arch;
const name = 'dsh-desktop-electron';
const electronVersion = rootPackage.devDependencies.electron.replace(
  /^[\^~]/,
  ''
);

const buildOut = path.join(ROOT, 'dist', 'electron-build');
const runtimeDir = path.join(ROOT, 'dist', 'electron', 'runtime');
const releaseDir = path.join(ROOT, 'dist', 'release');

function copyFileOrDir(relativePath, stagingDir) {
  const source = path.join(ROOT, relativePath);
  const target = path.join(stagingDir, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

function stageReleaseFiles(stagingDir) {
  const files = [
    'src',
    'apps/electron',
    'cordis.patch.yml',
    'package.json',
    'README.md',
    'README.zh-CN.md',
    'LICENSE'
  ];
  for (const file of files) {
    copyFileOrDir(file, stagingDir);
  }
  cpSync(runtimeDir, path.join(stagingDir, 'dist', 'electron', 'runtime'), {
    recursive: true
  });
}

function createArchive(stagingDir, releaseName) {
  mkdirSync(releaseDir, { recursive: true });
  if (platform === 'win32') {
    const filePath = path.join(releaseDir, `${releaseName}.zip`);
    const result = spawnSync(
      'tar',
      ['-a', '-c', '-f', filePath, '-C', stagingDir, '.'],
      { stdio: 'inherit' }
    );
    if (result.status !== 0)
      throw new Error(`tar failed with exit code ${result.status}`);
    return filePath;
  }
  const filePath = path.join(releaseDir, `${releaseName}.tar.gz`);
  const result = spawnSync('tar', ['-czf', filePath, '-C', stagingDir, '.'], {
    stdio: 'inherit'
  });
  if (result.status !== 0)
    throw new Error(`tar failed with exit code ${result.status}`);
  return filePath;
}

console.log(
  `Packaging ${name} ${electronVersion} for ${platform}-${arch} (asar: false, prune: true)`
);

rmSync(buildOut, { recursive: true, force: true });
rmSync(runtimeDir, { recursive: true, force: true });

const appPaths = await packager({
  dir: path.join(ROOT, 'apps', 'electron'),
  name,
  appVersion: rootPackage.version,
  electronVersion,
  out: buildOut,
  platform,
  arch,
  asar: false,
  prune: true,
  overwrite: true,
  quiet: false
});

const generatedDir = appPaths[0];
cpSync(generatedDir, runtimeDir, { recursive: true });
rmSync(buildOut, { recursive: true, force: true });

console.log(`Electron runtime ready at ${runtimeDir}`);

if (makeArchive) {
  const releaseName = `dsh-desktop-${rootPackage.version}-${platform}-${arch}`;
  const stagingDir = path.join(releaseDir, releaseName);
  rmSync(stagingDir, { recursive: true, force: true });
  mkdirSync(stagingDir, { recursive: true });
  stageReleaseFiles(stagingDir);
  const archivePath = createArchive(stagingDir, releaseName);
  rmSync(stagingDir, { recursive: true, force: true });
  console.log(`Release archive ready at ${archivePath}`);
}
