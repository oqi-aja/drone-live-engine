'use strict';

/**
 * Central configuration. Everything brand-related lives here so the app can be
 * re-labelled without touching the engine, the panel or the build scripts.
 */
const config = {
  branding: {
    name: 'Drone Live Engine',
    shortName: 'DLE',
    windowTitle: 'Drone Live Engine',
    company: '',
    accent: '#0ea5e9',
  },

  // The control panel is intentionally bound to loopback only. Viewers reach
  // the stream through the media ports below, not through this panel.
  panel: {
    host: '127.0.0.1',
    port: Number(process.env.DLE_PANEL_PORT || 3000),
    maxBodyBytes: 64 * 1024,
  },

  ports: {
    rtmp: 1935,
    rtsp: 8554,
    hls: 8888,
    webrtc: 8889,
    api: 9997,
    vcam: 16666,
  },

  streams: {
    prefix: 'live',
    default: 'live/drone1',
    seed: ['live/drone1', 'live/drone2'],
  },

  recording: {
    // Fragmented MP4 keeps the file playable even when the drone drops.
    container: 'mp4',
    filePrefix: 'Recording_',
    maxStreamNameLength: 64,
  },

  restream: {
    qualities: {
      hd: { video: '3500k', maxrate: '7000k' },
      balanced: { video: '2200k', maxrate: '4400k' },
      low: { video: '1500k', maxrate: '3000k' },
    },
    defaultQuality: 'hd',
    // Only these schemes may be used as an output target.
    allowedSchemes: ['rtmp', 'rtmps', 'srt', 'rist', 'udp', 'http', 'https'],
    audio: {
      stream: 'stream',
      silent: 'silent',
      microphonePrefix: 'mic:',
    },
  },

  virtualCamera: {
    width: 1280,
    height: 720,
    fps: 30,
    // dssvcam-compatible relay protocol: raw RGBA frames over TCP.
    pixelFormat: 'rgba',
  },

  mediaMtx: {
    apiPath: '/v3/paths/list',
    requestTimeoutMs: 1500,
    // A path only counts as "live" once bytes actually arrive.
    liveBytesThreshold: 0,
  },

  window: {
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
  },
};

module.exports = config;
