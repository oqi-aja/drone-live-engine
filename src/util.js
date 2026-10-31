'use strict';

const fs = require('node:fs');
const path = require('node:path');

const STREAM_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const STREAM_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

/**
 * Normalise and validate a MediaMTX path such as "live/drone1".
 * Throws on anything that could escape a directory or confuse ffmpeg.
 */
function safeStreamName(raw, fallback) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  const candidate = value || fallback;
  if (typeof candidate !== 'string' || candidate.length > 128) {
    throw new Error('Nama stream tidak valid');
  }
  if (candidate.includes('..') || candidate.startsWith('/') || candidate.endsWith('/')) {
    throw new Error('Nama stream tidak valid');
  }
  if (!STREAM_NAME.test(candidate)) {
    throw new Error('Nama stream hanya boleh berisi huruf, angka, titik, garis bawah, tanda hubung, dan "/"');
  }
  return candidate;
}

/** Short label used inside a file name (slashes are not allowed there). */
function streamFileTag(streamName) {
  return streamName.replace(/\//g, '_').slice(-64);
}

/** "2026-10-31_14-05-09" in local time. */
function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  );
}

function buildRecordingPath(folder, streamName, filePrefix) {
  if (typeof folder !== 'string' || !folder.trim()) {
    throw new Error('Folder penyimpanan belum dipilih');
  }
  const resolved = path.resolve(folder);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error('Folder penyimpanan tidak ditemukan');
  }
  const tag = streamFileTag(streamName);
  return path.join(resolved, `${filePrefix}${tag}_${timestamp()}.mp4`);
}

/**
 * Turn a base URL plus an optional stream key into one ffmpeg output URL.
 * Returns null when there is no base URL.
 */
function buildOutputUrl(baseUrl, streamKey, allowedSchemes) {
  const base = typeof baseUrl === 'string' ? baseUrl.trim() : '';
  if (!base) return null;

  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    throw new Error('URL target tidak valid');
  }
  const scheme = parsed.protocol.replace(':', '').toLowerCase();
  if (!allowedSchemes.includes(scheme)) {
    throw new Error(`Protokol "${scheme}" tidak diizinkan`);
  }
  if (!parsed.hostname) {
    throw new Error('URL target tidak memiliki host');
  }

  const key = typeof streamKey === 'string' ? streamKey.trim() : '';
  const joined = key ? `${base.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}` : base;

  // The tee muxer uses these characters as syntax, so they must not appear.
  if (/[|\[\]"',\s]/.test(joined)) {
    throw new Error('URL target mengandung karakter yang tidak diizinkan');
  }
  return joined;
}

/**
 * Synchronous best guess, kept for callers that cannot await. Prefer
 * detectNetwork() from ./network, which asks the OS for the default route.
 */
function detectLanAddress(osModule) {
  const { listInterfaces } = require('./network');
  const best = listInterfaces(osModule).find((entry) => !entry.linkLocal);
  return best ? best.address : '127.0.0.1';
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

module.exports = {
  STREAM_SEGMENT,
  safeStreamName,
  streamFileTag,
  timestamp,
  buildRecordingPath,
  buildOutputUrl,
  detectLanAddress,
  clampInt,
  isPlainObject,
};
