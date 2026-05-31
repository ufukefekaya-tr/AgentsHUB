# OPENCLAW vs AGENTSHUB — Tam Rekabet Analizi

**Tarih:** 2026-03-29  
**Yazan:** ATLAS  
**Amaç:** OpenClaw (ClawHub'ın açık kaynak ajan çekirdeği) ile AgentsHUB'ın derinlemesine teknik, stratejik ve operasyonel karşılaştırması.

---

## 1. GENEL PROFIL

| Metrik | OpenClaw | AgentsHUB |
|--------|----------|-----------|
| **Tür** | CLI-tabanlı çok kanallı AI Gateway | GUI-tabanlı yerel AI ajan platformu |
| **Dil** | TypeScript (tam tip güvenliği) | JavaScript (ESM, tipsiz) |
| **Kaynak Kod** | ~16 MB, ~1300 satır package.json | ~200 KB, 36 satır package.json |
| **Lisans** | MIT | Özel |
| **Bağımlılık** | 80+ paket (zod, undici, ink, marked...) | 8 paket (express, genai, grammy...) |
| **Test** | 100+ test dosyası (.test.ts), Vitest | 0 test dosyası |
| **Versiyon** | 2026.3.28 (CalVer) | 1.0.0 |
| **Arayüz** | Terminal TUI (Ink/React CLI) + basit Web UI | React Dashboard (SPA, Vite) |
| **Skill Sayısı** | 51 dahili skill | 13 dahili skill |
| **Hedef Kitle** | Geliştiriciler / Terminal kullanıcıları | Son kullanıcılar / KOBİ'ler |
| **Çalışma Modu** | Daemon process + Gateway | Tekil Node.js sunucu |

---

## 2. MİMARİ KARŞILAŞTIRMA

### 2.1. OpenClaw Mimarisi
```
CLI (openclaw.mjs)
  ├── Daemon (arka plan process, otomatik restart)
  ├── Gateway (HTTP/WebSocket sunucu, çok kanallı mesaj yönlendiricisi)
  ├── Plugin SDK (120+ alt modül, tam tip güvenliği)
  │   ├── Provider Plugins (Google, OpenAI, Anthropic, Ollama, DeepSeek, Mistral...)
  │   ├── Channel Plugins (Discord, Telegram, Slack, iMessage, Matrix, MS Teams, WhatsApp, IRC...)
  │   └── Feature Plugins (memory, image-gen, speech, MCP, browser...)
  ├── Context Engine (hafıza motorları registry, embeddings, QMD)
  ├── Security (SSRF koruması, sandbox, izolasyon, path-guard)
  ├── Cron (izole ajan process'i ile zamanlanmış görev)
  ├── ACP (Agent Communication Protocol)
  └── Skills (SKILL.md + frontmatter metadata, çoklu kaynak: bundled/managed/workspace/plugin/personal)
```

### 2.2. AgentsHUB Mimarisi
```
Express Server (ui_server.js)
  ├── Dashboard (React SPA, tek sayfa)
  ├── LLM Bridge (ReAct döngüsü, context prune, L3 cache)
  ├── Gemini Adapter (AI Studio + Vertex AI)
  ├── Skill Loader (dinamik ESM import, config-tabanlı filtre)
  ├── Memory (UMI: L1 RAM + L2 Vektör/SQLite + L3 Google Cache)
  ├── CyberShield (girdi sanitizasyonu)
  ├── Kaizen Engine (otonom davranış iyileştirme)
  ├── Cron Manager (node-cron)
  ├── Genesis (ajan doğurma sistemi)
  ├── Marketplace (lokal skill deposu + ClawHub.ai remote erişim)
  └── Telegram Bot (Grammy)
```

### Mimari Farklar

| Yön | OpenClaw | AgentsHUB |
|-----|----------|-----------|
| **Çalışma Modeli** | Daemon + Gateway (ayrı process'ler) | Tek Node.js process |
| **Model Desteği** | 15+ provider (Google, OpenAI, Anthropic, Ollama, DeepSeek, Mistral, Bedrock, HuggingFace, BytePlus...) | 1 provider (Google Gemini via @google/genai) |
| **Kanal Desteği** | Discord, Telegram, Slack, iMessage, Matrix, MS Teams, WhatsApp, IRC, Google Chat, LINE, Nostr... | Web Dashboard + Telegram |
| **Plugin Sistemi** | 120+ modüllü SDK, tam runtime izolasyonu, provider/channel/feature ayrımı | Yok (monolitik) |
| **MCP Desteği** | Var (Model Context Protocol) | Yok |
| **ACP Desteği** | Var (Agent Communication Protocol, ajan-ajan iletişim) | Yok |

---

## 3. SKILL SİSTEMİ KARŞILAŞTIRMASI (KRİTİK)

### 3.1. Format

**OpenClaw:**
```markdown
---
name: weather
description: "Get current weather and forecasts..."
metadata:
  openclaw:
    emoji: "☔"
    requires:
      bins: ["curl"]
    install:
      - kind: brew
        formula: curl
---
# Weather Skill
(Ajanın bu aracı nasıl kullanacağını açıklayan uzun doküman)
```
- SKILL.md = **doküman-tabanlı** (ajan dosyayı okur, komutları öğrenir)
- Çalıştırılabilir kod İÇERMEZ — ajan bash/terminal komutlarını kendisi çalıştırır
- Bağımlılık yönetimi var (brew/npm/go/uv/download)
- OS uyumluluk filtreleme var

**AgentsHUB:**
```javascript
export const skill = {
    name: "weather",
    execute: async (args) => {
        // Doğrudan çalışan kod
        const res = await fetch("https://api.open-meteo.com/...");
        return formatResult(res);
    }
};
```
- Çalıştırılabilir `.js` modülü — function calling ile doğrudan execute edilir
- Ajan kodu çalıştırmaz, sistem çalıştırır (sandbox)
- Bağımlılık yönetimi yok, yerine built-in fetch/child_process

### 3.2. Skill Kaynakları

| Kaynak | OpenClaw | AgentsHUB |
|--------|----------|-----------|
| Bundled (dahili) | 51 skill | 13 skill |
| Managed (global) | `~/.config/openclaw/skills/` | `Marketplace/skills/` |
| Workspace (proje) | `./skills/` | `Agents/{id}/skills/` |
| Plugin Skills | Pluginlerden otomatik | Yok |
| Personal | `~/.agents/skills/` | Yok |
| Remote Registry | ClawHub (CLI: `clawhub install`) | ClawHub (API: `clawhub_remote.js` tool) |

### 3.3. Skill Öne Çıkanlar

| OpenClaw'un 51 Skill'i | Kategori |
|-----|----------|
| coding-agent, skill-creator | Kod üretme / skill üretme |
| github, gh-issues, trello, notion, obsidian | Proje yönetimi |
| discord, slack, imsg | İletişim |
| spotify-player, sonoscli, songsee | Müzik |
| nano-pdf, summarize, xurl | Doküman |
| 1password, healthcheck | Güvenlik / Sistem |
| clawhub, mcporter | Marketplace / MCP |
| voice-call, sherpa-onnx-tts, openai-whisper | Ses/Konuşma |
| camsnap, video-frames, peekaboo | Görüntü/Video |
| apple-notes, apple-reminders, bear-notes, things-mac | macOS entegrasyonları |
| gemini, openai-whisper-api | AI model entegrasyonları |
| weather, goplaces, oracle | Bilgi |
| tmux, session-logs, node-connect | Sistem/DevOps |

---

## 4. GÜVENLİK KARŞILAŞTIRMASI

| Güvenlik Katmanı | OpenClaw | AgentsHUB |
|------------------|----------|-----------|
| **SSRF Koruması** | ✅ Tam (ssrf-runtime, outbound proxy) | ❌ Yok |
| **Sandbox İzolasyonu** | ✅ Ayrı process + path-guard + realpath doğrulama | ⚠️ Temel (SandboxRunner, timeout) |
| **Path Traversal Koruması** | ✅ `isPathInside()` + realpath çözümleme + symlink guard | ⚠️ Kısmi |
| **API Key Maskeleme** | ✅ `mask-api-key.ts` | ❌ Yok (loglardan okunabilir) |
| **Girdi Sanitizasyonu** | ✅ Kanal bazlı (allowlist, mention-gating) | ✅ CyberShield |
| **Skill Güvenliği** | ✅ VirusTotal + LLM tarama (ClawHub registry) + dosya boyutu limiti (256KB) | ⚠️ Sadece sandbox timeout |
| **TLS/Sertifika** | ✅ `src/infra/tls/` | ❌ HTTP-only |
| **Rate Limiting** | ✅ Kanal bazlı debounce + rate limit | ✅ express-rate-limit |
| **Secret Yönetimi** | ✅ `src/secrets/` (şifreli depolama) | ❌ Plaintext config.json |

---

## 5. PERFORMANS VE TOKEN YÖNETİMİ

| Metrik | OpenClaw | AgentsHUB |
|--------|----------|-----------|
| **Token Takibi** | ✅ `usage.ts` + `usage-format.ts` (detaylı maliyet raporlama) | ✅ Telemetry tracker |
| **Context Budgeting** | ✅ Skill prompt'u için karakter bütçesi (30K default) + binary search ile fit | ✅ Context prune (40K token eşikle buda) |
| **Skill Prompt Optimizasyonu** | ✅ Compact mode (açıklama kaldırma), path kısaltma (~/ prefix), 150 skill limiti | ⚠️ Tüm skill açıklamaları enjekte edilir, limit yok |
| **Cache** | ⚠️ Workspace bootstrap cache | ✅ 3 katmanlı: L1 RAM + L2 Vektör + L3 Google Cache |
| **Streaming** | ✅ SSE + draft-stream-controls | ✅ SSE streaming |
| **Concurrent Queue** | ✅ `keyed-async-queue`, `run-with-concurrency` | ❌ Tek mesaj seri işleme |
| **Circuit Breaker** | ❌ Yok (retry-runtime var) | ✅ Tam devre kesici |
| **Memory** | ✅ LanceDB (vektör), QMD engine, embedding host, multimodal | ✅ SQLite embedding + JSON |

---

## 6. SWOT ANALİZİ

### 6.1. OpenClaw SWOT

| | Olumlu | Olumsuz |
|---|---|---|
| **İç** | **Güçlü Yönler:** 51 skill, 15+ model provider, 12+ iletişim kanalı, Plugin SDK, TypeScript tip güvenliği, 100+ test, MCP/ACP desteği, profesyonel güvenlik katmanı, skill prompt budget yönetimi | **Zayıf Yönler:** CLI-ağırlıklı (GUI yok denecek kadar basit), kurulum karmaşık, KOBİ'ye sunulamaz, öğrenme eğrisi çok yüksek, 80+ bağımlılık = kırılgan supply chain |
| **Dış** | **Fırsatlar:** Açık kaynak topluluk gücü, ClawHub registry ekosistemi, enterprise-ready altyapı | **Tehditler:** Karmaşıklık yüzünden topluluk benimsemesi zor, monorepo bakım maliyeti yüksek, tek kişi (steipete) riski |

### 6.2. AgentsHUB SWOT

| | Olumlu | Olumsuz |
|---|---|---|
| **İç** | **Güçlü Yönler:** Kullanıcı dostu GUI, tek tıkla kurulum, sıfır teknik bilgi gerektiren arayüz, otonom yetenek edinme (ClawHub remote), çok katmanlı hafıza (L1+L2+L3), Kaizen otonom iyileştirme, Genesis ajan doğurma, çalıştırılabilir skill'ler (doğrudan execute), circuit breaker | **Zayıf Yönler:** Tek model provider (Gemini), 0 test, JavaScript (tip güvenliği yok), güvenlik katmanı zayıf, tek dosya Dashboard (1963 satır), secret'lar plaintext |
| **Dış** | **Fırsatlar:** KOBİ pazarı (rakip yok), Türkiye sanayi sektörü, saha tecrübesi ile entegrasyon, .exe dağıtımı ile sıfır kurulum | **Tehditler:** Google API bağımlılığı (tek provider), scaling sorunları, güvenlik açıkları |

---

## 7. METRİK BAZLI PUANLAMA (10 üzerinden)

| Metrik | OpenClaw | AgentsHUB | Not |
|--------|:--------:|:---------:|-----|
| **Kullanışlılık (Son Kullanıcı)** | 3/10 | 8/10 | OpenClaw terminal; AgentsHUB GUI |
| **Kullanışlılık (Geliştirici)** | 9/10 | 5/10 | OpenClaw'un plugin SDK'si olağanüstü |
| **Basitlik (Kurulum)** | 4/10 | 9/10 | `npm i -g openclaw` vs tek dosya çalıştır |
| **Basitlik (Mimari)** | 3/10 | 8/10 | 16MB vs 200KB |
| **Teknik Altyapı** | 9/10 | 5/10 | TypeScript, test, plugin SDK, MCP, ACP |
| **Güvenlik** | 9/10 | 3/10 | SSRF, sandbox, TLS, secret vault vs temel |
| **Performans** | 7/10 | 6/10 | OpenClaw concurrent queue, prompt budget |
| **Token Yönetimi** | 8/10 | 7/10 | Prompt budget, compact mode vs L3 cache |
| **Hafıza Sistemi** | 7/10 | 8/10 | LanceDB vs 3 katman (L1+L2+L3+Google Cache) |
| **Model Çeşitliliği** | 10/10 | 2/10 | 15+ provider vs sadece Gemini |
| **Kanal Çeşitliliği** | 10/10 | 4/10 | 12+ kanal vs Web+Telegram |
| **Skill Ekosistemi** | 9/10 | 5/10 | 51 skill + ClawHub CLI + SKILL.md vs 13 skill + API |
| **Otonom Evrim** | 3/10 | 8/10 | Ajan skill üretemez vs ClawHub arama+kod yazma+kur |
| **Test Altyapısı** | 9/10 | 0/10 | 100+ test vs sıfır |
| **Dokümantasyon** | 7/10 | 6/10 | docs/ dizini vs DNA.md + raporlar |
| **Ölçeklenebilirlik** | 8/10 | 4/10 | Daemon+Gateway vs tek process |
| **KOBİ uygunluğu** | 2/10 | 9/10 | CLI teknik; AgentsHUB sıfır sürtünme |
| | | | |
| **TOPLAM** | **117/170** | **97/170** | |
| **ORTALAMA** | **6.88** | **5.71** | |

---

## 8. NELERİ İÇİMİZE DAHİL ETMELİYİZ?

### 🔴 ZORUNLU (Dahil etmek ZORUNDAYIZ)

| # | Özellik | Neden | Nasıl |
|---|---------|-------|-------|
| 1 | **SSRF Koruması** | Ajan web_scraper ile herhangi bir URL'e gidebilir. İç ağ taraması yapabilir (192.168.x.x, localhost). Ciddi güvenlik açığı. | OpenClaw'un `outbound.ts` mantığını referans al — IP range blacklist + URL whitelist |
| 2 | **API Key Maskeleme** | Loglardan API key okunabiliyor. | `mask-api-key.ts` kopyala — basit regex maskeleme |
| 3 | **Path Traversal Koruması** | write_file ve byterover ile ajan sistem köküne erişebilir. | OpenClaw'un `isPathInside()` + realpath doğrulama mantığını kopyala |
| 4 | **Secret Şifreleme** | config.json'da API key plaintext duruyor. | Basit AES-256 şifreleme katmanı (keyring/credential store) |
| 5 | **Skill Dosya Boyutu Limiti** | Kötü niyetli skill terabyte dosya yazabilir. | OpenClaw'un `maxSkillFileBytes: 256_000` limiti |

### 🟡 DAHİL EDEBİLİRİZ (Büyük avantaj sağlar)

| # | Özellik | Avantajı | Zorluk |
|---|---------|----------|--------|
| 6 | **SKILL.md Desteği** | ClawHub uyumluluğu, ajanların daha detaylı skill dokümanı okuması | Orta — loader'a markdown parser ekle |
| 7 | **Skill Prompt Budget** | Token tasarrufu. 13 skill sorun değil ama 50+ olunca context patlayacak. | Düşük — karakter limiti + compact mod |
| 8 | **Multi-Provider** (OpenAI, Anthropic, Ollama) | Müşteri istediği modeli seçebilir, Gemini çökerse alternatif | Yüksek — her provider için adapter yaz |
| 9 | **Test Altyapısı** | Güvenilirlik. Şu an 0 test = kör uçuş. | Orta — Vitest + temel fonksiyon testleri |
| 10 | **MCP Desteği** | Model Context Protocol ile dış araç entegrasyonu (VS Code, IDE'ler) | Yüksek — protokol implementasyonu gerekli |

### 🟢 GÜZEL OLUR (Nice-to-have)

| # | Özellik | Avantajı | Zorluk |
|---|---------|----------|--------|
| 11 | **Plugin SDK** | 3. parti geliştiriciler kendi channel/provider/skill'lerini yazabilir | Çok Yüksek — tam mimari değişikliği |
| 12 | **TypeScript Geçişi** | Tip güvenliği, IDE yardımı, hata önleme | Çok Yüksek — tüm codebase yeniden yazım |
| 13 | **Concurrent Queue** | Çoklu kullanıcı aynı anda mesaj gönderebilsin | Orta — async queue implementasyonu |
| 14 | **ACP (Agent-to-Agent)** | Ajanlar arası iletişim protokolü | Yüksek — protokol tasarımı gerekli |
| 15 | **Discord/Slack Kanal** | KOBİ müşterileri Discord/Slack'ten erişsin | Orta — channel adapter yaz |

---

## 9. STRATEJİK SONUÇ (Mimar İçin)

### AgentsHUB'ın Haksız Avantajı
OpenClaw **teknik olarak üstün** ama **pazarlanabilir değil**. Bir KOBİ patronuna "Terminali aç, `openclaw setup` yaz" dediğinde adam kaçar.

AgentsHUB'ın gücü:
1. **Sıfır sürtünme:** .exe aç → API key yapıştır → kullan
2. **Otonom evrim:** Ajan kendi skill'ini bulup yazabiliyor (OpenClaw'da bu yok)
3. **3 katmanlı hafıza:** L1+L2+L3 (OpenClaw'un hafıza sistemi daha parçalı)
4. **Kaizen:** Ajan kendi davranışını otonom iyileştiriyor (OpenClaw'da yok)
5. **Genesis:** Yeni ajan doğurma (OpenClaw'da workspace template var ama daha basit)

### OpenClaw'dan Çalınacak En Kritik DNA
1. **Güvenlik katmanı** — SSRF + Path Guard + Secret Vault (acil)
2. **Skill prompt budget** — Token patlamasını önle (orta vade)
3. **SKILL.md formatı** — Ekosistem uyumluluğu (orta vade)
4. **Multi-provider** — Gemini monopolünü kır (uzun vade)

### Son Söz
> OpenClaw bir **mühendislik harikası** ama bir **iş harikası değil**. AgentsHUB ise tam tersi — mühendislik borcu yüksek ama iş değeri ve kullanıcı deneyimi çok güçlü. Strateji: **OpenClaw'un güvenlik ve altyapı DNA'sını çal, kendi KOBİ-first vizyonunu koru.**

| | OpenClaw | AgentsHUB |
|---|---------|-----------|
| **Bir cümlede** | Geliştiriciler için mükemmel, son kullanıcılar için imkansız | Son kullanıcılar için mükemmel, geliştiriciler için yetersiz |
| **Konum** | Mühendis aracı | İş aracı |
| **Stratejik hamle** | N/A | OpenClaw'un güvenlik+altyapısını al, KOBİ UX'ini koru |
