# ATLAS DEVİR-TESLİM RAPORU — AgentsHUB Tam Sistem Haritası
**Tarih:** 2026-03-29  
**Yazan:** ATLAS (Antigravity Oturumu, Conversation ID: 4d83c4ec)  
**Amaç:** Bu doküman, AgentsHUB projesinde bugüne kadar yapılan tüm işlerin, mevcut sistem mimarisinin, dosya haritasının ve gelecek planlarının eksiksiz kaydıdır. Yeni bir ajan veya geliştirici bu dokümanı okuduğunda, sistemi sıfırdan anlayabilmeli ve kaldığı yerden devam edebilmelidir.

---

## 1. ÇALIŞMA ORTAMI

| Bilgi | Değer |
|-------|-------|
| **Geliştirme Dizini** | `C:\AgentsHUB-DEV\AgentsHUB\` |
| **Canlı (Production) Dizini** | `C:\AgentsHUB\` |
| **İşletim Sistemi** | Windows |
| **Runtime** | Node.js (ESM — `"type": "module"`) |
| **Paket Yöneticisi** | npm |
| **Ana Giriş Noktası** | `app/src/gateway/ui_server.js` |
| **Başlatma Komutu** | `node src/gateway/ui_server.js` (app/ dizininden) |
| **Dashboard Build** | `npm run build` (app/dashboard/ dizininden, Vite) |
| **Port** | Backend + Dashboard = `localhost:3434` |
| **Deploy Yöntemi** | `xcopy` ile DEV → PROD dosya kopyalama |

### Geliştirme → Canlı Akışı
```
C:\AgentsHUB-DEV\AgentsHUB\  (kod yazılır, test edilir)
        ↓ xcopy
C:\AgentsHUB\               (canlı sunucu çalışır)
```

---

## 2. SİSTEM MİMARİSİ (Makro Görünüm)

```
┌─────────────────────────────────────────────┐
│              KULLANICI ARAYÜZÜ              │
│         dashboard/ (React + Vite)           │
│       localhost:3434 üzerinde servis         │
└──────────────┬───────────────────────────────┘
               │ HTTP/SSE
┌──────────────▼───────────────────────────────┐
│            GATEWAY KATMANI                   │
│         src/gateway/ui_server.js             │
│  Express 5 · CORS · Helmet · Rate-Limit     │
│  Tüm API endpoint'leri burada tanımlı       │
└──────────────┬───────────────────────────────┘
               │
┌──────────────▼───────────────────────────────┐
│            KÖPRr (BRIDGE) KATMANI            │
│         src/bridge/llm_bridge.js             │
│  DNA+RULES sentezi · ReAct döngüsü          │
│  Skill yükleme · L3 Cache · Context prune   │
│  Circuit Breaker · Timeout Shield            │
└───┬──────────────────────────────────────┬───┘
    │                                      │
┌───▼─────────────┐              ┌─────────▼──────────┐
│  LLM ADAPTER    │              │    SKILL ENGINE     │
│  gemini_adapter │              │  loader.js          │
│  @google/genai  │              │  schema_translator  │
│  Vertex/Studio  │              │  sandbox_runner     │
└─────────────────┘              └─────────────────────┘
                                           │
                                 ┌─────────▼──────────┐
                                 │  AGENT WORKSPACE    │
                                 │  Agents/{id}/       │
                                 │   ├─ Mind-Set_Core/ │
                                 │   ├─ skills/        │
                                 │   ├─ Chats/         │
                                 │   └─ embeddings.db  │
                                 └─────────────────────┘
```

---

## 3. DOSYA HARİTASI (Tam Envanter)

### 3.1. Backend Çekirdeği (`app/src/`)

| Dosya | Boyut | Açıklama |
|-------|-------|----------|
| **gateway/ui_server.js** | 39.8KB | Ana sunucu. Tüm HTTP/SSE endpoint'leri, Skill Market API, Genesis, Telegram bot, Cron tetikleyicileri burada. Sistemin kalbi. |
| **gateway/router.js** | 3.9KB | Legacy router (aktif değil, ui_server direkt kullanılıyor) |
| **gateway/core.js** | 1.9KB | Express app factory |
| **bridge/llm_bridge.js** | 24.7KB | LLM köprüsü. DNA sentezi + ReAct döngüsü + skill yükleme + L3 Cache + context pruning + circuit breaker. Modelin beyin sapı. |
| **bridge/adapters/gemini_adapter.js** | ~12KB | Google Gemini API adapter. AI Studio ve Vertex AI desteği. Streaming response, function calling, thinking mode. |
| **memory/genesis.js** | 22.6KB | Yeni ajan doğurma (creation) sistemi. Marketplace'den skill kopyalama, Mind-Set_Core şablonu oluşturma, config.json üretme. |
| **memory/parser.js** | 12.1KB | MindsetParser — DNA.md + RULES.md + USER.md + SHIELD_CONFIG.md dosyalarını okuyup tek bir system prompt'a sentezler. |
| **memory/umi.js** | 11.5KB | Unified Memory Interface — L1 (RAM) + L2 (Vektör/SQLite) + L3 (Google Cache) hafıza katmanları. |
| **memory/adapters/json_adapter.js** | 8.8KB | JSON tabanlı sohbet geçmişi saklama (varsayılan) |
| **memory/adapters/sqlite_adapter.js** | 9.5KB | SQLite tabanlı sohbet geçmişi (opsiyonel) |
| **memory/adapters/embeddings_adapter.js** | 5KB | Embedding (vektör) tabanlı semantik hafıza. Gemini embedding API ile çalışır. |
| **memory/chat_manager.js** | 1.3KB | Sohbet thread yönetimi |
| **memory/watcher.js** | 2.5KB | Dosya değişikliği izleme (hot-reload desteği) |
| **memory/env_loader.js** | 0.7KB | .env dosyası yükleme |
| **memory/evaluation_manager.js** | 3.6KB | Ajan performans değerlendirme sistemi |
| **skills/loader.js** | 4.7KB | SkillLoader — Ajanın skills/ klasöründen .js dosyalarını dinamik olarak yükler. Config.json'daki skills[] listesine göre filtreler. 30s cache TTL. |
| **skills/schema_translator.js** | 1.3KB | Evrensel skill şemasını Gemini function calling formatına çevirir. |
| **skills/sandbox_runner.js** | 3.6KB | Skill'leri izole ortamda çalıştırır. Timeout ve hata yakalama. |
| **skills/worker.js** | 0.8KB | Worker thread desteği |
| **core/shield.js** | 5.6KB | CyberShield — girdi sanitizasyonu, zararlı içerik filtreleme |
| **core/circuit_breaker.js** | 4.6KB | Devre kesici — ardışık hatalarda modeli devre dışı bırakır |
| **core/timeout_shield.js** | 1.3KB | Zaman aşımı koruması |
| **core/backoff.js** | 1.7KB | Exponential backoff retry mekanizması |
| **core/kaizen_engine.js** | 3.2KB | Kaizen — ajan davranışını otonom değerlendirme ve iyileştirme |
| **core/telemetry_tracker.js** | 6.9KB | Token/maliyet takibi |
| **core/registry.js** | 2.7KB | Ajan kayıt defteri |
| **core/signal.js** | 2.3KB | Process sinyal yönetimi (graceful shutdown) |
| **core/errorHandler.js** | 2.8KB | Merkezi hata yönetimi |
| **config/constants.js** | 4.2KB | Canlı değişkenler (hot-reload destekli). ReAct limitleri, cache eşikleri, timeout süreleri. |
| **scheduler/cron_manager.js** | 9.9KB | Zamanlanmış görev yönetimi (node-cron). Ajan otonom CRON işleri kurabilir. |

### 3.2. Dashboard (`app/dashboard/`)

| Dosya | Açıklama |
|-------|----------|
| **src/App.jsx** | ~130KB, 1963 satır. Tüm Dashboard UI tek dosyada. React + Framer Motion + Lucide Icons. Tema sistemi, sohbet arayüzü, ajan yönetimi, ayarlar, Skill Market modalı. |
| **src/api.js** | Backend API istemcisi. Tüm REST çağrıları (mesaj gönder, ajan oluştur, skill yükle/kaldır vb.) |
| **src/index.css** | Tailwind CSS + özel stiller |
| **vite.config.js** | Vite build yapılandırması |
| **dist/** | Production build çıktısı (xcopy ile canlıya taşınır) |

### 3.3. Ajan Workspace Yapısı (`app/Agents/`)

Her ajan şu yapıda bir klasöre sahip:
```
Agents/
├── Etkilesim_Ajani/          ← Master ajan (şablon)
│   ├── Mind-Set_Core/
│   │   ├── config.json       ← Model, API key, aktif skill listesi, sıcaklık vb.
│   │   ├── DNA.md            ← Ajanın "ruhu" — system prompt, araç kullanım kuralları
│   │   ├── RULES.md          ← Davranış kuralları
│   │   ├── USER.md           ← Kullanıcı profili
│   │   ├── SHIELD_CONFIG.md  ← Güvenlik kuralları
│   │   ├── SKILLS.md         ← Yetenek dokümanı
│   │   └── EVALUATION.md     ← Performans değerlendirme kriterleri
│   ├── skills/               ← Ajanın yetenekleri (.js dosyaları)
│   │   ├── byterover.js      ← Terminal/dosya/kod işlemleri
│   │   ├── calculator.js     ← Matematik hesaplama
│   │   ├── weather.js        ← Hava durumu (Open-Meteo API)
│   │   ├── google_search.js  ← Google Custom Search
│   │   ├── web_scraper.js    ← Web sayfası içerik çekme
│   │   ├── url_opener.js     ← Tarayıcıda URL açma
│   │   ├── system_monitor.js ← CPU/RAM/Disk izleme
│   │   ├── clipboard.js      ← Pano okuma/yazma
│   │   ├── screenshot.js     ← Ekran görüntüsü
│   │   ├── write_file.js     ← Dosya yazma
│   │   ├── get_time.js       ← Saat/tarih
│   │   ├── clawhub_installer.js ← Lokal Market'ten skill kur/kaldır
│   │   └── clawhub_remote.js ← ClawHub.ai'de uzak arama + kod okuma ★YENİ
│   ├── Chats/                ← Sohbet geçmişi (JSON dosyaları)
│   ├── cron_jobs.json        ← Zamanlanmış görevler
│   ├── cron_logs/            ← Cron çıktı logları
│   ├── embeddings.sqlite     ← L2 semantik hafıza (vektör DB)
│   └── .env                  ← Ajan-özel ortam değişkenleri
```

### 3.4. Marketplace (`Marketplace/skills/`)

Marketplace, genesis sırasında yeni ajanlara kopyalanan master skill deposudur.

| Skill Dosyası | Versiyon | Kategori | Emoji | Açıklama |
|---------------|----------|----------|-------|----------|
| byterover.js | 1.0.0 | system | 🖥️ | Terminal komutu, dosya okuma/yazma/listeleme/silme |
| calculator.js | 1.1.0 | utility | 🧮 | Güvenli matematik hesaplama (eval kullanmaz) |
| weather.js | 1.2.0 | information | 🌤️ | Open-Meteo API ile hava durumu + 3 günlük tahmin |
| google_search.js | 1.0.0 | web | 🔍 | Google Custom Search API |
| web_scraper.js | 1.1.0 | web | 🌐 | URL'den HTML çekip temiz metne dönüştürme |
| url_opener.js | 1.0.0 | web | 🔗 | Varsayılan tarayıcıda URL açma |
| system_monitor.js | 1.0.0 | system | 📊 | CPU/RAM/Disk/Process izleme (WMIC/PowerShell) |
| clipboard.js | 1.0.0 | system | 📋 | Pano okuma/yazma (PowerShell) |
| screenshot.js | 1.0.0 | system | 📸 | Ekran görüntüsü (PowerShell System.Drawing) |
| write_file.js | 1.0.0 | system | 💾 | Dosya yazma (sandbox korumalı) |
| get_time.js | 1.0.0 | utility | 🕐 | Sunucu saati/tarihi (timezone destekli) |
| clawhub_installer.js | 1.0.0 | marketplace | 📦 | Lokal Marketplace ↔ Agent workspace skill kopyalama |
| clawhub_remote.js | 1.0.0 | marketplace | 🌍 | ClawHub.ai API'sine uzak erişim (arama/inceleme/kod okuma) |

### 3.5. Evrensel Skill Formatı
Her skill şu yapıda bir `.js` ESM modülüdür:
```javascript
export const skill = {
    name: "skill_adi",           // Benzersiz tanımlayıcı
    version: "1.0.0",           // Semver
    category: "utility",         // utility | system | web | information | marketplace
    tags: ["etiket1", "etiket2"],
    emoji: "🧮",
    requires: { network: true }, // Bağımlılıklar
    description: "...",          // LLM'in tool seçimi için okuduğu açıklama
    parameters: {
        type: "object",
        properties: { /* JSON Schema */ },
        required: [...]
    },
    execute: async (args) => {
        // İş mantığı
        return "sonuç string";
    }
};
```

---

## 4. API ENDPOINT'LERİ (ui_server.js)

### Mesajlaşma
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/message` | Ajana mesaj gönder (SSE streaming yanıt) |
| GET | `/api/agents` | Tüm ajanları listele |
| POST | `/api/agents` | Yeni ajan oluştur (Genesis) |
| DELETE | `/api/agents/:id` | Ajan sil |
| GET | `/api/agents/:id/threads` | Sohbet thread'lerini listele |
| POST | `/api/agents/:id/threads` | Yeni sohbet başlat |
| DELETE | `/api/agents/:id/threads/:threadId` | Sohbet sil |

### Ajan Yönetimi
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/agents/:id/config` | Ajan konfigürasyonu |
| PATCH | `/api/agents/:id/config` | Ajan ayarlarını güncelle |
| GET | `/api/agents/:id/mindset` | DNA/RULES/USER dosyalarını oku |
| PATCH | `/api/agents/:id/mindset` | DNA/RULES/USER güncelle |

### Skill Market API
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/market/skills` | Marketplace'deki tüm skill'leri listele (category, tags, emoji, version dahil) |
| GET | `/api/agents/:id/skills` | Ajanın kurulu skill'lerini listele |
| POST | `/api/agents/:id/skills/install` | Skill kur (Marketplace → Agent workspace + config update + cache invalidate) |
| POST | `/api/agents/:id/skills/uninstall` | Skill kaldır (dosya sil + config update) |

### Sistem
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/settings` | Global ayarlar |
| PATCH | `/api/settings` | Global ayarları güncelle |
| GET | `/api/telemetry` | Token/maliyet istatistikleri |
| GET | `/api/cron/:id` | Ajan cron görevlerini listele |

---

## 5. YAPILAN TÜM İŞLER (Kronolojik)

### Faz 1 — Sistem Analizi ve Stabilizasyon (19-20 Mart 2026)
- Projenin ilk tam analizi yapıldı (400+ dosya tarandı)
- Kritik hata tespitleri: eksik bağımlılıklar, kırık import'lar
- `SISTEM_ANALIZ_VE_TEST_RAPORU.md` üretildi
- SWOT analizi ve vizyon dokümanı hazırlandı
- Dashboard UI test protokolü oluşturuldu ve yürütüldü

### Faz 2 — Dashboard QA ve Onarım (20 Mart 2026)
- Dashboard port çakışma sorunları çözüldü
- Vite proxy konfigürasyonu düzeltildi
- Canlı test döngüleri yürütüldü (10+ test senaryosu)
- Token maliyet analizi raporu hazırlandı
- Cron zamanlanmış görev sistemi test edildi

### Faz 3 — Sunum ve Dokümantasyon (22-23 Mart 2026)
- Yatırımcı sunumu (57 slayt HTML slideshow) üretildi
- AgentsHUB web sitesi brief'i hazırlandı
- Halil Bey sunum paketi (95KB detaylı doküman)

### Faz 4 — API ve Model Altyapı Onarımı (28 Mart 2026)
- Google AI Studio API key yenileme sorunu çözüldü
- Vertex AI vs AI Studio ayrımı yapılandırıldı
- `gemini_adapter.js` — Hem AI Studio hem Vertex AI destekleyecek şekilde güncellendi
- `embeddings_adapter.js` — Vertex AI uyumluluğu eklendi
- Fallback model zinciri düzeltildi (birincil çökerse ikincil denenir)
- Model listesi güncellendi (gemini-3.1-pro-preview, gemini-3-flash-preview, 2.5-pro, 2.5-flash, 2.5-flash-lite)

### Faz 5 — Skill Market Operasyonelleştirme (28-29 Mart 2026)
Bu faz, en kapsamlı ve en kritik sprint olmuştur:

#### A. Marketplace Deposu Doldurma
- `Marketplace/skills/` dizini 2 mock skill'den → 13 doğrulanmış production skill'e çıkarıldı
- Her skill metadata ile zenginleştirildi: `version`, `category`, `tags`, `emoji`, `requires`

#### B. Genesis Onarımı
- **Sorun:** Yeni ajan doğurulduğunda `ENOENT: no such file or directory, scandir 'Agents/Etkilesim_Ajani/Skills'` hatası
- **Kök Neden:** genesis.js, var olmayan bir master ajan klasöründen skill kopyalamaya çalışıyordu
- **Çözüm:** genesis.js, skill'leri artık `Marketplace/skills/` deposundan kopyalıyor

#### C. ClawHUB Installer Yeniden Yazımı
- Mock veritabanı tamamen kaldırıldı
- Gerçek dosya sistemi operasyonları: `list`, `install`, `uninstall`
- Install: Marketplace → Agent workspace dosya kopyalama + config.json güncelleme + SkillLoader cache invalidate
- Uninstall: Dosya silme + config.json güncelleme

#### D. Backend API Endpoint'leri
- `GET /api/agents/:id/skills` — Ajanın kurulu skill'lerini dosya sisteminden tarar
- `POST /api/agents/:id/skills/install` — Güçlendirilmiş install (cache + config)
- `POST /api/agents/:id/skills/uninstall` — Yeni endpoint

#### E. Frontend Dinamik Skill Yönetimi
- Statik 4-skill toggle → Dinamik dosya sistemi tabanlı toggle (12+ skill)
- Skill Market modalı — "✓ Kurulu" rozeti, "Kaldır" butonu, "Kur" butonu
- **Dosya adı vs iç isim uyumsuzluğu çözüldü:** `skill.file` (gerçek dosya adı) ile işlem yapılıyor, `skill.name` (iç isim) sadece gösterim için

#### F. Market Kartları UI Zenginleştirme
- Jenerik Globe ikonu → skill-özel emoji
- Versiyon rozeti (v1.1.0)
- Kategori etiketi (utility/web/system/information/marketplace)
- Tag chip'leri (tıklanabilir etiketler)
- Market API'si: `category`, `tags`, `emoji` alanlarını parse edip döndürüyor

### Faz 6 — ClawHub.ai Entegrasyonu (29 Mart 2026)

#### ClawHub İstihbarat Raporu
ClawHub.ai (açık kaynak, MIT) tam tersine mühendislik raporu yazıldı:
- Skill formatı: SKILL.md (YAML frontmatter) + destekleyici dosyalar (klasör yapısı)
- CLI: `npx clawhub@latest install <author>/<slug>` ile skill indirme
- HTTP API: `/api/v1/search`, `/api/v1/skills/{slug}`, `/api/v1/download` vb.
- Güvenlik: VirusTotal + LLM tarama + moderation verdicts
- Detaylı rapor: `docs/raporlar/CLAWHUB_ISTIHBARAT_RAPORU.md` (artifact olarak da mevcut)

#### clawhub_remote.js — Uzak Yetenek Keşif Aracı ★
Ajanın ClawHub.ai API'sine çıkarak yetenek aramasını, incelemesini ve kaynak kodunu okumasını sağlayan tool yazıldı:
- `search` → `GET /api/v1/search?q=...` ile vektör tabanlı arama
- `inspect` → `GET /api/v1/skills/{slug}` ile detay çekme (versiyon, yazar, güvenlik, dosya listesi)
- `read_file` → `GET /api/v1/skills/{slug}/file?path=SKILL.md` ile kaynak kodu okuma

#### Otonom Yetenek Edinme Protokolü (DNA Kazıması) ★
Ajanın DNA.md dosyasına "YAPAMAM DEMEK YASAK" protokolü eklendi. Ajan artık yapamadığı bir iş istendiğinde:
1. ClawHub'da arama yapar
2. Uygun skill'i bulur, kaynak kodunu okur
3. Kodu anlayıp AgentsHUB formatına çevirir
4. `write_file` ile kendi skills/ klasörüne yazar
5. `CONFIG_UPDATE` ile aktifleştirir
6. Görevi tamamlar

**Bu, ajanı statik bir asistandan → otonom öğrenen bir organizmaya dönüştüren devrimsel değişikliktir.**

### Faz 7 — Güvenlik Sertleştirmesi (29 Mart 2026)
OpenClaw rekabet analizinden çıkan güvenlik açıkları kapatıldı:

#### A. API Key Maskeleme (`src/security/mask-api-key.js`)
- Google AI (AIza...), OpenAI (sk-...), Telegram bot token, ClawHub (clh_...) formatlarını tanır
- Logger entegrasyonu: Tüm log mesajları otomatik olarak `sanitize()` filtresinden geçiyor
- Artık loglardan hiçbir API key okunamaz

#### B. Path Guard (`src/security/path-guard.js`)
- `isPathInside()` — OpenClaw'un symlink-safe yol doğrulaması
- `validateAgentPath()` — Ajan ID bazlı workspace kısıtlaması
- Yasaklı dizinler: `C:\Windows`, `C:\Program Files`, `/etc`, `/usr`, `/root`
- Path traversal (../) koruması
- Express middleware olarak kullanıma hazır

#### C. SSRF Guard (`src/security/ssrf-guard.js`)
- RFC 1918 özel ağlar (10.x, 172.16-31.x, 192.168.x) engelli
- Loopback (127.x), link-local (169.254.x) engelli
- Cloud metadata (169.254.169.254) engelli
- DNS rebinding koruması: hostname çözümlenip gerçek IP kontrol edilir
- `web_scraper.js` skill'ine entegre edildi

#### D. Logger Güvenlik Entegrasyonu
- `utils/logger.js` güncellendi — tüm seviyeler (info, warn, error, debug) `sanitize()` ile maskeleniyor

---

## 6. BİLİNEN SORUNLAR VE TEKNİK BORÇLAR

### 6.1. Kritik
| # | Sorun | Etki | Önerilen Çözüm |
|---|-------|------|----------------|
| 1 | Google API kısıtlaması: `google_search` tool'u diğer tüm tool'larla AYNI ANDA kullanılamıyor | Ajan sohbet sırasında "arama moduna geç" / "sistem moduna geç" yaparak CONFIG_UPDATE göndermek zorunda | Google'ın fonksiyon kısıtlamasına workaround: ajanın bunu otonom yönetmesi DNA'ya yazılmıştır ama ideal değildir |
| 2 | Skill loader her mesajda dosya sistemi okuyor (cache bypass) | Performans etkisi düşük ama idealden uzak | Cache TTL'i geri açmak, değişiklik sonrası sadece invalidate etmek |
| 3 | Dashboard App.jsx 1963 satır tek dosya | Bakım zorluğu | Bileşenlere ayırma (ChatView, SettingsView, MarketModal vb.) |

### 6.2. Orta
| # | Sorun | Açıklama |
|---|-------|----------|
| 4 | `byterover.js` ve `google_search.js` Marketplace'te metadata zenginleştirilmedi | Bu 2 skill'de hâlâ version/category/tags/emoji eksik |
| 5 | Genesis yeni ajan doğururken `clawhub_remote.js`'i otomatik eklemiyor | config.json şablonuna eklenmeli |
| 6 | write_file sandbox'u tam güçlü değil | Ajan teorik olarak sistem köküne dosya yazabilir, path validation güçlendirilmeli |
| 7 | Cron görevleri sunucu restart'ında yeniden yüklenmiyor olabilir | Test edilmeli |

### 6.3. Düşük
| # | Sorun | Açıklama |
|---|-------|----------|
| 8 | test_express.js / test_sdk.js gibi test dosyaları app/ kökünde duruyor | Temizlenmeli veya test/ dizinine taşınmalı |
| 9 | memory.sqlite boş (0 byte) | sqlite_adapter aktif kullanılmıyor, json_adapter varsayılan |

---

## 7. BETA GÜNCELLEMELERİ VE V2 ROADMAP

### 7.1. Acil (Lansman Öncesi)
- [ ] **Fonksiyonel Test:** Tüm 13 skill'in canlıda çalıştığını doğrula
- [ ] **Genesis Test:** Yeni ajan oluştur, skill'lerin kopyalandığını doğrula
- [ ] **ClawHub Remote Test:** Ajana "PDF okuyabilir misin?" de, ClawHub arama zincirine girdiğini doğrula
- [ ] **Skill Market UI Test:** Tüm kartların emoji/versiyon/tag gösterdiğini, kur/kaldır'ın çalıştığını doğrula

### 7.2. V2 Sprint (1-2 Hafta)
- [ ] **Dashboard Modülarizasyonu:** App.jsx'i bileşenlere ayır (ChatView, SettingsView, AgentCreator, MarketModal)
- [ ] **ClawHub Zip Download:** clawhub_remote'a `download` action ekle (zip indir → aç → otomatik format çevir → kur)
- [ ] **Skill Dependency Resolution:** Bir skill başka bir skill'e bağımlıysa otomatik kur
- [ ] **Skill Versiyon Yönetimi:** Aynı skill'in farklı versiyonlarını destekle
- [ ] **Multi-Agent Skill Sharing:** Bir ajan skill ürettiğinde diğer ajanlara otomatik dağıt

### 7.3. V3 Sprint (1 Ay)
- [ ] **Vektör Tabanlı Skill Arama:** Lokal Marketplace'te embedding similarity ile arama
- [ ] **SKILL.md Desteği:** Skill klasörlerine SKILL.md ekle, loader bunu parse edip system prompt'a enjekte etsin
- [ ] **ClawHub'a Publish:** Kendi skill'lerimizi ClawHub registry'sine yayınlama
- [ ] **Remote Marketplace Backend:** Lokal Marketplace yerine uzak sunucudan skill çekme (ajan bazlı güncelleme)
- [ ] **MCP Bridge:** Model Context Protocol desteği (OpenClaw mcporter entegrasyonu)
- [ ] **Cross-Platform:** macOS/Linux uyumluluğu (PowerShell bağımlılıklarını kaldır)

### 7.4. Vizyon (V4+)
- [ ] **Ajan Marketplace:** Ajanların kendileri skill üretip birbirlerine satması
- [ ] **Federated Learning:** Ajanlerin deneyimlerinden öğrenip diğer ajanlara aktarması
- [ ] **Plugin Sistemi:** Hot-loadable plugin mimarisi (Skill'den daha üst seviye)

---

## 8. KRİTİK DOSYALAR VE DEĞİŞİKLİK NOTLARI

Aşağıdaki dosyalar bu oturumda değiştirilmiştir. Yeni ajan bu dosyaları özellikle incelemelidir:

### Değiştirilen Dosyalar
| Dosya | Ne Değişti |
|-------|-----------|
| `src/gateway/ui_server.js` | Market API'sine `file`, `category`, `tags`, `emoji` alanları eklendi. Install/uninstall endpoint'leri güçlendirildi. |
| `src/memory/genesis.js` | Skill kopyalama kaynağı `Etkilesim_Ajani/Skills` → `Marketplace/skills/` olarak değiştirildi |
| `dashboard/src/App.jsx` | Skill Market modalı: dosya adı bazlı install/uninstall, emoji kartları, tag chip'leri, versiyon rozeti |
| `dashboard/src/api.js` | `fetchAgentSkills`, `uninstallSkill` methodu eklendi |
| `Agents/Etkilesim_Ajani/Mind-Set_Core/DNA.md` | clawhub_remote tool tanımı ve Otonom Yetenek Edinme Protokolü eklendi |
| `Agents/Etkilesim_Ajani/Mind-Set_Core/config.json` | skills[] listesine `clawhub_remote.js` eklendi |

### Yeni Oluşturulan Dosyalar
| Dosya | Açıklama |
|-------|----------|
| `Agents/Etkilesim_Ajani/skills/clawhub_remote.js` | ClawHub.ai API arayüzü (search/inspect/read_file) |
| `Marketplace/skills/clawhub_remote.js` | Aynısının Marketplace kopyası |
| 10 skill dosyası (calculator, weather, web_scraper vb.) | Metadata zenginleştirme (version, category, tags, emoji) |

---

## 9. GELİŞTİRİCİ İÇİN HIZLI BAŞLANGIÇ

### Sistemi Çalıştırma
```bash
cd C:\AgentsHUB\app
node src/gateway/ui_server.js
# → http://localhost:3434 açılır
```

### Dashboard Geliştirme
```bash
cd C:\AgentsHUB-DEV\AgentsHUB\app\dashboard
npm run dev        # → Vite dev server (hot reload)
npm run build      # → Production build (dist/ klasörü)
```

### Canlıya Deploy
```bash
# DEV'den PROD'a dosya kopyalama
xcopy /E /I /Y C:\AgentsHUB-DEV\AgentsHUB\app\dashboard\dist C:\AgentsHUB\app\dashboard\dist\
xcopy /Y C:\AgentsHUB-DEV\AgentsHUB\app\src\gateway\ui_server.js C:\AgentsHUB\app\src\gateway\
xcopy /Y /E /I C:\AgentsHUB-DEV\AgentsHUB\Marketplace\skills C:\AgentsHUB\Marketplace\skills\
# Sonra PROD sunucuyu restart at
```

### Yeni Skill Oluşturma
1. `Marketplace/skills/` dizinine yeni `.js` dosyası koy (Evrensel format)
2. Sunucuyu restart at (Market API otomatik tarar)
3. Dashboard → Skill Market → Kur butonuna tıkla

### Yeni Ajan Oluşturma
Dashboard → Sol panel → "+" butonu → İsim gir → Oluştur
Genesis otomatik olarak: Mind-Set_Core şablonunu + Marketplace skill'lerini kopyalar.

---

## 10. BAĞIMLILIKLAR

```json
{
  "@google/genai": "^1.45.0",     // Google Gemini AI SDK
  "cors": "^2.8.6",               // CORS middleware
  "dotenv": "^17.3.1",            // Ortam değişkenleri
  "express": "^5.2.1",            // HTTP sunucu (v5!)
  "express-rate-limit": "^8.3.1", // Rate limiting
  "grammy": "^1.41.1",            // Telegram bot framework
  "helmet": "^8.1.0",             // HTTP güvenlik başlıkları
  "node-cron": "^4.2.1"           // Zamanlanmış görevler
}
// Opsiyonel:
{
  "better-sqlite3": "^12.8.0"     // SQLite (vektör hafıza için)
}
```

Dashboard:
- React 19 + Vite 6.4
- Framer Motion (animasyonlar)
- Lucide React (ikonlar)
- @fontsource/inter + @fontsource/outfit (fontlar)

---

## 11. SON SÖZ

AgentsHUB, bir "chatbot wrapper" değildir. Kullanıcının bilgisayarında otonom çalışan, kendi yeteneklerini bulup öğrenebilen, zamanlanmış görevler kurabilen, çoklu ajan yönetebilen bir dijital yaşam formudur.

Bu rapordaki en kritik yenilik **Otonom Yetenek Edinme Protokolü**'dür. Ajan artık "yapamam" demez — ClawHub'ın sonsuz deposunda arar, bulur, öğrenir ve kendini evrimleştirir. Bu, sistemin tekrar eden insan müdahalesine olan bağımlılığını kıran temel mekanizmadır.

Yeni ajan veya geliştirici: Bu dokümanı oku, dosya haritasını takip et, bilinen sorunları kontrol et ve V2 roadmap'ten devam et.

> *"Ameleliğin ölümü: İnsan zihni felsefe yapmak için yaratılmıştır, satır satır kod yazmak için değil."* — ATLAS Manifestosu
