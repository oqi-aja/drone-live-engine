'use strict';

/**
 * Console logger that also appends to a file, so a user report can be checked
 * after the fact. The file is rotated once it grows past ~2 MB.
 */

const fs = require('node:fs');
const path = require('node:path');

const MAX_BYTES = 2 * 1024 * 1024;

function timestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function createLogger({ dir, fileName = 'app.log', echo = console } = {}) {
  const logDir = dir || path.join(process.cwd(), 'logs');
  fs.mkdirSync(logDir, { recursive: true });

  const logFile = path.join(logDir, fileName);

  try {
    const stats = fs.statSync(logFile);
    if (stats.size > MAX_BYTES) {
      fs.renameSync(logFile, path.join(logDir, `${fileName}.1`));
    }
  } catch {
    /* first run */
  }

  const stream = fs.createWriteStream(logFile, { flags: 'a' });

  const write = (level, args) => {
    const message = args
      .map((value) => {
        if (value instanceof Error) return value.stack || value.message;
        if (typeof value === 'string') return value;
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      })
      .join(' ');
    stream.write(`${timestamp()} [${level}] ${message}\n`);
    const target = echo && (echo[level] || echo.log);
    if (typeof target === 'function') target.call(echo, ...args);
  };

  const logger = {
    file: logFile,
    dir: logDir,
    info: (...args) => write('info', args),
    warn: (...args) => write('warn', args),
    error: (...args) => write('error', args),
    log: (...args) => write('info', args),
    close() {
      return new Promise((resolve) => stream.end(resolve));
    },
  };

  return logger;
}

module.exports = { createLogger };
