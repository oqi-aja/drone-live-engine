'use strict';

/**
 * Halaman pairing di HP. Tidak memakai app.js karena halaman ini harus bisa
 * dibuka sebelum ada sesi sama sekali.
 */
(function () {
  const input = document.getElementById('code');
  const button = document.getElementById('pair-btn');
  const errorBox = document.getElementById('pair-error');

  function deviceName() {
    const ua = navigator.userAgent || '';
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android';
    return 'Perangkat';
  }

  function setError(message, kind) {
    errorBox.textContent = message || '';
    errorBox.className = kind === 'ok' ? 'error ok' : 'error';
  }

  function digits() {
    return String(input.value || '').replace(/\D/g, '').slice(0, 6);
  }

  function sync() {
    const value = digits();
    if (input.value !== value) input.value = value;
    button.disabled = value.length !== 6;
  }

  async function submit() {
    const code = digits();
    if (code.length !== 6) return;

    button.disabled = true;
    button.textContent = 'Menghubungkan…';
    setError('');

    try {
      const response = await fetch('/api/pair', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: deviceName() }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setError('Berhasil. Membuka panel…', 'ok');
      window.location.replace('/m');
    } catch (error) {
      setError(error.message || 'Gagal menghubungkan');
      button.disabled = false;
      button.textContent = 'Hubungkan';
      input.select();
    }
  }

  input.addEventListener('input', sync);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submit();
  });
  button.addEventListener('click', submit);

  const fromHash = String(window.location.hash || '').replace(/[^0-9]/g, '').slice(0, 6);
  if (fromHash) {
    input.value = fromHash;
    history.replaceState(null, '', window.location.pathname);
  }
  sync();
  input.focus();
})();
