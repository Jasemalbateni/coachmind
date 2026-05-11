'use strict';

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ─── Environment ─────────────────────────────────────────────────────────────

const isDev = !app.isPackaged;
const PORT = isDev ? 3000 : 3456;

// ─── Window State Persistence ────────────────────────────────────────────────

const stateFile = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    const state = JSON.parse(raw);
    // Sanity-check saved bounds are on a valid display
    const { screen } = require('electron');
    const display = screen.getDisplayNearestPoint({ x: state.x || 0, y: state.y || 0 });
    const bounds = display.workArea;
    const visible =
      state.x != null &&
      state.x < bounds.x + bounds.width &&
      state.x + state.width > bounds.x &&
      state.y < bounds.y + bounds.height &&
      state.y + state.height > bounds.y;
    return visible ? state : { width: state.width, height: state.height };
  } catch {
    return { width: 1440, height: 900 };
  }
}

function saveWindowState(win) {
  if (win.isMaximized() || win.isMinimized() || win.isFullScreen()) return;
  try {
    fs.writeFileSync(stateFile, JSON.stringify(win.getBounds()), 'utf8');
  } catch {
    // Non-critical — ignore write errors
  }
}

// ─── Next.js Server (production only) ────────────────────────────────────────

/**
 * In production the Next.js standalone server runs inside the Electron main
 * process — Electron's main process IS Node.js, so we can simply require() the
 * compiled server.js.  No separate binary or child process is needed.
 */
function startNextServer() {
  if (isDev) {
    // Development: Next.js dev server is started separately (see desktop:dev)
    return Promise.resolve();
  }

  const serverPath = path.join(
    process.resourcesPath,
    '.next',
    'standalone',
    'server.js'
  );

  process.env.PORT = String(PORT);
  process.env.HOSTNAME = '127.0.0.1';
  process.env.NODE_ENV = 'production';

  // Starts the Next.js HTTP server inside this process
  require(serverPath);

  return waitForServer(`http://127.0.0.1:${PORT}`);
}

function waitForServer(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;

    function attempt() {
      http
        .get(url, (res) => {
          if (res.statusCode < 500) return resolve();
          schedule();
        })
        .on('error', () => {
          if (Date.now() > deadline) {
            return reject(new Error(`Server at ${url} did not start within ${timeout}ms`));
          }
          schedule();
        });
    }

    function schedule() {
      setTimeout(attempt, 250);
    }

    attempt();
  });
}

// ─── Main Window ──────────────────────────────────────────────────────────────

let mainWindow = null;

async function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width || 1440,
    height: state.height || 900,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 700,
    center: state.x == null,       // center only when no saved position
    title: 'CoachMind',
    backgroundColor: '#0f172a',    // matches app dark background — prevents white flash
    show: false,                   // reveal after ready-to-show for smooth startup
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,      // security: keep renderer sandboxed
      contextIsolation: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  // Smooth launch: show window only when content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Persist window size/position on change
  mainWindow.on('resize', () => saveWindowState(mainWindow));
  mainWindow.on('move', () => saveWindowState(mainWindow));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open target=_blank links in the system default browser, not a new Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Start server (no-op in dev) then load the app
  await startNextServer();
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // On macOS apps conventionally stay open until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS re-create the window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ─── IPC: File System API ─────────────────────────────────────────────────────
//
// These handlers expose native file dialogs to the renderer via the preload
// bridge.  They are stubs now but the full architecture is in place — the
// renderer just calls window.electronAPI.saveProject(data) and the rest is
// handled here with no changes to the UI code needed later.

ipcMain.handle('fs:save-project', async (_, { data, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save CoachMind Project',
    defaultPath: defaultName || 'my-session.coachmind',
    filters: [
      { name: 'CoachMind Project', extensions: ['coachmind'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  });
  if (result.canceled || !result.filePath) return { cancelled: true };
  fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
  return { filePath: result.filePath };
});

ipcMain.handle('fs:open-project', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open CoachMind Project',
    filters: [
      { name: 'CoachMind Project', extensions: ['coachmind'] },
      { name: 'JSON', extensions: ['json'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths.length) return { cancelled: true };
  const raw = fs.readFileSync(result.filePaths[0], 'utf8');
  return { filePath: result.filePaths[0], data: JSON.parse(raw) };
});

ipcMain.handle('fs:export-image', async (_, { dataUrl, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Drill Image',
    defaultPath: defaultName || 'drill.png',
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  });
  if (result.canceled || !result.filePath) return { cancelled: true };
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'));
  return { filePath: result.filePath };
});

ipcMain.handle('fs:export-pdf', async (_, { buffer, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PDF',
    defaultPath: defaultName || 'session.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { cancelled: true };
  fs.writeFileSync(result.filePath, Buffer.from(buffer));
  return { filePath: result.filePath };
});

// App info
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);
