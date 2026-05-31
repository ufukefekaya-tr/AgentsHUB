<div align="center">

# 🤖 AgentsHUB

**Kişisel bilgisayarınızda çalışan, otonom AI ajan platformu.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-brightgreen)](https://nodejs.org)
[![Version](https://img.shields.io/badge/Version-2.0.0--beta-blue)]()
[![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey)]()

[Türkçe](#-türkçe) • [English](#-english)

</div>

---

## 🇹🇷 Türkçe

### Nedir?

AgentsHUB, kendi bilgisayarınızda çalışan, dosya okuyup yazan, terminal komutu çalıştıran, internet araması yapan, ekran görüntüsü alan ve çok daha fazlasını yapabilen **otonom AI ajan platformudur**.

Tek bir chatbot değil — **ordu gibi çalışan çoklu ajan sistemi.**

### ✨ Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🤖 **Çoklu Ajan** | Birden fazla bağımsız ajan oluştur ve yönet |
| 🧠 **29 Yetenek** | Dosya, terminal, web, PDF, Python, Excel, GitHub... |
| 🔍 **Çoklu Arama** | Google, DuckDuckGo, Brave, Tavily entegrasyonu |
| 🌐 **Headless Browser** | Playwright ile web gezgini |
| 💬 **Telegram** | Bot entegrasyonu ile uzaktan erişim |
| 🎨 **Görsel Üretme** | AI ile görsel oluşturma (Imagen) |
| ⏰ **Cron** | Zamanlanmış otonom görevler |
| 📊 **Telemetri** | Canlı token ve maliyet izleme |
| 🛡️ **Güvenlik** | Exec Approval, CyberShield, SSRF/Path Guard |
| 🧬 **Kaizen** | Otonom öz-değerlendirme motoru |
| 📦 **Skill Market** | Yetenekleri tek tıkla kur/kaldır |
| 🔗 **Çoklu Ajan İletişim** | Ajanlar arası sinyal ve mesajlaşma |

### ⚡ Hızlı Başlangıç

**Gereksinimler:** Node.js v18+, [Google AI Studio API Key](https://aistudio.google.com)

```bash
# 1. Klonla
git clone https://github.com/ufukefekaya-tr/AgentsHUB.git
cd AgentsHUB

# 2. Bağımlılıkları kur
cd app && npm install

# 3. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle

# 4. Başlat
node src/gateway/ui_server.js
```

**Alternatif: Otomatik Kurulum**

```powershell
# PowerShell'i yönetici olarak açın
Set-ExecutionPolicy Bypass -Scope Process -Force
.\INSTALL.ps1
```

Dashboard: **http://localhost:3434**

### 🏗️ Mimari

```
AgentsHUB/
├── INSTALL.ps1              ← Otomatik kurulum scripti
├── launcher.mjs             ← System Tray + Server Manager
├── AgentsHUB.vbs            ← Çift tıkla başlat (Windows)
├── app/
│   ├── src/
│   │   ├── gateway/routes/  ← HTTP/SSE API
│   │   ├── bridge/          ← LLM adapter (Gemini, Vertex AI)
│   │   ├── core/            ← ReAct loop, circuit breaker, telemetry
│   │   ├── memory/          ← Hafıza katmanları (L1 RAM, L2 SQLite)
│   │   └── security/        ← Shield, SSRF Guard, Path Guard
│   ├── dashboard/           ← React + Vite frontend
│   └── Agents/              ← Ajan workspace'leri
└── Marketplace/skills/      ← 29 yetenek dosyası
```

### 🔧 Desteklenen Modeller

| Provider | Modeller |
|----------|---------|
| **Google AI Studio** | gemini-2.5-flash, gemini-2.5-pro |
| **Vertex AI** | gemini-3.1-pro-preview, gemini-2.5-flash |

### 🤝 Katkıda Bulun

1. Fork'la
2. `feature/ozellik-adi` branch'i oluştur
3. Değişikliklerini commit et
4. PR gönder

---

## 🇬🇧 English

### What is it?

AgentsHUB is an **autonomous AI agent platform** that runs on your personal computer. Your agents can read/write files, run terminal commands, search the web, take screenshots, generate images, and much more.

Not just one chatbot — **a multi-agent system that works like an army.**

### ⚡ Quick Start

**Requirements:** Node.js v18+, [Google AI Studio API Key](https://aistudio.google.com)

```bash
# 1. Clone
git clone https://github.com/ufukefekaya-tr/AgentsHUB.git
cd AgentsHUB

# 2. Install dependencies
cd app && npm install

# 3. Set up environment
cp .env.example .env
# Edit .env file

# 4. Start
node src/gateway/ui_server.js
```

**Alternative: Automated Setup (Windows)**

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
.\INSTALL.ps1
```

Dashboard: **http://localhost:3434**

### 📦 Marketplace Skills (29)

`byterover` · `calculator` · `weather` · `google_search` · `web_scraper` · `url_opener` · `system_monitor` · `clipboard` · `screenshot` · `write_file` · `get_time` · `clawhub_installer` · `clawhub_remote` · `skill_creator` · `browser_agent` · `python_runner` · `pdf_extractor` · `tavily_search` · `duckduckgo_search` · `brave_search` · `google_workspace` · `email_manager` · `github_manager` · `health_checker` · `auto_capture` · `signal_agent` · `mcp_bridge` · `excel_manager` · `image_generator`

### 📄 License

MIT © 2026 [EHARTE Ltd.](https://agentshub.com.tr)
