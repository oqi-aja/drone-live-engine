'use strict';

/**
 * Dependency-free sanity check:
 *  1. every JavaScript file parses,
 *  2. every JSON file parses,
 *  3. every element id used by the renderer exists in index.html.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const problems = [];
let checked = 0;

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else checkFile(full);
  }
}

function checkFile(file) {
  if (file.endsWith('.js')) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
      checked += 1;
    } catch (error) {
      problems.push(`${path.relative(root, file)}: ${error.stderr.toString().trim()}`);
    }
  } else if (file.endsWith('.json')) {
    try {
      JSON.parse(fs.readFileSync(file, 'utf8'));
      checked += 1;
    } catch (error) {
      problems.push(`${path.relative(root, file)}: ${error.message}`);
    }
  }
}

walk(root);

const htmlPath = path.join(root, 'renderer', 'index.html');
const appPath = path.join(root, 'renderer', 'app.js');
if (fs.existsSync(htmlPath) && fs.existsSync(appPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]));

  const referenced = new Set();
  for (const match of app.matchAll(/\$\('#([A-Za-z0-9_-]+)'/g)) referenced.add(match[1]);
  for (const match of app.matchAll(/getElementById\('([A-Za-z0-9_-]+)'\)/g)) referenced.add(match[1]);

  for (const id of referenced) {
    if (!ids.has(id)) problems.push(`renderer/app.js: elemen #${id} tidak ada di index.html`);
  }
  checked += 1;
}

if (problems.length > 0) {
  console.error('Pemeriksaan gagal:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`OK — ${checked} berkas diperiksa, tidak ada masalah.`);
