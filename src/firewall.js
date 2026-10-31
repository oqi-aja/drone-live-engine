'use strict';

/**
 * Windows Defender Firewall helpers.
 *
 * A per-user install cannot add firewall rules (netsh silently fails without
 * elevation), which is exactly how an RTMP publish from a phone ends up being
 * dropped while everything looks fine locally. The installer runs elevated and
 * creates these rules; this module verifies them and can repair a missing set
 * through a single UAC prompt.
 */

const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const RULES = [
  { name: 'Drone Live Engine RTMP', protocol: 'TCP', port: 1935 },
  { name: 'Drone Live Engine RTSP', protocol: 'TCP', port: 8554 },
  { name: 'Drone Live Engine HLS', protocol: 'TCP', port: 8888 },
  { name: 'Drone Live Engine WebRTC', protocol: 'TCP', port: 8889 },
  { name: 'Drone Live Engine WebRTC UDP', protocol: 'UDP', port: 8189 },
];

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { windowsHide: true, timeout: 20000, ...options },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error && typeof error.code === 'number' ? error.code : error ? 1 : 0,
          stdout: String(stdout || ''),
          stderr: String(stderr || ''),
        });
      },
    );
  });
}

async function ruleExists(name) {
  if (process.platform !== 'win32') return false;
  const result = await run('netsh', [
    'advfirewall',
    'firewall',
    'show',
    'rule',
    `name=${name}`,
  ]);
  // netsh exits 1 and prints "No rules match..." when the rule is absent.
  return result.ok && result.stdout.includes(name);
}

/** Check every rule we depend on. Never throws: unknown reads as missing. */
async function getFirewallStatus() {
  if (process.platform !== 'win32') {
    return { supported: false, allPresent: true, rules: [] };
  }
  const rules = [];
  for (const rule of RULES) {
    // Sequential on purpose: netsh is slow and spawning five at once is noisy.
    // eslint-disable-next-line no-await-in-loop
    rules.push({ ...rule, present: await ruleExists(rule.name) });
  }
  return {
    supported: true,
    allPresent: rules.every((rule) => rule.present),
    rules,
  };
}

function buildScript(programs) {
  const lines = ['@echo off', 'chcp 65001 >nul'];
  for (const rule of RULES) {
    lines.push(`netsh advfirewall firewall delete rule name="${rule.name}" >nul 2>&1`);
    lines.push(
      `netsh advfirewall firewall add rule name="${rule.name}" dir=in action=allow ` +
        `protocol=${rule.protocol} localport=${rule.port} profile=any enable=yes`,
    );
  }
  for (const program of programs) {
    if (!fs.existsSync(program)) continue;
    const label = `Drone Live Engine ${path.basename(program)}`;
    lines.push(`netsh advfirewall firewall delete rule name="${label}" >nul 2>&1`);
    lines.push(
      `netsh advfirewall firewall add rule name="${label}" dir=in action=allow ` +
        `program="${program}" profile=any enable=yes`,
    );
  }
  lines.push('exit /b 0');
  return lines.join('\r\n');
}

/**
 * Add the rules with one elevation prompt. Returns the verification result.
 * Throws with a readable message when the user declines the prompt.
 */
async function ensureFirewallRules({ programs = [], logger = console } = {}) {
  if (process.platform !== 'win32') {
    return { supported: false, allPresent: true, rules: [] };
  }

  const scriptPath = path.join(os.tmpdir(), `dle-firewall-${process.pid}.cmd`);
  fs.writeFileSync(scriptPath, buildScript(programs), 'utf8');

  try {
    const quoted = scriptPath.replace(/'/g, "''");
    const command =
      "$ErrorActionPreference='Stop'; " +
      'try { ' +
      `$p = Start-Process -FilePath cmd.exe -ArgumentList '/c','"${quoted}"' ` +
      '-Verb RunAs -Wait -PassThru -ErrorAction Stop; ' +
      'exit $p.ExitCode ' +
      '} catch { Write-Output $_.Exception.Message; exit 1 }';

    const result = await run(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { timeout: 120000 },
    );

    if (!result.ok) {
      const declined = /canceled|cancelled|dibatalkan|1223/i.test(
        `${result.stderr} ${result.stdout}`,
      );
      throw new Error(
        declined
          ? 'Izin administrator dibatalkan. Aturan firewall tidak diubah.'
          : 'Gagal menambahkan aturan firewall. Jalankan aplikasi sebagai administrator.',
      );
    }
  } finally {
    fs.promises.unlink(scriptPath).catch(() => {});
  }

  const status = await getFirewallStatus();
  logger.info(
    `[firewall] ${status.rules.filter((rule) => rule.present).length}/${status.rules.length} aturan aktif`,
  );
  return status;
}

module.exports = { RULES, getFirewallStatus, ensureFirewallRules, ruleExists };
