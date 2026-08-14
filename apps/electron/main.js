import { app, BrowserWindow } from 'electron';

const url = process.env.DSH_ELECTRON_URL ?? 'http://127.0.0.1:3080';
const parentPid = Number(process.env.DSH_ELECTRON_PARENT_PID ?? process.ppid);

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'dsh-desktop',
    autoHideMenuBar: true
  });
  win.loadURL(url).catch((err) => {
    console.error(
      `[dsh-desktop] failed to load ${url}: ${err?.message ?? err}`
    );
  });
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
