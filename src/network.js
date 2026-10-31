'use strict';

/**
 * LAN address discovery.
 *
 * Guessing from RFC1918 ranges is not reliable on a laptop that also runs
 * VirtualBox, Hyper-V, Docker or a VPN: those adapters often own a
 * 192.168.x address too. The only address a phone or drone can actually reach
 * is the one the operating system routes traffic through, so that is what we
 * ask the kernel for first and only fall back to scoring when there is no
 * default route at all.
 */

const dgram = require('node:dgram');
const os = require('node:os');

const VIRTUAL_HINTS = [
  'virtualbox',
  'virtual',
  'vmware',
  'vethernet',
  'hyper-v',
  'wsl',
  'loopback',
  'npcap',
  'docker',
  'vbox',
  'br-',
  'vmnet',
];

const VPN_HINTS = ['tailscale', 'zerotier', 'wireguard', 'openvpn', 'tap-', 'vpn', 'tun'];

// OUI prefixes used by hypervisor host-only/NAT adapters. Windows often names
// them "Ethernet 2" or "Ethernet 3", so the name alone is not enough.
const VIRTUAL_MACS = [
  '0a:00:27', // VirtualBox host-only
  '08:00:27', // VirtualBox NAT
  '00:50:56', // VMware
  '00:0c:29', // VMware
  '00:05:69', // VMware
  '00:1c:14', // VMware
  '00:15:5d', // Hyper-V
  '02:42:', // Docker bridge
];

function octets(address) {
  return String(address)
    .split('.')
    .map((part) => Number.parseInt(part, 10));
}

function isPrivate(address) {
  const [a, b] = octets(address);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/** 100.64.0.0/10, used by Tailscale and some carrier networks. */
function isShared(address) {
  const [a, b] = octets(address);
  return a === 100 && b >= 64 && b <= 127;
}

function isLinkLocal(address) {
  const [a, b] = octets(address);
  return a === 169 && b === 254;
}

function isLoopback(address) {
  return String(address).startsWith('127.');
}

function nameMatches(name, hints) {
  const lower = String(name || '').toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

function macIsVirtual(mac) {
  const lower = String(mac || '').toLowerCase().replace(/-/g, ':');
  return VIRTUAL_MACS.some((prefix) => lower.startsWith(prefix));
}

/**
 * Score an adapter for "this is the cable/wifi the drone can see".
 * Higher is better; virtual and VPN adapters are pushed to the bottom.
 */
function scoreInterface(name, address, flags = {}) {
  const virtual = flags.virtual === undefined ? nameMatches(name, VIRTUAL_HINTS) : flags.virtual;
  const vpn = flags.vpn === undefined ? nameMatches(name, VPN_HINTS) : flags.vpn;
  let score = 0;

  if (isPrivate(address)) score += 50;
  else if (isShared(address)) score += 5;
  else if (isLinkLocal(address)) score -= 60;
  else if (isLoopback(address)) score -= 100;
  else score += 10;

  if (virtual) score -= 40;
  if (vpn) score -= 35;

  // A phone hotspot or the drone's own Wi-Fi is the usual path, so nudge
  // wireless and plain Ethernet adapters up when everything else is equal.
  if (/^wi-?fi|wlan|wireless/i.test(String(name || ''))) score += 8;
  if (/^ethernet/i.test(String(name || ''))) score += 4;

  return score;
}

/** Every usable IPv4 adapter, best candidate first. */
function listInterfaces(osModule = os) {
  const result = [];
  const interfaces = osModule.networkInterfaces();

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!Array.isArray(addresses)) continue;
    for (const address of addresses) {
      if (!address || address.family !== 'IPv4' || address.internal) continue;
      if (isLoopback(address.address)) continue;

      const virtual = nameMatches(name, VIRTUAL_HINTS) || macIsVirtual(address.mac);
      const vpn = nameMatches(name, VPN_HINTS);
      result.push({
        name,
        address: address.address,
        netmask: address.netmask || '',
        cidr: address.cidr || '',
        mac: address.mac || '',
        private: isPrivate(address.address),
        shared: isShared(address.address),
        linkLocal: isLinkLocal(address.address),
        virtual,
        vpn,
        score: scoreInterface(name, address.address, { virtual, vpn }),
      });
    }
  }

  result.sort((left, right) => right.score - left.score);
  return result;
}

/** Ask the kernel which local address it would use to reach the internet. */
function probeRouteAddress(target, timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        /* already closed */
      }
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    socket.once('error', () => finish(null));

    try {
      // A UDP "connect" performs a route lookup without sending a packet.
      socket.connect(53, target, () => {
        try {
          finish(socket.address().address);
        } catch {
          finish(null);
        }
      });
    } catch {
      finish(null);
    }
  });
}

async function detectRouteAddress() {
  for (const target of ['1.1.1.1', '8.8.8.8', '9.9.9.9']) {
    const address = await probeRouteAddress(target);
    if (address) return address;
  }
  return null;
}

function pickFallback(interfaces) {
  const usable = interfaces.filter((entry) => !entry.linkLocal);
  return (
    usable.find((entry) => !entry.virtual && !entry.vpn && entry.private) ||
    usable.find((entry) => !entry.vpn && entry.private) ||
    usable.find((entry) => entry.private) ||
    usable[0] ||
    null
  );
}

/**
 * Resolve the address to advertise plus the full adapter list for the picker.
 * `source` is "route" when the OS default route decided it, "fallback" when we
 * had to score adapters ourselves, and "none" when nothing usable exists.
 */
async function detectNetwork({ osModule = os, routeAddress } = {}) {
  const interfaces = listInterfaces(osModule);
  const probed = routeAddress === undefined ? await detectRouteAddress() : routeAddress;
  const routeEntry = probed ? interfaces.find((entry) => entry.address === probed) : null;

  let chosen = null;
  let source = 'none';

  if (routeEntry && !routeEntry.linkLocal && !routeEntry.vpn) {
    chosen = routeEntry;
    source = 'route';
  } else {
    const fallback = pickFallback(interfaces);
    if (fallback) {
      chosen = fallback;
      source = 'fallback';
    }
  }

  return {
    ip: chosen ? chosen.address : '127.0.0.1',
    source,
    routeAddress: probed || null,
    interfaces,
  };
}

module.exports = {
  detectNetwork,
  detectRouteAddress,
  listInterfaces,
  scoreInterface,
  isPrivate,
  isLinkLocal,
  isShared,
};
