/* Drone Live Engine — situs promosi: gerakan + interaksi kecil.
   Tanpa framework. Semua efek punya fallback tanpa JS. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- entrance: judul, teks, gambar masuk bergilir per bagian ---- */
  var targets = document.querySelectorAll(
    '.hero-col, .hero-demo, .how-field, .show-in, .show-out, .show-head, ' +
    '.feat-title, .feat-panel, .feat-note, .stat-head, .stat-bar, .faq details, .cta-title, .cta-btn, .cta-note'
  );
  var stagger = 0;
  targets.forEach(function (el) {
    el.classList.add('rise');
    if (el.classList.contains('feat-note') || el.classList.contains('stat-bar')) {
      el.style.setProperty('--d', stagger * 70 + 'ms');
      stagger = (stagger + 1) % 4;
    }
  });
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- live thing: tombol salin tautan RTMP ---- */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-goto') ||
        (document.getElementById(btn.getAttribute('data-copy')) || {}).textContent || '';
      var done = function () {
        btn.classList.add('is-copied');
        var old = btn.textContent;
        btn.textContent = 'Tersalin';
        setTimeout(function () {
          btn.classList.remove('is-copied');
          btn.textContent = old;
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { /* abaikan */ });
      }
    });
  });

  /* ---- showcase: host yang diketik mengubah keluaran di kanan ---- */
  var host = document.getElementById('show-host');
  if (host) {
    var out = function (id, text) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    var sync = function () {
      var h = host.value.trim() || '10.220.99.210';
      out('out-rtsp', 'rtsp://' + h + ':8554/live/drone1');
      out('out-hls', 'http://' + h + ':8888/live/drone1/index.m3u8');
      out('out-webrtc', 'http://' + h + ':8889/live/drone1');    };
    host.addEventListener('input', sync);
  }

  /* ---- signature move: pratinjau crossfade "menunggu" <-> "hidup" ---- */
  var preview = document.querySelector('.fp-preview');
  if (preview && !reduced) {
    var imgs = preview.querySelectorAll('.fp-img');
    var wait = preview.querySelector('.fp-wait');
    var live = false;
    setInterval(function () {
      live = !live;
      imgs[0].classList.toggle('is-on', !live);
      imgs[1].classList.toggle('is-on', live);
      if (wait) wait.style.opacity = live ? '0' : '1';
      var a = preview.querySelector('.fp-camera-a');
      if (a) a.textContent = live ? '● drone1 · hidup' : '● drone1';
    }, 5200);
    if (wait) wait.style.transition = 'opacity 1600ms ease';
  }
  if (preview && reduced) {
    var w = preview.querySelector('.fp-wait');
    if (w) w.style.display = 'none';
  }
})();
