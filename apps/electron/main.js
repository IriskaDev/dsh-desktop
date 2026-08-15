import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';

const url = process.env.DSH_ELECTRON_URL ?? 'http://127.0.0.1:3080';
const parentPid = Number(process.env.DSH_ELECTRON_PARENT_PID ?? process.ppid);
const preload = fileURLToPath(new URL('./preload.cjs', import.meta.url));

// Frameless window: the preload injects a top drag strip + custom close button.
ipcMain.on('dsh-desktop:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

app.whenReady().then(() => {
  const win = new BrowserWindow({
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
