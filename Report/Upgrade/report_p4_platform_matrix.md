# AgentsHUB SKILL & EXTENSION ENTEGRASYON RAPORU
## PART 4 / 4 — PLATFORM-SPESİFİK GRUP + NİHAİ MATRİS

> Bu kısım; belirli bir işletim sistemine (macOS, Linux), coğrafyaya (Asya) veya niş donanıma özel geliştirilen modülleri kapsar.
> AgentsHUB'ın gücü: **Windows-first, cross-platform sonrası** mimari.
> Bu grup çoğunlukla "kaldırılan" modülleri içerir; ancak bazıları Windows muadili yazılarak kurtarılabilir.

---

## 1. MACOS-ONLY (Apple Ekosistemi) — TAMAMIYLE BUDANIYOR

Bu modüller AppleScript, macOS sistem API'leri veya Mac-only binary'lere bağımlıdır. Windows ortamında çalışması imkânsız.

| Modül | Ne Yapar | SWOT Özeti | AgentsHUB Kararı | Windows Muadili |
|---|---|---|---|---|
| `apple-notes` | Apple Notes'a yazma/okuma (AppleScript) | **S:** Mac kullanıcısı için pratik **T:** Windows'ta sıfır değer | ❌ KALDIRILDI | `obsidian_memory.js` veya `write_file` |
| `apple-reminders` | Apple Reminders yönetimi (AppleScript) | **S:** macOS görev yönetimi **T:** Platform bağımlı | ❌ KALDIRILDI | `cron_manager.js` (zaten var) |
| `bear-notes` | Bear not uygulaması (Mac/iOS only) | **S:** Zengin MD desteği **T:** Windows'ta çalışmaz | ❌ KALDIRILDI | `obsidian_memory.js` |
| `bluebubbles` (Skill) | iMessage via BlueBubbles Mac server | **W:** Mac server zorunlu, Apple ToS riski | ❌ KALDIRILDI | `whatsapp_bridge.js` |
| `bluebubbles` (Extension) | BlueBubbles TypeScript kanal eklentisi | **W:** Mac server zorunlu | ❌ KALDIRILDI | `whatsapp_bridge.js` |
| `imsg` | iMessage AppleScript ile gönderme | **W:** AppleScript, macOS özel | ❌ KALDIRILDI | `whatsapp_bridge.js` |
| `imessage` (Extension) | iMessage TypeScript kanal eklentisi | **W:** macOS özel | ❌ KALDIRILDI | `whatsapp_bridge.js` |
| `things-mac` | Things 3 görev uygulaması (URL scheme) | **W:** Mac/iOS özel | ❌ KALDIRILDI | `cron_manager.js` |
| `peekaboo` | Ekran görüntüsü (Mac imagesnap CLI) | **S:** Ajana "gözler" verir **W:** Mac CLI | ⚠️ **Windows Muadili Yazılabilir** | PowerShell `screenshot_capture.js` |
| `camsnap` | Kamera karesi (Mac imagesnap) | **S:** Fabrika izleme senaryosu **W:** Mac CLI | ⚠️ **Windows Muadili Yazılabilir** | PowerShell / WinRT Camera API |

### ⚠️ Kurtarılabilir Mac Modülleri (Windows için Yeniden Yazım)

**`peekaboo` → `screenshot_capture.js` (Windows):**

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Ajan ekranı görebilir: UI test, hata ayıklama, form doldurma kontrolü. |
| **Zayıflık (W)** | Gizlilik: ekran kaydı KVKK kapsamında. Kullanıcı izni şart. |
| **Fırsat (O)** | QA Ajanı: yazılım test sürecini otomatize. ERP ekranını okur, veri çeker. |
| **Tehdit (T)** | Yetkisiz ekran kaydı yasal risk. |

| Zorluk | Süre | Maliyet | Teknoloji |
|---|---|---|---|
| 🟡 Orta | 3–5 gün | Sıfır | PowerShell `System.Windows.Forms.Screen` |

**`camsnap` → `camera_capture.js` (Windows):**

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Fabrika bant izleme: kamera → frame → Gemini Vision → "hata var" uyarısı. |
| **Zayıflık (W)** | Kamera izni, KVKK. Hardware bağımlı. |
| **Fırsat (O)** | Sanayi KOBİ için biricik değer önerisi: "AI gözlü üretim hattı asistanı". |
| **Tehdit (T)** | Gizlilik yasaları. |

| Zorluk | Süre | Maliyet | Teknoloji |
|---|---|---|---|
| 🟡 Orta | 3–5 gün | Sıfır | Node.js `windows-camera` veya PowerShell WinRT |

---

## 2. LİNUX-ONLY MODÜLLER

| Modül | Ne Yapar | SWOT Özeti | AgentsHUB Kararı | Windows Alternatifi |
|---|---|---|---|---|
| `tmux` | Terminal multiplexer session yönetimi | **S:** Linux sunucu yönetimi **W:** Windows'ta yok | ⚠️ WSL2 kuruluysa çalışır | Windows Terminal via `byterover.js` |
| `sglang` | Yerel GPU model hosting (Linux/CUDA) | **S:** Sıfır API maliyeti air-gap **W:** CUDA + Linux gerektiriyor | 🔵 Uzun vadeli (GPU sunucu deploy) | Ollama (Windows'ta çalışır) |
| `vllm` | Başka yerel GPU hosting framework | **S:** Production-grade local model **W:** Linux + GPU zorunlu | 🔵 Uzun vadeli | Ollama (Windows'ta çalışır) |
| `sherpa-onnx-tts` | Offline TTS (C++ ONNX binary) | **S:** Gizlilik dostu offline ses **W:** Binary platform bağımlı | 🔴 KALDIRILDI | ElevenLabs API veya Microsoft TTS |

---

## 3. ASYA ODAKLI MODÜLLER (Coğrafi Özelleştirme)

Bu modüller Türkiye ve Avrupa pazarı için alakasız; veri güvenliği endişesi taşıyanlar da var.

| Modül | Hedef Pazar | Sorun | AgentsHUB Kararı |
|---|---|---|---|
| `feishu` / Lark | Çin + Güneydoğu Asya (ByteDance) | ByteDance veri riski | ❌ KALDIRILDI |
| `line` | Japonya / Tayvan / Tayland | Türkiye pazarında kullanımsız | ❌ KALDIRILDI |
| `zalo` + `zalouser` | Vietnam (70M kullanıcı) | Türkiye pazarında kullanımsız | ❌ KALDIRILDI |
| `minimax` | Çin LLM platformu | ByteDance bağlantısı, veri riski | ❌ KALDIRILDI |
| `moonshot` | Çin (Kimi AI) | Çin menşeili, veri riski | ❌ KALDIRILDI |
| `kimi-coding` | Çin (Kimi kodlama modeli) | Çin menşeili | ❌ KALDIRILDI |
| `byteplus` | ByteDance bulut servisi | ByteDance veri riski | ❌ KALDIRILDI |
| `volcengine` | ByteDance bulut (Doubao LLM) | ByteDance veri riski | ❌ KALDIRILDI |
| `qianfan` | Baidu ERNIE modeli | Çin menşeili | ❌ KALDIRILDI |
| `modelstudio` | Alibaba Model Studio | Çin menşeili | ❌ KALDIRILDI |
| `xiaomi` | Xiaomi AI servisleri | Niş, Çin menşeili | ❌ KALDIRILDI |

**NOT:** Asya pazarına girilmek istenirse bu modüller **ayrı, izole bir "Asia Edition"** olarak konumlandırılabilir. Ana AgentsHUB dağıtımına dahil edilmemelidir.

---

## 4. NİŞ DONANIM VE EĞLENCE MODÜLLER

| Modül | Sorun | Karar |
|---|---|---|
| `eightctl` (Eight Sleep yatak) | Niş IoT cihazı; KOBİ alakasız | ❌ KALDIRILDI |
| `openhue` (Philips Hue) | Niş akıllı ampül kontrolü | ❌ KALDIRILDI |
| `sonoscli` (Sonos hoparlör) | Niş ses sistemi | ❌ KALDIRILDI |
| `spotify-player` | Ofis müzik; kurumsal değer yok | ❌ KALDIRILDI |
| `songsee` (müzik tanıma) | Kurumsal değer yok | ❌ KALDIRILDI |
| `gifgrep` (GIF arama) | Kurumsal değer yok | ❌ KALDIRILDI |
| `gog` (oyun platformu) | Kurumsal değer yok | ❌ KALDIRILDI |
| `twitch` (canlı yayın) | Kurumsal değer yok | ❌ KALDIRILDI |

---

## 5. YASAL RİSK VE TOE İHLALİ

| Modül | Risk | Karar |
|---|---|---|
| `copilot-proxy` | GitHub ToS ihlali; hesap ban riski | ❌ KESİNLİKLE KALDIRILDI |
| `github-copilot` (provider) | GitHub ToS ihlali; hesap ban riski | ❌ KESİNLİKLE KALDIRILDI |
| `wacli` (headless WhatsApp) | WhatsApp ToS; ban riski + Chromium instability | ❌ KALDIRILDI — Baileys tercih et |

---

## 6. ZATEN MEVCUT (AgentsHUB'da var, tekrar gerek yok)

| Modül | Neden Atlanıyor |
|---|---|
| `gemini` (skill) | `gemini_adapter.js` zaten mevcut |
| `model-usage` (skill) | `telemetry_tracker.js` zaten mevcut |
| `session-logs` (skill) | `Chats/` klasörü zaten log tutuyor |
| `summarize` (skill) | LLM zaten özetliyor; ayrı skill gereksiz |
| `weather` (skill) | `weather.js` zaten Marketplace'de var |
| `telegram` (extension) | `telegram_bridge.js` zaten çalışıyor |
| `openshell` (extension) | `byterover.js` + `sandbox_runner.js` zaten mevcut |
| `xurl` (URL işlemleri) | `web_scraper.js` kapsamında zaten var |

---

## NİHAİ ENTEGRASYON ÖNCELİK MATRİSİ (Tüm 4 Grup)

### 🔴 KRİTİK — İlk 3 Hafta

| # | Modül | Grup | Süre | Neden Kritik |
|---|---|---|---|---|
| 1 | `openrouter` | LLM Provider | 1 gün | Gemini SPOF ortadan kalkar; 200+ model anında erişilir |
| 2 | `whatsapp` | Kanal | 1 hafta | KOBİ pazarına giriş; ticari değer 10x |
| 3 | `tavily` | Skill/Tool | 1 gün | Araştırma ajanının veri kaynağı |
| 4 | `anthropic` | LLM Provider | 3–5 gün | Fallback + kalite yükseltme |
| 5 | `openai` | LLM Provider | 3–5 gün | Endüstri standardı + embedding |
| 6 | `google` (Gmail+Drive+Cal) | Skill/Tool | 1 hafta | Sekreter ajanı; iş akışı otomasyonu |

---

### 🟠 YÜKSEK — İlk 2 Ay

| # | Modül | Grup | Süre |
|---|---|---|---|
| 7 | `deepseek` | LLM Provider | 1 gün |
| 8 | `groq` | LLM Provider | 1 gün |
| 9 | `memory-core` + `memory-lancedb` | Skill/Tool | 3–5 gün |
| 10 | `brave` + `duckduckgo` | Skill/Tool | 1 gün her biri |
| 11 | `openai-whisper-api` | Skill/Tool | 1–2 gün |
| 12 | `slack` | Kanal | 3–5 gün |
| 13 | `firecrawl` | Skill/Tool | 1 gün |
| 14 | `exa` | Skill/Tool | 1–2 gün |
| 15 | `browser` (Playwright) | Skill/Tool | 1 hafta |
| 16 | `github` | Skill/Tool | 3–5 gün |
| 17 | `himalaya` (e-posta) | Skill/Tool | 4–6 gün |
| 18 | `nano-pdf` | Skill/Tool | 1 gün |
| 19 | `video-frames` | Skill/Tool | 3–5 gün |
| 20 | `healthcheck` | Skill/Tool | 1 gün |
| 21 | `synthetic` (mock) | LLM Provider | 1 gün |
| 22 | `skill-creator` | Skill/Tool | 1–2 hafta |
| 23 | `mcporter` (MCP) | Skill/Tool | 1–2 hafta |

---

### 🟡 ORTA — 3–6 Ay

| # | Modül | Grup |
|---|---|---|
| 24 | `notion` | Skill/Tool |
| 25 | `trello` | Skill/Tool |
| 26 | `obsidian` | Skill/Tool |
| 27 | `elevenlabs` | Skill/Tool |
| 28 | `fal` (görüntü) | Skill/Tool |
| 29 | `perplexity` | Skill/Tool |
| 30 | `blogwatcher` (RSS) | Skill/Tool |
| 31 | `discord` | Kanal |
| 32 | `msteams` | Kanal |
| 33 | `amazon-bedrock` | LLM Provider |
| 34 | `huggingface` | LLM Provider |
| 35 | `ollama` | LLM Provider |
| 36 | `mistral` | LLM Provider |
| 37 | `cloudflare-ai-gateway` | LLM Provider |
| 38 | `litellm` | LLM Provider |
| 39 | `microsoft-foundry` | LLM Provider |
| 40 | `node-connect` (SSH) | Skill/Tool |
| 41 | `deepgram` | Skill/Tool |
| 42 | `ordercli` (ERP) | Skill/Tool |
| 43 | `oracle` (DB) | Skill/Tool |
| 44 | `goplaces` | Skill/Tool |
| 45 | `voice-call` | Skill/Tool |
| 46 | `acpx` (multi-agent) | Skill/Tool |
| 47 | `screenshot_capture` (Win) | Platform Kurtarma |
| 48 | `camera_capture` (Win) | Platform Kurtarma |

---

### 🔵 DÜŞÜK — Gerektiğinde

| Modüller |
|---|
| `xai`, `together`, `venice`, `sglang`, `vllm`, `matrix`, `signal`, `mattermost`, `googlechat`, `nextcloud-talk`, `sherpa-onnx-tts`, `tmux` (WSL) |

---

## HIZLI BAŞLANGIÇ REÇETESİ (İlk 3 Hafta)

```
Gün 1:   openrouter_adapter.js → 200+ LLM erişimi
Gün 2:   tavily_search.js → Araştırma motoru
Gün 3:   duckduckgo_search.js + brave_search.js → Yedek arama
Gün 4–8: whatsapp_bridge.js → KOBİ kanalı, Dashboard QR entegrasyonu
Gün 9–13: anthropic_adapter.js + openai_adapter.js → Native fallback
Gün 14:  nano-pdf + healthcheck + whisper_transcriber → 3 küçük skill
Gün 15:  google_workspace.js (OAuth + Gmail + Calendar)
```

**3 hafta sonrasında AgentsHUB:**
- 200+ LLM modelini fallback zinciriyle yönetiyor
- WhatsApp'tan müşteri mesajı alıp yanıtlıyor
- Web araştırması yapıyor (Tavily + Brave + DDG)
- PDF okuyor, e-posta yazıyor, sistem izliyor
- Google takvim güncelliyor

> **Toplam Maliyet (İlk 3 Hafta):** Yalnızca API kullanım ücretleri (OpenRouter, Tavily) — tek satır altyapı maliyeti yok.
