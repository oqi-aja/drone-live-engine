; Aturan firewall untuk port media dan biner yang dipaketkan.
; Installer per-machine berjalan dengan hak administrator, jadi netsh di sini
; benar-benar diterapkan (instalasi per-user sebelumnya gagal diam-diam).
; Tidak ada registrasi komponen berlisensi di sini.

!macro DleDeleteFirewallRules
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Drone Live Engine RTMP"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Drone Live Engine RTSP"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Drone Live Engine HLS"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Drone Live Engine WebRTC"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Drone Live Engine WebRTC UDP"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Drone Live Engine Panel"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Drone Live Engine app"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Drone Live Engine mediamtx.exe"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Drone Live Engine ffmpeg.exe"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Drone Live Engine dssvcam.exe"'
!macroend

!macro DleAddFirewallRules
  ; profile=any supaya tetap berlaku saat jaringan Wi-Fi berstatus "Public",
  ; yang merupakan penyebab umum RTMP dari DJI Fly ditolak Windows.
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Drone Live Engine RTMP" dir=in action=allow protocol=TCP localport=1935 profile=any enable=yes'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Drone Live Engine RTSP" dir=in action=allow protocol=TCP localport=8554 profile=any enable=yes'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Drone Live Engine HLS" dir=in action=allow protocol=TCP localport=8888 profile=any enable=yes'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Drone Live Engine WebRTC" dir=in action=allow protocol=TCP localport=8889 profile=any enable=yes'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Drone Live Engine WebRTC UDP" dir=in action=allow protocol=UDP localport=8189 profile=any enable=yes'

  ; Panel kontrol tetap loopback sampai "Akses dari HP" dinyalakan. Aturan ini
  ; hanya membuka jalan saat pengguna memilihnya; tanpa aturan ini Windows
  ; diam-diam memblokir port panel di jaringan.
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Drone Live Engine Panel" dir=in action=allow protocol=TCP localport=3000 profile=any enable=yes'
  IfFileExists "$INSTDIR\Drone Live Engine.exe" 0 DleSkipApp
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Drone Live Engine app" dir=in action=allow program="$INSTDIR\Drone Live Engine.exe" profile=any enable=yes'
  DleSkipApp:

  IfFileExists "$INSTDIR\resources\mediamtx.exe" 0 DleSkipMtx
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Drone Live Engine mediamtx.exe" dir=in action=allow program="$INSTDIR\resources\mediamtx.exe" profile=any enable=yes'
  DleSkipMtx:
  IfFileExists "$INSTDIR\resources\ffmpeg.exe" 0 DleSkipFfmpeg
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Drone Live Engine ffmpeg.exe" dir=in action=allow program="$INSTDIR\resources\ffmpeg.exe" profile=any enable=yes'
  DleSkipFfmpeg:
  IfFileExists "$INSTDIR\resources\dssvcam.exe" 0 DleSkipVcam
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Drone Live Engine dssvcam.exe" dir=in action=allow program="$INSTDIR\resources\dssvcam.exe" profile=any enable=yes'
  DleSkipVcam:
!macroend

!macro customInit
  ; Hentikan versi yang sedang berjalan supaya port 1935 tidak bentrok dan
  ; supaya kunci single-instance tidak menahan peluncuran versi baru.
  nsExec::ExecToLog 'taskkill /IM "Drone Live Engine.exe" /F'

  ; Versi 0.1.0 diinstal per-user. Hapus dulu agar tidak ada dua salinan
  ; dengan nama sama yang berebut port dan kunci instance.
  IfFileExists "$LOCALAPPDATA\Programs\Drone Live Engine\Uninstall Drone Live Engine.exe" 0 DleNoOldInstall
  DetailPrint "Menghapus instalasi per-user versi lama..."
  ExecWait '"$LOCALAPPDATA\Programs\Drone Live Engine\Uninstall Drone Live Engine.exe" /S'
  DleNoOldInstall:
!macroend

!macro customInstall
  DetailPrint "Menambahkan aturan firewall Drone Live Engine..."
  !insertmacro DleDeleteFirewallRules
  !insertmacro DleAddFirewallRules
  DetailPrint "Aturan firewall selesai."
!macroend

!macro customUnInstall
  DetailPrint "Menghapus aturan firewall Drone Live Engine..."
  !insertmacro DleDeleteFirewallRules
!macroend
