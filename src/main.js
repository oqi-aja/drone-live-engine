'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const config = require('./config');
const { Engine } = require('./engine');
const { createLogger } = require('./logger');
const { createPanel } = require('./server');
const { DeviceStore } = require('./devices');
const { detectNetwork } = require('./network');

const isDev = process.argv.includes('--dev');

let mainWindow = null;
let panelServer = null;
let engine = null;
let logger = null;
let panelOrigin = '';
let panel = null;
let serverHost = config.panel.host;
let boundPort = config.panel.port;
let lanIp = '';
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

function listenOnce(host, port) {
  return new Promise((resolve, reject) => {
    const server = panel.app.listen(port, host);
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}

async function closeServer(server) {
  if (!server) return;
  // Berhenti menerima koneksi baru dan lepaskan port segera. Koneksi yang
  // sedang membawa balasan (mis. toggle akses HP) tidak diputus paksa;
  // soket keep-alive yang menganggur dibersihkan setelah balasan terkirim.
  server.close();
  if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();
  setTimeout(() => {
    try {
      if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    } catch {
      /* best effort */
    }
  }, 500);
}

/** Semua alamat IPv4 lokal (tanpa loopback), dipakai untuk allowlist Host. */
function localIpv4s() {
  const list = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) list.push(entry.address);
    }
  }
  return list;
}

/**
 * Panel desktop selalu di 127.0.0.1. Saat akses HP dinyalakan, listener yang
 * sama dipindah ke 0.0.0.0 supaya tidak ada dua proses berebut port yang sama.
 */
async function setLanAccess(enabled, preferredIp = '') {
  if (enabled) {
    if (preferredIp && localIpv4s().includes(preferredIp)) {
      lanIp = preferredIp;
    } else if (!lanIp) {
      try {
        const network = await detectNetwork({ osModule: os });
        lanIp = network.ip || '';
      } catch {
        lanIp = '';
      }
    }
  }
  const target = enabled ? '0.0.0.0' : config.panel.host;
  if (target === serverHost) {
    panel.setLan(enabled);
    return;
  }
  await closeServer(panelServer);
  panelServer = await listenOnce(target, boundPort);
  serverHost = target;
  panel.setLan(enabled);
  logger.info(`[panel] listener pindah ke ${target}:${boundPort}`);
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

  try {
    const network = await detectNetwork({ osModule: os });
    lanIp = network.ip || '';
  } catch {
    lanIp = '';
  }

  const devices = new DeviceStore({
    file: path.join(app.getPath('appData'), 'drone-live-engine', 'devices.json'),
    logger,
  });

  panel = createPanel({
    engine,
    config,
    token,
    rendererDir,
    version,
    pickFolder,
    openPath: (target) => shell.openPath(target),
    logFile: logger.file,
    logger,
    devices,
    lan: {
      enabled: false,
      getState: () => ({ ip: lanIp }),
      listHosts: () => {
        const hosts = localIpv4s();
        if (lanIp && !hosts.includes(lanIp)) hosts.push(lanIp);
        return hosts;
      },
      onChange: setLanAccess,
    },
  });

  try {
    panelServer = await listenOnce(config.panel.host, config.panel.port);
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    // Another copy is already using the preferred port: pick a free one.
    panelServer = await listenOnce(config.panel.host, 0);
  }

  boundPort = panelServer.address().port;
  serverHost = config.panel.host;

  panel.setBoundPort(boundPort);
  panelOrigin = `http://${config.panel.host}:${boundPort}`;
  if (lanIp) logger.info(`[panel] IP LAN terdeteksi: ${lanIp}`);

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
