'use strict';

const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const {
  buildOutputUrl,
  buildRecordingPath,
  safeStreamName,
} = require('./util');

const BINARIES = {
  mediaMtx: 'mediamtx.exe',
  ffmpeg: 'ffmpeg.exe',
  virtualCamera: 'dssvcam.exe',
};

function waitForExit(child, timeoutMs) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimer);
      resolve();
    };
    const hardTimer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* already gone */
      }
      finish();
    }, timeoutMs);
    child.once('close', finish);
    child.once('exit', finish);
    child.once('error', finish);
  });
}

/**
 * Resolve once something accepts connections on the port, or after the
 * timeout. Used to confirm MediaMTX really opened RTMP instead of dying on a
 * port conflict while the UI still claims everything is fine.
 */
function waitForPort(port, timeoutMs = 5000, host = '127.0.0.1') {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const attempt = () => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (ok) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (ok) resolve(true);
        else if (Date.now() >= deadline) resolve(false);
        else setTimeout(attempt, 250);
      };

      socket.setTimeout(700);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
      socket.connect(port, host);
    };
    attempt();
  });
}

/**
 * Quick TCP reachability probe, used to reject dead RTMP targets before
 * spawning ffmpeg (a DNS/port failure then gets a precise message).
 */
function probeTcp(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

/**
 * Ask a child process to stop, then make sure it is really gone.
 * Recording gets a graceful 'q' so the MP4 trailer can be written.
 */
async function stopProcess(child, { graceful = false, graceMs = 3000 } = {}) {
  if (!child || child.exitCode !== null || child.signalCode) return;

  const exited = waitForExit(child, graceMs);
  if (graceful) {
    try {
      if (child.stdin && child.stdin.writable) child.stdin.write('q\n');
    } catch {
      /* stdin may already be closed */
    }
  } else {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
  }

  const killTimer = setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }, graceful ? graceMs : 500);

  await exited;
  clearTimeout(killTimer);
}

class Engine extends EventEmitter {
  constructor({ config, binDirs = [], logger = console }) {
    super();
    this.config = config;
    this.binDirs = binDirs.filter(Boolean);
    this.log = logger;

    this.mtx = null;
    this.mediaReady = false;
    this.mediaError = null;
    this.record = null;
    this.recordFile = null;
    this.restream = null;
    this.restreamTargets = [];
    this.restreamError = null;
    this.restreamWaiting = false;
    this.restreamIntent = null;
    this.restreamWaitTimer = null;
    this.sourceWaitBusy = false;
    this.restreamEpoch = 0;
    this.vcam = {
      intended: false,
      stream: config.streams.default,
      ffmpeg: null,
      relay: null,
      retryTimer: null,
      retries: 0,
    };
    this.lastError = null;
  }

  /** Locate a bundled binary, or return null when it is not present. */
  resolveBinary(name) {
    for (const dir of this.binDirs) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  requireBinary(name) {
    const found = this.resolveBinary(name);
    if (!found) {
      throw new Error(`${name} tidak ditemukan di folder resources`);
    }
    return found;
  }

  _spawn(label, binary, args, options = {}) {
    const child = spawn(binary, args, { windowsHide: true, ...options });
    this._captureOutput(label, child);
    child.on('error', (error) => {
      this.lastError = `${label}: ${error.message}`;
      this.log.error(`[${label}]`, error.message);
      this.emit('log', { level: 'error', message: this.lastError });
    });
    child.on('close', (code, signal) => {
      if (code && code !== 0 && !signal) {
        this.log.warn(`[${label}] keluar dengan kode ${code}`);
      }
    });
    return child;
  }

  /**
   * Drain child output. Without this the OS pipe buffer fills up and the child
   * blocks forever — MediaMTX is chatty enough for that to happen on a long
   * session. MediaMTX lines go to the log; other tools only report problems.
   */
  _captureOutput(label, child) {
    const verbose = label === 'mediamtx';
    const attach = (stream) => {
      if (!stream) return;
      let buffer = '';
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split(/\r\n|\r|\n/);
        buffer = lines.pop() || '';
        if (buffer.length > 8192) buffer = '';
        for (const line of lines) this._noteLine(label, line, verbose);
      });
      stream.on('error', () => {});
    };
    attach(child.stdout);
    attach(child.stderr);
  }

  _noteLine(label, line, verbose) {
    const text = String(line || '').trim();
    if (!text) return;

    if (!this.recentOutput) this.recentOutput = [];
    this.recentOutput.push(`${label}: ${text}`.slice(0, 400));
    if (this.recentOutput.length > 120) this.recentOutput.shift();

    const important = /error|failed|fatal|denied|refused|not found|invalid/i.test(text);
    if (verbose || important) {
      this.log.info(`[${label}] ${text.slice(0, 400)}`);
    }
  }

  async startMediaMtx() {
    if (this.mtx) return { running: true, ready: this.mediaReady };

    const binary = this.resolveBinary(BINARIES.mediaMtx);
    if (!binary) {
      this.mediaReady = false;
      this.mediaError = 'mediamtx.exe tidak ditemukan di folder resources';
      this.log.warn('[mediamtx] biner tidak ditemukan, engine media tidak dijalankan');
      return { running: false, ready: false, reason: this.mediaError };
    }

    const configPath = path.join(path.dirname(binary), 'mediamtx.yml');
    const args = fs.existsSync(configPath) ? [configPath] : [];
    this.mediaError = null;
    this.mtx = this._spawn('mediamtx', binary, args, { cwd: path.dirname(binary) });
    this.log.info('[mediamtx] engine media aktif');

    const ready = await waitForPort(this.config.ports.rtmp);
    this.mediaReady = ready;
    if (!ready) {
      this.mediaError =
        `Port RTMP ${this.config.ports.rtmp} tidak dapat dibuka. ` +
        'Tutup aplikasi lain yang memakai port tersebut, lalu jalankan ulang.';
      this.log.error('[mediamtx]', this.mediaError);
      this.emit('log', { level: 'error', message: this.mediaError });
    } else {
      this.log.info(`[mediamtx] RTMP siap di port ${this.config.ports.rtmp}`);
    }

    return { running: true, ready };
  }

  async stopMediaMtx() {
    const child = this.mtx;
    this.mtx = null;
    this.mediaReady = false;
    await stopProcess(child);
  }

  /**
   * Live paths reported by the MediaMTX API, newest data first.
   *
   * The panel polls this every second, so the promise must always settle.
   * A socket that goes quiet (or a response that never ends) used to leave
   * the request hanging, and each hanging call consumed one of the browser's
   * six connections per origin. After a few seconds every panel request
   * queued behind them, which is why the UI answered seconds late.
   */
  getStreams({ timeoutMs } = {}) {
    const { requestTimeoutMs, liveBytesThreshold } = this.config.mediaMtx;
    const apiPort = this.config.ports.api;
    const budget = Math.max(200, Number(timeoutMs) || requestTimeoutMs);

    return new Promise((resolve) => {
      let settled = false;
      let request = null;
      let hardTimer = null;

      const finish = (items) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimer);
        if (request) {
          try {
            request.destroy();
          } catch {
            /* already closed */
          }
        }
        resolve(items);
      };

      const parse = (body) => {
        try {
          const parsed = JSON.parse(body);
          const items = Array.isArray(parsed.items) ? parsed.items : [];
          return items
            .filter(
              (item) =>
                typeof item.name === 'string' &&
                item.name.startsWith(`${this.config.streams.prefix}/`) &&
                Number(item.bytesReceived) > liveBytesThreshold,
            )
            .map((item) => ({
              name: item.name,
              bytesReceived: Number(item.bytesReceived) || 0,
              readers: Array.isArray(item.readers) ? item.readers.length : 0,
              ready: Boolean(item.ready),
            }));
        } catch {
          return [];
        }
      };

      try {
        request = http.get(
          {
            host: '127.0.0.1',
            port: apiPort,
            path: this.config.mediaMtx.apiPath,
            timeout: budget,
          },
          (response) => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
              body += chunk;
              if (body.length > 2 * 1024 * 1024) finish([]);
            });
            response.on('end', () => finish(parse(body)));
            response.on('aborted', () => finish([]));
            response.on('error', () => finish([]));
            response.on('close', () => finish([]));
          },
        );
      } catch {
        finish([]);
        return;
      }

      // Last line of defence: even if the socket neither errors nor times out,
      // the panel gets an answer instead of waiting forever.
      hardTimer = setTimeout(() => finish([]), budget + 250);
      request.on('timeout', () => finish([]));
      request.on('error', () => finish([]));
      // A destroyed request emits 'close' without 'error'. Give a complete
      // response one tick to land first so a good body is not thrown away.
      request.on('close', () => {
        if (!settled) setTimeout(() => finish([]), 50);
      });
    });
  }

  async startRecording({ folder, streamName }) {
    const stream = safeStreamName(streamName, this.config.streams.default);
    const filepath = buildRecordingPath(
      folder,
      stream,
      this.config.recording.filePrefix,
    );
    const binary = this.requireBinary(BINARIES.ffmpeg);

    await this.stopRecording();

    const args = [
      '-hide_banner',
      '-loglevel',
      'warning',
      '-i',
      `rtmp://127.0.0.1:${this.config.ports.rtmp}/${stream}`,
      '-c',
      'copy',
      '-movflags',
      'frag_keyframe+empty_moov',
      '-y',
      filepath,
    ];

    const child = this._spawn('record', binary, args);
    this.record = child;
    this.recordFile = filepath;

    child.once('close', () => {
      if (this.record === child) {
        this.record = null;
        this.recordFile = null;
      }
      this.emit('state');
    });

    this.emit('state');
    return { filepath };
  }

  async stopRecording() {
    const child = this.record;
    const file = this.recordFile;
    this.record = null;
    this.recordFile = null;
    await stopProcess(child, { graceful: true });
    if (child) this.emit('state');
    return { filepath: file };
  }

  _buildRestreamArgs({ targets, audioSource, quality, stream }) {
    const qualityTable = this.config.restream.qualities;
    const profile = qualityTable[quality] || qualityTable[this.config.restream.defaultQuality];

    const audio = this.config.restream.audio;
    const audioArgs = [];
    const mapArgs = [];
    let extraAudioInput = false;

    if (audioSource === audio.stream) {
      // Use whatever audio the publisher already sends.
    } else if (typeof audioSource === 'string' && audioSource.startsWith(audio.microphonePrefix)) {
      const device = audioSource.slice(audio.microphonePrefix.length).trim();
      if (!device) throw new Error('Perangkat mikrofon tidak valid');
      audioArgs.push('-f', 'dshow', '-i', `audio=${device}`);
      extraAudioInput = true;
    } else {
      audioArgs.push(
        '-f',
        'lavfi',
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=44100',
      );
      extraAudioInput = true;
    }

    if (extraAudioInput) {
      mapArgs.push('-map', '0:v:0', '-map', '1:a:0');
    }

    let outputArgs;
    if (targets.length === 1) {
      outputArgs = ['-f', 'flv', targets[0]];
    } else {
      const tee = targets.map((url) => `[f=flv:onfail=ignore]${url}`).join('|');
      outputArgs = ['-f', 'tee', tee];
    }

    return [
      '-hide_banner',
      '-loglevel',
      'warning',
      '-fflags',
      'nobuffer+flush_packets',
      '-analyzeduration',
      '0',
      '-probesize',
      '32',
      '-flags',
      'low_delay',
      '-i',
      `rtmp://127.0.0.1:${this.config.ports.rtmp}/${stream}`,
      ...audioArgs,
      ...mapArgs,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'zerolatency',
      '-b:v',
      profile.video,
      '-maxrate',
      profile.maxrate,
      '-bufsize',
      profile.maxrate,
      '-pix_fmt',
      'yuv420p',
      '-g',
      '60',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      ...(extraAudioInput ? ['-shortest'] : []),
      ...outputArgs,
    ];
  }

  _lastChildError(label, maxLines = 3) {
    const prefix = `${label}:`;
    const lines = (this.recentOutput || [])
      .filter((line) => line.startsWith(prefix))
      .map((line) => line.slice(prefix.length).trim())
      .filter(Boolean)
      .filter((line) => !/^(frame=|size=|video:|audio:)/i.test(line));
    return lines.slice(-maxLines).join(' · ').slice(0, 300);
  }

  async startRestream(options) {
    const stream = safeStreamName(options.streamName, this.config.streams.default);
    const rawTargets = Array.isArray(options.targets) ? options.targets : [];
    const allowed = this.config.restream.allowedSchemes;

    const targets = [];
    for (const target of rawTargets) {
      if (!target) continue;
      const url = buildOutputUrl(target.url, target.key, allowed);
      if (url) targets.push(url);
    }

    if (targets.length === 0) {
      throw new Error('Minimal satu URL target harus diisi');
    }

    if (!this.mediaReady) {
      this.restreamError =
        'Mesin media belum siap. Tunggu beberapa detik sampai status RTMP aktif, lalu coba lagi.';
      throw new Error(this.restreamError);
    }

    // Short budget: the panel must answer in well under a second. A slow or
    // wedged MediaMTX API is reported as "not live" instead of freezing the UI.
    const epoch = this.restreamEpoch;
    const live = await this.getStreams({ timeoutMs: 900 }).catch(() => []);
    if (live.some((item) => item.name === stream)) {
      return this._launchRestream({ stream, targets, options, epoch });
    }

    if (options.waitForSource === false) {
      this.restreamError = `Stream "${stream}" belum aktif. Hubungkan drone lewat RTMP dulu, lalu coba lagi.`;
      throw new Error(this.restreamError);
    }

    // Pressing "Mulai" before DJI Fly starts streaming is the normal order of
    // operations, so wait for the publisher instead of refusing. The target is
    // still validated first: an unreachable server is a real mistake.
    await this._probeRestreamTargets(targets);

    this._cancelSourceWait();
    this.restreamIntent = { stream, targets, options };
    this.restreamWaiting = true;
    this.restreamError = null;
    this.restreamWaitTimer = setInterval(() => this._checkSourceWait(), 1000);
    this.emit('state');
    return { targets: targets.length, waiting: true };
  }

  /** Poll for the drone while the user has asked for a restream. */
  _checkSourceWait() {
    if (!this.restreamWaiting || !this.restreamIntent) {
      this._cancelSourceWait();
      return;
    }
    if (this.sourceWaitBusy) return;
    this.sourceWaitBusy = true;

    this.getStreams({ timeoutMs: 900 })
      .catch(() => [])
      .then((live) => {
        this.sourceWaitBusy = false;
        const intent = this.restreamIntent;
        if (!this.restreamWaiting || !intent) return;
        if (!live.some((item) => item.name === intent.stream)) return;

        this._cancelSourceWait();
        this._launchRestream({ ...intent, epoch: this.restreamEpoch }).catch((error) => {
          this.restreamError = error.message;
          this.emit('state');
        });
      });
  }

  _cancelSourceWait() {
    if (this.restreamWaitTimer) {
      clearInterval(this.restreamWaitTimer);
      this.restreamWaitTimer = null;
    }
    this.sourceWaitBusy = false;
    this.restreamWaiting = false;
    this.restreamIntent = null;
  }

  async _probeRestreamTargets(targets) {
    // Reject unreachable RTMP targets up front: ffmpeg would otherwise sit for
    // a couple of seconds and the UI would flash on and off.
    for (const target of targets) {
      let parsed;
      try {
        parsed = new URL(target);
      } catch {
        continue;
      }
      const scheme = parsed.protocol.replace(':', '').toLowerCase();
      if (scheme !== 'rtmp' && scheme !== 'rtmps') continue;
      const port = Number(parsed.port || (scheme === 'rtmps' ? 443 : 1935));
      // eslint-disable-next-line no-await-in-loop
      const reachable = await probeTcp(parsed.hostname, port);
      if (!reachable) {
        this.restreamError =
          `Target ${parsed.hostname}:${port} tidak dapat dihubungi. ` +
          'Periksa URL, stream key, dan koneksi internet.';
        throw new Error(this.restreamError);
      }
    }
  }

  async _launchRestream({ stream, targets, options, epoch }) {
    await this._probeRestreamTargets(targets);

    // Stop pressed while the probe was running: do not start anything.
    if (epoch !== undefined && epoch !== this.restreamEpoch) {
      return { targets: targets.length, waiting: false, cancelled: true };
    }

    const binary = this.requireBinary(BINARIES.ffmpeg);
    const args = this._buildRestreamArgs({
      targets,
      audioSource: options.audioSource,
      quality: options.quality,
      stream,
    });

    await this.stopRestream();

    this.restreamError = null;
    const child = this._spawn('restream', binary, args);
    this.restream = child;
    this.restreamTargets = targets;

    // A bad stream key or a target that closes the publish is usually detected
    // within a couple of seconds. Wait briefly so the API can report the real
    // reason instead of claiming success.
    const failed = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 2500);
      child.once('close', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });

    if (failed) {
      this.restream = null;
      this.restreamTargets = [];
      this.restreamError = this._lastChildError('restream') || 'FFmpeg berhenti setelah dimulai';
      throw new Error(`Restream gagal: ${this.restreamError}`);
    }

    child.once('close', () => {
      if (this.restream === child) {
        this.restream = null;
        this.restreamTargets = [];
        this.restreamError = this._lastChildError('restream') || 'Restream terputus';
      }
      this.emit('state');
    });

    this.emit('state');
    return { targets: targets.length, waiting: false };
  }

  async stopRestream() {
    this.restreamEpoch += 1;
    this._cancelSourceWait();
    const child = this.restream;
    this.restream = null;
    this.restreamTargets = [];
    this.restreamError = null;
    await stopProcess(child, { graceful: true });
    if (child) this.emit('state');
  }

  async startVirtualCamera({ streamName }) {
    const stream = safeStreamName(streamName, this.vcam.stream);
    const binary = this.requireBinary(BINARIES.ffmpeg);
    const relay = this.requireBinary(BINARIES.virtualCamera);

    this.vcam.intended = true;
    this.vcam.stream = stream;

    await this._stopVcamFfmpeg();
    this._spawnVcamRelay(relay);
    this._spawnVcamFfmpeg(binary);

    this.emit('state');
    return { stream };
  }

  _spawnVcamFfmpeg(binary) {
    const { width, height, fps, pixelFormat } = this.config.virtualCamera;
    const args = [
      '-hide_banner',
      '-loglevel',
      'warning',
      '-fflags',
      'nobuffer+flush_packets',
      '-flags',
      'low_delay',
      '-i',
      `rtmp://127.0.0.1:${this.config.ports.rtmp}/${this.vcam.stream}`,
      '-vf',
      'hflip,vflip',
      '-f',
      'rawvideo',
      '-vcodec',
      'rawvideo',
      '-pix_fmt',
      pixelFormat,
      '-s',
      `${width}x${height}`,
      '-r',
      String(fps),
      `tcp://127.0.0.1:${this.config.ports.vcam}?tcp_nodelay=1`,
    ];

    const child = this._spawn('vcam', binary, args);
    this.vcam.ffmpeg = child;
    const startedAt = Date.now();

    child.once('close', () => {
      if (this.vcam.ffmpeg === child) this.vcam.ffmpeg = null;
      this.emit('state');
      if (!this.vcam.intended) return;
      // With no publisher the relay dies immediately. Retrying every 1.5 s
      // spawned ffmpeg dozens of times a minute and made the whole panel feel
      // sluggish, so back off instead.
      if (Date.now() - startedAt > 10000) this.vcam.retries = 0;
      this.vcam.retries = Math.min(this.vcam.retries + 1, 5);
      const delay = Math.min(1500 * 2 ** (this.vcam.retries - 1), 15000);
      clearTimeout(this.vcam.retryTimer);
      this.vcam.retryTimer = setTimeout(() => {
        if (!this.vcam.intended) return;
        const bin = this.resolveBinary(BINARIES.ffmpeg);
        if (bin) this._spawnVcamFfmpeg(bin);
      }, delay);
    });
  }

  _spawnVcamRelay(binary) {
    if (this.vcam.relay) return;
    const { width, height } = this.config.virtualCamera;
    const icon = this.resolveBinary('logo.png');
    const args = [String(width), String(height)];
    if (icon) args.push(icon);

    try {
      const child = this._spawn('vcam-relay', binary, args, {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      this.vcam.relay = child;
      child.once('close', () => {
        if (this.vcam.relay === child) this.vcam.relay = null;
      });
    } catch (error) {
      this.log.warn('[vcam] relay gagal dijalankan:', error.message);
    }
  }

  async _stopVcamFfmpeg() {
    const child = this.vcam.ffmpeg;
    this.vcam.ffmpeg = null;
    this.vcam.retries = 0;
    await stopProcess(child);
  }

  async stopVirtualCamera() {
    this.vcam.intended = false;
    clearTimeout(this.vcam.retryTimer);
    this.vcam.retryTimer = null;
    await this._stopVcamFfmpeg();
    this.emit('state');
  }

  getState() {
    return {
      recording: {
        active: Boolean(this.record),
        filepath: this.recordFile,
      },
      restream: {
        active: Boolean(this.restream),
        waiting: Boolean(this.restreamWaiting),
        targets: this.restreamTargets.length || (this.restreamIntent ? this.restreamIntent.targets.length : 0),
        error: this.restreamError,
      },
      virtualCamera: {
        active: Boolean(this.vcam.intended),
        stream: this.vcam.stream,
      },
      media: {
        running: Boolean(this.mtx),
        ready: Boolean(this.mediaReady),
        error: this.mediaError,
      },
      lastError: this.lastError,
    };
  }

  async shutdown() {
    this.vcam.intended = false;
    clearTimeout(this.vcam.retryTimer);
    this._cancelSourceWait();
    await Promise.allSettled([
      this._stopVcamFfmpeg(),
      stopProcess(this.restream, { graceful: true }),
      stopProcess(this.record, { graceful: true }),
    ]);
    this.restream = null;
    this.record = null;
    await stopProcess(this.mtx);
    this.mtx = null;

    if (this.vcam.relay && this.vcam.relay.exitCode === null) {
      try {
        this.vcam.relay.kill();
      } catch {
        /* already gone */
      }
    }
    this.vcam.relay = null;
  }
}

module.exports = { Engine, BINARIES };
