/**
 * DRONE LIVE ENGINE — NEXT-GEN INTERACTIVE CONTROLLER
 * Aerospace HUD · Pixel-Perfect App Panel Replica · Particle Radar Canvas · Web Audio FX · Mission Switcher
 */

(function () {
  'use strict';

  // ------------------------------------------------------------- Motion Preferences
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------- Web Audio Synthesizer
  let audioCtx = null;
  let sfxEnabled = false;

  const sfxToggleBtn = document.getElementById('sfx-toggle');
  const sfxIconOff = document.getElementById('sfx-icon-off');
  const sfxIconOn = document.getElementById('sfx-icon-on');

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, gainVal, slideFreq) {
    if (!sfxEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
      }

      gain.gain.setValueAtTime(gainVal || 0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Ignore audio errors
    }
  }

  function playHoverSound() {
    playTone(1200, 'sine', 0.04, 0.015, 1600);
  }

  function playClickSound() {
    playTone(850, 'triangle', 0.07, 0.04, 420);
  }

  function playChimeSound() {
    playTone(520, 'sine', 0.18, 0.04, 1040);
  }

  if (sfxToggleBtn) {
    sfxToggleBtn.addEventListener('click', () => {
      initAudio();
      sfxEnabled = !sfxEnabled;
      sfxToggleBtn.classList.toggle('active', sfxEnabled);
      if (sfxIconOff && sfxIconOn) {
        sfxIconOff.style.display = sfxEnabled ? 'none' : 'block';
        sfxIconOn.style.display = sfxEnabled ? 'block' : 'none';
      }
      sfxToggleBtn.title = sfxEnabled ? 'Efek Suara UI (Aktif)' : 'Efek Suara UI (Mati)';
      if (sfxEnabled) playChimeSound();
    });
  }

  document.querySelectorAll('button, .btn-primary, .btn-secondary, .nav-link, .mission-tab').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      if (sfxEnabled) playHoverSound();
    });
  });

  // ------------------------------------------------------------- Scroll Entrance Reveal
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReduced) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  // ------------------------------------------------------------- Real Local Time Clock (HH.mm.ss)
  const appClockEl = document.getElementById('app-clock');
  function updateClock() {
    if (!appClockEl) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    appClockEl.textContent = `${h}.${m}.${s}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ------------------------------------------------------------- Radar Particle Canvas Background
  const canvas = document.getElementById('hero-canvas');
  if (canvas && !prefersReduced) {
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let radarAngle = 0;
    let animId = null;
    const mouse = { x: -1000, y: -1000 };

    function resizeCanvas() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    }

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.radius = Math.random() * 1.6 + 0.8;
        this.alpha = Math.random() * 0.5 + 0.2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          this.x -= dx * 0.02;
          this.y -= dy * 0.02;
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${this.alpha})`;
        ctx.fill();
      }
    }

    function initParticles() {
      const count = Math.min(Math.floor((width * height) / 16000), 55);
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    }

    function drawRadarSweep() {
      const centerX = width * 0.5;
      const centerY = height * 0.35;
      const radius = Math.min(width, height) * 0.55;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.04)';
      ctx.stroke();

      radarAngle += 0.008;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, radarAngle, radarAngle + 0.45);
      ctx.closePath();

      const sweepGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      sweepGrad.addColorStop(0, 'rgba(34, 211, 238, 0.1)');
      sweepGrad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      ctx.restore();
    }

    function drawConstellations() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - dist / 120) * 0.12})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
    }

    function renderLoop() {
      ctx.clearRect(0, 0, width, height);
      drawRadarSweep();
      drawConstellations();
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animId = requestAnimationFrame(renderLoop);
    }

    resizeCanvas();
    initParticles();
    renderLoop();

    window.addEventListener('resize', () => {
      resizeCanvas();
      initParticles();
    });

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    const canvasObserver = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) {
          if (animId) cancelAnimationFrame(animId);
        } else {
          renderLoop();
        }
      });
    });
    canvasObserver.observe(canvas);
  }

  // ------------------------------------------------------------- Simulated Application Window Controller
  const btnToggleStreamMode = document.getElementById('btn-toggle-stream-mode');
  const streamModeLabel = document.getElementById('stream-mode-label');
  const feedStandby = document.getElementById('feed-standby');
  const feedImg = document.getElementById('feed-img');
  const feedVid = document.getElementById('feed-vid');
  const feedHud = document.getElementById('feed-hud');
  const previewWatermark = document.getElementById('preview-watermark');
  const tabCam1 = document.getElementById('tab-cam1');
  const tabCam2 = document.getElementById('tab-cam2');
  const previewSubText = document.getElementById('preview-sub-text');
  const linkStreamPill = document.getElementById('link-stream-pill');
  const appBitrateText = document.getElementById('app-bitrate-text');
  const bitrateCanvas = document.getElementById('bitrate-canvas');
  const btnToggleRec = document.getElementById('btn-toggle-rec');
  const recBtnText = document.getElementById('rec-btn-text');
  const recStatusBadge = document.getElementById('rec-status-badge');
  const recStatusText = document.getElementById('rec-status-text');
  const btnToggleLan = document.getElementById('btn-toggle-lan');
  const lanStatusBadge = document.getElementById('lan-status-badge');
  const lanStatusText = document.getElementById('lan-status-text');
  const lanBtnText = document.getElementById('lan-btn-text');
  const lanBoxActive = document.getElementById('lan-box-active');
  const btnToggleWm = document.getElementById('btn-toggle-wm');
  const inputWmText = document.getElementById('input-wm-text');

  const hudAlt = document.getElementById('hud-alt');
  const hudSpd = document.getElementById('hud-spd');
  const hudDist = document.getElementById('hud-dist');

  let isLiveMode = false;
  let activeCam = 1;

  function updateStreamView() {
    if (isLiveMode) {
      if (feedStandby) feedStandby.classList.add('hidden');
      if (feedHud) feedHud.classList.remove('hidden');
      if (previewWatermark) previewWatermark.hidden = false;
      if (streamModeLabel) streamModeLabel.textContent = 'LIVE (3520 kbps)';

      if (activeCam === 1) {
        if (feedImg) feedImg.classList.remove('hidden');
        if (feedVid) {
          feedVid.classList.add('hidden');
          feedVid.pause();
        }
      } else {
        if (feedImg) feedImg.classList.add('hidden');
        if (feedVid) {
          feedVid.classList.remove('hidden');
          feedVid.play().catch(() => {});
        }
      }
    } else {
      if (feedStandby) feedStandby.classList.remove('hidden');
      if (feedHud) feedHud.classList.add('hidden');
      if (feedImg) feedImg.classList.add('hidden');
      if (feedVid) {
        feedVid.classList.add('hidden');
        feedVid.pause();
      }
      if (previewWatermark) previewWatermark.hidden = true;
      if (streamModeLabel) streamModeLabel.textContent = 'STANDBY';
      if (appBitrateText) appBitrateText.textContent = '0.0 kbps';
    }
  }

  // Simulated dynamic telemetry jitter when live
  setInterval(() => {
    if (isLiveMode) {
      if (hudAlt) {
        const alt = (124.5 + (Math.random() - 0.5) * 1.8).toFixed(1);
        hudAlt.textContent = `${alt} M`;
      }
      if (hudSpd) {
        const spd = (24.8 + (Math.random() - 0.5) * 3.2).toFixed(1);
        hudSpd.textContent = `${spd} KM/H`;
      }
      if (hudDist) {
        const dist = Math.round(412 + (Math.random() - 0.5) * 8);
        hudDist.textContent = `${dist} M`;
      }
    }
  }, 1400);

  // Toggle Stream Mode Button
  if (btnToggleStreamMode) {
    btnToggleStreamMode.addEventListener('click', () => {
      playClickSound();
      isLiveMode = !isLiveMode;
      updateStreamView();
    });
  }

  // Camera Tabs
  if (tabCam1 && tabCam2) {
    tabCam1.addEventListener('click', () => {
      playClickSound();
      activeCam = 1;
      tabCam1.classList.add('active');
      tabCam2.classList.remove('active');
      if (previewSubText) previewSubText.textContent = 'live/drone1';
      if (linkStreamPill) linkStreamPill.textContent = 'live/drone1';
      updateStreamView();
    });

    tabCam2.addEventListener('click', () => {
      playClickSound();
      activeCam = 2;
      tabCam2.classList.add('active');
      tabCam1.classList.remove('active');
      if (previewSubText) previewSubText.textContent = 'live/drone2';
      if (linkStreamPill) linkStreamPill.textContent = 'live/drone2';
      // Automatically switch to live mode to see video action!
      isLiveMode = true;
      updateStreamView();
    });
  }

  // Watermark Button & Input
  if (btnToggleWm && previewWatermark) {
    btnToggleWm.addEventListener('click', () => {
      playClickSound();
      previewWatermark.hidden = !previewWatermark.hidden;
      btnToggleWm.classList.toggle('on', !previewWatermark.hidden);
    });
  }

  if (inputWmText && previewWatermark) {
    inputWmText.addEventListener('input', (e) => {
      previewWatermark.textContent = e.target.value.trim() || 'LIVE';
    });
  }

  // Record Button Simulation
  let isRecording = false;
  let recTimer = null;
  let recSec = 0;

  function fmtTimer(s) {
    const min = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `00:${min}:${sec}`;
  }

  if (btnToggleRec) {
    btnToggleRec.addEventListener('click', () => {
      isRecording = !isRecording;
      playChimeSound();

      btnToggleRec.classList.toggle('is-recording', isRecording);
      if (recStatusBadge) {
        recStatusBadge.classList.toggle('rec', isRecording);
        recStatusBadge.classList.toggle('on', isRecording);
      }

      if (isRecording) {
        recSec = 0;
        recBtnText.textContent = 'Stop Rekam';
        if (recStatusText) recStatusText.textContent = `Merekam (${fmtTimer(recSec)})`;
        recTimer = setInterval(() => {
          recSec++;
          if (recStatusText) recStatusText.textContent = `Merekam (${fmtTimer(recSec)})`;
        }, 1000);
      } else {
        clearInterval(recTimer);
        recBtnText.textContent = 'Mulai Rekam';
        if (recStatusText) recStatusText.textContent = 'Siaga';
      }
    });
  }

  // HP Access Toggle Button
  if (btnToggleLan) {
    let lanActive = false;
    btnToggleLan.addEventListener('click', () => {
      playClickSound();
      lanActive = !lanActive;
      if (lanStatusBadge) lanStatusBadge.classList.toggle('on', lanActive);
      if (lanStatusText) lanStatusText.textContent = lanActive ? 'Aktif' : 'Mati';
      if (lanBtnText) lanBtnText.textContent = lanActive ? 'Matikan Akses HP' : 'Aktifkan Akses HP';
      if (lanBoxActive) lanBoxActive.style.display = lanActive ? 'block' : 'none';
    });
  }

  // Sparkline Bitrate Canvas Monitor
  if (bitrateCanvas) {
    const bCtx = bitrateCanvas.getContext('2d');
    const bW = bitrateCanvas.width;
    const bH = bitrateCanvas.height;
    const points = Array(22).fill(0);

    function drawBitrate() {
      let curVal = 0;
      if (isLiveMode) {
        curVal = Math.round(3520 + (Math.random() - 0.5) * 220);
        if (appBitrateText) appBitrateText.textContent = `${curVal.toLocaleString()} kbps`;
      } else {
        curVal = 0;
      }

      points.push(curVal);
      points.shift();

      bCtx.clearRect(0, 0, bW, bH);

      const maxVal = 4000;
      const stepX = bW / (points.length - 1);

      bCtx.beginPath();
      points.forEach((v, i) => {
        const x = i * stepX;
        const norm = v / maxVal;
        const y = bH - norm * (bH - 6) - 3;
        if (i === 0) bCtx.moveTo(x, y);
        else bCtx.lineTo(x, y);
      });

      bCtx.strokeStyle = isLiveMode ? '#22d3ee' : '#334155';
      bCtx.lineWidth = 1.6;
      bCtx.stroke();
    }

    setInterval(drawBitrate, 650);
  }

  // ------------------------------------------------------------- Interactive Mission Scenarios
  const missionTabs = document.querySelectorAll('.mission-tab');
  const missionPill = document.getElementById('mission-pill');
  const missionTitle = document.getElementById('mission-title');
  const missionDesc = document.getElementById('mission-desc');
  const missionSpecs = document.getElementById('mission-specs');
  const missionImage = document.getElementById('mission-image');
  const missionBadgeText = document.getElementById('mission-badge-text');

  const missionData = {
    wedding: {
      pill: 'WEDDING & LIVE PRODUCTION',
      title: 'Tayangkan Momen Sakral ke LED Wall Ballroom Tanpa Kabel Panjang.',
      desc: 'Sering kali kabel HDMI dari drone ke switcher panggung sangat merepotkan dan berbahaya. Dengan Drone Live Engine, drone menyiarkan langsung lewat Wi-Fi gedung ke laptop switcher Anda. Video langsung masuk ke vMix atau ATEM Mini via RTSP dalam hitungan milidetik.',
      specs: [
        { label: 'Protokol Rekomendasi:', val: 'RTSP / HDMI Output via OBS Fullscreen' },
        { label: 'Latensi ke Layar:', val: '< 1 Detik (Sinkron Audio Panggung)' },
        { label: 'Backup Rekaman:', val: 'fMP4 Master Otomatis di SSD Laptop' }
      ],
      img: 'assets/drone-sawah.jpg',
      badge: 'STATUS: FEED STABIL · ZERO DROPOUT'
    },
    sar: {
      pill: 'SAR & TANGGAP DARURAT BENCANA',
      title: 'Koordinasi Regu Lapangan di Area Blank Spot Tanpa Kuota Cloud.',
      desc: 'Di tengah hutan belantara atau bencana banjir tanpa BTS seluler, Drone Live Engine bekerja dari hotspot portable laptop. Rekaman drone langsung didistribusikan ke 4–8 HP personel regu penyelamat di tenda posko via WebRTC lokal.',
      specs: [
        { label: 'Infrastruktur:', val: '100% Mandiri (Baterai Laptop & Hotspot HP)' },
        { label: 'Akses Personel:', val: 'Browser HP via Kode Pairing 6 Angka' },
        { label: 'Ketahanan File:', val: 'fMP4 Tidak Rusak Saat Drone Low-Bat Jatuh' }
      ],
      img: 'assets/sawah-ngadas.jpg',
      badge: 'STATUS: POSKO TERKONEKSI · WEBRTC AKTIF'
    },
    racing: {
      pill: 'FPV RACING & OLAHRAGA CEPAT',
      title: 'Pantau Manuver Kecepatan Tinggi dengan Latensi Ultra-Rendah <300ms.',
      desc: 'Kru pit stop butuh melihat posisi drone balap secara real-time. Melalui pipeline WebRTC ultra-fast yang tertanam di engine lokal, latensi ditekan hingga mendekati zero delay tanpa lag buffer video.',
      specs: [
        { label: 'Target Latensi:', val: '≈ 260 - 320 Milidetik' },
        { label: 'Dukungan Frame:', val: '60 FPS Smooth Motion' },
        { label: 'Input Jaringan:', val: 'Koneksi Wi-Fi 5GHz / Kabel LAN' }
      ],
      img: 'assets/udara-salju.jpg',
      badge: 'STATUS: PIT STOP MONITORING · 60 FPS'
    },
    broadcast: {
      pill: 'BROADCAST TV & SOCIAL RESTREAM',
      title: 'Siaran Simultan ke YouTube, Facebook & Virtual Cam Zoom / OBS.',
      desc: 'Bebaskan laptop Anda dari beban re-encoding CPU yang berat. Drone Live Engine meneruskan passthrough RTMP langsung ke YouTube dan Facebook secara paralel, sekaligus memunculkan webcam virtual DirectShow untuk panggilan video Zoom.',
      specs: [
        { label: 'Dual Restream:', val: 'YouTube Live + Facebook Bersamaan' },
        { label: 'Webcam Virtual:', val: 'Driver DirectShow Native di Windows' },
        { label: 'Beban CPU:', val: '< 3% (Passthrough Tanpa Re-encode)' }
      ],
      img: 'assets/preview-live.jpg',
      badge: 'STATUS: ON-AIR DUAL STREAM'
    }
  };

  missionTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      playClickSound();
      missionTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const missionKey = tab.getAttribute('data-mission');
      const data = missionData[missionKey];
      if (data) {
        if (missionPill) missionPill.textContent = data.pill;
        if (missionTitle) missionTitle.textContent = data.title;
        if (missionDesc) missionDesc.textContent = data.desc;
        if (missionImage) missionImage.src = data.img;
        if (missionBadgeText) missionBadgeText.textContent = data.badge;

        if (missionSpecs) {
          missionSpecs.innerHTML = data.specs
            .map(
              (s) => `
            <div class="mission-spec-item">
              <span class="spec-label">${s.label}</span>
              <span class="spec-val">${s.val}</span>
            </div>
          `
            )
            .join('');
        }
      }
    });
  });

  // ------------------------------------------------------------- Protocol Matrix & IP Playground
  const customIpInput = document.getElementById('custom-ip-input');
  const presetBtns = document.querySelectorAll('.ip-preset-btn');
  const protoRtmpIn = document.getElementById('proto-rtmp-in');
  const protoWebRtc = document.getElementById('proto-webrtc');
  const protoRtsp = document.getElementById('proto-rtsp');
  const protoHls = document.getElementById('proto-hls');
  const appIpVal = document.getElementById('app-ip-val');
  const linkDji = document.getElementById('link-dji');
  const linkRtsp = document.getElementById('link-rtsp');
  const linkHls = document.getElementById('link-hls');
  const linkWeb = document.getElementById('link-web');

  function syncProtocols(ip) {
    const cleanIp = ip.trim() || '10.220.99.210';
    if (appIpVal) appIpVal.textContent = `Otomatis · ${cleanIp}`;
    if (linkDji) linkDji.value = `rtmp://${cleanIp}:1935/live/drone1`;
    if (linkRtsp) linkRtsp.value = `rtsp://${cleanIp}:8554/live/drone1`;
    if (linkHls) linkHls.value = `http://${cleanIp}:8888/live/drone1/index.m3u8`;
    if (linkWeb) linkWeb.value = `http://${cleanIp}:8889/live/drone1/`;
    if (protoRtmpIn) protoRtmpIn.textContent = `rtmp://${cleanIp}:1935/live/drone1`;
    if (protoWebRtc) protoWebRtc.textContent = `http://${cleanIp}:8889/live/drone1/`;
    if (protoRtsp) protoRtsp.textContent = `rtsp://${cleanIp}:8554/live/drone1`;
    if (protoHls) protoHls.textContent = `http://${cleanIp}:8888/live/drone1/index.m3u8`;
  }

  if (customIpInput) {
    customIpInput.addEventListener('input', (e) => {
      syncProtocols(e.target.value);
      presetBtns.forEach((btn) => btn.classList.remove('active'));
    });
  }

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      playClickSound();
      presetBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const presetIp = btn.getAttribute('data-preset');
      if (customIpInput) customIpInput.value = presetIp;
      syncProtocols(presetIp);
    });
  });

  // ------------------------------------------------------------- Clipboard Copy Action
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playClickSound();
      const targetId = btn.getAttribute('data-copy');
      const targetEl = document.getElementById(targetId);
      const textToCopy = targetEl ? (targetEl.value || targetEl.textContent).trim() : '';

      if (navigator.clipboard && textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          btn.classList.add('copied');
          const oldText = btn.textContent;
          btn.textContent = 'Tersalin!';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = oldText;
          }, 1800);
        });
      }
    });
  });

  // ------------------------------------------------------------- QR Button Toast / Alert
  document.querySelectorAll('[data-qr]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playClickSound();
      const targetId = btn.getAttribute('data-qr');
      const targetEl = document.getElementById(targetId);
      const url = targetEl ? (targetEl.value || targetEl.textContent).trim() : '';
      alert(`Kode QR untuk tautan:

${url}

Tautan siap dipindai dari kamera atau HP kru.`);
    });
  });

  // ------------------------------------------------------------- Drone Compatibility Selector
  const droneModelSelect = document.getElementById('drone-model-select');
  const compatRtmpStatus = document.getElementById('compat-rtmp-status');
  const compatResolution = document.getElementById('compat-resolution');
  const compatLatency = document.getElementById('compat-latency');
  const compatRc = document.getElementById('compat-rc');
  const compatTipBox = document.getElementById('compat-tip-box');

  const droneSpecs = {
    mini4: {
      status: '✓ 100% Didukung Native',
      res: '1080p @ 60 FPS',
      lat: '~260 - 320 ms',
      rc: 'DJI RC 2 / RC-N2 / Smart Controller',
      tip: 'Gunakan frekuensi 5.8 GHz untuk hotspot laptop Anda agar transmisi video drone tidak saling menginterferensi dengan sinyal kendali remote.'
    },
    air3: {
      status: '✓ 100% Didukung Native (Dual Cam)',
      res: '1080p @ 60 FPS',
      lat: '~240 - 300 ms',
      rc: 'DJI RC 2 / RC Pro',
      tip: 'Dukungan penuh perpindahan kamera lensa wide dan tele 3x secara seamless di DJI Fly tanpa memutus stream RTMP.'
    },
    mavic3: {
      status: '✓ 100% Didukung Native (Pro / Cine / 3E)',
      res: '1080p @ 60 FPS (H.264 High)',
      lat: '~220 - 280 ms',
      rc: 'DJI RC Pro / RC-N1 / RC Pro Enterprise',
      tip: 'Kombinasi terbaik untuk transmisi jarak jauh hingga 15 km dengan kestabilan O3+ menuju receiver Wi-Fi laptop.'
    },
    avata2: {
      status: '✓ 100% Didukung (Goggles 3 / 2)',
      res: '1080p @ 60 FPS Ultra-Smooth',
      lat: '~250 - 310 ms',
      rc: 'DJI Goggles 3 Wi-Fi Sharing / FPV RC',
      tip: 'Aktifkan fitur Live Share pada menu Goggles ke alamat RTMP Drone Live Engine untuk penonton di darat.'
    },
    inspire3: {
      status: '✓ 100% Didukung (Cinema Broadcast)',
      res: '1080p @ 60 FPS (Full Bitrate)',
      lat: '~200 - 250 ms',
      rc: 'DJI RC Plus Dual Operator',
      tip: 'Dukungan dual-feed untuk pilot FPV camera dan gimbal camera operator secara bersamaan.'
    },
    matrice: {
      status: '✓ 100% Didukung (Enterprise Mission)',
      res: '1080p @ 60 FPS Thermal & Zoom',
      lat: '~230 - 290 ms',
      rc: 'DJI RC Plus Enterprise',
      tip: 'Sangat cocok untuk tim SAR dan inspeksi tower listrik: feed visual optik dan termal dapat di-relay ke posko.'
    },
    custom: {
      status: '✓ Didukung via RTMP Standar',
      res: 'Menyesuaikan encoder (hingga 1080p60)',
      lat: '~300 - 450 ms',
      rc: 'Aplikasi kontroler bawaan atau HDMI encoder',
      tip: 'Masukkan rtmp://IP:1935/live/drone1 pada kolom Custom RTMP di remote atau hardware video encoder Anda.'
    }
  };

  if (droneModelSelect) {
    droneModelSelect.addEventListener('change', (e) => {
      playClickSound();
      const spec = droneSpecs[e.target.value] || droneSpecs.mini4;
      if (compatRtmpStatus) compatRtmpStatus.textContent = spec.status;
      if (compatResolution) compatResolution.textContent = spec.res;
      if (compatLatency) compatLatency.textContent = spec.lat;
      if (compatRc) compatRc.textContent = spec.rc;
      if (compatTipBox) {
        compatTipBox.innerHTML = `
          <div class="compat-tip-icon">💡</div>
          <div class="compat-tip-text">
            <strong>Rekomendasi Operasional:</strong> ${spec.tip}
          </div>
        `;
      }
    });
  }

  // ------------------------------------------------------------- Latency Benchmark Trigger
  const btnRunLatency = document.getElementById('btn-run-latency-test');
  const barWebRtc = document.getElementById('bar-webrtc');
  const barRtsp = document.getElementById('bar-rtsp');
  const barHls = document.getElementById('bar-hls');

  if (btnRunLatency && barWebRtc && barRtsp && barHls) {
    btnRunLatency.addEventListener('click', () => {
      playChimeSound();
      btnRunLatency.disabled = true;
      btnRunLatency.innerHTML = `<span>Menguji Respons Paket...</span>`;

      barWebRtc.style.width = '0%';
      barRtsp.style.width = '0%';
      barHls.style.width = '0%';

      setTimeout(() => {
        barWebRtc.style.width = '12%';
      }, 200);

      setTimeout(() => {
        barRtsp.style.width = '25%';
      }, 600);

      setTimeout(() => {
        barHls.style.width = '82%';
        btnRunLatency.disabled = false;
        btnRunLatency.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Pengujian Selesai · Ulangi
        `;
      }, 1600);
    });
  }

  // ------------------------------------------------------------- Floating Download Pill on Scroll
  const floatPill = document.getElementById('float-pill');
  if (floatPill) {
    window.addEventListener(
      'scroll',
      () => {
        if (window.scrollY > 450) {
          floatPill.classList.add('visible');
        } else {
          floatPill.classList.remove('visible');
        }
      },
      { passive: true }
    );
  }
})();
