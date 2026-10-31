# Drone Live Engine

**Panduan instalasi dan pengoperasian** — by Oqi

Mesin siaran lokal untuk drone. Aplikasi ini menerima RTMP dari DJI Fly (atau
sumber RTMP lain), merekam ke MP4, meneruskan siaran (restream) ke dua platform
sekaligus, dan menyediakan tautan RTSP/HLS/WebRTC untuk vMix, OBS, Smart TV, dan
browser — semuanya dari satu laptop di jaringan yang sama dengan drone.

**CONTOH:   pernagkat yang digunakan itu ada hp, laptop, remote, dan drone dan softaware nya menggunakan drone live engine ini dan dji fly 
   tahap menghubungkan nya yaitu buka aplikasinya dan menggunakan satu jaringan contoh hp dan laptop menggunakan wifi yang sama 
   atau bisa dengan menggunkan hoshpot pada hp dan laptop terhubung pada hoshpot hp atau konect pada hospot hp 
   setelah dalam satu jaaringan maka aplikasi siapdigunkaan 
   caranya buka DLE (drone live engine) dan buka palikasi DJI Fly masuk ke tampilanvamera 
   lalu masuk transmisi pilih live steaming menggunkan rtmp masukan link rtmp yang terdapat pada DLE di laptop
   DJI Fly RTMP
Tempel di Live Streaming DJI Fly. Bila ada kolom stream key, pakai rtmp://IP:1935/live + drone1.
lalu mulai 

intinya kamu pelajarri sendiri lah gampang kok pengoprasiannya dan ini bisa conet ke 2 drone sekaligus ya 


Tidak ada sistem lisensi, trial, atau kunci aktivasi. Semua fitur langsung terbuka.**

## Mulai cepat

1. Buka **[halaman Releases](https://github.com/oqi-aja/drone-live-engine/releases/latest)**
   dan unduh `Drone Live Engine-<versi>-setup.exe`
   (di GitHub namanya tampil dengan titik, mis. `Drone.Live.Engine-0.1.5-setup.exe`).
2. Jalankan installer dan setujui prompt administrator
   (bila SmartScreen muncul: **More info → Run anyway**).
3. Buka aplikasi, salin tautan **DJI Fly RTMP**, tempel di DJI Fly, lalu mulai
   siaran.

Panduan lengkap ada di bawah ini, dan juga tersedia sebagai `PANDUAN.md` di
folder instalasi.

---

## Daftar isi

1. [Persyaratan](#1-persyaratan)
2. [Instalasi](#2-instalasi)
3. [Menjalankan aplikasi pertama kali](#3-menjalankan-aplikasi-pertama-kali)
4. [Menghubungkan drone (DJI Fly)](#4-menghubungkan-drone-dji-fly)
5. [Rekaman](#5-rekaman)
6. [Restream ke YouTube / Facebook / Instagram](#6-restream-ke-youtube--facebook--instagram)
7. [Menonton siaran: RTSP, HLS, WebRTC](#7-menonton-siaran-rtsp-hls-webrtc)
8. [Kamera virtual untuk vMix / OBS / Zoom](#8-kamera-virtual-untuk-vmix--obs--zoom)
9. [Pengaturan tampilan](#9-pengaturan-tampilan)
10. [Diagnostik dan log](#10-diagnostik-dan-log)
11. [Port yang dipakai](#11-port-yang-dipakai)
12. [Masalah umum dan solusinya](#12-masalah-umum-dan-solusinya)
13. [Update dan uninstall](#13-update-dan-uninstall)
14. [Menjalankan dari source (untuk pengembang)](#14-menjalankan-dari-source-untuk-pengembang)
15. [Keamanan](#15-keamanan)
16. [Lisensi dan kredit](#16-lisensi-dan-kredit)

---

## 1. Persyaratan

| Komponen | Kebutuhan |
| --- | --- |
| Sistem operasi | Windows 10 atau Windows 11, 64-bit |
| Prosesor | Intel/AMD dual-core atau lebih (encoding 720p/1080p) |
| RAM | Minimal 4 GB, disarankan 8 GB |
| Jaringan | Laptop dan HP/RC drone di **jaringan Wi-Fi yang sama** |
| Ruang disk | ± 300 MB untuk aplikasi + ruang untuk rekaman |
| Hak akses | Administrator (hanya saat instalasi dan perbaikan firewall) |

> Aplikasi berjalan penuh secara lokal. Tidak perlu internet untuk menerima
> gambar dari drone, tetapi **restream** ke platform tentu butuh internet.

---

## 2. Instalasi

### 2.1 Mendapatkan installer

**Pengguna umum:** buka halaman **Releases** repositori ini dan unduh berkas
`Drone Live Engine-<versi>-setup.exe`. Berkas ini sudah satu paket — aplikasi,
MediaMTX, FFmpeg, dan relay kamera virtual semuanya ada di dalamnya. Tidak perlu
memasang Node.js atau program lain.

> GitHub mengganti spasi pada nama aset menjadi titik, jadi di halaman Release
> berkasnya terlihat seperti `Drone.Live.Engine-0.1.5-setup.exe`. Isinya sama.

**Dari source:** jalankan `npm run dist`, lalu ambil installer dari folder
`dist\`. (Lihat [bagian 14](#14-menjalankan-dari-source-untuk-pengembang).)

### 2.2 Menjalankan installer

1. Klik dua kali berkas `Drone Live Engine-<versi>-setup.exe`.
2. Jika muncul **Windows protected your PC** (SmartScreen):
   klik **More info** → **Run anyway**. Ini normal untuk aplikasi baru yang
   belum memiliki reputasi di Microsoft.
3. Setujui prompt **User Account Control** (Yes). Installer perlu hak
   administrator untuk menulis aturan Windows Firewall.
4. Pilih folder instalasi (default: `C:\Program Files\Drone Live Engine`),
   lalu lanjutkan sampai **Install** selesai.
5. Centang **Run Drone Live Engine** pada layar terakhir, atau buka lewat
   shortcut Desktop / Start Menu.

### 2.3 Apa yang dilakukan installer

- Menghentikan aplikasi yang sedang berjalan agar port tidak bentrok.
- **Menghapus instalasi versi lama** (termasuk instalasi per-user di
  `%LOCALAPPDATA%\Programs\Drone Live Engine`) supaya tidak ada dua salinan yang
  berebut port 1935.
- Memasang aplikasi untuk semua pengguna Windows (per-machine).
- Menambahkan aturan **Windows Firewall** untuk TCP 1935, 8554, 8888, 8889 dan
  UDP 8189 pada semua profil jaringan (Private, Domain, Public).
- Menyalin MediaMTX, FFmpeg, dan relay kamera virtual ke folder `resources\`.

### 2.4 Jika installer diblokir antivirus

Tambahkan folder instalasi ke daftar pengecualian antivirus, lalu jalankan
installer lagi. Aplikasi ini menjalankan proses lokal (`mediamtx.exe`,
`ffmpeg.exe`) yang kadang ditandai sebagai "PUP" oleh antivirus agresif.

---

## 3. Menjalankan aplikasi pertama kali

1. Buka **Drone Live Engine**. Jendela panel akan muncul setelah 2–5 detik.
2. Perhatikan pill status di kanan atas:
   - **Menyiapkan…** — mesin media sedang dinyalakan.
   - **RTMP siap** — siap menerima siaran dari drone.
   - **RTMP mati / RTMP bermasalah** — ada masalah; buka **Diagnostik**.
3. Periksa **IP Sistem** di bagian atas:
   - Pilihan **Otomatis** memakai IP dari rute default Windows — ini yang benar
     untuk sebagian besar kasus.
   - Adapter yang dipakai diberi tanda **· disarankan**.
   - Adapter VirtualBox/Hyper-V ditandai **virtual**, VPN/Tailscale ditandai **VPN**.
   - Jika IP yang dipilih salah, pilih manual dari daftar. Pilihan disimpan dan
     dipakai lagi saat aplikasi dibuka berikutnya.
   - Tombol ↻ di sebelah daftar untuk mendeteksi ulang IP (misalnya setelah
     berpindah Wi-Fi).
4. Tautan di kartu **Tautan Koneksi** otomatis mengikuti IP yang dipilih.

> Panel kontrol hanya terbuka di laptop ini (`127.0.0.1`) dan dilindungi token
> per sesi. Perangkat lain tidak bisa membuka panel, tetapi tetap bisa mengambil
> siaran lewat port media (RTSP/HLS/WebRTC).

---

## 4. Menghubungkan drone (DJI Fly)

1. Nyalakan drone dan remote, lalu sambungkan HP/RC ke **Wi-Fi yang sama**
   dengan laptop.
2. Di laptop, catat tautan **1. DJI Fly RTMP**, contohnya:

   ```
   rtmp://10.220.99.210:1935/live/drone1
   ```

3. Di DJI Fly buka **Pengaturan Transmisi → Live Streaming → RTMP**.
4. Tempel tautan tersebut.
   - Jika DJI meminta **URL** dan **Stream Key** terpisah:
     - URL: `rtmp://10.220.99.210:1935/live`
     - Stream Key: `drone1`
5. Pilih resolusi (720p disarankan untuk kestabilan), lalu **mulai siaran**.
6. Dalam 1–3 detik:
   - Pratinjau di aplikasi menampilkan gambar drone.
   - Bitrate langsung bergerak dari `0.0 kbps`.
   - Pill status tetap **RTMP siap**, dan kamera `drone1` menyala.

### Drone kedua

Gunakan path berbeda pada remote kedua, misalnya `live/drone2`. Kedua kamera
muncul sebagai chip di atas pratinjau dan bisa dipilih bergantian.

> **Penting:** jika Wi-Fi memakai *client isolation* (umum di Wi-Fi kantor,
> kafe, atau hotel), HP tidak akan pernah bisa menghubungi laptop meski IP dan
> firewall sudah benar. Solusi: aktifkan **hotspot dari HP/RC**, lalu sambungkan
> laptop ke hotspot tersebut, dan pilih IP hotspot di daftar **IP Sistem**.

---

## 5. Rekaman

1. Di kartu **Rekaman**, tekan **Pilih** dan tentukan folder penyimpanan.
2. Tekan **Mulai Rekam**.
3. Status berubah menjadi merah **Merekam**, dan nama berkas muncul di bawah
   tombol.
4. Tekan **Stop Rekam** untuk mengakhiri.

Catatan:

- Format **MP4 fragmen**, sehingga berkas tetap bisa diputar walau koneksi drone
  terputus mendadak atau laptop mati.
- Rekaman mengikuti kamera yang sedang dipilih.
- Nama berkas: `Recording_<stream>_<tanggal>_<jam>.mp4`.
- Folder terakhir diingat untuk sesi berikutnya.

---

## 6. Restream ke YouTube / Facebook / Instagram

Restream meneruskan siaran drone ke platform lain, tanpa perlu OBS.

### 6.1 Mengisi target

1. Di kartu **Restream**, isi **Target 1**:
   - **URL** — alamat RTMP dari platform, misalnya
     `rtmp://a.rtmp.youtube.com/live2`.
   - **Stream key** — kunci siaran dari platform (bukan password akun).
2. **Target 2 (opsional)** bisa diisi platform lain; keduanya berjalan bersamaan.
3. Pilih **Sumber Audio**:
   - **Audio dari stream** — suara asli dari drone (default).
   - **Senyap** — video saja.
   - **Mic …** — menambahkan mikrofon laptop/eksternal.
4. Pilih **Kualitas**:

   | Pilihan | Bitrate | Cocok untuk |
   | --- | --- | --- |
   | HD | ± 3500 kbps | Wi-Fi stabil, 1080p |
   | Seimbang | ± 2200 kbps | 720p, jaringan biasa |
   | Hemat | ± 1500 kbps | Sinyal lemah / kuota terbatas |

5. Tekan **Mulai 1** dan/atau **Mulai 2**.

### 6.2 Mode menunggu drone

Restream **tidak menolak** jika drone belum mengirim gambar. Status akan menjadi
kuning **Menunggu drone**, dan tautan RTMP ditampilkan di kotak di bawah tombol.

Siaran ke platform otomatis dimulai begitu gambar dari drone masuk. Ini urutan
yang disarankan: siapkan restream dulu, baru mulai siaran di DJI Fly.

Selama masih menunggu, mengganti **Kualitas** atau **Sumber Audio** langsung
diterapkan. Jika restream sudah berjalan, perubahan baru berlaku pada restream
berikutnya (muncul pemberitahuan).

### 6.3 Menghentikan

Tekan **Stop** untuk menghentikan semua target sekaligus, atau tekan tombol
**Mulai 1 / Mulai 2** yang sedang aktif untuk mematikan target tersebut saja.

### 6.4 Jika target ditolak

Aplikasi memeriksa apakah server target bisa dihubungi sebelum memulai. Pesan
seperti `Target a.rtmp.youtube.com:1935 tidak dapat dihubungi` berarti:

- laptop tidak terhubung internet,
- URL/port salah, atau
- platform memblokir koneksi (cek stream key dan status akun).

---

## 7. Menonton siaran: RTSP, HLS, WebRTC

Semua tautan ada di kartu **Tautan Koneksi** dan bisa disalin atau ditampilkan
sebagai QR (tombol **QR**) untuk dibuka di perangkat lain.

| Kebutuhan | Protokol | Contoh tautan | Catatan |
| --- | --- | --- | --- |
| vMix / OBS | RTSP | `rtsp://10.220.99.210:8554/live/drone1` | Latensi ± 0,5–2 detik |
| Smart TV / browser | HLS | `http://10.220.99.210:8888/live/drone1/index.m3u8` | Latensi 5–15 detik |
| Browser modern | WebRTC | `http://10.220.99.210:8889/live/drone1` | Latensi terendah |

Di OBS: **Sources → + → Media Source**, matikan *Local File*, tempel tautan RTSP,
lalu OK. Di vMix: **Add Input → Stream → RTSP**.

> HLS butuh beberapa detik untuk mulai. Jika pemutar menolak, coba buka
> tautannya di browser terlebih dahulu.

---

## 8. Kamera virtual untuk vMix / OBS / Zoom

Kamera virtual membuat aplikasi yang hanya mengenal kamera Windows (Zoom, Teams,
Google Meet) bisa memakai siaran drone.

1. Pastikan `dssvcam.exe` ada di folder `resources\` (sudah dipasang installer).
2. Di kartu **Kamera Virtual**, tekan **Nyalakan VCam**.
3. Status berubah menjadi **Aktif**.
4. Di aplikasi tujuan, pilih kamera bernama **Drone Live Engine** / **dssvcam**.

Catatan:

- Kamera virtual memakai CPU tambahan karena harus mengubah frame terus-menerus.
- Jika gagal, aplikasi mencoba ulang otomatis dengan jeda yang makin panjang;
  pesan kesalahan ditampilkan di kartu tersebut.
- Matikan VCam bila tidak dipakai.

---

## 9. Pengaturan tampilan

- **ID / EN** — ganti bahasa antarmuka (Indonesia/Inggris).
- Ikon bulan/matahari — tema gelap/terang.
- **Pratinjau Langsung** — chip kamera (`drone1`, `drone2`) untuk memilih sumber.
- Watermark/logo pada pratinjau hanya tampilan, tidak memengaruhi rekaman atau
  restream.
- Semua pengaturan (IP, folder rekaman, URL target, kualitas, audio, bahasa,
  tema) disimpan otomatis dan dipakai lagi saat aplikasi dibuka.

---

## 10. Diagnostik dan log

Klik ikon garis detak di kanan atas untuk membuka **Diagnostik**:

- **IP terpilih** dan rute default.
- **Adapter jaringan** beserta tanda virtual/VPN.
- **Aturan firewall** (aktif/tidak) dan status port (terbuka/tertutup).
- **Biner** yang ditemukan (`mediamtx`, `ffmpeg`, `dssvcam`).
- Jumlah stream aktif dan lokasi berkas log.

Tombol di dalamnya:

- **Perbaiki Firewall** — menambahkan aturan yang hilang (butuh izin admin).
- **Buka Log** — membuka folder log.
- **Muat Ulang** — menyegarkan data.

Berkas log:

```
%APPDATA%\drone-live-engine\logs\app.log
```

Log berputar otomatis pada 2 MB (`app.log.1`). Sertakan berkas ini saat
melaporkan masalah koneksi.

---

## 11. Port yang dipakai

| Fungsi | Port | Protokol | Terbuka ke |
| --- | --- | --- | --- |
| RTMP (ingest drone) | 1935 | TCP | LAN |
| RTSP | 8554 | TCP | LAN |
| HLS | 8888 | TCP | LAN |
| WebRTC | 8889 | TCP | LAN |
| WebRTC ICE | 8189 | UDP | LAN |
| API MediaMTX | 9997 | TCP | Hanya `127.0.0.1` |
| Panel kontrol | 3000 (otomatis) | TCP | Hanya `127.0.0.1` |
| Relay kamera virtual | 16666 | TCP | Hanya `127.0.0.1` |

Jika port 1935 dipakai aplikasi lain, tutup aplikasi tersebut — port ini tidak
bisa diganti tanpa mengubah konfigurasi.

---

## 12. Masalah umum dan solusinya

| Gejala | Penyebab umum | Solusi |
| --- | --- | --- |
| DJI Fly gagal tersambung / "connection failed" | Firewall memblokir, IP salah, atau client isolation | Buka **Diagnostik** → **Perbaiki Firewall**; pastikan IP Sistem satu jaringan dengan drone; coba hotspot HP |
| Pratinjau tetap "Menunggu sinyal drone…" | Siaran di DJI Fly belum dimulai, atau URL salah | Mulai live streaming di DJI Fly; cocokkan URL persis (`live/drone1`) |
| Bitrate `0.0 kbps` padahal siaran jalan | Drone mengirim ke IP lain | Cek **IP Sistem**, pilih IP yang benar, lalu salin ulang tautan |
| Status **RTMP mati** | Port 1935 dipakai aplikasi lain | Tutup aplikasi tersebut, lalu buka ulang Drone Live Engine |
| Restream langsung berhenti | Stream key salah / internet putus | Cek pesan error di kartu Restream, uji internet, pastikan stream key benar |
| Video restream tersendat | Bitrate terlalu tinggi untuk jaringan | Pilih kualitas **Seimbang** atau **Hemat** |
| Penonton HLS lambat | Sifat protokol HLS | Gunakan WebRTC untuk latensi rendah |
| VCam tidak muncul di Zoom/OBS | `dssvcam.exe` tidak ada atau gagal start | Cek **Diagnostik** → Biner; nyalakan ulang VCam; restart aplikasi tujuan |
| Laptop tidak bisa diakses perangkat lain | Jaringan tamu / AP isolation | Gunakan hotspot dari HP/RC |
| Aplikasi tidak mau terbuka | Instance lama masih berjalan | Tutup lewat Task Manager, lalu buka lagi |

Jika masalah berlanjut, kirimkan `app.log` beserta tangkapan layar panel
**Diagnostik**.

---

## 13. Update dan uninstall

### Update

1. Tutup aplikasi.
2. Jalankan installer versi baru.
3. Installer menghapus versi lama secara otomatis (pengaturan di
   `%APPDATA%\drone-live-engine` tetap dipertahankan).
4. Buka aplikasi dan pastikan nomor versi di **Diagnostik** sudah berubah.

### Uninstall

- **Settings → Apps → Installed apps → Drone Live Engine → Uninstall**, atau
- jalankan `Uninstall Drone Live Engine.exe` di folder instalasi.

Untuk menghapus sisa data (log dan pengaturan):

```
%APPDATA%\drone-live-engine
```

Aturan firewall yang dibuat installer akan dihapus saat uninstall.

---

## 14. Menjalankan dari source (untuk pengembang)

Prasyarat: Node.js 18+ dan biner pihak ketiga di folder `resources/`.

```
resources/
  mediamtx.exe
  mediamtx.yml
  ffmpeg.exe
  dssvcam.exe     (opsional, untuk kamera virtual)
```

Biner tidak disertakan di repositori. Unduh dari rilis resmi:

- MediaMTX — <https://github.com/bluenviron/mediamtx/releases>
- FFmpeg — <https://www.gyan.dev/ffmpeg/builds/> (build `essentials`)

Perintah:

```powershell
npm install
npm start          # menjalankan aplikasi
npm run dev        # aplikasi + DevTools
npm run check      # cek sintaks dan referensi elemen
npm run dist       # membuat installer NSIS di folder dist/
```

Struktur proyek:

```
src/
  main.js      bootstrap Electron, window, lifecycle
  server.js    Express panel + API + autentikasi token
  engine.js    orkestrasi MediaMTX, FFmpeg, dan relay kamera virtual
  network.js   deteksi IP LAN lewat rute default + pemilihan adapter
  firewall.js  pemeriksaan dan perbaikan aturan Windows Firewall
  logger.js    log konsol + berkas (rotasi 2 MB)
  config.js    branding, port, profil kualitas
  util.js      validasi path/URL dan helper
renderer/      UI (HTML/CSS/JS tanpa framework, tanpa CDN)
resources/     mediamtx.yml + biner pihak ketiga
installer/     aturan firewall NSIS
scripts/       pemeriksaan sintaks dan referensi DOM
```

Konfigurasi utama ada di `src/config.js` (branding, port, profil kualitas,
resolusi kamera virtual). Jika port diubah, sesuaikan juga
`resources/mediamtx.yml`.

---

## 15. Keamanan

- Panel kontrol hanya mendengarkan di `127.0.0.1` dan memakai token acak per
  sesi (cookie `HttpOnly`, `SameSite=Strict`).
- Setiap permintaan divalidasi terhadap `Host` dan `Origin` untuk mencegah DNS
  rebinding dan CSRF.
- Renderer berjalan dengan `contextIsolation: true`, `nodeIntegration: false`,
  dan `sandbox: true`.
- Nama stream dan URL target divalidasi; hanya skema yang diizinkan yang
  diteruskan ke FFmpeg.
- Port media (RTMP/RTSP/HLS/WebRTC) memang terbuka ke LAN agar perangkat lain
  bisa menonton. Jangan jalankan di jaringan yang tidak dipercaya tanpa aturan
  firewall tambahan.

---

## 16. Lisensi dan kredit

MIT — bebas dipakai, dimodifikasi, dan didistribusikan. Tidak ada kunci
aktivasi dan tidak ada pembatasan jumlah perangkat.

Dibuat dan dipelihara oleh **Oqi**.

Biner pihak ketiga mengikuti lisensi masing-masing:

- MediaMTX — MIT
- FFmpeg — LGPL/GPL (sesuai build)
- dssvcam — sesuai lisensi pembuatnya
- 
**[DOWNLOAD DISINI](https://github.com/oqi-aja/drone-live-engine/releases/latest)**

---


© 2026 Oqi
