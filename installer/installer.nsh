; Aturan firewall untuk port media dan biner yang dipaketkan.
!include "x64.nsh"

; Installer per-machine berjalan dengan hak administrator, jadi netsh dan
; regsvr32 di sini benar-benar diterapkan (instalasi per-user sebelumnya
; gagal diam-diam).
;
; Registrasi kamera virtual memakai filter DirectShow UnityCapture
; (UnityCaptureFilter32/64.dll — MIT (c) 2018 Bernhard Schelling, diadaptasi
; dari UnityCam (c) 2016 MHD Yamen Saraiji). Tanpa pendaftaran ini OBS,
; vMix, dan browser (semuanya 64-bit) tidak akan melihat kamera "Drone Live
; Engine".

; Parameter /i:UnityCaptureName= mengatur nama (FriendlyName) kamera yang
; akan terlihat di OBS/vMix/Zoom, dan sekaligus menggantikan registrasi lama
; "DSS Camera" yang menunjuk ke DLL milik produk lain yang tidak ada.

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

; Mendaftarkan filter DirectShow kamera virtual untuk kedua arsitektur.
; Beberapa aplikasi (OBS Studio, vMix, Chrome) hanya membaca registry 64-bit,
; yang lain 32-bit, jadi dua-duanya wajib. regsvr32 yang dipakai harus
; arsitekturnya sendiri: System32 = 64-bit, SysWOW64 = 32-bit.
!macro DleRegisterVcamFilter
  IfFileExists "$INSTDIR\resources\UnityCaptureFilter64.dll" 0 DleSkipVcam64
  DetailPrint "Mendaftarkan kamera virtual (64-bit): Drone Live Engine"
  nsExec::ExecToLog '"$WINDIR\System32\regsvr32.exe" /s "/i:UnityCaptureName=Drone Live Engine" "$INSTDIR\resources\UnityCaptureFilter64.dll"'
  DleSkipVcam64:
  IfFileExists "$INSTDIR\resources\UnityCaptureFilter32.dll" 0 DleSkipVcam32
  DetailPrint "Mendaftarkan kamera virtual (32-bit): Drone Live Engine"
  nsExec::ExecToLog '"$WINDIR\SysWOW64\regsvr32.exe" /s "/i:UnityCaptureName=Drone Live Engine" "$INSTDIR\resources\UnityCaptureFilter32.dll"'
  DleSkipVcam32:
!macroend

; Pembatalan registrasi menjalankan regsvr32 /u bila DLL masih ada.
!macro DleUnregisterVcamFilter
  IfFileExists "$INSTDIR\resources\UnityCaptureFilter64.dll" 0 DleSkipUnVcam64
  nsExec::ExecToLog '"$WINDIR\System32\regsvr32.exe" /u /s "/i:UnityCaptureName=Drone Live Engine" "$INSTDIR\resources\UnityCaptureFilter64.dll"'
  DleSkipUnVcam64:
  IfFileExists "$INSTDIR\resources\UnityCaptureFilter32.dll" 0 DleSkipUnVcam32
  nsExec::ExecToLog '"$WINDIR\SysWOW64\regsvr32.exe" /u /s "/i:UnityCaptureName=Drone Live Engine" "$INSTDIR\resources\UnityCaptureFilter32.dll"'
  DleSkipUnVcam32:
!macroend

; Hapus sisa kunci registry kamera virtual (baik milik kita maupun registrasi
; "DSS Camera" lama yang menunjuk ke DLL yang tidak ada pada mesin ini).
!macro DleVcamRegCleanup
  ${If} ${IsWin64}
    DeleteRegKey HKLM "SOFTWARE\Classes\CLSID\{5C2CD55C-92AD-4999-8666-912BD3E70010}"
    DeleteRegKey HKLM "SOFTWARE\Classes\CLSID\{5C2CD55C-92AD-4999-8666-912BD3E70011}"
    DeleteRegKey HKLM "SOFTWARE\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\{5C2CD55C-92AD-4999-8666-912BD3E70010}"
    DeleteRegKey HKLM "SOFTWARE\Classes\Wow6432Node\CLSID\{5C2CD55C-92AD-4999-8666-912BD3E70020}"
    DeleteRegKey HKLM "SOFTWARE\Classes\Wow6432Node\CLSID\{5C2CD55C-92AD-4999-8666-912BD3E70021}"
    DeleteRegKey HKLM "SOFTWARE\Classes\Wow6432Node\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\{5C2CD55C-92AD-4999-8666-912BD3E70020}"
  ${Else}
    DeleteRegKey HKLM "SOFTWARE\Classes\CLSID\{5C2CD55C-92AD-4999-8666-912BD3E70020}"
    DeleteRegKey HKLM "SOFTWARE\Classes\CLSID\{5C2CD55C-92AD-4999-8666-912BD3E70021}"
    DeleteRegKey HKLM "SOFTWARE\Classes\CLSID\{860BB310-5D01-11d0-BD3B-00A0C911CE86}\Instance\{5C2CD55C-92AD-4999-8666-912BD3E70020}"
  ${EndIf}
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
  !insertmacro DleRegisterVcamFilter
!macroend

!macro customRemoveFiles
  ; Dilepas di sini karena DLL harus masih ada agar regsvr32 /u berhasil
  ; (macro ini dijalankan sebelum berkas dihapus).
  !insertmacro DleUnregisterVcamFilter
!macroend

!macro customUnInstall
  ; Bersihkan sisa kunci registry bila DLL sudah terhapus lebih dulu.
  !insertmacro DleVcamRegCleanup
  DetailPrint "Menghapus aturan firewall Drone Live Engine..."
  !insertmacro DleDeleteFirewallRules
!macroend
