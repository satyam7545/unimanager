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

  // Persistent user uploads directory
  const userDataDir = app.getPath('userData');
  const userUploadsDir = path.join(userDataDir, 'uploads');
  if (!fs.existsSync(userUploadsDir)) {
    try {
      fs.mkdirSync(userUploadsDir, { recursive: true });
    } catch (e) {
      console.warn('Failed to create user uploads directory:', e);
    }
  }

  // Sync existing uploads from repo/resources into user uploads directory
  const potentialSourceUploadDirs = [
    path.join(__dirname, '../backend/uploads'),
    path.join(__dirname, '../uploads'),
    path.join(process.resourcesPath, 'backend/uploads'),
    path.join(process.resourcesPath, 'app.asar.unpacked/backend/uploads'),
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'backend/uploads'),
  ];

  potentialSourceUploadDirs.forEach((srcDir) => {
    try {
      if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir);
        files.forEach((file) => {
          const srcPath = path.join(srcDir, file);
          const destPath = path.join(userUploadsDir, file);
          if (fs.statSync(srcPath).isFile() && !fs.existsSync(destPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`Synced attachment to user uploads: ${file}`);
          }
        });
      }
    } catch (e) {
      // Ignored non-critical copy warning
    }
  });

  const envConfig = {
    PORT: String(BACKEND_PORT),
    NODE_ENV: 'production',
    DATABASE_URL: 'mysql://satya:$%40tyam%407545MySQL@129.154.233.66:3306/uni',
    JWT_ACCESS_SECRET: 'unimanager_access_super_secret_key_12345!',
    JWT_REFRESH_SECRET: 'unimanager_refresh_super_secret_key_54321!',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    CLIENT_URL: 'http://localhost:5173',
  };

  // Try reading any available .env file to override defaults
  const possibleEnvFiles = [
    path.join(__dirname, '../backend/.env'),
    path.join(__dirname, '.env'),
    path.join(process.resourcesPath, 'backend/.env'),
    path.join(process.resourcesPath, 'app.asar.unpacked/backend/.env'),
    path.join(path.resolve(path.dirname(backendPath), '..'), '.env'),
  ];

  for (const envFile of possibleEnvFiles) {
    try {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        content.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const idx = trimmed.indexOf('=');
            if (idx !== -1) {
              const k = trimmed.slice(0, idx).trim();
              let v = trimmed.slice(idx + 1).trim();
              if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                v = v.slice(1, -1);
              }
              if (k && v) {
                envConfig[k] = v;
              }
            }
          }
        });
        break;
      }
    } catch (e) {
      // Ignored
    }
  }

  const env = {
    ...process.env,
    ...envConfig,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(BACKEND_PORT),
    NODE_ENV: 'production',
    UPLOADS_DIR: userUploadsDir,
  };

  const backendRootDir = path.resolve(path.dirname(backendPath), '..');

  backendProcess = spawn(process.execPath, [backendPath], {
    env,
    cwd: backendRootDir,
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
      plugins: true,
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

  // Open external links in user's default browser, but keep internal/backend URLs inside
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return { action: 'allow' };
    }
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
