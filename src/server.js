'use strict';

const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const express = require('express');

const { detectNetwork } = require('./network');
const { getFirewallStatus, ensureFirewallRules } = require('./firewall');
const { isPlainObject, safeStreamName } = require('./util');

const COOKIE_NAME = 'dle_panel';
const MAX_QR_TEXT = 512;

function timingSafeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function parseAudioDevices(stderr) {
  const devices = [];
  let inAudioSection = false;

  for (const line of String(stderr).split(/\r?\n/)) {
    if (line.includes('DirectShow audio devices')) {
      inAudioSection = true;
      continue;
    }
    if (line.includes('DirectShow video devices')) {
      inAudioSection = false;
      continue;
    }
    if (!inAudioSection) continue;
    if (line.includes('Alternative name')) continue;

    const match = line.match(/"([^"]+)"/);
    if (match && match[1] && !devices.includes(match[1])) {
      devices.push(match[1]);
    }
  }
  return devices;
}

function isPortListening(port, host = '127.0.0.1', timeoutMs = 700) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function createPanel({
  engine,
  config,
  token,
  rendererDir,
  version = '0.1.0',
  pickFolder,
  openPath,
  logFile = '',
  logger = console,
}) {
  if (!token || typeof token !== 'string') {
    throw new Error('Panel token wajib diisi');
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);

  let boundPort = config.panel.port;
  const allowedHosts = () => [
    `127.0.0.1:${boundPort}`,
    `localhost:${boundPort}`,
    `[::1]:${boundPort}`,
  ];

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "media-src 'self' blob:",
        "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self'",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
    next();
  });

  // Reject DNS-rebinding attempts: the Host header must be loopback.
  app.use((req, res, next) => {
    const host = String(req.headers.host || '').toLowerCase();
    if (!allowedHosts().includes(host)) {
      res.status(421).type('text/plain').send('Host tidak diizinkan');
      return;
    }
    next();
  });

  const isAuthed = (req) => {
    const header = req.headers['x-panel-token'];
    if (typeof header === 'string' && timingSafeEqual(header, token)) return true;
    const cookie = readCookie(req.headers.cookie, COOKIE_NAME);
    return Boolean(cookie) && timingSafeEqual(cookie, token);
  };

  const requireAuth = (req, res, next) => {
    if (isAuthed(req)) {
      next();
      return;
    }
    res.status(401).json({ success: false, error: 'Tidak terautentikasi' });
  };

  const requireJson = (req, res, next) => {
    if (!req.is('application/json')) {
      res.status(415).json({ success: false, error: 'Content-Type harus application/json' });
      return;
    }
    const origin = req.headers.origin;
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (parsed.host !== req.headers.host) {
          res.status(403).json({ success: false, error: 'Origin tidak diizinkan' });
          return;
        }
      } catch {
        res.status(403).json({ success: false, error: 'Origin tidak valid' });
        return;
      }
    }
    next();
  };

  app.get('/', (req, res) => {
    const supplied = typeof req.query.token === 'string' ? req.query.token : '';
    if (supplied) {
      if (!timingSafeEqual(supplied, token)) {
        res.status(403).type('text/plain').send('Token panel tidak valid');
        return;
      }
      res.setHeader(
        'Set-Cookie',
        `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/`,
      );
      res.redirect(302, '/');
      return;
    }

    if (!isAuthed(req)) {
      res
        .status(403)
        .type('text/plain')
        .send('Panel hanya dapat dibuka dari dalam aplikasi Drone Live Engine.');
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(rendererDir, 'index.html'));
  });

  app.use(requireAuth);

  app.use(
    express.static(rendererDir, {
      index: false,
      dotfiles: 'deny',
      maxAge: '1h',
    }),
  );

  app.use('/api', express.json({ limit: config.panel.maxBodyBytes }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, version });
  });

  app.get('/api/config', (req, res) => {
    res.json({
      app: {
        name: config.branding.name,
        windowTitle: config.branding.windowTitle,
        company: config.branding.company,
        accent: config.branding.accent,
      },
      version,
      ports: config.ports,
      streams: config.streams,
      recording: { filePrefix: config.recording.filePrefix },
      defaultQuality: config.restream.defaultQuality,
      qualities: Object.entries(config.restream.qualities).map(([id, value]) => ({
        id,
        video: value.video,
        maxrate: value.maxrate,
      })),
      virtualCamera: {
        width: config.virtualCamera.width,
        height: config.virtualCamera.height,
        fps: config.virtualCamera.fps,
      },
    });
  });

  app.get('/api/state', (req, res) => {
    res.json(engine.getState());
  });

  const sendIp = asyncRoute(async (req, res) => {
    const network = await detectNetwork({ osModule: os });
    res.json({ ip: network.ip, source: network.source });
  });
  app.get('/api/get-ip', sendIp);
  app.get('/api/ip', sendIp);

  app.get(
    '/api/network',
    asyncRoute(async (req, res) => {
      const network = await detectNetwork({ osModule: os });
      res.json(network);
    }),
  );

  app.get(
    '/api/diagnostics',
    asyncRoute(async (req, res) => {
      const [network, firewall, paths] = await Promise.all([
        detectNetwork({ osModule: os }),
        getFirewallStatus(),
        engine.getStreams().catch(() => []),
      ]);

      const ports = [
        ['RTMP', config.ports.rtmp],
        ['RTSP', config.ports.rtsp],
        ['HLS', config.ports.hls],
        ['WebRTC', config.ports.webrtc],
        ['API', config.ports.api],
      ];

      res.json({
        version,
        platform: `${process.platform} ${os.release()}`,
        logFile,
        network,
        firewall,
        binaries: {
          mediamtx: engine.resolveBinary('mediamtx.exe'),
          ffmpeg: engine.resolveBinary('ffmpeg.exe'),
          dssvcam: engine.resolveBinary('dssvcam.exe'),
        },
        ports: await Promise.all(
          ports.map(async ([name, port]) => ({
            name,
            port,
            listening: await isPortListening(port),
          })),
        ),
        paths: paths.length,
        engine: engine.getState(),
      });
    }),
  );

  app.get(
    '/api/firewall/status',
    asyncRoute(async (req, res) => {
      res.json(await getFirewallStatus());
    }),
  );

  app.post(
    '/api/firewall/fix',
    requireJson,
    asyncRoute(async (req, res) => {
      const programs = ['mediamtx.exe', 'ffmpeg.exe', 'dssvcam.exe']
        .map((name) => engine.resolveBinary(name))
        .filter(Boolean);
      const status = await ensureFirewallRules({ programs, logger });
      res.json({ success: true, firewall: status });
    }),
  );

  app.post(
    '/api/open-logs',
    requireJson,
    asyncRoute(async (req, res) => {
      if (typeof openPath !== 'function') {
        res.status(501).json({ success: false, error: 'Pembuka folder tidak tersedia' });
        return;
      }
      if (!logFile) {
        res.status(404).json({ success: false, error: 'Berkas log belum tersedia' });
        return;
      }
      await openPath(path.dirname(logFile));
      res.json({ success: true });
    }),
  );

  const sendStreams = asyncRoute(async (req, res) => {
    const streams = await engine.getStreams();
    res.json({ streams });
  });
  app.get('/api/bitrate', sendStreams);
  app.get('/api/streams', sendStreams);

  app.get(
    '/api/audio-devices',
    asyncRoute(async (req, res) => {
      const binary = engine.resolveBinary('ffmpeg.exe');
      if (!binary) {
        res.json({ devices: [] });
        return;
      }
      execFile(
        binary,
        ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'],
        { windowsHide: true, timeout: 8000 },
        (error, stdout, stderr) => {
          // ffmpeg exits non-zero here by design; stderr carries the device list.
          if (error && !stderr) {
            res.json({ devices: [] });
            return;
          }
          res.json({ devices: parseAudioDevices(stderr) });
        },
      );
    }),
  );

  const chooseFolder = asyncRoute(async (req, res) => {
    if (typeof pickFolder !== 'function') {
      res.status(501).json({ success: false, error: 'Pemilih folder tidak tersedia' });
      return;
    }
    const folder = await pickFolder();
    res.json({ folder: folder || null });
  });
  app.get('/api/select-folder', chooseFolder);
  app.post('/api/select-folder', chooseFolder);

  app.post(
    '/api/record/start',
    requireJson,
    asyncRoute(async (req, res) => {
      const body = isPlainObject(req.body) ? req.body : {};
      const streamName = safeStreamName(body.streamName, config.streams.default);
      const result = await engine.startRecording({
        folder: body.folder,
        streamName,
      });
      res.json({ success: true, filepath: result.filepath, streamName });
    }),
  );

  app.post(
    '/api/record/stop',
    requireJson,
    asyncRoute(async (req, res) => {
      const result = await engine.stopRecording();
      res.json({ success: true, filepath: result.filepath });
    }),
  );

  app.post(
    '/api/restream',
    requireJson,
    asyncRoute(async (req, res) => {
      const body = isPlainObject(req.body) ? req.body : {};
      const streamName = safeStreamName(body.streamName, config.streams.default);

      let targets = Array.isArray(body.targets) ? body.targets : [];
      if (targets.length === 0) {
        // Backwards-compatible shape: url1/key1 and url2/key2.
        targets = [
          { url: body.url1, key: body.key1 },
          { url: body.url2, key: body.key2 },
        ];
      }

      const result = await engine.startRestream({
        targets,
        streamName,
        audioSource: body.audioSource,
        quality: body.quality,
        // Default: wait for the drone instead of refusing. DJI Fly is usually
        // started after the operator presses "Mulai".
        waitForSource: body.waitForSource !== false,
      });
      res.json({
        success: true,
        targets: result.targets,
        waiting: Boolean(result.waiting),
        streamName,
      });
    }),
  );

  app.post(
    '/api/restream/stop',
    requireJson,
    asyncRoute(async (req, res) => {
      await engine.stopRestream();
      res.json({ success: true });
    }),
  );

  app.post(
    '/api/vcam/start',
    requireJson,
    asyncRoute(async (req, res) => {
      const body = isPlainObject(req.body) ? req.body : {};
      const streamName = safeStreamName(body.streamName, config.streams.default);
      await engine.startVirtualCamera({ streamName });
      res.json({ success: true, streamName });
    }),
  );

  app.post(
    '/api/vcam/stop',
    requireJson,
    asyncRoute(async (req, res) => {
      await engine.stopVirtualCamera();
      res.json({ success: true });
    }),
  );

  app.get(
    '/api/qr',
    asyncRoute(async (req, res) => {
      const text = typeof req.query.text === 'string' ? req.query.text : '';
      if (!text || text.length > MAX_QR_TEXT) {
        res.status(400).json({ success: false, error: 'Teks QR tidak valid' });
        return;
      }

      let QRCode;
      try {
        QRCode = require('qrcode');
      } catch {
        res.status(501).json({ success: false, error: 'Modul QR belum terpasang' });
        return;
      }

      const buffer = await QRCode.toBuffer(text, {
        type: 'png',
        width: 256,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f172aff', light: '#ffffffff' },
      });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-store');
      res.send(buffer);
    }),
  );

  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {    logger.error('[panel]', error.message);
    const status = error.status && Number.isInteger(error.status) ? error.status : 400;
    res.status(status).json({ success: false, error: error.message || 'Terjadi kesalahan' });
  });

  return {
    app,
    setBoundPort(port) {
      boundPort = port;
    },
  };
}

module.exports = { createPanel, parseAudioDevices };
