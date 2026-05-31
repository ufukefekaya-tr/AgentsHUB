<#
.SYNOPSIS
    AgentsHUB Otomatik Kurulum Scripti
    Bu script, AgentsHUB projesini ve Antigravity zihin verisini
    yeni bir Windows makinesine kusursuz sekilde kurar.

.DESCRIPTION
    Calistirma:
        1. PowerShell'i YONETICI OLARAK acin
        2. Komut: Set-ExecutionPolicy Bypass -Scope Process -Force
        3. Komut: .\INSTALL.ps1

.NOTES
    Mimar: ATLAS V4.0 | AgentsHUB Organizması
    Tarih: 2026-04-05
#>

[CmdletBinding()]
param(
    [switch]$SkipNpm,
    [switch]$SkipBrain,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

# ── RENK YARDIMCILARI ──────────────────────────────────────────
function Write-Banner { param($m) Write-Host $m -ForegroundColor Magenta }
function Write-Step   { param($m) Write-Host "[*] $m" -ForegroundColor Cyan }
function Write-OK     { param($m) Write-Host "[+] $m" -ForegroundColor Green }
function Write-Warn   { param($m) Write-Host "[!] $m" -ForegroundColor Yellow }
function Write-Fail   { param($m) Write-Host "[-] $m" -ForegroundColor Red }

function Test-Admin {
    $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# ── YAPILANDIRMA ────────────────────────────────────────────────
$SCRIPT_DIR    = Split-Path -Parent $MyInvocation.MyCommand.Definition
$SRC_PROJE     = Join-Path $SCRIPT_DIR "Proje"
$SRC_ZIHIN     = Join-Path $SCRIPT_DIR "Zihin"
$DST_PROJE     = "C:\AgentsHUB"
$DST_ANTIGRAV  = Join-Path $env:USERPROFILE ".gemini\antigravity"
$TIMESTAMP     = Get-Date -Format "yyyyMMdd_HHmmss"
$LOG_FILE      = Join-Path $SCRIPT_DIR "install_log_$TIMESTAMP.txt"

# Log fonksiyonu
function Write-Log {
    param($m)
    $entry = "[$(Get-Date -Format 'HH:mm:ss')] $m"
    Add-Content -Path $LOG_FILE -Value $entry
}

# ── ANA BANNER ──────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Banner "╔══════════════════════════════════════════════════════════════════╗"
Write-Banner "║                                                                ║"
Write-Banner "║       █████╗  ██████╗ ███████╗███╗   ██╗████████╗███████╗      ║"
Write-Banner "║      ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔════╝      ║"
Write-Banner "║      ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ███████╗      ║"
Write-Banner "║      ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║      ║"
Write-Banner "║      ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ███████║      ║"
Write-Banner "║      ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝      ║"
Write-Banner "║                    H U B   I N S T A L L E R                   ║"
Write-Banner "║                                                                ║"
Write-Banner "╚══════════════════════════════════════════════════════════════════╝"
Write-Host ""
Write-Host "  AgentsHUB Otomatik Kurulum v1.0" -ForegroundColor White
Write-Host "  Tarih: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 0: ON KONTROLLER
# ══════════════════════════════════════════════════════════════════
Write-Host "─── FAZ 0: ON KONTROLLER ───────────────────────────────────" -ForegroundColor DarkCyan

# Yonetici kontrolu
Write-Step "Yonetici yetkileri kontrol ediliyor..."
if (-not (Test-Admin)) {
    Write-Warn "Bu script yonetici olarak calistirilmadi."
    Write-Warn "Bazi islemler basarisiz olabilir. Devam ediliyor..."
    Write-Log "WARN: Yonetici yetkisi yok"
} else {
    Write-OK "Yonetici yetkisi mevcut."
}

# Kaynak dosya kontrolu
Write-Step "Kaynak dosyalar kontrol ediliyor..."
if (-not (Test-Path $SRC_PROJE)) {
    Write-Fail "HATA: 'Proje' klasoru bulunamadi: $SRC_PROJE"
    Write-Fail "INSTALL.ps1 dosyasinin AgentsHUB_Handoff klasorunun icinde oldugundan emin olun."
    exit 1
}
if (-not (Test-Path $SRC_ZIHIN)) {
    Write-Warn "'Zihin' klasoru bulunamadi. Sadece proje dosyalari kurulacak."
    $SkipBrain = $true
}

$srcProjeFiles = (Get-ChildItem -Path $SRC_PROJE -Recurse -File | Measure-Object).Count
Write-OK "Proje: $srcProjeFiles dosya bulundu."

if (-not $SkipBrain) {
    $srcZihinFiles = (Get-ChildItem -Path $SRC_ZIHIN -Recurse -File | Measure-Object).Count
    Write-OK "Zihin: $srcZihinFiles dosya bulundu."
}

# Disk alani kontrolu
Write-Step "Disk alani kontrol ediliyor..."
$drive = (Get-PSDrive C)
$freeGB = [math]::Round($drive.Free / 1GB, 1)
if ($freeGB -lt 2) {
    Write-Fail "HATA: C: diskinde yeterli alan yok ($freeGB GB). En az 2 GB gerekli."
    exit 1
}
Write-OK "C: diskinde $freeGB GB bos alan var."

# Node.js kontrolu
Write-Step "Node.js kontrolu..."
$bundledNode = Join-Path $SRC_PROJE "node\node.exe"
if (Test-Path $bundledNode) {
    $nodeVersion = & $bundledNode --version 2>$null
    Write-OK "Bundled Node.js: $nodeVersion"
} else {
    # Sistem Node.js kontrolu
    try {
        $nodeVersion = & node --version 2>$null
        Write-OK "Sistem Node.js: $nodeVersion"
    } catch {
        Write-Fail "HATA: Node.js bulunamadi. Bundled node.exe de pakette yok."
        Write-Fail "Node.js kurulumu gerekiyor: https://nodejs.org"
        exit 1
    }
}

Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 1: PROJE DOSYALARINI KUR
# ══════════════════════════════════════════════════════════════════
Write-Host "─── FAZ 1: PROJE KURULUMU ──────────────────────────────────" -ForegroundColor DarkCyan

# Mevcut kurulum kontrolu
if (Test-Path $DST_PROJE) {
    Write-Warn "Mevcut AgentsHUB kurulumu tespit edildi: $DST_PROJE"

    if (-not $Force) {
        Write-Host ""
        Write-Host "  [1] Yedekle ve devam et (onerilen)" -ForegroundColor White
        Write-Host "  [2] Uzerine yaz (mevcut veriler silinir)" -ForegroundColor White
        Write-Host "  [3] Iptal et" -ForegroundColor White
        Write-Host ""
        $choice = Read-Host "Seciminiz (1/2/3)"

        switch ($choice) {
            "1" {
                $backupPath = "C:\AgentsHUB_BACKUP_$TIMESTAMP"
                Write-Step "Yedekleniyor: $backupPath"
                Rename-Item -Path $DST_PROJE -NewName $backupPath -Force
                Write-OK "Yedekleme tamamlandi."
                Write-Log "Backup: $backupPath"
            }
            "2" {
                Write-Step "Mevcut kurulum siliniyor..."
                Remove-Item -Path $DST_PROJE -Recurse -Force
                Write-OK "Silindi."
            }
            "3" {
                Write-Host "Kurulum iptal edildi." -ForegroundColor Yellow
                exit 0
            }
            default {
                $backupPath = "C:\AgentsHUB_BACKUP_$TIMESTAMP"
                Write-Step "Varsayilan: Yedekleniyor..."
                Rename-Item -Path $DST_PROJE -NewName $backupPath -Force
                Write-OK "Yedekleme tamamlandi: $backupPath"
            }
        }
    } else {
        $backupPath = "C:\AgentsHUB_BACKUP_$TIMESTAMP"
        Write-Step "Force modu: Yedekleniyor..."
        Rename-Item -Path $DST_PROJE -NewName $backupPath -Force
        Write-OK "Yedekleme tamamlandi."
    }
}

# Proje dosyalarini kopyala
Write-Step "Proje dosyalari kopyalaniyor -> $DST_PROJE"
Copy-Item -Path $SRC_PROJE -Destination $DST_PROJE -Recurse -Force
Write-OK "Proje dosyalari kopyalandi."
Write-Log "Proje kuruldu: $DST_PROJE"

Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 2: .ENV KONFIGURASYONU
# ══════════════════════════════════════════════════════════════════
Write-Host "─── FAZ 2: KONFIGÜRASYON ───────────────────────────────────" -ForegroundColor DarkCyan

$envDst = Join-Path $DST_PROJE "app\.env"
$envExample = Join-Path $DST_PROJE "app\.env.example"

if (-not (Test-Path $envDst)) {
    Write-Step ".env dosyasi olusturuluyor..."

    # API key iste
    Write-Host ""
    Write-Host "  AgentsHUB, LLM modellerine baglanmak icin API anahtarina ihtiyac duyar." -ForegroundColor DarkGray
    Write-Host "  Simdilik bos birakilabilir, sonra da ayarlanabilir." -ForegroundColor DarkGray
    Write-Host ""
    $uiApiKey = Read-Host "  UI API Key (bos birakilabilir)"

    if ([string]::IsNullOrWhiteSpace($uiApiKey)) {
        $uiApiKey = "agentshub_default_key"
    }

    $envContent = @"
UI_PORT=3434
NODE_ENV=production
CORS_ORIGINS=http://localhost:3434
RATE_LIMIT_CHAT=60
RATE_LIMIT_API=300
UI_API_KEY="$uiApiKey"
"@
    Set-Content -Path $envDst -Value $envContent
    Write-OK ".env dosyasi olusturuldu."
} else {
    Write-OK ".env dosyasi zaten mevcut."
}

Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 3: BAGIMLILIK KURULUMU (npm install)
# ══════════════════════════════════════════════════════════════════
Write-Host "─── FAZ 3: BAGIMLILIK KURULUMU ─────────────────────────────" -ForegroundColor DarkCyan

if (-not $SkipNpm) {
    # Node.exe yolunu belirle
    $nodeExe = Join-Path $DST_PROJE "node\node.exe"
    if (-not (Test-Path $nodeExe)) {
        # Sistem node'unu kullan
        $nodeExe = "node"
    }

    # npm yolunu belirle
    $npmCmd = "npm"

    # Ana uygulama bagimliliklari
    Write-Step "Ana uygulama bagimliliklari kuruluyor (npm install)..."
    Write-Host "  Bu islem birka dakika surebilir..." -ForegroundColor DarkGray

    $appDir = Join-Path $DST_PROJE "app"
    $npmResult = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$appDir`" && npm install --production 2>&1" -Wait -PassThru -NoNewWindow
    if ($npmResult.ExitCode -eq 0) {
        Write-OK "Ana uygulama bagimliliklari kuruldu."
    } else {
        Write-Warn "npm install basarisiz olmus olabilir (exit code: $($npmResult.ExitCode))."
        Write-Warn "Elle deneyebilirsiniz: cd C:\AgentsHUB\app && npm install"
    }
    Write-Log "npm install app: exit $($npmResult.ExitCode)"

    # Dashboard bagimliliklari (dist zaten var, opsiyonel)
    $dashPkg = Join-Path $DST_PROJE "app\dashboard\package.json"
    $dashDist = Join-Path $DST_PROJE "app\dashboard\dist"
    if ((Test-Path $dashPkg) -and (Test-Path $dashDist)) {
        Write-OK "Dashboard zaten build edilmis (dist/ mevcut). npm install atlanıyor."
    } elseif (Test-Path $dashPkg) {
        Write-Step "Dashboard bagimliliklari kuruluyor..."
        $dashDir = Join-Path $DST_PROJE "app\dashboard"
        $dashResult = Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$dashDir`" && npm install 2>&1" -Wait -PassThru -NoNewWindow
        Write-OK "Dashboard bagimliliklari kuruldu."
    }
} else {
    Write-Warn "npm install atlandi (-SkipNpm)."
}

Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 4: ANTIGRAVITY ZIHIN VERISI ENJEKSIYONU
# ══════════════════════════════════════════════════════════════════
Write-Host "─── FAZ 4: ANTIGRAVITY ZIHIN ENJEKSIYONU ───────────────────" -ForegroundColor DarkCyan

if (-not $SkipBrain) {
    Write-Step "Antigravity dizini kontrol ediliyor..."

    # Antigravity ana dizini
    $geminiDir = Join-Path $env:USERPROFILE ".gemini"
    if (-not (Test-Path $geminiDir)) {
        New-Item -ItemType Directory -Path $geminiDir -Force | Out-Null
        Write-OK ".gemini dizini olusturuldu."
    }

    if (-not (Test-Path $DST_ANTIGRAV)) {
        New-Item -ItemType Directory -Path $DST_ANTIGRAV -Force | Out-Null
        Write-OK "antigravity dizini olusturuldu."
    }

    # Mevcut veri kontrolu
    $existingBrain = Join-Path $DST_ANTIGRAV "brain"
    $hasExisting = (Test-Path $existingBrain) -and ((Get-ChildItem -Path $existingBrain -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0)

    if ($hasExisting -and -not $Force) {
        Write-Warn "Mevcut Antigravity verisi tespit edildi."
        Write-Host ""
        Write-Host "  [1] Mevcut verileri koru, sadece eksikleri ekle (merge)" -ForegroundColor White
        Write-Host "  [2] Eski verileri yedekle, tamamen yenisiyle degistir" -ForegroundColor White
        Write-Host "  [3] Zihin verisini atla" -ForegroundColor White
        Write-Host ""
        $brainChoice = Read-Host "Seciminiz (1/2/3)"
    } else {
        $brainChoice = "2"
    }

    switch ($brainChoice) {
        "1" {
            # Merge modu: Sadece yeni dosyalari ekle
            Write-Step "Merge modu: Eksik dosyalar ekleniyor..."
            Get-ChildItem -Path $SRC_ZIHIN -Directory | ForEach-Object {
                $dstDir = Join-Path $DST_ANTIGRAV $_.Name
                if (-not (Test-Path $dstDir)) {
                    Copy-Item -Path $_.FullName -Destination $dstDir -Recurse -Force
                    Write-OK "  Eklendi: $($_.Name)"
                } else {
                    # Dosya bazinda merge
                    Get-ChildItem -Path $_.FullName -Recurse -File | ForEach-Object {
                        $relPath = $_.FullName.Substring($SRC_ZIHIN.Length)
                        $dstFile = Join-Path $DST_ANTIGRAV $relPath
                        if (-not (Test-Path $dstFile)) {
                            $dstFileDir = Split-Path $dstFile -Parent
                            if (-not (Test-Path $dstFileDir)) {
                                New-Item -ItemType Directory -Path $dstFileDir -Force | Out-Null
                            }
                            Copy-Item -Path $_.FullName -Destination $dstFile -Force
                        }
                    }
                    Write-OK "  Merge: $($_.Name)"
                }
            }
            # Tekil dosyalar
            Get-ChildItem -Path $SRC_ZIHIN -File | ForEach-Object {
                $dstFile = Join-Path $DST_ANTIGRAV $_.Name
                if (-not (Test-Path $dstFile)) {
                    Copy-Item -Path $_.FullName -Destination $dstFile -Force
                    Write-OK "  Eklendi: $($_.Name)"
                }
            }
        }
        "2" {
            # Tam degisim
            if ($hasExisting) {
                $brainBackup = Join-Path $DST_ANTIGRAV ".backup_$TIMESTAMP"
                Write-Step "Mevcut veriler yedekleniyor: $brainBackup"
                New-Item -ItemType Directory -Path $brainBackup -Force | Out-Null
                Get-ChildItem -Path $DST_ANTIGRAV -Exclude ".backup_*" | ForEach-Object {
                    if ($_.Name -ne ".backup_$TIMESTAMP") {
                        Move-Item -Path $_.FullName -Destination $brainBackup -Force -ErrorAction SilentlyContinue
                    }
                }
                Write-OK "Mevcut veri yedeklendi."
            }

            Write-Step "Zihin verisi enjekte ediliyor..."
            Get-ChildItem -Path $SRC_ZIHIN | ForEach-Object {
                $dstPath = Join-Path $DST_ANTIGRAV $_.Name
                Copy-Item -Path $_.FullName -Destination $dstPath -Recurse -Force
                Write-OK "  Enjekte: $($_.Name)"
            }
        }
        "3" {
            Write-Warn "Zihin verisi enjeksiyonu atlandi."
        }
    }

    Write-Log "Zihin enjeksiyonu: secim=$brainChoice"
} else {
    Write-Warn "Zihin verisi enjeksiyonu atlandi (-SkipBrain)."
}

Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 5: DOGRULAMA
# ══════════════════════════════════════════════════════════════════
Write-Host "─── FAZ 5: DOGRULAMA ───────────────────────────────────────" -ForegroundColor DarkCyan

$checks = @()

# Kritik dosya kontrolleri
$criticalFiles = @(
    @{ Path = (Join-Path $DST_PROJE "launcher.mjs");                  Name = "Launcher" },
    @{ Path = (Join-Path $DST_PROJE "node\node.exe");                 Name = "Node.js Runtime" },
    @{ Path = (Join-Path $DST_PROJE "AgentsHUB.vbs");                 Name = "VBS Starter" },
    @{ Path = (Join-Path $DST_PROJE "icon.ico");                      Name = "Tray Icon" },
    @{ Path = (Join-Path $DST_PROJE "app\package.json");              Name = "Package.json" },
    @{ Path = (Join-Path $DST_PROJE "app\src\gateway\ui_server.js");  Name = "UI Server" },
    @{ Path = (Join-Path $DST_PROJE "app\.env");                      Name = "ENV Config" },
    @{ Path = (Join-Path $DST_PROJE "app\dashboard\dist\index.html"); Name = "Dashboard Build" }
)

Write-Step "Kritik dosyalar kontrol ediliyor..."
foreach ($cf in $criticalFiles) {
    if (Test-Path $cf.Path) {
        Write-OK "  $($cf.Name): OK"
        $checks += @{ Name = $cf.Name; Status = "OK" }
    } else {
        Write-Fail "  $($cf.Name): EKSIK!"
        $checks += @{ Name = $cf.Name; Status = "EKSIK" }
    }
}

# Skills kontrolu
$skillsDir = Join-Path $DST_PROJE "Marketplace\skills"
if (Test-Path $skillsDir) {
    $skillCount = (Get-ChildItem -Path $skillsDir -Filter "*.js" | Measure-Object).Count
    Write-OK "  Marketplace Skills: $skillCount adet"
    $checks += @{ Name = "Skills"; Status = "$skillCount adet" }
}

# Agents kontrolu
$agentsDir2 = Join-Path $DST_PROJE "app\Agents"
if (Test-Path $agentsDir2) {
    $agentCount = (Get-ChildItem -Path $agentsDir2 -Directory | Measure-Object).Count
    Write-OK "  Ajan Tanimlari: $agentCount adet"
}

# node_modules kontrolu
$nmDir = Join-Path $DST_PROJE "app\node_modules"
if (Test-Path $nmDir) {
    Write-OK "  node_modules: Kurulu"
} else {
    Write-Fail "  node_modules: EKSIK (npm install gerekli)"
}

# Antigravity kontrolu
if (-not $SkipBrain) {
    $brainDir = Join-Path $DST_ANTIGRAV "brain"
    $convDir  = Join-Path $DST_ANTIGRAV "conversations"
    if (Test-Path $brainDir) {
        $brainCount = (Get-ChildItem -Path $brainDir -Recurse -File | Measure-Object).Count
        Write-OK "  Antigravity Brain: $brainCount dosya"
    }
    if (Test-Path $convDir) {
        $convCount = (Get-ChildItem -Path $convDir -File | Measure-Object).Count
        Write-OK "  Antigravity Conversations: $convCount sohbet"
    }
}

Write-Host ""

# ══════════════════════════════════════════════════════════════════
# FAZ 6: SONUC RAPORU
# ══════════════════════════════════════════════════════════════════
$failCount = ($checks | Where-Object { $_.Status -eq "EKSIK" }).Count

if ($failCount -eq 0) {
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              KURULUM BASARIYLA TAMAMLANDI!                 ║" -ForegroundColor Green
    Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "║  Sistemi baslatmak icin:                                   ║" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "║  YONTEM 1 (Onerilen):                                      ║" -ForegroundColor Green
    Write-Host "║    C:\AgentsHUB\AgentsHUB.vbs dosyasini cift tiklayin      ║" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "║  YONTEM 2 (Terminal):                                      ║" -ForegroundColor Green
    Write-Host "║    C:\AgentsHUB\node\node.exe C:\AgentsHUB\launcher.mjs    ║" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "║  Dashboard: http://localhost:3434                          ║" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║        KURULUM TAMAMLANDI (UYARILAR MEVCUT)               ║" -ForegroundColor Yellow
    Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Yellow
    Write-Host "║  $failCount adet eksik dosya tespit edildi.                       ║" -ForegroundColor Yellow
    Write-Host "║  Detaylar icin: $LOG_FILE" -ForegroundColor Yellow
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Kurulum logu: $LOG_FILE" -ForegroundColor DarkGray
Write-Host ""
Write-Log "Kurulum tamamlandi. Basarisiz: $failCount"

# Sonraki adim onerileri
Write-Host "─── SONRAKI ADIMLAR ────────────────────────────────────────" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  1. Ajan API anahtarlarini ayarlayin:" -ForegroundColor White
Write-Host "     C:\AgentsHUB\app\Agents\ altindaki JSON dosyalarinda" -ForegroundColor DarkGray
Write-Host "     'apiKey' degerlerini kendi anahtarlarinizla degistirin." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  2. Sistemi baslatin:" -ForegroundColor White
Write-Host "     C:\AgentsHUB\AgentsHUB.vbs (cift tik)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  3. Antigravity'de projeyi acin:" -ForegroundColor White
Write-Host "     Workspace olarak C:\AgentsHUB klasorunu ekleyin." -ForegroundColor DarkGray
Write-Host ""

# Bekleme
Read-Host "Cikmak icin Enter'a basin"
