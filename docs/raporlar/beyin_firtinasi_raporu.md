# AgentsHUB V3→V4 BEYİN FIRTINASI KONSOLİDASYON RAPORU

> **Tarih:** 20 Mart 2026  
> **Oturum Süresi:** ~2 saat  
> **Katılımcılar:** Mimar + ATLAS Zihin Çekirdeği  
> **Kapsam:** Sistemin iç perspektifi (ajan gözü) ve dış perspektifi (mühendis gözü) ile 10 stratejik konu

---

## İÇİNDEKİLER

1. [Telegram Entegrasyonu](#1-telegram-entegrasyonu)
2. [Araç Dokümantasyonu ve Hata Geri Bildirimi](#2-araç-dokümantasyonu-ve-hata-geri-bildirimi)
3. [Kalıcı Hafıza (Vektör DB / L2)](#3-kalıcı-hafıza-vektör-db--l2)
4. [Otonom Görev Koşucusu (Agentic Drive / Task Runner)](#4-otonom-görev-koşucusu)
5. [Turbo ReAct + Task Runner Hibrit Mimarisi](#5-turbo-react--task-runner-hibrit-mimarisi)
6. [Cron Zamanlayıcı](#6-cron-zamanlayıcı)
7. [Dosya Yükleme (Upload + Parse)](#7-dosya-yükleme)
8. [Token Maliyet Analizi (Tüm Özellikler)](#8-token-maliyet-analizi)
9. [Tek Tıkla Kurulum (MSI/EXE)](#9-tek-tıkla-kurulum)
10. [Önceliklendirme Matrisi ve Yol Haritası](#10-önceliklendirme-matrisi)

---

## 1. Telegram Entegrasyonu

### Mevcut Durum
❌ Kod tabanında Telegram entegrasyonu **yok.** Sıfırdan yazılacak.

### Mimari
```
[Telegram Bot API] ←→ [telegram_bridge.js] ←→ [LLMBridge.execute()]

Eşleme basit: Bot Token = Ajan Kimliği
  Bot Token A → Ajan A (1:1 mapping, routing yok)
  Bot Token B → Ajan B
```

Her ajanın `config.json`'ına `telegram_bot_token` alanı eklenir. `BotManager` tüm config'leri tarar, token bulunan her ajan için izole bot instance'ı spawn eder.

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| KOBİ patronu Dashboard açmaz, Telegram'ı her gün açıyor | Bot API rate limit: saniyede 30 mesaj |
| Sıfır öğrenme eğrisi — herkes Telegram kullanıyor | Dosya gönderimi 20MB Telegram limiti |
| Mevcut `LLMBridge.execute()` aynen kullanılır | Sesli mesaj desteği ekstra iş (Whisper) |
| Her ajan izole bot — birinin çökmesi diğerini etkilemez | Her ajan için ayrı BotFather'dan token alınmalı |
| Grup chat desteği — birden fazla kişi aynı ajana sorabilir | Telegram hesabı açması gerekiyor |

### Sorun → Çözüm

| Sorun | Çözüm |
|---|---|
| SSE stream'i Telegram'a nasıl çevrilecek? | `telegram_bridge.js` içinde SSE → düz text dönüşümü. Thinking tokenları filtrelenir, sadece final cevap gönderilir. |
| Bir bot çökerse diğerleri etkilenir mi? | Her bot instance izole. `BotManager` watchdog ile çöken botu otomatik restart eder. |
| Kullanıcı kimlik eşlemesi? | Yok. Token = Ajan. Gelen mesaj direkt o ajana gider. |

### Uygulama Detayı

| Bileşen | Dosya | Satır |
|---|---|---|
| `BotManager` sınıfı | `app/src/channels/telegram_bridge.js` | ~100-120 |
| Config alanı | `config.json` → `telegram_bot_token` | +1 alan |
| Dashboard UI | Ayarlar paneline token input | ~20 satır |
| **Bağımlılık** | `grammy` (~200KB) | 1 paket |

### Mimarın Kararı
🟡 **V3.1'de yapılacak.** Düşük riskli, yüksek değerli.

---

## 2. Araç Dokümantasyonu ve Hata Geri Bildirimi

### Mevcut Durum
- Araçların `input/output schema`sı yok. Ajan hangi parametreyi göndereceğini prompt'tan tahmin ediyor.
- Hata mesajları tek satır: `[RUNTIME ERROR]: ${err.message}` — ajan kullanıcıya mantıklı açıklama yapamıyor.

### Çözüm: Dokümantasyon Standardı

Her skill manifest'ine eklenen yeni alanlar:
```javascript
{
  name: "weather",
  description: "Belirtilen şehir için anlık hava durumu verisi getirir.",
  // YENİ:
  input_schema: {
    city: { type: "string", required: true, description: "Şehir adı (Türkçe)" }
  },
  output_schema: {
    temperature: "number (°C)",
    condition: "string (açıklama)"
  },
  examples: [
    { input: { city: "İstanbul" }, output: "İstanbul: 15.2°C, Parçalı Bulutlu" }
  ]
}
```

### Çözüm: Zengin Hata Raporlama

Mevcut: `[RUNTIME ERROR]: ECONNREFUSED`

Yeni standart:
```
[ARAÇ HATASI - weather.js]
Hata Türü: ECONNREFUSED (API sunucusuna bağlanılamadı)
Girdi: { city: "İstanbul" }
Öneri: İnternet bağlantısını kontrol edin veya farklı bir araç deneyin.
```

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Ajan yanlış parametre gönderme oranı düşer | Her skill'e manuel schema eklemek gerekiyor |
| "Yapamadım" yerine "şu yüzden yapamadım" der | Hata mesajı token maliyetini +50-100 artırır (ihmal edilir) |
| Yeni skill geliştiriciler için self-documenting | İlk seferde tüm skill'lere eklenmesi zaman alır |

### Uygulama Detayı

| Bileşen | Dosya | Değişiklik |
|---|---|---|
| Schema standardı | `loader.js` | Manifest okurken `input_schema` ve `examples` çekme |
| Hata zenginleştirme | `sandbox_runner.js` | Catch bloğuna yapılandırılmış hata objesi |
| Prompt enjeksiyonu | `llm_bridge.js` | Araç tanımlarına `examples` ekleme |

### Mimarın Kararı
🔴 **HEMEN yapılacak.** 1-2 saatlik iş.

---

## 3. Kalıcı Hafıza (Vektör DB / L2)

### Mevcut Durum — Sürpriz: L2 ZATEN Var

Kod analizi sonucu tespit edildi: `embeddings_adapter.js` dosyasında **tam işlevsel bir Vektör DB** zaten yazılmış:

- ✅ `better-sqlite3` ile per-agent izole SQLite (`embeddings.sqlite`)
- ✅ Google `gemini-embedding-001` ile 768 boyutlu vektör üretimi
- ✅ Cosine Similarity ile anlamsal arama
- ✅ `umi.js` satır 101-113'te her mesajda **otomatik L2 embedding enjeksiyonu**

### Sorun: Neden Çalışmıyor?

| Sorun | Açıklama |
|---|---|
| `better-sqlite3` native C++ modülü | Windows'ta derleme gerektiriyor. Yüklü değilse L2 sessizce hata veriyor. |
| Search skill'i yok | `semanticSearch()` fonksiyonu var ama ajan bunu araç olarak çağıramıyor. |
| Kalibrasyon yapılmamış | Benzerlik eşiği (threshold) ayarlanmamış. Düşük eşik = alakasız sonuçlar = halüsinasyon. |

### Çözüm Önerisi

| Adım | Açıklama | Süre |
|---|---|---|
| 1 | `better-sqlite3`'ün kurulu olduğunu doğrula | 15 dk |
| 2 | `/memory` search'ü bir **skill** olarak ajana sun | 1 saat |
| 3 | Benzerlik eşiğini 0.7+ olarak kalibre et | 30 dk |
| 4 | Pilot: 2 hafta sadece **okuma** modunda çalıştır, precision ölç | Gözlem |

### 3 Katmanlı Hafıza Mimarisi (Mevcut)

| Katman | Rolü | Durum | Vektör DB ile Çakışır mı? |
|---|---|---|---|
| **L1 (JSON/SQLite)** | Ham sohbet geçmişi, thread bazlı | ✅ Çalışıyor | ❌ Bağımsız — kısa süreli hafıza |
| **L2 (EmbeddingsAdapter)** | Anlamsal hatırlama, vektörize anı deposu | ⚠️ Stub — SQLite bağımlılığı | **BU ZATEN VEKTÖR DB** |
| **L3 (Context Caching)** | Gemini native cache — token tasarrufu | ⚠️ Cache Manager bağımlı | ❌ Bağımsız — maliyet optimizasyonu |

### Vektör DB Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Çapraz sohbet hafızası ("Geçen hafta ne konuşmuştuk?") | Kötü kalibre = halüsinasyon **artabilir** |
| Kullanıcı tercihlerini zamanla öğrenme | Eski bilgi kirliliği (6 ay önceki fiyat hâlâ doğruymuş gibi) — TTL mekanizması şart |
| Tekrarlayan sorularda API çağrısı yapmadan cevaplama | KVKK/gizlilik riski — silme hakkı uygulanmalı |
| Lokal ChromaDB ile sıfır maliyet | Embedding pipeline + chunk stratejisi karmaşıklık ekler |

### Mimarın Kararı
🟡 **V3.2'de stabilize et.** Yeni DB kurmaya gerek yok — mevcut L2'yi çalıştır ve kalibre et.

---

## 4. Otonom Görev Koşucusu (Agentic Drive / Task Runner)

### Sorunun Kök Nedeni: Ajanlar Neden Yarıda Takılıyor?

| Neden | Açıklama |
|---|---|
| **Bağlam Erimesi** | 30 dk görevi sırasında 15. adımda ajan 1. adımda ne yaptığını unutuyor. Context window doluyor. |
| **API Kırılganlığı** | 30 dk'da en az 1-2 kez 503/timeout. Sistem hata verince görev ölüyor. |
| **Tek İstek Mimarisi** | Her mesaj = 1 HTTP request. 30 dk'lık görevi tek request'e sığdıramazsın. |
| **Durum Kaybı** | 15. faturada çökerse, 1'den başlamak zorunda. Checkpoint yok. |
| **Geri Bildirim Yokluğu** | Kullanıcı "Ne yapıyor?" diye soramıyor. |

### Çözüm: Checkpoint Tabanlı Task Runner

```
Görev: "50 faturayı işle"
  → Adım 1: LLM → "Bu faturayı oku" (bağımsız, temiz context)
  → Checkpoint: { step: 1, status: "done", result: {...} }
  → Adım 2: LLM → "Bu faturayı oku" (yeni temiz context)
  → ...
  → Adım 37'de API patladı → retry 3x → park
  → 10 dk sonra otomatik devam → 37'den kaldığı yerden
```

**Context erimesi sıfır** — her adım temiz bir sayfa.

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Fire-and-forget: görevi ver, git kahve iç | Token tüketimi artar (her adım yeni context = sistem promptu tekrar) |
| Çökmeye dayanıklı: checkpoint'ten devam | Adımlar arası bilgi kaybı — önceki adımların özeti enjekte edilmeli |
| Context erimesi yok: 100+ adım bile temiz | Görev tanımlama zorluğu: dosyalar nerede, çıktı nereye? |
| Paralel görev desteği | Hata kararı: retry mi, kullanıcı müdahalesi mi? |
| İzlenebilirlik: "15/50 fatura tamam" | |

### İzole Kurgulanabilir mi?

**Evet, %100.**

| Soru | Cevap |
|---|---|
| Mevcut dosyalara dokunulur mu? | `ui_server.js`'e 3 endpoint eklenir (minimal) |
| LLMBridge değişir mi? | Hayır — Task Runner mevcut `execute()`'ı çağırır |
| UMI değişir mi? | Hayır — görev sonuçları ayrı `tasks/` klasöründe |
| Silersek ne olur? | Sistem eski haliyle çalışır |
| Yeni bağımlılık? | Sıfır |

### Mimarın Kararı
🟡 **V3.2 — Turbo ReAct ile birlikte hibrit olarak.**

---

## 5. Turbo ReAct + Task Runner Hibrit Mimarisi

### Birleşik Mimari

```
KULLANICI MESAJI
     │
     ▼
┌────────────────────────┐
│  GÖREV SINIFLANDIRICI  │
│  (Otomatik Karar)      │
└────┬───────────┬───────┘
  Kısa iş      Uzun iş
  (<5 dk)      (5-60 dk)
     │           │
     ▼           ▼
┌──────────┐ ┌──────────────────────────────────┐
│ TURBO    │ │ TASK RUNNER                       │
│ REACT    │ │ Görevi adımlara böl               │
│ Loop: 25 │ │ Her adım = 1 Turbo ReAct çağrısı │
│ Cap: 80K │ │ Checkpoint → Retry → Devam        │
│ Time: 5m │ │ Progress: "7/20 fatura tamam"     │
│ SSE live │ │ Arka planda, fire-and-forget       │
└──────────┘ └──────────────────────────────────┘
```

### Katman 1: Turbo ReAct

| Parametre | Eski | Yeni |
|---|---|---|
| `MAX_REACT_LOOPS` | 7 | **25** |
| Token bütçesi | Yok | **80K hard cap** |
| Zaman limiti | Yok | **5 dakika** |
| SSE timeout | 2 dk | **10 dakika** |

**Değişiklik:** `llm_bridge.js` içinde **4 satır.**

### Katman 2: Task Runner

Her adımda **Turbo ReAct'i** çağırır. Kendi başına LLM konuşmaz — mevcut motoru kullanır ama **temiz context** ile.

**Değişiklik:** 1 yeni dosya (`task_runner.js`, ~150-200 satır) + `ui_server.js`'e 3 endpoint (~30 satır).

### Neden Bu Kombinasyon İşe Yarar?

| Senaryo | Saf ReAct 25 | Saf Task Runner | **Hibrit** |
|---|---|---|---|
| "Saat kaç?" (5 sn) | ✅ | ❌ Gereksiz overhead | ✅ ReAct |
| "3 faturayı oku" (3 dk) | ✅ | ❌ Gereksiz overhead | ✅ ReAct |
| "50 faturayı işle" (30 dk) | ❌ Timeout | ✅ | ✅ Task Runner |
| API çökmesi | ❌ Ölür | ✅ Checkpoint | ✅ İkisinde de korunma |

### Toplam Maliyet

| Dosya | Değişiklik |
|---|---|
| `llm_bridge.js` | +4 satır (loop, cap, time, timeout) |
| `scheduler/task_runner.js` | ~150-200 satır (YENİ) |
| `ui_server.js` | +30 satır (3 endpoint) |
| **Toplam** | **~230 satır, 0 bağımlılık** |

### Mimarın Kararı
🟡 **Turbo ReAct hemen (2 dk). Task Runner V3.2'de.**

---

## 6. Cron Zamanlayıcı

### Mimari
```javascript
// app/src/scheduler/cron_manager.js
class CronManager {
    schedule(agentId, cronExpr, taskPrompt) {
        cron.schedule(cronExpr, () => LLMBridge.execute(agentId, taskPrompt));
    }
}
```

Ajan, sohbet içinde `[CRON_SCHEDULE]: { "cron": "0 9 * * 1-5", "task": "Rapor hazırla" }` formatıyla cron'u aktive eder.

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Otonom görev — Mimar uyurken rapor hazırlar | Sunucu restart'ında kaybolur (persist lazım) |
| Sıfır ek maliyet (idle = 0 token) | Yanlış cron ifadesi sistemi bombardıman edebilir |
| Prompt tabanlı kontrol — AI kendi görevlerini yönetir | Windows sleep/hibernate'de duraklar |
| Task Runner ile birleşince tam otonomi | Uzun süreli görevlerde timeout riski |

### Uygulama Detayı

| Bileşen | Detay |
|---|---|
| Bağımlılık | `node-cron` (12KB) |
| Dosya | `app/src/scheduler/cron_manager.js` (~80-100 satır) |
| Persist | `cron_jobs.json` dosyasına kayıt (restart sonrası yeniden yükleme) |
| Güvenlik | Max 10 aktif cron/ajan, rate limit koruması |

### Mimarın Kararı
🟡 **V3.1'de yapılacak.** Task Runner ile birleştirilecek.

---

## 7. Dosya Yükleme (Upload + Parse)

### Zor mu? Proje Şişer mi?

| Soru | Cevap |
|---|---|
| **Upload zor mu?** | Hayır. `multer` middleware, 1-2 saat. |
| **PDF/Excel parse zor mu?** | Orta. `pdf-parse` + `xlsx` ile 4-6 saat. |
| **Proje şişer mi?** | Kontrollü: +7-8MB (`node_modules`). |
| **Modülerlik bozulur mu?** | **HAYIR.** Skill olarak yazılır, çekirdek sisteme dokunmaz. |

### Mimari

```
[Frontend Drag&Drop] → [ui_server.js: multer] → [uploads/{agentId}/]
                                                        ↓
[Skill: file_parser.js] ← LLMBridge ← Ajan: "Bu dosyayı analiz et"
```

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Fatura/teklif PDF okutma — KOBİ "katil özellik" | Büyük dosyalarda token patlaması (50+ sayfa = 20K+ token) |
| Excel analizi: "En yüksek sütunu bul" | Karmaşık Excel formatları (pivot, macro) parse edilemez |
| Skill olarak izole — modülerlik korunur | Kötü niyetli dosya yükleme riski — whitelist şart |
| Kaldırılabilir: skill silinirse sistem eski hali | OCR eklenirse +15MB şişme |

### Güvenlik Gereksinimleri

> [!CAUTION]
> Dosya tipi whitelist (`.pdf, .xlsx, .csv, .txt`), boyut limiti (10MB), virüs tarama (opsiyonel).

### Mimarın Kararı
🟡 **V3.2'de yapılacak.** Task Runner ile birleşince güçlü: "50 faturayı yükle ve işle."

---

## 8. Token Maliyet Analizi (Tüm Özellikler)

### Özellik Bazlı Maliyet Etkisi

| Özellik | Token Artışı/Sorgu | Aylık Ek Maliyet (1K sorgu/gün, Flash) |
|---|---|---|
| Araç Dokümantasyonu | +100-200 (prompt'a schema) | ~1₺ |
| Hata Raporları | +50-100 (hata detayı) | <1₺ |
| Vektör DB (RAG) | +1-2K (RAG context) | ~5-10₺ |
| Turbo ReAct (25 loop) | +1-2K (daha fazla döngü) | ~3-5₺ |
| Self-Reflection | +500-1K (iç denetim) | ~2-4₺ |
| Cron Scheduler | 0 (idle, sadece tetiklenince) | 0₺ |
| Task Runner | Adım başına normal sorgu maliyeti | Göreve bağlı |
| Telegram | 0 ek (aynı LLM çağrısı) | 0₺ |
| **TOPLAM** | **+2.5K-5K/sorgu** | **~10-19₺/ay** |

> [!NOTE]
> Gemini 2.5 Flash fiyatlandırmasına göre. Gemini 1.5 Pro kullanımında maliyet ~3x artar.

---

## 9. Tek Tıkla Kurulum (MSI/EXE)

### Sorun
Mühendis "npm nedir" bilmiyor. `.bat` dosyası iyi ama `node` kurulu olmalı.

### Çözüm Seçenekleri

| Yöntem | Avantaj | Dezavantaj |
|---|---|---|
| `pkg` ile tek EXE | Tek dosya, çift tıkla çalışır | ESM çakışması (daha önce yaşandı), native modül sorunu |
| `electron` paketleme | GUI + system tray + auto-update | +150MB boyut, karmaşık |
| `nexe` | Daha basit, native modül desteği daha iyi | Aktif geliştirmesi yavaşladı |
| **Node.js gömülü MSI** | Node.js installer'a gömülü, Inno Setup ile | En stabil, en az sürpriz |

### Mimarın Kararı
🔵 **V4.0.** Şu an `.bat` başlatıcılar yeterli.

---

## 10. Önceliklendirme Matrisi ve Yol Haritası

### Aciliyet × Değer Matrisi

| # | Özellik | Değer | Efor | Risk | Versiyon |
|---|---|---|---|---|---|
| 1 | **Araç Dokümantasyonu + Hata Raporları** | 🟢 Yüksek | 1-2 saat | 🟢 Düşük | 🔴 **V3.0 (HEMEN)** |
| 2 | **Turbo ReAct (Loop=25)** | 🟢 Yüksek | 2 dakika | 🟢 Düşük | 🔴 **V3.0 (HEMEN)** |
| 3 | **Cron Zamanlayıcı** | 🟢 Yüksek | 3-4 saat | 🟢 Düşük | 🟡 V3.1 |
| 4 | **Telegram Entegrasyonu** | 🟢 Yüksek | 12-18 saat | 🟡 Orta | 🟡 V3.1 |
| 5 | **L2 Vektör DB Stabilizasyonu** | 🟡 Orta | 2-3 saat | 🟢 Düşük | 🟡 V3.2 |
| 6 | **Dosya Yükleme (PDF/Excel)** | 🟢 Yüksek | 7-11 saat | 🟡 Orta | 🟡 V3.2 |
| 7 | **Task Runner (Checkpoint)** | 🟢 Yüksek | 4-6 saat | 🟡 Orta | 🟡 V3.2 |
| 8 | **Self-Reflection** | 🟡 Orta | 4-6 saat | 🟡 Orta | 🔵 V4.0 |
| 9 | **Tek Tıkla Kurulum (MSI)** | 🟡 Orta | 8-12 saat | 🔴 Yüksek | 🔵 V4.0 |
| 10 | **Çoklu Ajan Orkestrasyonu** | 🔵 Vizyon | 30+ saat | 🔴 Yüksek | ⚪ V5.0 |

### Yol Haritası Zaman Çizelgesi

```
V3.0 (Bugün)
  ├─ Araç Dokümantasyonu + Hata Raporları
  └─ Turbo ReAct (MAX_REACT_LOOPS = 25)

V3.1 (Bu Hafta)
  ├─ Cron Zamanlayıcı
  └─ Telegram Per-Agent Bot Entegrasyonu

V3.2 (Bu Ay)
  ├─ L2 Vektör DB Stabilizasyonu + Search Skill
  ├─ Dosya Yükleme (PDF/Excel Parse)
  └─ Task Runner (Otonom Görev Koşucusu)

V4.0 (Q2 2026)
  ├─ Self-Reflection (İç Denetçi)
  ├─ Tek Tıkla MSI Installer
  └─ WhatsApp Business Entegrasyonu

V5.0 (Q3 2026)
  ├─ Çoklu Ajan Orkestrasyonu
  ├─ Agentic Drive (Paylaşımlı Dosya Sistemi)
  └─ Ollama/LM Studio Offline Çalışma
```

---

## Sonuç

Sistemin çekirdeği (Bridge, UMI, Skills, Gateway) sağlam ve modüler. Tartışılan **10 özelliğin hiçbiri** mevcut mimariyi kırmadan eklenebilir. Toplam yeni kod ~500-600 satır, sıfır veya minimum yeni bağımlılık.

**Kritik tespit:** L2 Vektör DB'nin zaten var olması, ChromaDB/Pinecone ekleme zorunluluğunu ortadan kaldırdı. `better-sqlite3` düzgün çalıştığında, sistem zaten anlamsal hafızaya sahip.

**En yüksek ROI:** Turbo ReAct (2 dk) + Araç Dokümantasyonu (1-2 saat) = Mevcut sistemin kapasitesini **3-4x** artırır, sıfır mimari risk ile.
