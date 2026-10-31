'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const config = require('./config');
const { Engine } = require('./engine');
const { createLogger } = require('./logger');
const { createPanel } = require('./server');

const isDev = process.argv.includes('--dev');

let mainWindow = null;
let panelServer = null;
let engine = null;
let logger = null;
let panelOrigin = '';
let shuttingDown = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

  app.setAppUserModelId('com.example.dronelive');

  app.whenReady().then(start).catch((error) => {
    dialog.showErrorBox('Gagal memulai', error.message);
    app.exit(1);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('before-quit', (event) => {
    if (shuttingDown) return;
    event.preventDefault();
    shuttingDown = true;

    const cleanup = async () => {
      try {
        if (engine) await engine.shutdown();
      } catch {
        /* best effort */
      }
      if (panelServer) {
        await new Promise((resolve) => panelServer.close(resolve));
      }
      if (logger) {
        logger.info('[app] berhenti');
        await logger.close();
      }
    };

    Promise.race([
      cleanup(),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]).finally(() => app.exit(0));
  });
}

function resourceDirs() {
  const dirs = [path.join(__dirname, '..', 'resources')];
  if (process.resourcesPath) {
    // Flat layout (preferred): <app>\resources\mediamtx.exe
    dirs.push(process.resourcesPath);
    // Nested layout kept so older installs keep working.
    dirs.push(path.join(process.resourcesPath, 'resources'));
  }
  return dirs;
}

async function pickFolder() {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Pilih folder penyimpanan rekaman',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

async function start() {
  const token = crypto.randomBytes(32).toString('hex');
  const rendererDir = path.join(__dirname, '..', 'renderer');
  const version = require('../package.json').version;

  logger = createLogger({ dir: path.join(app.getPath('appData'), 'drone-live-engine', 'logs') });
  logger.info(`[app] Drone Live Engine ${version} mulai (${process.platform})`);

  process.on('uncaughtException', (error) => {
    logger.error('[app] uncaughtException', error);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('[app] unhandledRejection', reason);
  });

  engine = new Engine({
    config,
    binDirs: resourceDirs(),
    logger,
  });
  engine.on('log', (entry) => logger.info(`[engine] ${entry.message}`));

  await engine.startMediaMtx();

  const panel = createPanel({
    engine,
    config,
    token,
    rendererDir,
    version,
    pickFolder,
    openPath: (target) => shell.openPath(target),
    logFile: logger.file,
    logger,
  });

  panelServer = panel.app.listen(config.panel.port, config.panel.host);
  let boundPort;
  try {
    boundPort = await new Promise((resolve, reject) => {
      panelServer.once('listening', () => resolve(panelServer.address().port));
      panelServer.once('error', reject);
    });
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    // Another copy is already using the preferred port: pick a free one.
    panelServer = panel.app.listen(0, config.panel.host);
    boundPort = await new Promise((resolve, reject) => {
      panelServer.once('listening', () => resolve(panelServer.address().port));
      panelServer.once('error', reject);
    });
  }

  panel.setBoundPort(boundPort);
  panelOrigin = `http://${config.panel.host}:${boundPort}`;

  const iconPath = path.join(rendererDir, 'icon.png');
  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    minWidth: config.window.minWidth,
    minHeight: config.window.minHeight,
    title: config.branding.windowTitle,
    backgroundColor: '#0b1220',
    autoHideMenuBar: true,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${panelOrigin}/`)) event.preventDefault();
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    if (isDev && input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  await mainWindow.loadURL(`${panelOrigin}/?token=${token}`);
  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}
