const path = require('node:path');
const { app, BrowserWindow, shell } = require('electron');
const { APP_URL, WINDOW_TITLE } = require('./config');

const APP_ORIGIN = new URL(APP_URL).origin;
const APP_ICON = path.join(
  __dirname,
  'assets',
  process.platform === 'win32' ? 'icon.ico' : 'icon.png'
);

function isExternalUrl(url) {
  try {
    return new URL(url).origin !== APP_ORIGIN;
  } catch {
    return true;
  }
}

function openInBrowser(url) {
  let protocol;

  try {
    protocol = new URL(url).protocol;
  } catch {
    return;
  }

  if (!['http:', 'https:', 'mailto:'].includes(protocol)) {
    return;
  }

  shell.openExternal(url).catch((error) => {
    console.error(`Could not open ${url} in the default browser:`, error);
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: WINDOW_TITLE,
    width: 1100,
    height: 800,
    minWidth: 360,
    minHeight: 600,
    icon: APP_ICON,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      openInBrowser(url);
      return { action: 'deny' };
    }

    return { action: 'allow' };
  });

  const handleNavigation = (event, url) => {
    if (isExternalUrl(url)) {
      event.preventDefault();
      openInBrowser(url);
    }
  };

  mainWindow.webContents.on('will-navigate', handleNavigation);
  mainWindow.webContents.on('will-redirect', handleNavigation);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(APP_URL);
}

app.setName(WINDOW_TITLE);

if (process.platform === 'win32') {
  app.setAppUserModelId('com.sreehas.chatapp');
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(APP_ICON);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
