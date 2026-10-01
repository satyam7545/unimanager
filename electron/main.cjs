const { app, BrowserWindow, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let backendProcess = null;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const BACKEND_PORT = process.env.PORT || 5000;
const FRONTEND_DEV_URL = 'http://localhost:5173';
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

// Enforce single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function resolveBackendPath() {
  const possiblePaths = [
    path.join(__dirname, '../backend/dist/index.js'),
    path.join(process.resourcesPath, 'backend/dist/index.js'),
    path.join(process.resourcesPath, 'app.asar.unpacked/backend/dist/index.js'),
  ];
  return possiblePaths.find((p) => fs.existsSync(p));
}

function startBackend() {
  const backendPath = resolveBackendPath();
  if (!backendPath) {
    console.warn('Backend entry not found at expected paths, expecting external or dev server.');
    return;
  }

  console.log(`Starting backend from: ${backendPath}`);

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(BACKEND_PORT),
    NODE_ENV: 'production',
  };

  backendProcess = spawn(process.execPath, [backendPath], {
    env,
    stdio: 'inherit',
    windowsHide: true,
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
  });

  backendProcess.on('exit', (code, signal) => {
    console.log(`Backend process exited with code ${code}, signal ${signal}`);
  });
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(`${url}/api/v1/health`, (res) => {
          if (res.statusCode === 200 || res.statusCode === 304) {
            resolve();
          } else {
            retry();
          }
        })
        .on('error', () => {
          retry();
        });
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for backend server at ${url}`));
      } else {
        setTimeout(check, 350);
      }
    };

    check();
  });
}

function createMainWindow() {
  nativeTheme.themeSource = 'dark';

  const iconPath = path.join(__dirname, 'resources/icon.png');
  const isWindows = process.platform === 'win32';

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1080,
    minHeight: 700,
    title: 'UniManager',
    backgroundColor: '#09090b',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: isWindows ? 'hidden' : 'default',
    titleBarOverlay: isWindows
      ? {
          color: '#09090b',
          symbolColor: '#a1a1aa',
          height: 48,
        }
      : false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
    },
  });

  // Windows Desktop Keyboard Shortcuts (F11 Fullscreen, Ctrl+R / F5 Reload, Zoom In/Out)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    if (((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') && input.type === 'keyDown') {
      mainWindow.reload();
      event.preventDefault();
    }
    if (input.control && (input.key === '=' || input.key === '+') && input.type === 'keyDown') {
      const zoom = mainWindow.webContents.getZoomFactor();
      mainWindow.webContents.setZoomFactor(Math.min(zoom + 0.1, 2.0));
      event.preventDefault();
    }
    if (input.control && input.key === '-' && input.type === 'keyDown') {
      const zoom = mainWindow.webContents.getZoomFactor();
      mainWindow.webContents.setZoomFactor(Math.max(zoom - 0.1, 0.7));
      event.preventDefault();
    }
    if (input.control && input.key === '0' && input.type === 'keyDown') {
      mainWindow.webContents.setZoomFactor(1.0);
      event.preventDefault();
    }
  });

  // Load splash loading screen immediately
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const targetUrl = isDev ? FRONTEND_DEV_URL : BACKEND_URL;

  waitForServer(BACKEND_URL)
    .then(() => {
      console.log(`Backend is ready! Loading app at ${targetUrl}`);
      if (mainWindow) {
        mainWindow.loadURL(targetUrl);
      }
    })
    .catch((err) => {
      console.error(err);
      if (mainWindow) {
        mainWindow.loadURL(targetUrl);
      }
    });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});
ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});
ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

app.whenReady().then(() => {
  if (!isDev) {
    startBackend();
  }
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

function cleanup() {
  if (backendProcess && !backendProcess.killed) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProcess.pid.toString(), '/f', '/t']);
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch (e) {
      console.error('Error cleaning up backend process:', e);
    }
    backendProcess = null;
  }
}

app.on('before-quit', cleanup);
app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
