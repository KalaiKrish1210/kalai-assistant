const electron = require('electron');

if (typeof electron === 'string' || !electron.app) {
  console.error('Kalai Assistant must be started with Electron, not Node.');
  process.exit(1);
}

const { app, BrowserWindow, Menu, dialog, shell } = electron;
const fs = require('fs');
const path = require('path');
const { startDesktopServer } = require('./server');

const WEB_ROOT = path.join(__dirname, '..', 'dist', 'kalai-assistant', 'browser');

let mainWindow = null;
let desktopServer = null;

function iconPath() {
  const png = path.join(__dirname, 'icons', 'icon.png');
  return fs.existsSync(png) ? png : undefined;
}

function createMenu() {
  const isMac = process.platform === 'darwin';
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(isMac
        ? [{ role: 'appMenu' }]
        : [{ label: 'File', submenu: [{ role: 'quit' }] }]),
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ]),
  );
}

async function createWindow(startUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 880,
    minHeight: 640,
    title: 'Kalai Assistant',
    backgroundColor: '#14110e',
    autoHideMenuBar: process.platform === 'win32',
    icon: iconPath(),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  await mainWindow.loadURL(startUrl);
}

async function boot() {
  try {
    if (!fs.existsSync(path.join(WEB_ROOT, 'index.html'))) {
      dialog.showErrorBox(
        'Kalai Assistant',
        'The app UI is missing. From the project folder run:\n\nnpm run build\nnpm run desktop',
      );
      app.quit();
      return;
    }

    desktopServer = await startDesktopServer({
      userDataDir: app.getPath('userData'),
      webRoot: WEB_ROOT,
      packaged: app.isPackaged,
    });
    createMenu();
    await createWindow(desktopServer.url);
  } catch (error) {
    dialog.showErrorBox(
      'Kalai Assistant',
      error instanceof Error ? error.message : 'The desktop app failed to start.',
    );
    app.quit();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(() => void boot());
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && desktopServer) {
      void createWindow(desktopServer.url);
    }
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  app.on('before-quit', () => {
    desktopServer?.server.close();
  });
}
