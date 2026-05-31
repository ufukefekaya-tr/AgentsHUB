# 🚀 AgentsHUB — Devir Teslim Kurulum Rehberi

> Bu paket, AgentsHUB platformunun tam bir klonunu içerir: kaynak kodu, 29 otonom skill, React dashboard ve Antigravity AI asistanının tüm sohbet geçmişi ile öğrenilmiş hafızası.

---

## 📋 Sistem Gereksinimleri

| Gereksinim | Minimum | Önerilen |
|-----------|---------|----------|
| **İşletim Sistemi** | Windows 10 (64-bit) | Windows 11 |
| **RAM** | 4 GB | 8 GB+ |
| **Disk Alanı** | 2 GB | 5 GB |
| **Node.js** | Pakete dahil (bundled) | — |
| **NPM** | Sisteme kurulu olmalı | v10+ |
| **Antigravity** | Kurulu olmalı | Son versiyon |

> ⚠️ **Node.js Runtime**: Pakette `node/node.exe` olarak gömülü geliyor. Sistemde ayrıca Node.js kurulu olması `npm install` komutu için gereklidir.

---

## ⚡ YÖNTEM 1: Otomatik Kurulum (Önerilen)

En hızlı ve güvenli yol. Tek bir script ile her şey otomatik yapılır.

### Adım 1: Paketi Aç
Paketi bilgisayarınıza indirin/kopyalayın ve zip ise çıkartın.

### Adım 2: PowerShell'i Yönetici Olarak Aç
- Windows arama çubuğuna `PowerShell` yazın
- Sağ tıklayın → **Yönetici olarak çalıştır**

### Adım 3: Execution Policy Ayarla
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
```

### Adım 4: Script'i Çalıştır
```powershell
cd "PAKETIN_BULUNDUGU_KLASOR\AgentsHUB_Handoff"
.\INSTALL.ps1
```

### Adım 5: Script Yönlendirmelerini Takip Et
Script size şunları soracak:
1. **Mevcut kurulum varsa**: Yedekle / Üzerine yaz / İptal
2. **API Anahtarı**: UI API key (şimdilik boş bırakabilirsiniz)
3. **Antigravity verisi**: Merge / Değiştir / Atla

### Adım 6: Tamamlandı!
Script sonunda doğrulama raporu gösterir. Tüm kontroller ✅ ise sistem hazırdır.

---

## 🔧 YÖNTEM 2: Manuel Kurulum (Adım Adım)

Script çalıştırmak istemiyorsanız her adımı elle yapabilirsiniz.

### 2.1 Proje Dosyalarını Kopyala

```powershell
# Paket içindeki Proje klasörünü C:\AgentsHUB'a kopyala
Copy-Item -Path ".\Proje" -Destination "C:\AgentsHUB" -Recurse -Force
```

### 2.2 Bağımlılıkları Kur

```powershell
# Ana uygulama
cd C:\AgentsHUB\app
npm install --production

# Dashboard (opsiyonel, dist/ zaten build edilmiş olmalı)
cd C:\AgentsHUB\app\dashboard
npm install
```

### 2.3 .env Dosyasını Oluştur

`C:\AgentsHUB\app\.env.example` dosyasını kopyalayıp `.env` olarak adlandırın:

```powershell
Copy-Item "C:\AgentsHUB\app\.env.example" "C:\AgentsHUB\app\.env"
```

Ardından `.env` dosyasını düzenleyin ve `UI_API_KEY` değerini girin.

### 2.4 Antigravity Zihin Verisini Enjekte Et

```powershell
# Zihin verisi klasörlerini kopyala
$dst = "$env:USERPROFILE\.gemini\antigravity"

# Dizin yoksa oluştur
New-Item -ItemType Directory -Path $dst -Force

# Tüm zihin verilerini kopyala
Copy-Item -Path ".\Zihin\conversations" -Destination "$dst\conversations" -Recurse -Force
Copy-Item -Path ".\Zihin\brain"         -Destination "$dst\brain"         -Recurse -Force
Copy-Item -Path ".\Zihin\knowledge"     -Destination "$dst\knowledge"     -Recurse -Force
Copy-Item -Path ".\Zihin\annotations"   -Destination "$dst\annotations"   -Recurse -Force
Copy-Item -Path ".\Zihin\implicit"      -Destination "$dst\implicit"      -Recurse -Force
Copy-Item -Path ".\Zihin\global_workflows" -Destination "$dst\global_workflows" -Recurse -Force
Copy-Item -Path ".\Zihin\prompting"     -Destination "$dst\prompting"     -Recurse -Force
Copy-Item -Path ".\Zihin\mcp_config.json" -Destination "$dst\mcp_config.json" -Force
```

### 2.5 Sistemi Başlat

```powershell
# Yöntem A: VBS ile (arka planda çalışır)
C:\AgentsHUB\AgentsHUB.vbs

# Yöntem B: Terminal ile
C:\AgentsHUB\node\node.exe C:\AgentsHUB\launcher.mjs
```

Dashboard adresi: **http://localhost:3434**

---

## 🤖 YÖNTEM 3: Antigravity ile Otomatik Entegrasyon

Kendi Antigravity AI asistanınız varsa, ona şu komutu verin:

```
Bu paketteki AgentsHUB projesini ve Antigravity zihin verilerini benim sistemime entegre et.
Proje -> C:\AgentsHUB
Zihin -> %USERPROFILE%\.gemini\antigravity\
INSTALL.ps1 scriptini referans olarak kullan.
```

Antigravity, `INSTALL.ps1` dosyasındaki adımları okuyarak entegrasyonu otomatik yapacaktır.

---

## 🔑 API Anahtarı Ayarları

### UI API Key
`C:\AgentsHUB\app\.env` dosyasında:
```
UI_API_KEY="kendi_anahtariniz"
```

### Ajan API Key'leri
Her ajan klasöründe bir JSON konfigürasyonu vardır:
```
C:\AgentsHUB\app\Agents\
├── QA_ATLAS_V3/
│   └── config.json  ← "apiKey" değerini güncelleyin
├── SIGMA_TESTER_V1/
│   └── config.json
└── ...
```

JSON dosyalarında `"apiKey": "__BURAYA_KENDI_API_KEYINIZI_GIRIN__"` satırlarını bulun ve kendi Google AI Studio veya diğer LLM provider API anahtarınızla değiştirin.

---

## 📁 Paket İçeriği

```
AgentsHUB_Handoff/
│
├── INSTALL.ps1              ← Otomatik kurulum scripti
├── README_KURULUM.md        ← Bu dosya
│
├── Proje/                   ← AgentsHUB platform kodu
│   ├── AgentsHUB.vbs        ← Windows başlatıcı (çift tık)
│   ├── launcher.mjs         ← Node.js launcher + system tray
│   ├── icon.ico             ← Tray ikonu
│   ├── node/node.exe        ← Gömülü Node.js runtime (~90 MB)
│   ├── Marketplace/skills/  ← 29 otonom skill
│   │   ├── brave_search.js
│   │   ├── excel_manager.js
│   │   ├── web_scraper.js
│   │   ├── python_runner.js
│   │   └── ... (29 adet)
│   ├── app/
│   │   ├── src/             ← Backend kaynak kodu
│   │   │   ├── bridge/      ← LLM bağlantı katmanı
│   │   │   ├── core/        ← Ana motor (ReAct loop)
│   │   │   ├── gateway/     ← HTTP/SSE sunucu
│   │   │   ├── security/    ← SSRF/Path guard
│   │   │   ├── skills/      ← Skill yöneticisi
│   │   │   └── ...
│   │   ├── Agents/          ← Ajan tanımları
│   │   ├── dashboard/       ← React UI (build edilmiş)
│   │   ├── .env.example     ← ENV şablonu
│   │   └── package.json     ← Bağımlılık listesi
│   └── docs/                ← Dokümantasyon
│
└── Zihin/                   ← Antigravity hafıza verisi
    ├── conversations/       ← 22 sohbet geçmişi (.pb)
    ├── brain/               ← Proje artifact'leri
    ├── knowledge/           ← Öğrenilmiş bilgi tabanı
    ├── annotations/         ← Sohbet etiketleri
    ├── implicit/            ← Implicit hafıza
    ├── global_workflows/    ← QA-Loop ve workflow'lar
    ├── prompting/           ← Browser prompting config
    └── mcp_config.json      ← MCP konfigürasyonu
```

---

## ❓ Sorun Giderme (Troubleshooting)

### "npm install başarısız oluyor"
```powershell
# Node.js ve npm'in kurulu olduğundan emin olun
node --version
npm --version

# Proxy arkasındaysanız
npm config set proxy http://proxy:8080
npm config set https-proxy http://proxy:8080
```

### "Port 3434 kullanımda"
Launcher otomatik olarak bir sonraki boş portu bulur. Eğer sorun devam ederse:
```powershell
# Hangi process portu tutuyor?
netstat -ano | findstr :3434

# O process'i sonlandır
taskkill /PID <PID_NUMARASI> /F
```

### "Dashboard açılmıyor"
```powershell
# Server'ın çalıştığını doğrula
curl http://localhost:3434/api/health
```

### "Antigravity eski sohbetleri görmüyor"
- Antigravity'yi tamamen kapatıp tekrar açın
- Workspace olarak `C:\AgentsHUB` eklediğinizden emin olun
- `%USERPROFILE%\.gemini\antigravity\conversations\` klasöründe `.pb` dosyalarının olduğunu kontrol edin

### "Execution Policy hatası"
```powershell
# Sadece bu oturum için izin ver
Set-ExecutionPolicy Bypass -Scope Process -Force

# Veya kalıcı olarak (dikkatli olun)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

---

## ⚠️ Önemli Notlar

1. **Mutlak Yol**: Proje **mutlaka** `C:\AgentsHUB` konumuna kurulmalıdır. Tüm iç referanslar bu yola bağlıdır.
2. **API Güvenliği**: Paketteki API anahtarları temizlenmiştir. Kendi anahtarlarınızı girmeniz gerekir.
3. **Antigravity Versiyonu**: Zihin verisi, Antigravity'nin son sürümüyle uyumludur. Farklı bir sürüm kullanıyorsanız bazı veriler uyumsuz olabilir.
4. **Windows Only**: Bu sistem şu an sadece Windows üzerinde çalışmaktadır.

---

*Bu paket ATLAS V4.0 tarafından oluşturulmuştur.*
*Tarih: 2026-04-05*
