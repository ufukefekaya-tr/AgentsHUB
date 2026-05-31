@echo off
chcp 65001 >nul
title AgentsHUB V2.0 — Başlatılıyor...
color 0B

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║         AgentsHUB V2.0.0-beta                ║
echo  ║         Sistem hazırlanıyor...               ║
echo  ╚══════════════════════════════════════════════╝
echo.

set "ROOT=%~dp0"
set "NODE_EXE=%ROOT%node\node.exe"
set "APP_DIR=%ROOT%app"
set "NODE_MODULES=%APP_DIR%\node_modules"
set "LAUNCHER=%ROOT%launcher.mjs"

:: ─── ADIM 1: Node.js Kontrolü ───────────────────────
echo  [1/3] Node.js kontrol ediliyor...

if exist "%NODE_EXE%" (
    echo        Paket ici Node.js bulundu.
    goto :check_modules
)

:: Sistem Node.js var mı?
where node >nul 2>&1
if %errorlevel%==0 (
    set "NODE_EXE=node"
    echo        Sistem Node.js bulundu.
    goto :check_modules
)

:: Node.js yok — otomatik indir
echo        Node.js bulunamadi. Indiriliyor...
echo.
mkdir "%ROOT%node" 2>nul

:: PowerShell ile Node.js portable indir
powershell -ExecutionPolicy Bypass -Command ^
  "$url='https://nodejs.org/dist/v20.18.3/node-v20.18.3-win-x64.zip'; " ^
  "$zip='%ROOT%node\node.zip'; " ^
  "$ProgressPreference='SilentlyContinue'; " ^
  "Write-Host '        Indiriliyor: Node.js v20.18.3 (~30MB)...'; " ^
  "Invoke-WebRequest -Uri $url -OutFile $zip; " ^
  "Write-Host '        Cikariliyor...'; " ^
  "Expand-Archive -Path $zip -DestinationPath '%ROOT%node\temp' -Force; " ^
  "Copy-Item '%ROOT%node\temp\node-v20.18.3-win-x64\node.exe' '%ROOT%node\node.exe' -Force; " ^
  "Copy-Item -Recurse '%ROOT%node\temp\node-v20.18.3-win-x64\node_modules' '%ROOT%node\node_modules' -Force -ErrorAction SilentlyContinue; " ^
  "$npmDir='%ROOT%node\temp\node-v20.18.3-win-x64'; " ^
  "if(Test-Path \"$npmDir\npm.cmd\"){Copy-Item \"$npmDir\npm.cmd\" '%ROOT%node\npm.cmd' -Force}; " ^
  "if(Test-Path \"$npmDir\npx.cmd\"){Copy-Item \"$npmDir\npx.cmd\" '%ROOT%node\npx.cmd' -Force}; " ^
  "Remove-Item $zip -Force; " ^
  "Remove-Item '%ROOT%node\temp' -Recurse -Force; " ^
  "Write-Host '        Node.js kuruldu!'"

if not exist "%NODE_EXE%" (
    echo.
    echo  [HATA] Node.js indirilemedi.
    echo         Lutfen https://nodejs.org adresinden manuel kurun.
    pause
    exit /b 1
)

:: ─── ADIM 2: Bağımlılık Kontrolü ────────────────────
:check_modules
echo  [2/3] Bagimliliklar kontrol ediliyor...

if exist "%NODE_MODULES%\express" (
    echo        node_modules hazir.
    goto :start_app
)

echo        Bagimliliklar kuruluyor (ilk seferde ~2 dk)...
echo.

:: npm PATH'e ekle
set "PATH=%ROOT%node;%ROOT%node\node_modules\.bin;%PATH%"

pushd "%APP_DIR%"
"%NODE_EXE%" -e "const{execSync}=require('child_process');try{execSync('npm install --production',{stdio:'inherit',cwd:'%APP_DIR:\=\\%'})}catch(e){console.error(e.message)}"
popd

if not exist "%NODE_MODULES%\express" (
    echo.
    echo  [HATA] Bagimliliklar kurulamadi.
    echo         Manuel deneyin: cd app ^&^& npm install
    pause
    exit /b 1
)

echo        Bagimliliklar kuruldu!

:: ─── ADIM 3: Başlat ─────────────────────────────────
:start_app
echo  [3/3] AgentsHUB baslatiliyor...
echo.

:: .env yoksa oluştur
if not exist "%APP_DIR%\.env" (
    if exist "%APP_DIR%\.env.example" (
        copy "%APP_DIR%\.env.example" "%APP_DIR%\.env" >nul
        echo        .env dosyasi olusturuldu.
    )
)

echo  ══════════════════════════════════════════════════
echo   AgentsHUB aciliyor: http://localhost:3434
echo   Kapatmak icin bu pencereyi kapatin.
echo  ══════════════════════════════════════════════════
echo.

"%NODE_EXE%" "%LAUNCHER%"

if %errorlevel% neq 0 (
    echo.
    echo  [HATA] AgentsHUB baslatilamadi.
    pause
)
