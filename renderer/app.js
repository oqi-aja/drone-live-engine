'use strict';

/* ------------------------------------------------------------------ helpers */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const translations = {
  id: {
    tagline: 'Mesin siaran lokal untuk drone',
    local_time: 'Waktu Lokal',
    system_ip: 'IP Sistem',
    live_bitrate: 'Bitrate Langsung',
    preview: 'Pratinjau Langsung',
    waiting: 'Menunggu sinyal drone…',
    waiting_hint: 'Kirim RTMP dari DJI Fly ke alamat di bawah.',
    watermark: 'Watermark',
    logo: 'Logo',
    links: 'Tautan Koneksi',
    links_sub: 'Gunakan tautan sesuai perangkat tujuan.',
    link_dji: '1. DJI Fly RTMP',
    desc_dji: 'Tempel di Live Streaming DJI Fly. Bila ada kolom stream key, pakai rtmp://IP:1935/live + drone1.',
    link_rtsp: '2. RTSP (vMix / OBS)',
    desc_rtsp: 'Input jaringan untuk vMix atau OBS.',
    link_hls: '3. HLS (Smart TV)',
    desc_hls: 'Cocok untuk pemutar browser di Smart TV.',
    link_web: '4. Tonton di Browser',
    desc_web: 'Bagikan QR agar penonton bisa memantau dari HP.',
    copy: 'Salin',
    recording: 'Rekaman',
    idle: 'Siaga',
    folder: 'Folder penyimpanan',
    folder_ph: 'Belum dipilih',
    browse: 'Pilih',
    start_rec: 'Mulai Rekam',
    stop_rec: 'Stop Rekam',
    rec_hint: 'Rekaman memakai fragmen MP4, tetap aman walau drone terputus.',
    recording_on: 'Merekam',
    restream: 'Restream',
    target1: 'Target 1',
    target2: 'Target 2 (opsional)',
    audio: 'Sumber audio',
    audio_stream: 'Audio dari stream',
    audio_silent: 'Tanpa audio',
    quality: 'Kualitas',
    start_rs1: 'Mulai 1',
    start_rs2: 'Mulai 2',
    stop: 'Stop',
    vcam: 'Kamera Virtual',
    off: 'Mati',
    vcam_hint: 'Aktifkan bila vMix atau OBS tidak bisa membuka RTSP. Memakai CPU dan RAM tambahan.',
    start_vcam: 'Nyalakan VCam',
    stop_vcam: 'Matikan VCam',
    vcam_on: 'Aktif',
    vcam_waiting: 'Menunggu aplikasi tujuan',
    vcam_pick_hint: 'Lalu pilih kamera Drone Live Engine di OBS, vMix, Meet, atau Zoom.',
    guide_title: 'Panduan singkat',
    guide_1_title: '1. Menghubungkan drone',
    guide_1_desc:
      'Buka DJI Fly, masuk ke Pengaturan Transmisi, pilih Live Streaming (RTMP), lalu tempel tautan DJI Fly RTMP. Bila DJI meminta URL dan stream key terpisah, isi URL dengan rtmp://IP:1935/live dan key drone1. HP/RC dan laptop harus berada di Wi-Fi yang sama, matikan data seluler di HP, dan pilih IP yang sesuai di bagian atas. Tes cepat: buka http://IP:8889 di browser HP — kalau tidak terbuka, jaringan memblokir (isolasi klien) atau IP-nya salah.',
    guide_2_title: '2. Rekaman',
    guide_2_desc:
      'Pilih folder lalu tekan Mulai Rekam. Rekaman mengikuti kamera yang sedang dipilih. Berkas tetap dapat diputar meskipun koneksi drone terputus mendadak.',
    guide_3_title: '3. Restream',
    guide_3_desc:
      'Isi URL dan stream key dari platform tujuan. Dua target dapat berjalan bersamaan. Pilih mikrofon bila ingin menambahkan suara dari lokasi.',
    guide_4_title: '4. vMix, OBS, dan Smart TV',
    guide_4_desc:
      'Gunakan RTSP untuk vMix/OBS, HLS untuk Smart TV, atau kamera virtual untuk aplikasi yang hanya mengenal kamera Windows.',
    q_hd: 'HD · 3500 kbps',
    q_balanced: 'Seimbang · 2200 kbps',
    q_low: 'Hemat · 1500 kbps',
    toast_copied: 'Tautan disalin',
    toast_no_folder: 'Pilih folder penyimpanan terlebih dahulu',
    toast_folder: 'Folder penyimpanan dipilih',
    toast_rec_started: 'Rekaman dimulai',
    toast_rec_stopped: 'Rekaman dihentikan',
    toast_rs_started: 'Restream dimulai',
    toast_rs_stopped: 'Restream dihentikan',
    toast_vcam_on: 'Kamera virtual aktif',
    toast_vcam_off: 'Kamera virtual dimatikan',
    toast_media_missing: 'mediamtx.exe tidak ditemukan. Letakkan biner di folder resources.',
    toast_target_required: 'Isi URL target terlebih dahulu',
    toast_stream_switched: 'Kamera diganti',
    toast_error: 'Terjadi kesalahan',
    qr_title: 'Pindai QR',
    target_count: 'target',
    rs_checking: 'Memeriksa…',
    rs_waiting: 'Menunggu drone',
    rs_wait_hint:
      'Restream siap. Buka DJI Fly → Live Streaming (RTMP), lalu tempel tautan ini. Siaran mulai otomatis begitu video masuk:',
    toast_rs_waiting: 'Menunggu drone lewat RTMP',
    toast_quality_next: 'Kualitas baru berlaku saat restream dimulai',
    engine_no_response: 'Mesin tidak merespons. Tutup lalu buka ulang aplikasi.',
    media_ready: 'RTMP siap',
    media_starting: 'Menyiapkan…',
    media_off: 'RTMP mati',
    media_error: 'RTMP bermasalah',
    diagnostics: 'Diagnostik',
    ip_auto: 'Otomatis',
    ip_virtual: 'virtual',
    ip_vpn: 'VPN',
    ip_recommended: 'disarankan',
    ip_refresh: 'Deteksi ulang IP',
    toast_ip_active: 'IP aktif',
    toast_ip_changed: 'IP koneksi diganti',
    toast_ip_auto: 'IP terdeteksi otomatis',
    toast_ip_gone: 'IP pilihan tidak tersedia lagi, kembali ke otomatis',
    fw_alert_title: 'Firewall Windows memblokir koneksi masuk',
    fw_alert_body:
      'DJI Fly tidak akan bisa mengirim RTMP sebelum port 1935 diizinkan. Tekan Perbaiki, lalu setujui permintaan administrator.',
    fix_firewall: 'Perbaiki Firewall',
    open_logs: 'Buka Log',
    refresh: 'Muat Ulang',
    diag_network: 'IP terpilih',
    diag_route: 'Rute default',
    diag_interfaces: 'Adapter jaringan',
    diag_firewall: 'Aturan firewall',
    diag_ports: 'Port',
    diag_binaries: 'Biner',
    diag_log: 'Berkas log',
    diag_paths: 'Stream aktif',
    diag_loading: 'Memuat…',
    diag_none: 'Tidak ada',
    diag_present: 'aktif',
    diag_missing: 'belum ada',
    diag_listening: 'terbuka',
    diag_offline: 'tertutup',
    diag_note:
      'Jika DJI Fly tetap gagal, pastikan HP/RC dan laptop berada di jaringan yang sama, IP yang dipilih benar, dan jaringan tidak memakai isolasi antar-klien (coba hotspot HP).',
    toast_fw_fixed: 'Aturan firewall diperbarui',
    lan_title: 'Akses dari HP',
    lan_hint:
      'Nyalakan untuk mengontrol siaran dari HP di Wi-Fi yang sama. Panel tetap tertutup selama tombol ini mati.',
    lan_enable: 'Aktifkan Akses HP',
    lan_disable: 'Matikan Akses HP',
    lan_active: 'Aktif',
    lan_pair: 'Buat Kode Pairing',
    lan_pair_hint: 'Pindai QR ini dari HP, lalu masukkan kode 6 angka.',
    lan_expire: 'Kode berlaku sampai',
    lan_devices: 'Perangkat terhubung',
    lan_no_devices: 'Belum ada perangkat yang terhubung.',
    lan_revoke: 'Cabut',
    toast_lan_on: 'Akses dari HP aktif',
    toast_lan_off: 'Akses dari HP dimatikan',
    toast_pair_created: 'Kode pairing dibuat',
    toast_device_revoked: 'Perangkat dicabut',
    nav_preview: 'Siaran',
    nav_restream: 'Restream',
    nav_record: 'Rekam',
    nav_links: 'Tautan',
  },
  en: {
    tagline: 'Local broadcast engine for drones',
    local_time: 'Local Time',
    system_ip: 'System IP',
    live_bitrate: 'Live Bitrate',
    preview: 'Live Preview',
    waiting: 'Waiting for drone signal…',
    waiting_hint: 'Send RTMP from DJI Fly to the address below.',
    watermark: 'Watermark',
    logo: 'Logo',
    links: 'Connection Links',
    links_sub: 'Pick the link that matches the receiving device.',
    link_dji: '1. DJI Fly RTMP',
    desc_dji: 'Paste into DJI Fly Live Streaming. If it asks for a stream key, use rtmp://IP:1935/live + drone1.',
    link_rtsp: '2. RTSP (vMix / OBS)',
    desc_rtsp: 'Network input for vMix or OBS.',
    link_hls: '3. HLS (Smart TV)',
    desc_hls: 'Best for browser players on Smart TVs.',
    link_web: '4. Watch in Browser',
    desc_web: 'Share the QR so viewers can watch from a phone.',
    copy: 'Copy',
    recording: 'Recording',
    idle: 'Idle',
    folder: 'Storage folder',
    folder_ph: 'Not selected',
    browse: 'Browse',
    start_rec: 'Start Recording',
    stop_rec: 'Stop Recording',
    rec_hint: 'Fragmented MP4 keeps the file playable even if the drone drops.',
    recording_on: 'Recording',
    restream: 'Restream',
    target1: 'Target 1',
    target2: 'Target 2 (optional)',
    audio: 'Audio source',
    audio_stream: 'Audio from stream',
    audio_silent: 'No audio',
    quality: 'Quality',
    start_rs1: 'Start 1',
    start_rs2: 'Start 2',
    stop: 'Stop',
    vcam: 'Virtual Camera',
    off: 'Off',
    vcam_hint: 'Enable when vMix or OBS cannot open RTSP. Uses extra CPU and RAM.',
    start_vcam: 'Turn VCam On',
    stop_vcam: 'Turn VCam Off',
    vcam_on: 'Active',
    vcam_waiting: 'Waiting for target app',
    vcam_pick_hint: 'Then pick the Drone Live Engine camera in OBS, vMix, Meet, or Zoom.',
    guide_title: 'Quick guide',
    guide_1_title: '1. Connecting the drone',
    guide_1_desc:
      'Open DJI Fly, go to Transmission Settings, choose Live Streaming (RTMP), then paste the DJI Fly RTMP link. If DJI asks for a URL and stream key separately, use rtmp://IP:1935/live as the URL and drone1 as the key. The phone/RC and the laptop must be on the same Wi-Fi, mobile data must be off, and the matching IP must be selected at the top. Quick test: open http://IP:8889 in the phone browser — if it does not load, the network blocks it (client isolation) or the IP is wrong.',
    guide_2_title: '2. Recording',
    guide_2_desc:
      'Pick a folder and press Start Recording. Recording follows the selected camera. The file stays playable even if the drone disconnects abruptly.',
    guide_3_title: '3. Restream',
    guide_3_desc:
      'Enter the URL and stream key from the destination platform. Two targets can run at once. Pick a microphone to add sound from the field.',
    guide_4_title: '4. vMix, OBS and Smart TV',
    guide_4_desc:
      'Use RTSP for vMix/OBS, HLS for Smart TV, or the virtual camera for apps that only see Windows cameras.',
    q_hd: 'HD · 3500 kbps',
    q_balanced: 'Balanced · 2200 kbps',
    q_low: 'Low · 1500 kbps',
    toast_copied: 'Link copied',
    toast_no_folder: 'Choose a storage folder first',
    toast_folder: 'Storage folder selected',
    toast_rec_started: 'Recording started',
    toast_rec_stopped: 'Recording stopped',
    toast_rs_started: 'Restream started',
    toast_rs_stopped: 'Restream stopped',
    toast_vcam_on: 'Virtual camera enabled',
    toast_vcam_off: 'Virtual camera disabled',
    toast_media_missing: 'mediamtx.exe was not found. Put the binary in the resources folder.',
    toast_target_required: 'Fill in a target URL first',
    toast_stream_switched: 'Camera switched',
    toast_error: 'Something went wrong',
    qr_title: 'Scan QR',
    target_count: 'target(s)',
    rs_checking: 'Checking…',
    rs_waiting: 'Waiting for drone',
    rs_wait_hint:
      'Restream is ready. Open DJI Fly → Live Streaming (RTMP) and paste this link. Streaming starts by itself as soon as video arrives:',
    toast_rs_waiting: 'Waiting for the drone over RTMP',
    toast_quality_next: 'The new quality applies when restream starts',
    engine_no_response: 'The engine is not responding. Close and reopen the app.',
    media_ready: 'RTMP ready',
    media_starting: 'Starting…',
    media_off: 'RTMP off',
    media_error: 'RTMP error',
    diagnostics: 'Diagnostics',
    ip_auto: 'Automatic',
    ip_virtual: 'virtual',
    ip_vpn: 'VPN',
    ip_recommended: 'recommended',
    ip_refresh: 'Detect IP again',
    toast_ip_active: 'Active IP',
    toast_ip_changed: 'Connection IP changed',
    toast_ip_auto: 'IP detected automatically',
    toast_ip_gone: 'Selected IP is gone, switched back to automatic',
    fw_alert_title: 'Windows Firewall is blocking incoming connections',
    fw_alert_body:
      'DJI Fly cannot publish RTMP until port 1935 is allowed. Press Fix, then approve the administrator prompt.',
    fix_firewall: 'Fix Firewall',
    open_logs: 'Open Logs',
    refresh: 'Refresh',
    diag_network: 'Selected IP',
    diag_route: 'Default route',
    diag_interfaces: 'Network adapters',
    diag_firewall: 'Firewall rules',
    diag_ports: 'Ports',
    diag_binaries: 'Binaries',
    diag_log: 'Log file',
    diag_paths: 'Active streams',
    diag_loading: 'Loading…',
    diag_none: 'None',
    diag_present: 'present',
    diag_missing: 'missing',
    diag_listening: 'listening',
    diag_offline: 'closed',
    diag_note:
      'If DJI Fly still fails, make sure the phone/RC and the laptop are on the same network, the selected IP is correct, and the network does not isolate clients (try a phone hotspot).',
    toast_fw_fixed: 'Firewall rules updated',
    lan_title: 'Phone Access',
    lan_hint: 'Turn this on to control the broadcast from a phone on the same Wi-Fi. The panel stays closed while it is off.',
    lan_enable: 'Enable Phone Access',
    lan_disable: 'Disable Phone Access',
    lan_active: 'On',
    lan_pair: 'Create Pairing Code',
    lan_pair_hint: 'Scan this QR from the phone, then enter the 6-digit code.',
    lan_expire: 'Code valid until',
    lan_devices: 'Connected devices',
    lan_no_devices: 'No device connected yet.',
    lan_revoke: 'Revoke',
    toast_lan_on: 'Phone access enabled',
    toast_lan_off: 'Phone access disabled',
    toast_pair_created: 'Pairing code created',
    toast_device_revoked: 'Device revoked',
    nav_preview: 'Live',
    nav_restream: 'Restream',
    nav_record: 'Record',
    nav_links: 'Links',
  },
};

const state = {
  config: null,
  ip: '',
  ipMode: 'auto',
  detectedIp: '',
  netSource: 'none',
  interfaces: [],
  netSignature: '',
  firewallOk: true,
  stream: 'live/drone1',
  known: new Set(),
  bytes: new Map(),
  bitrateHistory: new Array(48).fill(0),
  lastBytes: 0,
  lastTime: 0,
  lang: localStorage.getItem('dle_lang') === 'en' ? 'en' : 'id',
  theme: localStorage.getItem('dle_theme') === 'light' ? 'light' : 'dark',
  recording: false,
  recFile: '',
  restreaming: false,
  restreamWaiting: false,
  restreamError: '',
  mediaSnapshot: null,
  networkBusy: false,
  targets: { 1: false, 2: false },
  vcam: false,
  vcamStreaming: false,
  vcamRelayRunning: false,
  watermark: false,
  logo: false,
  mediaMissingWarned: false,
  mediaError: '',
  cameraSignature: '',
  lan: { enabled: false, devices: [], url: '' },
};

let toastTimer = null;
let previewPeer = null;
let previewTimer = null;
let previewGeneration = 0;
let rsBusy = false;

const t = (key) => translations[state.lang][key] || translations.id[key] || key;

/* -------------------------------------------------------------------- setup */

function boot() {
  if (window.location.pathname === '/m') {
    document.body.dataset.mode = 'mobile';
  }
  applyTheme();
  applyLanguage();
  bindUi();
  startClock();
  restoreSettings();
  initialise().catch((error) => toast(error.message, 'error'));
  setInterval(pollState, 2000);
  setInterval(pollBitrate, 1000);
  setInterval(refreshNetwork, 15000);
  checkFirewall();
  // Daftar perangkat diperbarui sendiri supaya HP yang baru pairing langsung
  // terlihat di panel desktop tanpa perlu muat ulang.
  setInterval(() => {
    if (!isMobileMode() && state.lan.enabled) loadLan();
  }, 4000);
}

async function initialise() {
  const [config, network] = await Promise.all([request('/api/config'), request('/api/network')]);

  state.config = config;
  applyNetwork(network);

  const stored = localStorage.getItem('dle_stream');
  const seed = Array.isArray(config.streams.seed) ? config.streams.seed : [];
  state.known = new Set([config.streams.default, ...seed]);
  state.stream = stored && state.known.has(stored) ? stored : config.streams.default;

  $('#app-name').textContent = config.app.name;
  const versionLabel = $('#diag-version');
  if (versionLabel) versionLabel.textContent = `${config.app.name} ${config.version || ''}`.trim();
  document.title = config.app.windowTitle || config.app.name;

  buildQualityOptions(config.qualities);
  updateLinks();
  renderCameras();
  await loadAudioDevices();
  await pollState();
  await connectPreview();
  if (!isMobileMode()) loadLan();
}

function request(path, { method = 'GET', body, timeoutMs = 8000 } = {}) {
  const init = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  // Every panel call is local, so anything slower than this means the engine
  // is stuck. Fail loudly instead of leaving a button spinning forever.
  // timeoutMs: 0 disables the guard (native dialogs may stay open for minutes).
  const controller = new AbortController();
  init.signal = controller.signal;
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  return fetch(path, init)
    .then(async (response) => {
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (data && data.success === false) throw new Error(data.error || t('toast_error'));
      return data;
    })
    .catch((error) => {
      if (error && error.name === 'AbortError') {
        throw new Error(t('engine_no_response'));
      }
      throw error;
    })
    .finally(() => clearTimeout(timer));
}

function toast(message, kind = 'info') {
  const element = $('#toast');
  element.textContent = message;
  element.className = `toast ${kind}`;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.hidden = true;
  }, 3600);
}

/* ------------------------------------------------------------------ language */

function applyLanguage() {
  document.documentElement.lang = state.lang;
  $$('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  $$('[data-i18n-ph]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPh);
  });
  $$('[data-i18n-title]').forEach((element) => {
    const label = t(element.dataset.i18nTitle);
    element.title = label;
    element.setAttribute('aria-label', label);
  });
  $('#lang-btn').textContent = state.lang.toUpperCase();
  if (state.config && Array.isArray(state.config.qualities)) {
    buildQualityOptions(state.config.qualities);
  }
  renderRecording();
  renderRestream();
  renderVcam();
  renderMediaState();
  if (state.interfaces.length > 0) renderIpSelect();
  if (!$('#diag-modal').hidden) loadDiagnostics();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const button = $('#theme-btn');
  button.innerHTML =
    state.theme === 'dark'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" stroke-linejoin="round"/></svg>';
  drawGraph();
}

/* ------------------------------------------------------------------ network */

function interfaceLabel(entry) {
  const tags = [];
  if (entry.virtual) tags.push(t('ip_virtual'));
  if (entry.vpn) tags.push(t('ip_vpn'));
  return `${entry.address} · ${entry.name}${tags.length ? ` (${tags.join(', ')})` : ''}`;
}

function applyNetwork(network) {
  if (!network || typeof network !== 'object') return;

  const interfaces = Array.isArray(network.interfaces) ? network.interfaces : [];
  const signature = JSON.stringify([
    network.ip,
    network.source,
    interfaces.map((entry) => [
      entry.name,
      entry.address,
      entry.virtual ? 1 : 0,
      entry.vpn ? 1 : 0,
    ]),
  ]);

  const changed = signature !== state.netSignature;
  state.netSignature = signature;
  state.interfaces = interfaces;
  state.detectedIp = network.ip || '127.0.0.1';
  state.netSource = network.source || 'none';

  const stored = localStorage.getItem('dle_ip') || '';
  const stillThere = interfaces.some((entry) => entry.address === stored);
  const manual = Boolean(stored) && stillThere;

  if (!manual && state.ipMode === 'manual') toast(t('toast_ip_gone'), 'error');
  state.ipMode = manual ? 'manual' : 'auto';
  state.ip = manual ? stored : state.detectedIp;

  if (changed) {
    renderIpSelect();
    updateLinks();
  }
}

function renderIpSelect() {
  const select = $('#ip-select');
  if (!select) return;

  // Defensive: never leave the picker on an option that no longer exists.
  if (state.ipMode === 'manual' && !state.interfaces.some((entry) => entry.address === state.ip)) {
    state.ipMode = 'auto';
    state.ip = state.detectedIp;
    localStorage.removeItem('dle_ip');
    updateLinks();
  }

  select.textContent = '';

  const auto = document.createElement('option');
  auto.value = '';
  auto.textContent = `${t('ip_auto')} · ${state.detectedIp}`;
  select.appendChild(auto);

  for (const entry of state.interfaces) {
    const option = document.createElement('option');
    option.value = entry.address;
    const recommended =
      entry.address === state.detectedIp && state.netSource === 'route' && !entry.virtual && !entry.vpn;
    option.textContent = recommended
      ? `${interfaceLabel(entry)} · ${t('ip_recommended')}`
      : interfaceLabel(entry);
    select.appendChild(option);
  }

  select.value = state.ipMode === 'manual' ? state.ip : '';
  select.title = state.netSource === 'route' ? t('diag_route') : '';
}

async function refreshNetwork(announce = false) {
  if (state.networkBusy) return;
  state.networkBusy = true;
  const button = $('#ip-refresh');
  if (button) {
    button.disabled = true;
    button.classList.add('spin');
  }

  try {
    const network = await request('/api/network');
    applyNetwork(network);
    if (announce) {
      const key = state.ipMode === 'manual' ? 'toast_ip_active' : 'toast_ip_auto';
      toast(`${t(key)}: ${state.ip}`, 'ok');
    }
  } catch {
    /* the panel is local; a transient failure is not worth a toast */
  } finally {
    state.networkBusy = false;
    if (button) {
      button.disabled = false;
      button.classList.remove('spin');
    }
  }
}

async function checkFirewall() {
  try {
    const status = await request('/api/firewall/status', { timeoutMs: 20000 });
    state.firewallOk = Boolean(status.allPresent);
    $('#fw-alert').hidden = state.firewallOk || !status.supported;
  } catch {
    /* diagnostics are optional */
  }
}

async function fixFirewall() {
  const buttons = [$('#fw-fix'), $('#diag-fix-fw')];
  buttons.forEach((button) => {
    button.disabled = true;
  });
  try {
    const result = await request('/api/firewall/fix', {
      method: 'POST',
      body: {},
      timeoutMs: 180000,
    });
    state.firewallOk = Boolean(result.firewall && result.firewall.allPresent);
    $('#fw-alert').hidden = state.firewallOk;
    toast(t('toast_fw_fixed'), 'ok');
    if (!$('#diag-modal').hidden) await loadDiagnostics();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

/* ------------------------------------------------------------ akses dari HP */

const isMobileMode = () => document.body.dataset.mode === 'mobile';

let lanBusy = false;

function timeAgo(timestamp) {
  const seconds = Math.max(0, Math.round((Date.now() - Number(timestamp || 0)) / 1000));
  if (seconds < 60) return 'baru saja';
  if (seconds < 3600) return `${Math.round(seconds / 60)} menit lalu`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} jam lalu`;
  return `${Math.round(seconds / 86400)} hari lalu`;
}

function renderDevices(list) {
  const box = $('#device-list');
  if (!box) return;
  box.textContent = '';

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'device-empty';
    empty.textContent = t('lan_no_devices');
    box.appendChild(empty);
    return;
  }

  for (const device of list) {
    const row = document.createElement('div');
    row.className = 'device-row';

    const meta = document.createElement('div');
    meta.className = 'device-meta';

    const name = document.createElement('span');
    name.className = 'device-name';
    name.textContent = device.name;

    const sub = document.createElement('span');
    sub.className = 'device-sub';
    sub.textContent = `${device.lastIp || '-'} · ${timeAgo(device.lastSeenAt)}`;

    meta.append(name, sub);

    const revoke = document.createElement('button');
    revoke.type = 'button';
    revoke.className = 'btn btn-ghost';
    revoke.textContent = t('lan_revoke');
    revoke.addEventListener('click', () => revokeDevice(device.id));

    row.append(meta, revoke);
    box.appendChild(row);
  }
}

function renderLan(info) {
  state.lan = info || { enabled: false, devices: [], url: '' };
  const enabled = Boolean(state.lan.enabled);

  const status = $('#lan-status');
  if (status) {
    status.classList.toggle('on', enabled);
    const label = status.querySelector('span');
    if (label) label.textContent = enabled ? t('lan_active') : t('off');
  }

  const button = $('#lan-btn');
  if (button) button.textContent = enabled ? t('lan_disable') : t('lan_enable');

  const body = $('#lan-body');
  if (body) body.hidden = !enabled;

  const url = $('#lan-url');
  if (url) url.textContent = state.lan.url || '';

  renderDevices(Array.isArray(state.lan.devices) ? state.lan.devices : []);
}

async function loadLan() {
  if (isMobileMode()) return;
  try {
    renderLan(await request('/api/lan'));
  } catch {
    renderLan({ enabled: false, devices: [], url: '' });
  }
}

async function toggleLan() {
  if (lanBusy) return;
  lanBusy = true;
  const button = $('#lan-btn');
  if (button) button.disabled = true;

  try {
    const info = await request('/api/lan', {
      method: 'POST',
      body: { enabled: !state.lan.enabled, ip: state.ip },
      timeoutMs: 15000,
    });
    renderLan(info);
    toast(info.enabled ? t('toast_lan_on') : t('toast_lan_off'), 'ok');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    lanBusy = false;
    if (button) button.disabled = false;
  }
}

async function createPairCode() {
  try {
    const data = await request('/api/pair/new', { method: 'POST', body: {} });
    const box = $('#pair-box');
    box.hidden = false;
    $('#pair-code').textContent = data.code;
    $('#pair-qr').src = `/api/qr?text=${encodeURIComponent(data.qr || data.url || '')}`;
    $('#pair-expire').textContent = `${t('lan_expire')} ${new Date(
      data.expiresAt,
    ).toLocaleTimeString()}`;
    toast(t('toast_pair_created'), 'ok');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function revokeDevice(id) {
  try {
    const data = await request(`/api/devices/${encodeURIComponent(id)}`, { method: 'DELETE' });
    renderDevices(Array.isArray(data.devices) ? data.devices : []);
    toast(t('toast_device_revoked'), 'ok');
  } catch (error) {
    toast(error.message, 'error');
  }
}

/* -------------------------------------------------------------------- links */

function updateLinks() {
  if (!state.config) return;
  const ip = state.ip || '127.0.0.1';
  const ports = state.config.ports;
  const stream = state.stream;

  $('#l-dji').value = `rtmp://${ip}:${ports.rtmp}/${stream}`;
  $('#l-rtsp').value = `rtsp://${ip}:${ports.rtsp}/${stream}`;
  $('#l-hls').value = `http://${ip}:${ports.hls}/${stream}/index.m3u8`;
  $('#l-web').value = `http://${ip}:${ports.webrtc}/${stream}/`;

  $('#link-stream').textContent = stream;
  $('#preview-sub').textContent = stream;
}

async function copyValue(id) {
  const input = document.getElementById(id);
  if (!input) return;
  try {
    await navigator.clipboard.writeText(input.value);
  } catch {
    input.select();
    document.execCommand('copy');
    input.setSelectionRange(0, 0);
  }
  toast(t('toast_copied'), 'ok');
}

function openQr(inputId, title) {
  const input = document.getElementById(inputId);
  if (!input || !input.value) return;
  $('#qr-image').src = `/api/qr?text=${encodeURIComponent(input.value)}`;
  $('#qr-text').textContent = input.value;
  $('#qr-title').textContent = title || t('qr_title');
  $('#qr-modal').hidden = false;
}

function closeQr() {
  $('#qr-modal').hidden = true;
  $('#qr-image').removeAttribute('src');
}

/* ------------------------------------------------------------------ cameras */

function streamLabel(name) {
  return name.replace(/^live\//, '');
}

function isLive(name) {
  return (state.bytes.get(name) || 0) > 0;
}

function renderCameras() {
  const signature = `${state.stream}|${Array.from(state.known)
    .map((name) => `${name}:${isLive(name) ? 1 : 0}`)
    .join(',')}`;
  if (signature === state.cameraSignature) return;
  state.cameraSignature = signature;

  const container = $('#camera-list');
  container.textContent = '';

  for (const name of state.known) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cam-chip';
    if (name === state.stream) button.classList.add('active');
    if (isLive(name)) button.classList.add('live');
    button.textContent = streamLabel(name);
    button.addEventListener('click', () => selectStream(name));
    container.appendChild(button);
  }
}

async function selectStream(name) {
  if (name === state.stream) return;
  state.stream = name;
  state.lastBytes = 0;
  state.lastTime = 0;
  localStorage.setItem('dle_stream', name);

  updateLinks();
  renderCameras();
  connectPreview();

  try {
    if (state.recording) {
      const folder = $('#rec-folder').value.trim();
      await request('/api/record/stop', { method: 'POST', body: {} });
      if (folder) {
        await request('/api/record/start', {
          method: 'POST',
          body: { folder, streamName: name },
        });
      }
    }
    if (state.vcam) {
      await request('/api/vcam/start', { method: 'POST', body: { streamName: name } });
    }
    if (state.restreaming) {
      const targets = activeTargets();
      if (targets.length > 0) {
        await request('/api/restream', {
          method: 'POST',
          body: {
            targets,
            streamName: name,
            audioSource: $('#rs-audio').value,
            quality: $('#rs-quality').value,
          },
        });
      }
    }
    toast(`${t('toast_stream_switched')}: ${streamLabel(name)}`, 'ok');
  } catch (error) {
    toast(error.message, 'error');
  }
}

/* ------------------------------------------------------------------ preview */

function waitForIce(peer, timeoutMs) {
  return new Promise((resolve) => {
    if (peer.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const timer = setTimeout(finish, timeoutMs);
    function finish() {
      clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    }
    function onChange() {
      if (peer.iceGatheringState === 'complete') finish();
    }
    peer.addEventListener('icegatheringstatechange', onChange);
  });
}

function schedulePreviewRetry() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    if (!state.config) return schedulePreviewRetry();
    connectPreview();
  }, 5000);
}

function teardownPreview() {
  previewGeneration += 1;
  clearTimeout(previewTimer);
  if (previewPeer) {
    try {
      previewPeer.close();
    } catch {
      /* already closed */
    }
    previewPeer = null;
  }
  const video = $('#player');
  video.srcObject = null;
}

async function connectPreview() {
  teardownPreview();
  const generation = previewGeneration;
  if (!state.config) return;

  const video = $('#player');
  const standby = $('#standby');
  standby.classList.remove('hidden');

  try {
    const peer = new RTCPeerConnection({ iceServers: [] });
    previewPeer = peer;
    peer.addTransceiver('video', { direction: 'recvonly' });
    peer.addTransceiver('audio', { direction: 'recvonly' });

    const remote = new MediaStream();
    peer.addEventListener('track', (event) => {
      if (generation !== previewGeneration) return;
      const [incoming] = event.streams;
      if (!incoming) return;
      incoming.getTracks().forEach((track) => {
        if (!remote.getTracks().includes(track)) remote.addTrack(track);
      });
      video.srcObject = remote;
      standby.classList.add('hidden');
    });

    peer.addEventListener('connectionstatechange', () => {
      if (generation !== previewGeneration) return;
      if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
        standby.classList.remove('hidden');
        schedulePreviewRetry();
      }
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await waitForIce(peer, 1500);
    if (generation !== previewGeneration) return;

    const response = await fetch(
      `http://${window.location.hostname}:${state.config.ports.webrtc}/${state.stream}/whep`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: peer.localDescription.sdp,
      },
    );
    if (!response.ok) throw new Error(`WHEP ${response.status}`);

    const answer = await response.text();
    if (generation !== previewGeneration) return;
    await peer.setRemoteDescription({ type: 'answer', sdp: answer });
  } catch {
    if (generation !== previewGeneration) return;
    if (previewPeer) {
      try {
        previewPeer.close();
      } catch {
        /* already closed */
      }
      previewPeer = null;
    }
    standby.classList.remove('hidden');
    schedulePreviewRetry();
  }
}

/* ---------------------------------------------------------------- bitrate */

function drawGraph() {
  const canvas = $('#bitrate-graph');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 150;
  const height = canvas.clientHeight || 34;

  if (canvas.width !== Math.round(width * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const history = state.bitrateHistory;
  const peakValue = Math.max(...history);
  if (peakValue <= 0) return;

  const peak = Math.max(500, peakValue) * 1.15;
  const step = width / Math.max(1, history.length - 1);

  context.beginPath();
  context.moveTo(0, height);
  history.forEach((value, index) => {
    context.lineTo(index * step, height - (value / peak) * height);
  });
  context.lineTo(width, height);
  context.closePath();

  const latest = history[history.length - 1] || 0;
  const stroke = latest < 500 ? '#fb7185' : latest < 1500 ? '#fbbf24' : '#34d399';
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `${stroke}55`);
  gradient.addColorStop(1, `${stroke}00`);
  context.fillStyle = gradient;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 1.5;
  context.stroke();
}

async function pollBitrate() {
  // Never let a slow poll stack up: each one holds a browser connection and
  // the queue would delay user actions such as pressing "Mulai 1".
  if (pollBitrate.busy) return;
  pollBitrate.busy = true;
  try {
    const data = await request('/api/bitrate');
    const list = Array.isArray(data.streams) ? data.streams : [];
    const live = new Set();

    for (const item of list) {
      live.add(item.name);
      state.bytes.set(item.name, item.bytesReceived);
      if (!state.known.has(item.name)) {
        state.known.add(item.name);
        renderCameras();
      }
    }
    for (const name of Array.from(state.bytes.keys())) {
      if (!live.has(name)) state.bytes.delete(name);
    }

    const current = state.bytes.get(state.stream) || 0;
    const now = performance.now();

    if (state.lastTime > 0 && current >= state.lastBytes && current > 0) {
      const delta = ((current - state.lastBytes) * 8) / ((now - state.lastTime) / 1000) / 1000;
      const kbps = Math.max(0, delta);
      $('#bitrate').textContent = `${kbps.toFixed(1)} kbps`;
      state.bitrateHistory.push(kbps);
      state.bitrateHistory.shift();
      drawGraph();
    } else if (current === 0) {
      $('#bitrate').textContent = '0.0 kbps';
      state.bitrateHistory.push(0);
      state.bitrateHistory.shift();
      drawGraph();
    }

    state.lastBytes = current;
    state.lastTime = now;

    renderCameras();
    if (current > 0) {
      $('#standby').classList.add('hidden');
    } else {
      $('#standby').classList.remove('hidden');
    }
  } catch {
    /* panel is local; a transient failure is not worth a toast */
  } finally {
    pollBitrate.busy = false;
  }
}

/* ------------------------------------------------------------------- state */

async function pollState() {
  if (pollState.busy) return;
  // A restream request is in flight; its answer is newer than this snapshot.
  if (rsBusy) return;
  pollState.busy = true;
  try {
    const snapshot = await request('/api/state');
    state.recording = Boolean(snapshot.recording?.active);
    state.recFile = snapshot.recording?.filepath || '';
    state.restreaming = Boolean(snapshot.restream?.active);
    state.restreamWaiting = Boolean(snapshot.restream?.waiting);
    state.restreamError = snapshot.restream?.error || '';
    if (!state.restreaming && !state.restreamWaiting) state.targets = { 1: false, 2: false };
    state.vcam = Boolean(snapshot.virtualCamera?.active);
    state.vcamStreaming = Boolean(snapshot.virtualCamera?.streaming);
    state.vcamRelayRunning = Boolean(snapshot.virtualCamera?.relayRunning);

    renderRecording();
    renderRestream();
    renderVcam();
    renderMediaState(snapshot);

    if (snapshot.media && snapshot.media.running === false && !state.mediaMissingWarned) {
      state.mediaMissingWarned = true;
      toast(t('toast_media_missing'), 'error');
    }

    const mediaError = (snapshot.media && snapshot.media.error) || '';
    if (mediaError && mediaError !== state.mediaError) {
      state.mediaError = mediaError;
      toast(mediaError, 'error');
    }
  } catch {
    /* keep the last known state */
  } finally {
    pollState.busy = false;
  }
}

function renderRecording() {
  const status = $('#rec-status');
  status.classList.toggle('rec', state.recording);
  status.classList.toggle('on', state.recording);
  status.querySelector('span').textContent = state.recording ? t('recording_on') : t('idle');

  const button = $('#rec-btn');
  button.textContent = state.recording ? t('stop_rec') : t('start_rec');
  button.classList.toggle('btn-danger', state.recording);
  button.classList.toggle('btn-primary', !state.recording);

  const file = $('#rec-file');
  if (state.recFile) {
    const parts = state.recFile.split(/[\\/]/);
    file.textContent = parts[parts.length - 1];
    file.hidden = false;
  } else {
    file.hidden = true;
  }
}

function renderRestream() {
  const count = Number(state.targets[1]) + Number(state.targets[2]);
  const waiting = Boolean(state.restreamWaiting);
  const status = $('#rs-status');
  status.classList.toggle('on', count > 0 && !waiting);
  status.classList.toggle('wait', waiting && !rsBusy);
  status.querySelector('span').textContent = rsBusy
    ? t('rs_checking')
    : waiting
      ? t('rs_waiting')
      : count > 0
        ? `${count} ${t('target_count')}`
        : t('idle');

  $('#rs-btn1').classList.toggle('on', state.targets[1]);
  $('#rs-btn2').classList.toggle('on', state.targets[2]);
  $('#rs-stop').disabled = count === 0 && !waiting && !state.restreaming;

  const wait = $('#rs-wait');
  if (wait) {
    wait.hidden = !waiting;
    if (waiting) {
      const text = $('#rs-wait-text');
      const link = $('#rs-wait-link');
      if (text) text.textContent = t('rs_wait_hint');
      if (link) link.textContent = $('#l-dji').value;
    }
  }

  const error = $('#rs-error');
  if (error) {
    error.textContent = state.restreamError || '';
    error.hidden = !state.restreamError;
  }
}

function renderMediaState(snapshot) {
  if (snapshot) state.mediaSnapshot = snapshot.media || null;
  const element = $('#media-status');
  if (!element) return;

  const media = state.mediaSnapshot || {};
  const ready = Boolean(media.ready);
  const running = Boolean(media.running);
  const error = media.error || '';

  element.classList.toggle('on', ready && !error);
  element.classList.toggle('warn', running && !ready && !error);
  element.classList.toggle('rec', Boolean(error));
  element.querySelector('span').textContent = error
    ? t('media_error')
    : ready
      ? t('media_ready')
      : running
        ? t('media_starting')
        : t('media_off');
  element.title = error || `RTMP :${(state.config && state.config.ports.rtmp) || 1935}`;
}

function renderVcam() {
  const status = $('#vcam-status');
  const live = state.vcam && state.vcamStreaming;
  status.classList.toggle('on', live);
  // VCam "on" only shows while frames actually flow; while the relay waits for
  // a DirectShow consumer (OBS/vMix/browser opening the camera) show the hint.
  if (!state.vcam) {
    status.querySelector('span').textContent = t('off');
  } else if (live) {
    status.querySelector('span').textContent = t('vcam_on');
  } else {
    status.querySelector('span').textContent = t('vcam_waiting');
  }

  const button = $('#vcam-btn');
  button.textContent = state.vcam ? t('stop_vcam') : t('start_vcam');
  button.classList.toggle('btn-danger', state.vcam);
  button.classList.toggle('btn-outline', !state.vcam);
}

/* ------------------------------------------------------------------ actions */

async function toggleRecording() {
  const button = $('#rec-btn');
  button.disabled = true;
  try {
    if (state.recording) {
      await request('/api/record/stop', { method: 'POST', body: {} });
      state.recording = false;
      state.recFile = '';
      toast(t('toast_rec_stopped'), 'ok');
    } else {
      const folder = $('#rec-folder').value.trim();
      if (!folder) throw new Error(t('toast_no_folder'));
      const result = await request('/api/record/start', {
        method: 'POST',
        body: { folder, streamName: state.stream },
      });
      state.recording = true;
      state.recFile = result.filepath || '';
      toast(t('toast_rec_started'), 'ok');
    }
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
    renderRecording();
  }
}

function activeTargets() {
  const targets = [];
  if (state.targets[1]) {
    targets.push({ url: $('#rs-url1').value.trim(), key: $('#rs-key1').value.trim() });
  }
  if (state.targets[2]) {
    targets.push({ url: $('#rs-url2').value.trim(), key: $('#rs-key2').value.trim() });
  }
  return targets.filter((target) => target.url);
}

/**
 * Quality/audio are baked into the ffmpeg command. While the engine is still
 * waiting for the drone we can update that pending command; once it runs, the
 * change only applies on the next start, and the user should know.
 */
async function syncRestreamSettings() {
  if (!state.restreamWaiting) {
    if (state.restreaming) toast(t('toast_quality_next'), 'info');
    return;
  }

  const targets = activeTargets();
  if (targets.length === 0) return;

  try {
    const result = await request('/api/restream', {
      method: 'POST',
      body: {
        targets,
        streamName: state.stream,
        audioSource: $('#rs-audio').value,
        quality: $('#rs-quality').value,
      },
    });
    state.restreamWaiting = Boolean(result.waiting);
    state.restreaming = !result.waiting;
    state.restreamError = '';
  } catch (error) {
    state.restreamError = error.message;
  }
  renderRestream();
}

async function applyRestream(next) {
  const button1 = $('#rs-btn1');
  const button2 = $('#rs-btn2');
  button1.disabled = true;
  button2.disabled = true;
  rsBusy = true;
  // Immediate feedback: the engine answers in milliseconds, but the user
  // should never be left staring at a silent button while it checks.
  $('#rs-status').querySelector('span').textContent = t('rs_checking');

  try {
    const targets = [];
    if (next[1]) {
      const url = $('#rs-url1').value.trim();
      if (!url) throw new Error(t('toast_target_required'));
      targets.push({ url, key: $('#rs-key1').value.trim() });
    }
    if (next[2]) {
      const url = $('#rs-url2').value.trim();
      if (!url) throw new Error(t('toast_target_required'));
      targets.push({ url, key: $('#rs-key2').value.trim() });
    }

    if (targets.length === 0) {
      await request('/api/restream/stop', { method: 'POST', body: {} });
      state.targets = { 1: false, 2: false };
      state.restreaming = false;
      state.restreamWaiting = false;
      state.restreamError = '';
      toast(t('toast_rs_stopped'), 'ok');
    } else {
      const result = await request('/api/restream', {
        method: 'POST',
        body: {
          targets,
          streamName: state.stream,
          audioSource: $('#rs-audio').value,
          quality: $('#rs-quality').value,
        },
      });
      state.targets = { 1: Boolean(next[1]), 2: Boolean(next[2]) };
      state.restreaming = !result.waiting;
      state.restreamWaiting = Boolean(result.waiting);
      state.restreamError = '';
      if (result.waiting) {
        toast(`${t('toast_rs_waiting')} · ${$('#l-dji').value}`, 'info');
      } else {
        toast(`${t('toast_rs_started')} · ${targets.length} ${t('target_count')}`, 'ok');
      }
    }
  } catch (error) {
    state.restreamError = error.message;
    toast(error.message, 'error');
  } finally {
    rsBusy = false;
    button1.disabled = false;
    button2.disabled = false;
    renderRestream();
  }
}

async function toggleVcam() {
  const button = $('#vcam-btn');
  button.disabled = true;
  try {
    if (state.vcam) {
      await request('/api/vcam/stop', { method: 'POST', body: {} });
      state.vcam = false;
      toast(t('toast_vcam_off'), 'ok');
    } else {
      await request('/api/vcam/start', {
        method: 'POST',
        body: { streamName: state.stream },
      });
      state.vcam = true;
      toast(t('toast_vcam_on'), 'ok');
    }
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
    renderVcam();
  }
}

async function browseFolder() {
  try {
    const result = await request('/api/select-folder', {
      method: 'POST',
      body: {},
      timeoutMs: 0,
    });
    if (result.folder) {
      $('#rec-folder').value = result.folder;
      localStorage.setItem('dle_folder', result.folder);
      toast(t('toast_folder'), 'ok');
    }
  } catch (error) {
    toast(error.message, 'error');
  }
}

/* --------------------------------------------------------------- settings */

function buildQualityOptions(qualities) {
  const select = $('#rs-quality');
  select.textContent = '';
  for (const quality of qualities) {
    const option = document.createElement('option');
    option.value = quality.id;
    const key = `q_${quality.id}`;
    option.textContent = translations[state.lang][key] || quality.id;
    select.appendChild(option);
  }
  const stored = localStorage.getItem('dle_quality');
  const fallback = state.config && state.config.defaultQuality;
  if (stored && qualities.some((quality) => quality.id === stored)) {
    select.value = stored;
  } else if (fallback && qualities.some((quality) => quality.id === fallback)) {
    select.value = fallback;
  }
}

async function loadAudioDevices() {
  try {
    const data = await request('/api/audio-devices', { timeoutMs: 15000 });
    const select = $('#rs-audio');
    const stored = localStorage.getItem('dle_audio');
    for (const device of data.devices || []) {
      const option = document.createElement('option');
      option.value = `mic:${device}`;
      option.textContent = `Mic · ${device}`;
      select.appendChild(option);
    }
    if (stored && Array.from(select.options).some((option) => option.value === stored)) {
      select.value = stored;
    }
  } catch {
    /* microphone enumeration is optional */
  }
}

function restoreSettings() {
  const folder = localStorage.getItem('dle_folder');
  if (folder) $('#rec-folder').value = folder;

  const pairs = [
    ['dle_url1', '#rs-url1'],
    ['dle_key1', '#rs-key1'],
    ['dle_url2', '#rs-url2'],
    ['dle_key2', '#rs-key2'],
  ];
  for (const [key, selector] of pairs) {
    const value = localStorage.getItem(key);
    if (value) $(selector).value = value;
  }
}

function persistInputs() {
  const pairs = [
    ['dle_url1', '#rs-url1'],
    ['dle_key1', '#rs-key1'],
    ['dle_url2', '#rs-url2'],
    ['dle_key2', '#rs-key2'],
  ];
  for (const [key, selector] of pairs) {
    localStorage.setItem(key, $(selector).value);
  }
  localStorage.setItem('dle_quality', $('#rs-quality').value);
  localStorage.setItem('dle_audio', $('#rs-audio').value);
}

/* ------------------------------------------------------------- diagnostics */

async function openDiagnostics() {
  $('#diag-modal').hidden = false;
  await loadDiagnostics();
}

function closeDiagnostics() {
  $('#diag-modal').hidden = true;
}

async function loadDiagnostics() {
  const body = $('#diag-body');
  body.textContent = t('diag_loading');
  try {
    const data = await request('/api/diagnostics', { timeoutMs: 30000 });
    renderDiagnostics(data);
    state.firewallOk = Boolean(data.firewall && data.firewall.allPresent);
    $('#fw-alert').hidden = state.firewallOk || !(data.firewall && data.firewall.supported);
  } catch (error) {
    body.textContent = error.message;
  }
}

function renderDiagnostics(data) {
  const body = $('#diag-body');
  body.textContent = '';

  const section = (title) => {
    const wrapper = document.createElement('section');
    wrapper.className = 'diag-section';
    const heading = document.createElement('h4');
    heading.textContent = title;
    wrapper.appendChild(heading);
    body.appendChild(wrapper);
    return wrapper;
  };

  const row = (parent, key, value, good) => {
    const line = document.createElement('div');
    line.className = 'diag-row';
    const name = document.createElement('span');
    name.className = 'diag-key';
    name.textContent = key;
    const val = document.createElement('span');
    val.className = 'diag-val mono';
    if (good === true) val.classList.add('ok');
    if (good === false) val.classList.add('bad');
    val.textContent = value;
    line.append(name, val);
    parent.appendChild(line);
  };

  const network = data.network || {};
  const net = section(t('diag_network'));
  row(net, t('diag_network'), `${network.ip || '—'} · ${network.source || '—'}`);
  row(net, t('diag_route'), network.routeAddress || '—');

  const adapters = section(t('diag_interfaces'));
  const interfaces = Array.isArray(network.interfaces) ? network.interfaces : [];
  for (const entry of interfaces) {
    const tags = [];
    if (entry.virtual) tags.push(t('ip_virtual'));
    if (entry.vpn) tags.push(t('ip_vpn'));
    row(adapters, entry.name, `${entry.address}${tags.length ? ` · ${tags.join(', ')}` : ''}`);
  }
  if (interfaces.length === 0) row(adapters, t('diag_none'), '—');

  const firewall = data.firewall || {};
  const fw = section(t('diag_firewall'));
  const rules = Array.isArray(firewall.rules) ? firewall.rules : [];
  for (const rule of rules) {
    row(
      fw,
      rule.name.replace('Drone Live Engine ', ''),
      rule.present ? t('diag_present') : t('diag_missing'),
      rule.present,
    );
  }
  if (rules.length === 0) row(fw, t('diag_none'), '—');

  const ports = section(t('diag_ports'));
  for (const entry of data.ports || []) {
    row(
      ports,
      entry.name,
      `${entry.port} · ${entry.listening ? t('diag_listening') : t('diag_offline')}`,
      entry.listening,
    );
  }

  const binaries = section(t('diag_binaries'));
  for (const [name, value] of Object.entries(data.binaries || {})) {
    row(binaries, name, value || t('diag_missing'), Boolean(value));
  }

  const info = section(t('diag_log'));
  row(info, t('diag_paths'), String(data.paths ?? 0));
  row(info, t('diag_log'), data.logFile || '—');

  const note = document.createElement('p');
  note.className = 'diag-note';
  note.textContent = t('diag_note');
  body.appendChild(note);
}

/* -------------------------------------------------------------------- clock */

function startClock() {
  const tick = () => {
    $('#clock').textContent = new Date().toLocaleTimeString('id-ID', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

/* --------------------------------------------------------------- ui binding */

function bindUi() {
  $('#lang-btn').addEventListener('click', () => {
    state.lang = state.lang === 'id' ? 'en' : 'id';
    localStorage.setItem('dle_lang', state.lang);
    applyLanguage();
    buildQualityOptions(state.config ? state.config.qualities : []);
  });

  $('#theme-btn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('dle_theme', state.theme);
    applyTheme();
  });

  $$('[data-copy]').forEach((button) => {
    button.addEventListener('click', () => copyValue(button.dataset.copy));
  });

  $$('[data-qr]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = button.closest('.link-row');
      const title = row ? row.querySelector('.link-title').textContent : t('qr_title');
      openQr(button.dataset.qr, title);
    });
  });

  $('#qr-close').addEventListener('click', closeQr);
  $('#qr-modal').addEventListener('click', (event) => {
    if (event.target === $('#qr-modal')) closeQr();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!$('#qr-modal').hidden) closeQr();
    if (!$('#diag-modal').hidden) closeDiagnostics();
  });

  $('#ip-select').addEventListener('change', (event) => {
    const value = event.target.value;
    if (!value) {
      state.ipMode = 'auto';
      state.ip = state.detectedIp;
      localStorage.removeItem('dle_ip');
      toast(`${t('toast_ip_auto')}: ${state.ip}`, 'ok');
    } else {
      state.ipMode = 'manual';
      state.ip = value;
      localStorage.setItem('dle_ip', value);
      toast(`${t('toast_ip_changed')}: ${value}`, 'ok');
    }
    updateLinks();
  });

  $('#ip-refresh').addEventListener('click', () => refreshNetwork(true));
  $('#fw-fix').addEventListener('click', fixFirewall);

  $('#diag-btn').addEventListener('click', openDiagnostics);
  $('#diag-close').addEventListener('click', closeDiagnostics);
  $('#diag-modal').addEventListener('click', (event) => {
    if (event.target === $('#diag-modal')) closeDiagnostics();
  });
  $('#diag-refresh').addEventListener('click', loadDiagnostics);
  $('#diag-fix-fw').addEventListener('click', fixFirewall);
  $('#diag-open-logs').addEventListener('click', async () => {
    try {
      await request('/api/open-logs', { method: 'POST', body: {} });
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  $('#browse-btn').addEventListener('click', browseFolder);
  $('#rec-btn').addEventListener('click', toggleRecording);

  $('#rs-btn1').addEventListener('click', () =>
    applyRestream({ 1: !state.targets[1], 2: state.targets[2] }),
  );
  $('#rs-btn2').addEventListener('click', () =>
    applyRestream({ 1: state.targets[1], 2: !state.targets[2] }),
  );
  $('#rs-stop').addEventListener('click', () => applyRestream({ 1: false, 2: false }));

  $('#vcam-btn').addEventListener('click', toggleVcam);

  const lanBtn = $('#lan-btn');
  if (lanBtn) lanBtn.addEventListener('click', toggleLan);
  const pairNew = $('#pair-new');
  if (pairNew) pairNew.addEventListener('click', createPairCode);

  ['#rs-url1', '#rs-key1', '#rs-url2', '#rs-key2'].forEach((selector) => {
    $(selector).addEventListener('change', persistInputs);
  });
  $('#rs-quality').addEventListener('change', () => {
    persistInputs();
    syncRestreamSettings();
  });
  $('#rs-audio').addEventListener('change', () => {
    persistInputs();
    syncRestreamSettings();
  });

  $('#wm-btn').addEventListener('click', () => {
    state.watermark = !state.watermark;
    const element = $('#watermark');
    element.hidden = !state.watermark;
    element.textContent = $('#wm-input').value.trim() || 'LIVE';
    $('#wm-btn').classList.toggle('on', state.watermark);
  });

  $('#wm-input').addEventListener('input', () => {
    $('#watermark').textContent = $('#wm-input').value.trim() || 'LIVE';
  });

  $('#logo-btn').addEventListener('click', () => {
    if (!$('#logo-overlay').getAttribute('src')) {
      $('#logo-input').click();
      return;
    }
    state.logo = !state.logo;
    $('#logo-overlay').hidden = !state.logo;
    $('#logo-btn').classList.toggle('on', state.logo);
  });

  $('#logo-input').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = $('#logo-overlay');
      image.src = String(reader.result);
      image.hidden = false;
      state.logo = true;
      $('#logo-btn').classList.add('on');
    };
    reader.readAsDataURL(file);
  });

  $('#fs-btn').addEventListener('click', () => {
    const box = $('#preview-box');
    if (document.fullscreenElement === box) {
      document.exitFullscreen();
    } else {
      box.requestFullscreen().catch(() => {});
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.config && !previewPeer) connectPreview();
  });

  window.addEventListener('resize', drawGraph);
}

document.addEventListener('DOMContentLoaded', boot);
