<#
.SYNOPSIS
    AgentsHUB V2.0 Beta — Otomatik Kurulum Scripti
    
.DESCRIPTION
    Bu script, AgentsHUB platformunu yeni bir Windows makinesine kurar.
    
    Çalıştırma:
        1. PowerShell'i YÖNETICI OLARAK açın
        2. Set-ExecutionPolicy Bypass -Scope Process -Force
        3. .\INSTALL.ps1

.NOTES
    Platform: AgentsHUB V2.0.0-beta
    Kuruluş: EHARTE Ltd. Şti.
    Lisans: MIT
#>

[CmdletBinding()]
param(
    [switch]$SkipNpm,
    [switch]$Force,
    [string]$InstallDir = "C:\AgentsHUB"
)

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"
$VERSION = "2.0.0-beta"

# ── RENK YARDIMCILARI ──────────────────────────────────────────
function Write-Banner { param($m) Write-Host $m -ForegroundColor Magenta }
function Write-Step   { param($m) Write-Host "  [*] $m" -ForegroundColor Cyan }
function Write-OK     { param($m) Write-Host "  [+] $m" -ForegroundColor Green }
function Write-Warn   { param($m) Write-Host "  [!] $m" -ForegroundColor Yellow }
function Write-Fail   { param($m) Write-Host "  [-] $m" -ForegroundColor Red }

function Test-Admin {
    $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$TIMESTAMP  = Get-Date -Format "yyyyMMdd_HHmmss"
$LOG_FILE   = Join-Path $SCRIPT_DIR "install_log_$TIMESTAMP.txt"

function Write-Log {
    param($m)
    $entry = "[$(Get-Date -Format 'HH:mm:ss')] $m"
    Add-Content -Path $LOG_FILE -Value $entry -ErrorAction SilentlyContinue
}

# ── BANNER ──────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Banner "  ╔══════════════════════════════════════════════════════════╗"
Write-Banner "  ║                                                        ║"
Write-Banner "  ║     █████╗  ██████╗ ███████╗███╗   ██╗████████╗       ║"
Write-Banner "  ║    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝       ║"
Write-Banner "  ║    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║          ║"
Write-Banner "  ║    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║          ║"
Write-Banner "  ║    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║          ║"
Write-Banner "  ║    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝          ║"
Write-Banner "  ║              H U B   v$VERSION                        ║"
Write-Banner "  ║                                                        ║"
Write-Banner "  ╚══════════════════════════════════════════════════════════╝"
Write-Host ""
Write-Host "  AgentsHUB Installer v$VERSION" -ForegroundColor White
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 0: ÖN KONTROLLER
# ══════════════════════════════════════════════════════════════════
Write-Host "  ─── FAZ 0: ÖN KONTROLLER ────────────────────────────" -ForegroundColor DarkCyan

# Yönetici kontrolü
Write-Step "Yönetici yetkileri kontrol ediliyor..."
if (-not (Test-Admin)) {
    Write-Warn "Yönetici olarak çalıştırılmadı. Bazı işlemler başarısız olabilir."
    Write-Log "WARN: Yönetici yetkisi yok"
} else {
    Write-OK "Yönetici yetkisi mevcut."
}

# Disk alanı kontrolü
Write-Step "Disk alanı kontrol ediliyor..."
$driveLetter = $InstallDir.Substring(0, 1)
$drive = Get-PSDrive $driveLetter -ErrorAction SilentlyContinue
if ($drive -and $drive.Free) {
    $freeGB = [math]::Round($drive.Free / 1GB, 1)
    if ($freeGB -lt 1) {
        Write-Fail "HATA: $($driveLetter): diskinde yeterli alan yok ($freeGB GB). En az 1 GB gerekli."
        exit 1
    }
    Write-OK "$($driveLetter): diskinde $freeGB GB boş alan var."
} else {
    Write-Warn "Disk alanı kontrol edilemedi, devam ediliyor."
}

# Node.js kontrolü
Write-Step "Node.js kontrol ediliyor..."
$bundledNode = Join-Path $SCRIPT_DIR "node\node.exe"
$nodeExe = $null
if (Test-Path $bundledNode) {
    $nodeVersion = & $bundledNode --version 2>$null
    Write-OK "Paket içi Node.js: $nodeVersion"
    $nodeExe = $bundledNode
} else {
    try {
        $nodeVersion = & node --version 2>$null
        Write-OK "Sistem Node.js: $nodeVersion"
        $nodeExe = "node"
    } catch {
        Write-Fail "HATA: Node.js bulunamadı."
        Write-Host ""
        Write-Host "  Node.js kurulumu gerekiyor: https://nodejs.org" -ForegroundColor Yellow
        Write-Host "  v18 veya üzeri önerilir." -ForegroundColor DarkGray
        exit 1
    }
}

# npm kontrolü
Write-Step "npm kontrol ediliyor..."
try {
    $npmVersion = & npm --version 2>$null
    Write-OK "npm: v$npmVersion"
} catch {
    Write-Fail "npm bulunamadı. Node.js kurulumunuzu kontrol edin."
    exit 1
}

Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 1: DOSYA KURULUMU
# ══════════════════════════════════════════════════════════════════
Write-Host "  ─── FAZ 1: DOSYA KURULUMU ───────────────────────────" -ForegroundColor DarkCyan

# Script kendi içinden mi çalışıyor?
$isRunningFromInstall = (Test-Path (Join-Path $SCRIPT_DIR "app\package.json"))

if ($isRunningFromInstall) {
    # Script proje klasörünün içinde — doğrudan kullan
    if ($SCRIPT_DIR -ne $InstallDir) {
        Write-Step "Proje dosyaları kopyalanıyor → $InstallDir"
        
        if (Test-Path $InstallDir) {
            if (-not $Force) {
                Write-Host ""
                Write-Host "  Mevcut kurulum tespit edildi: $InstallDir" -ForegroundColor Yellow
                Write-Host "  [1] Yedekle ve devam et (önerilen)" -ForegroundColor White
                Write-Host "  [2] Üzerine yaz" -ForegroundColor White
                Write-Host "  [3] İptal et" -ForegroundColor White
                Write-Host ""
                $choice = Read-Host "  Seçiminiz (1/2/3)"
                switch ($choice) {
                    "1" {
                        $backupPath = "${InstallDir}_BACKUP_$TIMESTAMP"
                        Write-Step "Yedekleniyor → $backupPath"
                        Rename-Item -Path $InstallDir -NewName $backupPath -Force
                        Write-OK "Yedekleme tamamlandı."
                    }
                    "2" {
                        Write-Step "Mevcut kurulum siliniyor..."
                        Remove-Item -Path $InstallDir -Recurse -Force
                    }
                    "3" {
                        Write-Host "  Kurulum iptal edildi." -ForegroundColor Yellow
                        exit 0
                    }
                    default {
                        $backupPath = "${InstallDir}_BACKUP_$TIMESTAMP"
                        Write-Step "Varsayılan: Yedekleniyor..."
                        Rename-Item -Path $InstallDir -NewName $backupPath -Force
                    }
                }
            }
        }
        
        # Kopyala (node_modules, .git, sqlite hariç)
        $excludeDirs = @("node_modules", ".git", "Chats", "cron_logs", "cron_output", "Workspace")
        $excludeExts = @(".sqlite", ".sqlite-journal", ".log")
        
        robocopy $SCRIPT_DIR $InstallDir /MIR /XD $excludeDirs /XF *.sqlite *.sqlite-journal *.log .env /NFL /NDL /NJH /NJS /NP | Out-Null
        Write-OK "Dosyalar kopyalandı."
    } else {
        Write-OK "Script zaten hedef dizinde çalışıyor."
    }
} else {
    Write-Fail "HATA: Proje dosyaları bulunamadı."
    Write-Host "  INSTALL.ps1 dosyasını AgentsHUB proje klasörünün içine koyun." -ForegroundColor Yellow
    exit 1
}

Write-Log "Proje kuruldu: $InstallDir"
Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 2: BAĞIMLILIK KURULUMU
# ══════════════════════════════════════════════════════════════════
Write-Host "  ─── FAZ 2: BAĞIMLILIKLAR ────────────────────────────" -ForegroundColor DarkCyan

if (-not $SkipNpm) {
    $appDir = Join-Path $InstallDir "app"
    
    # Ana uygulama bağımlılıkları
    Write-Step "Bağımlılıklar kuruluyor (npm install)..."
    Write-Host "  Bu işlem birkaç dakika sürebilir..." -ForegroundColor DarkGray
    
    $npmResult = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c cd /d `"$appDir`" && npm install --production 2>&1" `
        -Wait -PassThru -NoNewWindow
    
    if ($npmResult.ExitCode -eq 0) {
        Write-OK "Bağımlılıklar kuruldu."
    } else {
        Write-Warn "npm install sorunlu olabilir (exit: $($npmResult.ExitCode))."
        Write-Host "  Manuel deneme: cd $appDir && npm install" -ForegroundColor DarkGray
    }
    Write-Log "npm install: exit $($npmResult.ExitCode)"
    
    # Dashboard build kontrolü
    $dashDist = Join-Path $InstallDir "app\dashboard\dist\index.html"
    if (Test-Path $dashDist) {
        Write-OK "Dashboard build mevcut (dist/)."
    } else {
        Write-Step "Dashboard build ediliyor..."
        $dashDir = Join-Path $InstallDir "app\dashboard"
        if (Test-Path (Join-Path $dashDir "package.json")) {
            Start-Process -FilePath "cmd.exe" `
                -ArgumentList "/c cd /d `"$dashDir`" && npm install && npm run build 2>&1" `
                -Wait -PassThru -NoNewWindow | Out-Null
            if (Test-Path $dashDist) {
                Write-OK "Dashboard build tamamlandı."
            } else {
                Write-Warn "Dashboard build başarısız. Manuel build gerekebilir."
            }
        }
    }
} else {
    Write-Warn "Bağımlılık kurulumu atlandı (-SkipNpm)."
}

Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 3: KONFIGÜRASYON
# ══════════════════════════════════════════════════════════════════
Write-Host "  ─── FAZ 3: KONFİGÜRASYON ───────────────────────────" -ForegroundColor DarkCyan

$envDst     = Join-Path $InstallDir "app\.env"
$envExample = Join-Path $InstallDir "app\.env.example"

if (-not (Test-Path $envDst)) {
    Write-Step ".env konfigürasyonu oluşturuluyor..."
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  AgentsHUB, LLM modelleri için API anahtarı gerektirir.  │" -ForegroundColor DarkGray
    Write-Host "  │  Google AI Studio: https://aistudio.google.com           │" -ForegroundColor DarkGray
    Write-Host "  │  Şimdilik boş bırakabilirsiniz (sonra ayarlanır).        │" -ForegroundColor DarkGray
    Write-Host "  └─────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    # JWT Secret otomatik oluştur
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    
    $envContent = @"
# ══════════════════════════════════════════════
# AgentsHUB V2.0 — Ortam Değişkenleri
# ══════════════════════════════════════════════

# Server
UI_PORT=3434
NODE_ENV=production
CORS_ORIGINS=http://localhost:3434

# Güvenlik
UI_API_KEY=agentshub_local
JWT_SECRET=$jwtSecret

# Rate Limiting
RATE_LIMIT_CHAT=60
RATE_LIMIT_API=300

# ── Opsiyonel Entegrasyonlar ──
# TAVILY_API_KEY=
# BRAVE_API_KEY=
# GITHUB_TOKEN=
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASS=
"@
    Set-Content -Path $envDst -Value $envContent -Encoding UTF8
    Write-OK ".env oluşturuldu (JWT Secret otomatik üretildi)."
} else {
    Write-OK ".env zaten mevcut."
}

Write-Log "ENV: OK"
Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 4: KISAYOLLAR
# ══════════════════════════════════════════════════════════════════
Write-Host "  ─── FAZ 4: KISAYOLLAR ───────────────────────────────" -ForegroundColor DarkCyan

# Masaüstü kısayolu
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "AgentsHUB.lnk"
$vbsPath = Join-Path $InstallDir "AgentsHUB.vbs"
$iconPath = Join-Path $InstallDir "icon.ico"

if (Test-Path $vbsPath) {
    try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = "wscript.exe"
        $shortcut.Arguments = "`"$vbsPath`""
        $shortcut.WorkingDirectory = $InstallDir
        if (Test-Path $iconPath) {
            $shortcut.IconLocation = "$iconPath,0"
        }
        $shortcut.Description = "AgentsHUB V$VERSION"
        $shortcut.Save()
        Write-OK "Masaüstü kısayolu oluşturuldu."
    } catch {
        Write-Warn "Masaüstü kısayolu oluşturulamadı: $($_.Exception.Message)"
    }
} else {
    Write-Warn "AgentsHUB.vbs bulunamadı, kısayol atlandı."
}

Write-Log "Kısayollar: OK"
Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 5: DOĞRULAMA
# ══════════════════════════════════════════════════════════════════
Write-Host "  ─── FAZ 5: DOĞRULAMA ────────────────────────────────" -ForegroundColor DarkCyan

$checks = @()
$criticalFiles = @(
    @{ Path = (Join-Path $InstallDir "app\package.json");              Name = "Package.json" },
    @{ Path = (Join-Path $InstallDir "app\src\gateway\ui_server.js");  Name = "UI Server" },
    @{ Path = (Join-Path $InstallDir "app\.env");                      Name = "ENV Config" },
    @{ Path = (Join-Path $InstallDir "app\dashboard\dist\index.html"); Name = "Dashboard" },
    @{ Path = (Join-Path $InstallDir "launcher.mjs");                  Name = "Launcher" }
)

Write-Step "Kritik dosyalar kontrol ediliyor..."
foreach ($cf in $criticalFiles) {
    if (Test-Path $cf.Path) {
        Write-OK "$($cf.Name)"
        $checks += @{ Name = $cf.Name; Status = "OK" }
    } else {
        Write-Fail "$($cf.Name): EKSİK!"
        $checks += @{ Name = $cf.Name; Status = "EKSIK" }
    }
}

# Skills kontrolü
$skillsDir = Join-Path $InstallDir "Marketplace\skills"
if (Test-Path $skillsDir) {
    $skillCount = (Get-ChildItem -Path $skillsDir -Filter "*.js" | Measure-Object).Count
    Write-OK "Yetenekler: $skillCount adet"
}

# node_modules kontrolü
$nmDir = Join-Path $InstallDir "app\node_modules"
if (Test-Path $nmDir) {
    Write-OK "node_modules: Kurulu"
} else {
    Write-Fail "node_modules: EKSİK (npm install gerekli)"
}

Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 6: SONUÇ
# ══════════════════════════════════════════════════════════════════
$failCount = ($checks | Where-Object { $_.Status -eq "EKSIK" }).Count

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║           KURULUM BAŞARIYLA TAMAMLANDI! ✅              ║" -ForegroundColor Green
    Write-Host "  ╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "  ║                                                        ║" -ForegroundColor Green
    Write-Host "  ║  Başlatma:                                             ║" -ForegroundColor Green
    Write-Host "  ║    Masaüstündeki 'AgentsHUB' kısayoluna çift tıklayın  ║" -ForegroundColor Green
    Write-Host "  ║                                                        ║" -ForegroundColor Green
    Write-Host "  ║  Alternatif (Terminal):                                ║" -ForegroundColor Green
    Write-Host "  ║    node $InstallDir\launcher.mjs              ║" -ForegroundColor Green
    Write-Host "  ║                                                        ║" -ForegroundColor Green
    Write-Host "  ║  Dashboard: http://localhost:3434                      ║" -ForegroundColor Green
    Write-Host "  ║                                                        ║" -ForegroundColor Green
    Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "  ║     KURULUM TAMAMLANDI (UYARILAR MEVCUT) ⚠️            ║" -ForegroundColor Yellow
    Write-Host "  ║     $failCount eksik dosya tespit edildi.                      ║" -ForegroundColor Yellow
    Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  ─── SONRAKI ADIMLAR ─────────────────────────────────" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  1. Dashboard'ı açın: http://localhost:3434" -ForegroundColor White
Write-Host "  2. Sol panelden yeni bir ajan oluşturun" -ForegroundColor White
Write-Host "  3. Ajanınızın ayarlarından API anahtarınızı girin:" -ForegroundColor White
Write-Host "     Google AI Studio: https://aistudio.google.com" -ForegroundColor DarkGray
Write-Host "     Vertex AI: https://console.cloud.google.com" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Dökümantasyon: https://github.com/ufukefekaya-tr/AgentsHUB" -ForegroundColor DarkGray
Write-Host "  Web: https://agentshub.com.tr" -ForegroundColor DarkGray
Write-Host ""
Write-Log "Kurulum tamamlandı. Başarısız: $failCount"

# İlk başlatma teklifi
Write-Host ""
$startNow = Read-Host "  AgentsHUB'ı şimdi başlatmak ister misiniz? (E/H)"
if ($startNow -eq "E" -or $startNow -eq "e" -or $startNow -eq "Evet") {
    Write-Step "Başlatılıyor..."
    if (Test-Path $vbsPath) {
        & wscript.exe "$vbsPath"
        Write-OK "AgentsHUB başlatıldı! Tarayıcınız açılacak..."
    } else {
        $launcherPath = Join-Path $InstallDir "launcher.mjs"
        if ($nodeExe -and (Test-Path $launcherPath)) {
            Start-Process -FilePath $nodeExe -ArgumentList "`"$launcherPath`"" -WorkingDirectory $InstallDir
            Write-OK "AgentsHUB başlatıldı!"
        }
    }
} else {
    Write-Host "  Tamam. Hazır olduğunuzda masaüstü kısayolunu kullanın." -ForegroundColor DarkGray
}

Write-Host ""
