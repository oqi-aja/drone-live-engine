'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Perangkat yang boleh mengontrol panel lewat LAN.
 *
 * Kode pairing hanya hidup di memori: sekali pakai, umur pendek, dan tidak
 * pernah ditulis ke disk. Yang disimpan hanyalah hash token sesi, jadi salinan
 * berkas devices.json tidak bisa dipakai untuk masuk.
 */
const PAIR_CODE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 10;
const MAX_DEVICES = 8;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function equalHex(left, right) {
  const a = Buffer.from(String(left), 'hex');
  const b = Buffer.from(String(right), 'hex');
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

function cleanName(value) {
  const text = String(value || '').replace(/[\r\n\t]/g, ' ').trim();
  if (!text) return 'Perangkat';
  return text.slice(0, 40);
}

class DeviceStore {
  constructor({ file, logger = console, now = () => Date.now() } = {}) {
    this.file = file || '';
    this.logger = logger;
    this.now = now;
    this.devices = [];
    this.pairCode = null;
    this.attempts = new Map();
    this.load();
  }

  load() {
    if (!this.file || !fs.existsSync(this.file)) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      const list = Array.isArray(parsed.devices) ? parsed.devices : [];
      this.devices = list
        .filter((entry) => entry && entry.id && entry.tokenHash)
        .slice(0, MAX_DEVICES);
    } catch (error) {
      this.logger.warn('[devices] gagal membaca daftar perangkat:', error.message);
      this.devices = [];
    }
  }

  save() {
    if (!this.file) return;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const payload = JSON.stringify({ version: 1, devices: this.devices }, null, 2);
      fs.writeFileSync(this.file, payload, { mode: 0o600 });
    } catch (error) {
      this.logger.warn('[devices] gagal menyimpan daftar perangkat:', error.message);
    }
  }

  prune() {
    const now = this.now();
    const before = this.devices.length;
    this.devices = this.devices.filter((entry) => now - entry.createdAt < SESSION_TTL_MS);
    if (this.devices.length !== before) this.save();
  }

  /** Kode pairing baru. Kode lama otomatis batal. */
  createPairCode() {
    this.prune();
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    this.pairCode = {
      code,
      expiresAt: this.now() + PAIR_CODE_TTL_MS,
      used: false,
    };
    return { code, expiresAt: this.pairCode.expiresAt };
  }

  cancelPairCode() {
    this.pairCode = null;
  }

  pairCodeState() {
    if (!this.pairCode) return null;
    if (this.now() > this.pairCode.expiresAt) {
      this.pairCode = null;
      return null;
    }
    return { expiresAt: this.pairCode.expiresAt };
  }

  /** Catat kegagalan per IP; kembalikan false kalau IP harus dikunci sementara. */
  noteAttempt(ip, success) {
    const key = String(ip || 'unknown');
    const now = this.now();
    const entry = this.attempts.get(key) || { count: 0, firstAt: now, blockedUntil: 0 };

    if (entry.blockedUntil > now) {
      this.attempts.set(key, entry);
      return { allowed: false, retryAfterMs: entry.blockedUntil - now };
    }

    if (now - entry.firstAt > ATTEMPT_WINDOW_MS) {
      entry.count = 0;
      entry.firstAt = now;
      entry.blockedUntil = 0;
    }

    if (success) {
      this.attempts.delete(key);
      return { allowed: true, retryAfterMs: 0 };
    }

    entry.count += 1;
    if (entry.count >= MAX_ATTEMPTS_PER_WINDOW) {
      entry.blockedUntil = now + ATTEMPT_WINDOW_MS;
      entry.count = 0;
      entry.firstAt = now;
    }
    this.attempts.set(key, entry);
    return { allowed: entry.blockedUntil <= now, retryAfterMs: Math.max(0, entry.blockedUntil - now) };
  }

  claim(code, { name, ip } = {}) {
    const gate = this.noteAttempt(ip, false);
    if (!gate.allowed) {
      return { error: 'terlalu_banyak', retryAfterMs: gate.retryAfterMs };
    }

    const entry = this.pairCode;
    if (!entry || entry.used || this.now() > entry.expiresAt) {
      this.pairCode = null;
      return { error: 'kode_tidak_valid' };
    }
    if (!equalHex(hashToken(code), hashToken(entry.code))) {
      return { error: 'kode_tidak_valid' };
    }

    this.pairCode = null;
    this.noteAttempt(ip, true);

    this.prune();
    if (this.devices.length >= MAX_DEVICES) {
      this.devices.sort((a, b) => a.createdAt - b.createdAt);
      this.devices.shift();
    }

    const token = crypto.randomBytes(32).toString('hex');
    const device = {
      id: crypto.randomBytes(8).toString('hex'),
      name: cleanName(name),
      tokenHash: hashToken(token),
      createdAt: this.now(),
      lastSeenAt: this.now(),
      lastIp: String(ip || ''),
    };

    this.devices.push(device);
    this.save();
    return { token, device: this.publicDevice(device) };
  }

  verify(token) {
    if (!token || typeof token !== 'string' || token.length !== 64) return null;
    const wanted = hashToken(token);
    const device = this.devices.find((entry) => equalHex(entry.tokenHash, wanted));
    if (!device) return null;
    if (this.now() - device.createdAt >= SESSION_TTL_MS) {
      this.revoke(device.id);
      return null;
    }
    device.lastSeenAt = this.now();
    return device;
  }

  publicDevice(device) {
    return {
      id: device.id,
      name: device.name,
      createdAt: device.createdAt,
      lastSeenAt: device.lastSeenAt,
      lastIp: device.lastIp || '',
    };
  }

  list() {
    this.prune();
    return this.devices
      .slice()
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .map((entry) => this.publicDevice(entry));
  }

  revoke(id) {
    const before = this.devices.length;
    this.devices = this.devices.filter((entry) => entry.id !== id);
    if (this.devices.length !== before) this.save();
    return this.devices.length !== before;
  }

  revokeAll() {
    const count = this.devices.length;
    this.devices = [];
    this.save();
    return count;
  }
}

module.exports = {
  DeviceStore,
  PAIR_CODE_TTL_MS,
  SESSION_TTL_MS,
  hashToken,
};
