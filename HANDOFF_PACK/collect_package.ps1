<#
.SYNOPSIS
    AgentsHUB Devir Paketi Toplayici (Collector)
    Proje kodunu ve Antigravity zihin verisini tek pakette toplar.
.NOTES
    ATLAS V4.0 | AgentsHUB
#>

$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

function Write-Step  { param($m) Write-Host "[*] $m" -ForegroundColor Cyan }
function Write-OK    { param($m) Write-Host "[+] $m" -ForegroundColor Green }
function Write-Warn  { param($m) Write-Host "[!] $m" -ForegroundColor Yellow }

$DESKTOP       = [Environment]::GetFolderPath("Desktop")
$PACK_ROOT     = Join-Path $DESKTOP "AgentsHUB_Handoff"
$PACK_PROJE    = Join-Path $PACK_ROOT "Proje"
$PACK_ZIHIN    = Join-Path $PACK_ROOT "Zihin"
$PROJECT_SRC   = "C:\AgentsHUB"
$ANTIGRAVITY   = Join-Path $env:USERPROFILE ".gemini\antigravity"

$EXCLUDE_DIRS  = @("node_modules", ".git", "openclaw-main", "logs", ".agent_telemetry", ".skill_cache", "Test_Merkezi", "HANDOFF_PACK")
$BRAIN_DIRS    = @("conversations", "brain", "knowledge", "annotations", "implicit", "global_workflows", "prompting")

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Magenta
Write-Host "     AgentsHUB DEVIR PAKETI TOPLAYICI (ATLAS)            " -ForegroundColor Magenta
Write-Host "=========================================================" -ForegroundColor Magenta
Write-Host ""

# 1. Hedef klasoru olustur
Write-Step "Paket dizini olusturuluyor..."
if (Test-Path $PACK_ROOT) {
    Write-Warn "Mevcut paket dizini siliniyor..."
    Remove-Item -Path $PACK_ROOT -Recurse -Force
}
New-Item -ItemType Directory -Path $PACK_PROJE -Force | Out-Null
New-Item -ItemType Directory -Path $PACK_ZIHIN -Force | Out-Null
Write-OK "Paket dizini hazir: $PACK_ROOT"

# 2. Proje dosyalarini kopyala (robocopy ile)
Write-Step "Proje dosyalari kopyalaniyor..."

$robocopyArgs = @(
    $PROJECT_SRC
    $PACK_PROJE
    "/MIR"
    "/NP"
    "/NFL"
    "/NDL"
    "/NJH"
    "/NJS"
)
foreach ($d in $EXCLUDE_DIRS) {
    $robocopyArgs += "/XD"
    $robocopyArgs += $d
}
$robocopyArgs += "/XF"
$robocopyArgs += "*.log"
$robocopyArgs += "/XF"
$robocopyArgs += "*.tmp"
$robocopyArgs += "/XF"
$robocopyArgs += ".pid"
$robocopyArgs += "/XF"
$robocopyArgs += ".port"
$robocopyArgs += "/XF"
$robocopyArgs += "unins000.*"
$robocopyArgs += "/XF"
$robocopyArgs += "*.dat"

& robocopy @robocopyArgs 2>$null | Out-Null
Write-OK "Proje dosyalari kopyalandi."

# 3. Dashboard node_modules temizle (eger kopyalandiysa)
$dashboardNM = Join-Path $PACK_PROJE "app\dashboard\node_modules"
if (Test-Path $dashboardNM) {
    Remove-Item -Path $dashboardNM -Recurse -Force
    Write-OK "Dashboard node_modules temizlendi."
}

# 4. API anahtarlarini temizle
Write-Step "API anahtarlari temizleniyor..."
$envFile = Join-Path $PACK_PROJE "app\.env"
if (Test-Path $envFile) {
    Remove-Item $envFile -Force
    Write-OK ".env dosyasi paketten cikarildi."
}

# Agent JSON'larindaki apiKey degerlerini temizle
$agentsDir = Join-Path $PACK_PROJE "app\Agents"
if (Test-Path $agentsDir) {
    $pattern = [regex]'"apiKey"\s*:\s*"[^"]*"'
    $replacement = '"apiKey": "__BURAYA_KENDI_API_KEYINIZI_GIRIN__"'
    Get-ChildItem -Path $agentsDir -Recurse -Filter "*.json" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -and $pattern.IsMatch($content)) {
            $cleaned = $pattern.Replace($content, $replacement)
            Set-Content -Path $_.FullName -Value $cleaned -NoNewline
            Write-OK "  Temizlendi: $($_.Name)"
        }
    }
}

# 5. INSTALL.ps1 ve README'yi paketin kokenine kopyala
Write-Step "Installer ve README kopyalaniyor..."
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$installSrc = Join-Path $scriptDir "INSTALL.ps1"
$readmeSrc  = Join-Path $scriptDir "README_KURULUM.md"

if (Test-Path $installSrc) {
    Copy-Item $installSrc -Destination $PACK_ROOT -Force
    Write-OK "INSTALL.ps1 pakete eklendi."
}
if (Test-Path $readmeSrc) {
    Copy-Item $readmeSrc -Destination $PACK_ROOT -Force
    Write-OK "README_KURULUM.md pakete eklendi."
}

# 6. Antigravity zihin verisini kopyala
Write-Step "Antigravity zihin verisi kopyalaniyor..."

foreach ($dir in $BRAIN_DIRS) {
    $srcDir = Join-Path $ANTIGRAVITY $dir
    $dstDir = Join-Path $PACK_ZIHIN $dir
    if (Test-Path $srcDir) {
        Copy-Item -Path $srcDir -Destination $dstDir -Recurse -Force
        $count = (Get-ChildItem -Path $dstDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-OK "  $dir -> $count dosya"
    } else {
        Write-Warn "  $dir bulunamadi, atlaniyor."
    }
}

# mcp_config.json
$mcpSrc = Join-Path $ANTIGRAVITY "mcp_config.json"
if (Test-Path $mcpSrc) {
    Copy-Item -Path $mcpSrc -Destination (Join-Path $PACK_ZIHIN "mcp_config.json") -Force
    Write-OK "  mcp_config.json kopyalandi."
}

# 7. Istatistikler
Write-Host ""
Write-Step "Paket istatistikleri hesaplaniyor..."

$projeFiles = (Get-ChildItem -Path $PACK_PROJE -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
$projeSizeMB = [math]::Round((Get-ChildItem -Path $PACK_PROJE -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
$zihinFiles = (Get-ChildItem -Path $PACK_ZIHIN -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
$zihinSizeMB = [math]::Round((Get-ChildItem -Path $PACK_ZIHIN -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
$totalFiles = $projeFiles + $zihinFiles
$totalSizeMB = [math]::Round($projeSizeMB + $zihinSizeMB, 1)

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "               PAKET HAZIRLANDI                          " -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "  Konum  : $PACK_ROOT" -ForegroundColor Green
Write-Host "  Proje  : $projeFiles dosya ($projeSizeMB MB)" -ForegroundColor Green
Write-Host "  Zihin  : $zihinFiles dosya ($zihinSizeMB MB)" -ForegroundColor Green
Write-Host "  Toplam : $totalFiles dosya ($totalSizeMB MB)" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Sonraki adim: Paketi arkadasina gonder." -ForegroundColor Yellow
Write-Host "Arkadasi INSTALL.ps1 dosyasini calistiracak." -ForegroundColor Yellow
Write-Host ""
