# AgentsHUB V3→V5: MASTER PROBLEM-ÇÖZÜM-QA RAPORU

> **Tarih:** 20 Mart 2026  
> **Yazar:** ATLAS Zihin Çekirdeği  
> **Hedef Okuyucu:** Projeyi hiç bilmeyen bir ajan VEYA insan mühendis  
> **Format:** Her özellik → Problem → Mevcut Durum → Çözüm Mimarisi → Dosya Değişiklikleri → QA Test Senaryosu → Avantaj/Dezavantaj → Versiyon

---

## PROJE NEDİR? (30 Saniyede Anlat)

**AgentsHUB** = "Yapay Zeka Ajanları İşletim Sistemi." Kullanıcılar web arayüzünden AI ajanları oluşturur, her ajanın kendi beyni (LLM bağlantısı), araçları (skills) ve hafızası vardır. Ajanlar sohbet üzerinden komut alır, araçları otomatik çağırır, internette arar, dosya okur/yazar.

### Kritik Dosya Haritası (Herkes Ezberlesin)

```
AgentsHUB/app/
├── src/
│   ├── gateway/ui_server.js     ← Express REST API (Port 3004). TÜM HTTP endpoint'ler BURADA.
│   ├── bridge/llm_bridge.js     ← LLM konuşma motoru. ReAct döngüsü, tool calling, fallback.
│   ├── skills/
│   │   ├── loader.js            ← Ajanın araçlarını diskten yükler.
│   │   ├── sandbox_runner.js    ← Araçları Worker Thread'de izole çalıştırır.
│   │   └── schema_translator.js ← Skill manifest → Gemini function declaration çevirici.
│   ├── memory/
│   │   ├── umi.js               ← Hafıza katmanı (L1 JSON, L2 Vektör, L3 Cache).
│   │   ├── genesis.js           ← Yeni ajan fabrikası. Default dosyaları yazar.
│   │   ├── parser.js            ← Ajanın config/DNA/RULES'ını okur.
│   │   └── embeddings_adapter.js← Vektör DB (SQLite + cosine similarity). ZATEN VAR ama kapalı.
│   ├── config/constants.js      ← Tüm sabitler (MAX_REACT_LOOPS, token limitleri, vb.)
│   ├── core/
│   │   ├── telemetry_tracker.js ← Token kullanımı ve araç çağrılarını loglar.
│   │   ├── shield.js            ← Prompt injection koruması (CyberShield).
│   │   ├── circuit_breaker.js   ← API çökmelerinde otomatik devre kesici.
│   │   ├── backoff.js           ← Exponential retry mekanizması.
│   │   └── timeout_shield.js    ← LLM çağrılarına zaman aşımı koruması.
│   ├── scheduler/cron_manager.js← [V3.1 YENİ] Zamanlanmış görevler.
│   └── channels/telegram_bridge.js ← [V3.1 YENİ] Telegram per-agent bot.
├── dashboard/src/
│   ├── App.jsx                  ← React frontend (tek dosya, ~1866 satır).
│   └── api.js                   ← Frontend API helper fonksiyonları.
├── Agents/                      ← Her ajan için bir klasör.
│   └── {AjanAdı}/
│       ├── Mind-Set_Core/
│       │   ├── config.json      ← Model, API key, skills listesi, temperature vb.
│       │   ├── DNA.md           ← Ajanın "fıtrat" dosyası (sistem promptu).
│       │   ├── RULES.md         ← Kısıtlama ve davranış kuralları.
│       │   └── SHIELD.txt       ← Prompt injection filtresi.
│       ├── Chats/               ← Sohbet geçmişi (thread JSON dosyaları).
│       └── skills/              ← Ajana özel araçlar (JS dosyaları).
└── global_settings.json         ← Sistem geneli ayarlar.
```

### Veri Akışı (Her İsteğin Macerası)

```
[Kullanıcı Mesajı] → ui_server.js (POST /api/agents/:id/chat)
  ↓
  1. MindsetParser.loadConfig()     → config.json oku
  2. CyberShield.sanitize()         → prompt injection kontrolü
  3. LLMBridge.execute()            → ReAct döngüsü başlat
     ↓
     3a. SkillLoader.loadSkills()   → araçları yükle
     3b. GeminiAdapter.generate()   → LLM'ye gönder
     3c. Araç çağrısı gelirse?      → SandboxRunner.executeIsolated() (Worker Thread)
     3d. Sonucu LLM'ye geri gönder  → Döngü devam (max 25 tur)
     ↓
  4. SSE stream ile frontend'e yanıt gönder
  5. UMI.save()                     → sohbeti diske kaydet
```

---

## ÖZELLİK 1: ARAÇ DOKÜMANTASYONU (Tool Input/Output Schema)

### Problem
Ajan, hangi aracı hangi parametreyle çağıracağını **prompt'tan tahmin ediyor.** Bazı araçlar belirsiz — ajan yanlış parametre gönderiyor, araç çöküyor, kullanıcı "neden yapamadı" diye soruyor.

```
// Mevcut durum (genesis.js DNA template):
"- **byterover**: Terminal komutu çalıştırmak, dosya okumak/yazmak/listelemek/silmek için. Parametreleri: action, command, path, content."
// → Hangi action ne bekliyor? Zorunlu mu? Tip ne? Belli değil.
```

### Mevcut Durum
- Araçların `input_schema` bilgisi yok  
- `output_schema` bilgisi yok  
- Örnek kullanım yok

### Çözüm
`genesis.js` → `getDNATemplate()` fonksiyonunda her aracın detaylı referans kartı yazılır:

```javascript
'📦 **byterover** - Dosya ve terminal işlemleri',
'  Parametreler: action (run_command|read_file|write_file|list_directory|delete_path), command (string), path (string), content (string)',
'  Zorunlu: action. Diğerleri action tipine göre zorunlu.',
'  Örnek: byterover({action: "read_file", path: "C:/dosya.txt"}) → Dosya içeriği döner',
```

### Dosya Değişiklikleri

| Dosya | Satır | Değişiklik |
|---|---|---|
| [genesis.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/memory/genesis.js) | 18-68 | 11 araç için detaylı parametre+tip+örnek |

### QA Test Senaryosu

```
1. Yeni ajan oluştur (Dashboard → Genesis Başlat)
2. Oluşan DNA.md dosyasını aç → "DETAYLI REFERANS" bölümünü kontrol et
3. Ajana sor: "İstanbul hava durumu ne?"
4. BEKLENEN: Ajan weather({city: "İstanbul"}) çağırır (parametreyi doğru gönderir)
5. BAŞARISIZLIK KRİTERİ: Ajan yanlış parametre gönderirse veya araç çağırmadan cevap uydurursa → FAIL
```

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Ajan yanlış parametre gönderme oranı düşer | DNA prompt'u ~500 token uzar |
| Self-documenting — yeni skill eklense bile format belli | Her yeni skill'e manuel referans kartı yazılmalı |
| Yeni ajan oluştuğunda otomatik dahil olur | Eski ajanların DNA'sı güncellenmez (manuel güncelle) |

### Versiyon: 🔴 V3.1 (YAPILDI ✅)

---

## ÖZELLİK 2: HATA GERİ BİLDİRİMİ (Zengin Error Reporting)

### Problem
Araç patladığında ajan tek satır hata alıyor: `[SKILL RUNTIME ERROR]: ECONNREFUSED`. Bu, ajana hiçbir şey anlatmıyor. Ajan kullanıcıya sadece "bir hata oluştu" diyor.

### Mevcut Durum
```javascript
// sandbox_runner.js (ESKİ):
resolve(`[SKILL RUNTIME ERROR]: ${msg.error}`);
// → Ajan: "Bir hata oluştu."  Kullanıcı: "Ne hatası?"
```

### Çözüm
3 hata handler'ını zenginleştir:

```javascript
// sandbox_runner.js (YENİ):
resolve(`[ARAÇ HATASI - ${skillObj.name}]
Hata: ${msg.error}
Girdi: ${JSON.stringify(args).slice(0, 200)}
Öneri: Bu aracı farklı parametrelerle deneyin veya internet bağlantısını kontrol edin.`);
```

### Dosya Değişiklikleri

| Dosya | Satır | Değişiklik |
|---|---|---|
| [sandbox_runner.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/skills/sandbox_runner.js) | 50-53 | Timeout hatası → `[ARAÇ HATASI]` formatı |
| [sandbox_runner.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/skills/sandbox_runner.js) | 59-62 | Runtime hatası → `[ARAÇ HATASI]` formatı |
| [sandbox_runner.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/skills/sandbox_runner.js) | 67-68 | Fatal hatası → `[ARAÇ HATASI]` formatı |

### QA Test Senaryosu

```
1. Ajana sor: "C:/olmayan_dosya_12345.txt dosyasını oku"
2. Ajan byterover({action: "read_file", path: "..."}) çağırır
3. BEKLENEN ÇIKTI: "[ARAÇ HATASI - byterover] Hata: ENOENT... Girdi: {action: read_file...} Öneri: ..."
4. Ajan kullanıcıya: "Dosya bulunamadı, yolu kontrol edin" der (uydurmaz!)
5. BAŞARISIZLIK KRİTERİ: Ajan dosya içeriğini uydurursa → FAIL
```

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Ajan "neden" patladığını bilir | Hata mesajı ~100 token uzar (ihmal edilir) |
| Kullanıcıya mantıklı açıklama yapabilir | Girdi JSON'u hassas veri içerebilir (200 char limit ile sınırlı) |
| Debug kolaylaşır | - |

### Versiyon: 🔴 V3.1 (YAPILDI ✅)

---

## ÖZELLİK 3: GÖREV KUYRUĞU / CRON ZAMANLATICI

### Problem
Ajan pasif — kullanıcı mesaj göndermezse hiçbir şey yapmaz. "Sabah 9'da rapor hazırla" diyemiyorsun. Otonom çalışma kapasitesi sıfır.

### Mevcut Durum
- Zamanlanmış görev mekanizması yok
- Ajan sadece reactive (tepki veren), proactive (inisiyatif alan) değil

### Çözüm
`node-cron` ile per-agent zamanlanmış görevler + persist to disk:

```javascript
// cron_manager.js — Yeni dosya
class CronManager {
    schedule(agentId, cronExpr, taskPrompt)  // Görev ekle
    list(agentId)                              // Görevleri listele
    cancel(jobId)                              // Görev iptal
    restoreAll()                               // Sunucu restart'ında geri yükle
    _persist(agentId)                          // Diske kaydet
}
```

**Ajan kontrolü:** Ajan sohbet içinde cron kurabilir:
```
[CRON_SCHEDULE]: {"cron": "0 9 * * 1-5", "task": "Günlük sistem durumu raporu hazırla"}
```

**Güvenlik:** Minimum 5 dakika aralık. `* * * * *` (her dakika) reddedilir.

### Dosya Değişiklikleri

| Dosya | İşlem | Satır |
|---|---|---|
| [cron_manager.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/scheduler/cron_manager.js) | **YENİ** | ~120 |
| [ui_server.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/gateway/ui_server.js) | MODIFY | +3 endpoint (POST/GET/DELETE) |
| [ui_server.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/gateway/ui_server.js) | MODIFY | Chat endpoint'e `[CRON_SCHEDULE]` parser |
| [genesis.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/memory/genesis.js) | MODIFY | DNA'ya cron bilgisi eklendi |

### QA Test Senaryosu

```
1. curl -X POST http://localhost:3004/api/agents/Asistan/cron \
     -H "Content-Type: application/json" \
     -d '{"cronExpr":"*/5 * * * *","taskPrompt":"Saat kaç söyle"}'
2. BEKLENEN: {"status":"scheduled","jobId":"cron_Asistan_..."}
3. curl http://localhost:3004/api/agents/Asistan/cron
4. BEKLENEN: [{id,cronExpr:"*/5 * * * *",task:"Saat kaç söyle"}]
5. GÜVENLİK TESTİ: cronExpr="* * * * *" → BEKLENEN: 400 error "Minimum 5 dakika"
6. curl -X DELETE http://localhost:3004/api/agents/Asistan/cron/{jobId}
7. BEKLENEN: {"status":"cancelled"}
8. Sunucuyu kapat, tekrar aç → görevin geri yüklendiğini doğrula
```

**CANLI TEST SONUÇLARI:**
- ✅ POST: `{"status":"scheduled","jobId":"cron_Asistan_1774018585717"}`
- ✅ GET: Doğru liste döndü
- ✅ Güvenlik: `* * * * *` reddedildi
- ✅ DELETE: `{"status":"cancelled"}`

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Fire-and-forget otonom görevler | Windows sleep/hibernate'de duraklar |
| Disk persist — restart dayanıklı | Yanlış cron ifadesi maliyeti patlatabilir (5dk min koruma var) |
| Ajan prompt ile kendi görevini kurar | Cron çıktısı Dashboard'da görünmüyor (Telegram/log ile izlenebilir) |
| Sıfır ek token maliyeti (idle = 0) | - |

### Versiyon: 🔴 V3.1 (YAPILDI ✅)

---

## ÖZELLİK 4: TELEGRAM PER-AGENT BOT ENTEGRASYONU

### Problem
Kullanıcı (KOBİ patronu) fabrikadayken bilgisayar başında değil. Dashboard açamıyor. Telefondan ajana ulaşması lazım. Telegram herkesin cebinde — sıfır öğrenme eğrisi.

### Mevcut Durum
- Telegram kodu sıfır
- Dashboard'da "Telegram Token" input alanı vardı ama backend'e bağlı değildi

### Çözüm
`grammy` kütüphanesi ile per-agent izole Telegram bot:

```
[Telegram Mesajı] → TelegramBotManager → LLMBridge.execute() → Cevap → Telegram'a geri
                                           ↕
                                    UMI.save("📱 Telegram" klasörüne)
```

**Her ajan = 1 izole bot.** Birinin çökmesi diğerini etkilemez.

```javascript
// telegram_bridge.js — Yeni dosya
class TelegramBotManager {
    startAll()           // Sunucu başlangıcında tüm token'lı ajanları tara ve bot başlat
    startBot(agentId)    // Tek ajan için bot başlat
    stopBot(agentId)     // Bot durdur
    restartBot(agentId)  // Token değiştiğinde yeniden başlat
    _ensureTelegramFolder(agentId) // "📱 Telegram" klasörü oluştur
}
```

**Sohbetler Dashboard'da "📱 Telegram" klasöründe görünür.** Her Telegram kullanıcısı ayrı thread.

### Dosya Değişiklikleri

| Dosya | İşlem | Satır |
|---|---|---|
| [telegram_bridge.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/channels/telegram_bridge.js) | **YENİ** | ~200 |
| [ui_server.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/gateway/ui_server.js) | MODIFY | Import + config save'de `telegramManager.restartBot()` |
| [ui_server.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/gateway/ui_server.js) | MODIFY | `app.listen` → `telegramManager.startAll()` |
| [genesis.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/memory/genesis.js) | MODIFY | Default config'e `telegram_bot_token: ""` |
| [genesis.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/memory/genesis.js) | MODIFY | DNA'ya Telegram bilgisi |
| [App.jsx](file:///C:/AgentsHUB-DEV/AgentsHUB/app/dashboard/src/App.jsx) | MODIFY | `telegram_token` → `telegram_bot_token` hizalama |

### QA Test Senaryosu

```
1. BotFather'dan yeni bot oluştur → /newbot → token al (ör: 7123456789:AAH...)
2. Dashboard → Asistan → Ayarlar → "Telegram Bot Token" → token yapıştır → Kaydet
3. Sunucu loglarında: "[TELEGRAM] ✅ @BotUsername (Asistan) aktif." göründüğünü doğrula
4. Telegram'dan bota yaz: "Saat kaç?"
5. BEKLENEN: Bot ajanın cevabını döndürür (get_time aracını çağırarak)
6. Dashboard'a dön → Asistan → Sohbetler → "📱 Telegram" klasörünü kontrol et
7. BEKLENEN: Telegram sohbeti thread olarak görünür
8. Token'ı sil ve kaydet → BEKLENEN: Bot durur, log "[TELEGRAM] durduruldu"
9. BAŞARISIZLIK KRİTERİ: Bot cevap vermezse veya sohbet "Telegram" klasöründe görünmezse → FAIL
```

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| KOBİ patronu zaten Telegram kullanıyor | Her ajan için BotFather'dan ayrı token gerekli |
| Mevcut LLMBridge aynen kullanılır | Dosya gönderimi 20MB limiti (Telegram kısıtı) |
| İzole botlar — birinin çökmesi diğerini etkilemez | Sesli mesaj desteği yok (Whisper eklenebilir) |
| Sohbet geçmişi Dashboard'da görünür | Bot API rate limit: 30 mesaj/saniye |

### Versiyon: 🔴 V3.1 (YAPILDI ✅)

---

## ÖZELLİK 5: TURBO REACT (Artırılmış Döngü + Güvenlik)

### Problem
`MAX_REACT_LOOPS = 7` (eski) → Ajan tek mesajda en fazla 7 araç çağrısı yapabiliyor. Karmaşık görevlerde ("saati öğren, hava durumunu sor, dosyayı oku ve rapor yaz") yetersiz kalıyor.

### Mevcut Durum
- Loop: 20 (zaten yükseltilmişti)
- Token bütçesi: YOK
- Zaman limiti: YOK
- SSE timeout: 2 dakika

### Çözüm
Loop'u 25'e çek + 3 güvenlik katmanı ekle:

```javascript
// constants.js
MAX_REACT_LOOPS = 25;        // 25 ardışık araç çağrısı izni
REACT_TOKEN_BUDGET = 80000;  // 80K token hard cap
REACT_TIME_LIMIT_MS = 300000; // 5 dakika hard limit

// llm_bridge.js (ReAct döngüsünün başında):
if (reactTotalTokens > REACT_TOKEN_BUDGET) break;   // Maliyet giyotini
if (Date.now() - reactStartTime > REACT_TIME_LIMIT_MS) break; // Zaman duvarı

// ui_server.js
req.setTimeout(600000); // SSE timeout: 10 dakika
```

### Dosya Değişiklikleri

| Dosya | Satır | Değişiklik |
|---|---|---|
| [constants.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/config/constants.js) | 9 | MAX=25 |
| [constants.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/config/constants.js) | 46-47 | +REACT_TOKEN_BUDGET, +REACT_TIME_LIMIT_MS |
| [llm_bridge.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/bridge/llm_bridge.js) | 17-24 | Import genişletildi |
| [llm_bridge.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/bridge/llm_bridge.js) | 137-152 | Safety guard blokları |
| [llm_bridge.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/bridge/llm_bridge.js) | 280 | reactTotalTokens counter |
| [ui_server.js](file:///C:/AgentsHUB-DEV/AgentsHUB/app/src/gateway/ui_server.js) | 353 | SSE timeout 2dk→10dk |

### QA Test Senaryosu

```
1. Ajana: "Önce saati öğren, sonra İstanbul hava durumunu sor, sonra CPU kullanımını kontrol et"
2. BEKLENEN: Ajan 3 aracı ardışık çağırır (get_time → weather → system_monitor) ve tek cevap döndürür
3. Loglarda: "[BRIDGE] ReAct Döngüsü #2", "#3" görünmeli
4. Token guard test: 80K üstü simülasyon → "[BRIDGE] ⚠️ Token bütçesi aşıldı" logu
```

### Versiyon: 🔴 V3.1 (YAPILDI ✅)

---

## ÖZELLİK 6: KALICI HAFIZA (Vektör DB / L2)

### Problem
Ajan thread değiştiğinde geçmişi unutuyor. "Daha önce ne sormuştum?" sorusuna cevap veremiyor. Çapraz sohbet hafızası yok.

### Mevcut Durum — SÜRPRİZ: L2 ZATEN YAZILMIŞ

```
embeddings_adapter.js → tam işlevsel Vektör DB:
✅ better-sqlite3 ile per-agent izole SQLite (embeddings.sqlite)
✅ Google gemini-embedding-001 ile 768 boyutlu vektör üretimi
✅ Cosine Similarity ile anlamsal arama
✅ umi.js satır 101-113'te her mesajda otomatik L2 embedding enjeksiyonu
```

**Ama çalışmıyor çünkü:**

| Sorun | Neden |
|---|---|
| `better-sqlite3` native C++ modülü | Windows'ta derleme istiyor, kurulu değilse L2 sessizce kapanıyor |
| Ajan arama yapamıyor | `semanticSearch()` var ama skill olarak sunulmamış |
| Kalibrasyon yok | Benzerlik eşiği (threshold) ayarlanmamış |

### Çözüm

| Adım | Açıklama | Dosya | Efor |
|---|---|---|---|
| 1 | `better-sqlite3` kurulumu doğrula | Terminal | 15 dk |
| 2 | `/memory search` komutunu skill olarak sun | Yeni skill veya LLMBridge genişletme | 1 saat |
| 3 | Benzerlik eşiğini 0.7+ olarak kalibre et | embeddings_adapter.js | 30 dk |
| 4 | TTL (Time-To-Live) ekle (eski veri kirliliği önle) | embeddings_adapter.js | 1 saat |

### QA Test Senaryosu

```
1. "Geçen hafta İstanbul hava durumu nasıldı?" sor (geçmiş sohbette sorulmuşsa)
2. BEKLENEN: L2 vektör araması → eski cevabı bulur → bağlama enjekte eder
3. Ajan: "Geçen hafta sorduğunuzda 15°C ve parçalı bulutluydu" der
4. BAŞARISIZLIK KRİTERİ: "Geçmiş sohbetlerin erişimim yok" derse → L2 çalışmıyor
```

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Çapraz sohbet hafızası | Kötü kalibre = halüsinasyon ARTABİLİR |
| Tekrarlayan sorularda API çağrısı yapmadan cevap | Eski bilgi kirliliği (TTL şart) |
| Lokal SQLite = sıfır ek maliyet | KVKK: Silme hakkı uygulanmalı |
| KOD ZATEN YAZILI — sadece aktifleştir | `better-sqlite3` native modül Windows'ta sorunlu olabilir |

### Versiyon: 🟡 V3.2

---

## ÖZELLİK 7: ARAÇ ZİNCİRİ (Tool Chaining / Turbo ReAct)

### Problem
Ajan tek seferde sadece 1 araç çağırabiliyor. "İnternette ara → sonucu dosyaya yaz → dosyayı analiz et" gibi zincirleme görevleri ayrı ayrı döngüde yapıyor, kullanıcı her adımda bekliyor.

### Mevcut Durum
- ReAct döngüsü VAR (while loop, MAX=25)
- Her döngüde 1 tool call → sonuç → LLM → tekrar
- Zaten zincirleme çalışabiliyor AMA loop sayısı düşüktü

### Çözüm
**Bu özellik Turbo ReAct (Özellik 5) ile zaten çözüldü.** Loop=25 ile ajan 25 araç zincirleyebilir. Ek bir değişiklik GEREKMEZ — LLM zaten "bir sonraki adımda hangi aracı çağıracağına" karar veriyor.

### QA Test Senaryosu

```
1. Ajana: "web_scraper ile example.com'u oku, sonra içeriği Desktop'a dosya.txt olarak kaydet, sonra dosyayı oku ve özetle"
2. BEKLENEN: 3 ardışık araç çağrısı (web_scraper → byterover write → byterover read) + özet
3. Loglarda: ReAct Döngüsü #1, #2, #3 görünmeli
```

### Versiyon: 🔴 V3.1 (YAPILDI ✅ — Turbo ReAct'in parçası)

---

## ÖZELLİK 8: KENDİNİ İZLEME (Self-Reflection)

### Problem
Ajan cevaplarının kalitesini ölçemiyor. "Bu cevap saçmaydı" diyebilecek iç denetçi yok. Halüsinasyon tespiti sadece fallback modunda var, normal modda yok.

### Mevcut Durum
- Fallback zincirine "HALÜSİNASYON YASAKTIR" uyarısı eklendi (V3.0)
- Normal modda halüsinasyon tespiti yok
- Cevap kalitesi ölçümü yok

### Çözüm Mimarisi

```javascript
// llm_bridge.js — ReAct döngüsünün SON adımında (araç çağrısı bittiğinde):
// İç Denetçi: Cevabı ikinci bir LLM çağrısıyla puanla
const reflectionPrompt = `Aşağıdaki cevabı 1-10 arası puanla. 
Kritik sorular:
1. Cevap soruya gerçekten cevap veriyor mu?
2. Araç çıktısıyla tutarlı mı yoksa uydurma mı?
3. Eksik veya belirsiz bir bilgi var mı?
Puan 5'in altındaysa cevabı düzelt.`;

const reflection = await quickLLMCall(reflectionPrompt + response.content);
if (reflection.score < 5) {
    // Cevabı düzelt ve tekrar sun
}
```

### QA Test Senaryosu

```
1. Ajana saçma bir soru sor: "Ay'ın ağırlığı kaç kilogram?"
2. BEKLENEN: İç denetçi "Bu fiziksel anlamsızlık" tespit eder
3. Ajan: "Ay'ın kütlesi 7.34×10²² kg'dır, ağırlık ise üzerinde bulunduğun cismin çekimine bağlıdır" der
4. Telemetri'de: reflection_score: 8/10 kaydedilmeli
```

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Halüsinasyon tespiti | Her mesajda +1 ekstra LLM çağrısı (+500-1K token) |
| Cevap kalitesi artışı | Yanıt süresi uzar (ek ~2-3 saniye) |
| Opsiyonel: sadece flag ile açılır | Basit sorularda gereksiz maliyet |
| Güvenirlik artışı | Reflection LLM'si de halüsinasyon görebilir |

### Versiyon: 🔵 V4.0

---

## ÖZELLİK 9: DASHBOARD'DA MALİYET TAKİBİ

### Problem
"Bu ay kaç TL harcadım?" sorusuna cevap yok. Token kullanımı telemetride var ama TL/USD cinsinden gösterilmiyor. Günlük/aylık grafik yok.

### Mevcut Durum
- `telemetry_tracker.js` token sayılarını logluyor
- Dashboard'da Telemetry panelinde sayılar var ama PARA olarak gösterilmiyor
- Fiyat bilgisi ($/1M token) sistem içinde yok

### Çözüm Mimarisi

```javascript
// telemetry_tracker.js → Fiyat tablosu ekle:
const PRICING = {
    'gemini-2.5-flash':      { input: 0.15, output: 0.60 },  // $/1M token
    'gemini-2.5-pro':        { input: 1.25, output: 5.00 },
    'gemini-2.5-flash-lite': { input: 0.075, output: 0.30 },
};

// Her LLM çağrısında: totalCost += (inputTokens / 1e6) * rate.input + (outputTokens / 1e6) * rate.output

// Yeni endpoint: GET /api/telemetry/cost?period=daily|monthly
// Response: { today: "₺0.45", thisMonth: "₺12.30", daily: [{date,cost}], byModel: {...} }
```

**Dashboard'a eklenmesi gereken:**
- Telemetri paneline "₺" göstergesi
- Günlük maliyet çubuk grafik
- Model bazlı maliyet dağılımı

### Dosya Değişiklikleri

| Dosya | İşlem | Efor |
|---|---|---|
| `telemetry_tracker.js` | Fiyat tablosu + maliyet hesaplama | 2 saat |
| `ui_server.js` | `/api/telemetry/cost` endpoint | 30 dk |
| `App.jsx` | Telemetry paneline maliyet göstergesi + grafik | 3-4 saat |

### QA Test Senaryosu

```
1. 5 farklı mesaj gönder (farklı modellerle)
2. GET /api/telemetry/cost → BEKLENEN: {today: "₺0.XX", byModel: {...}}
3. Dashboard'da telemetri panelini aç → ₺ göstergesi görünmeli
4. BAŞARISIZLIK KRİTERİ: Fiyat bilgisi sıfır veya NaN döndürürse → FAIL
```

### Versiyon: 🟡 V3.2

---

## ÖZELLİK 10: RAPORLAMA MOTORU

### Problem
"Geçen haftanın özetini çıkar" dediğinde güzel formatlı PDF/Excel rapor üretebilmeli. Şu an düz metin çıktı veriyor.

### Mevcut Durum
- PDF/Excel üretimi yok
- Ajan düz metin rapor yazabiliyor ama dosya formatı yok

### Çözüm Mimarisi

```javascript
// Yeni skill: report_generator.js
// Bağımlılıklar: pdfkit (PDF) + xlsx (Exceljs)
module.exports = {
    name: "report_generator",
    description: "PDF veya Excel rapor üretir",
    parameters: {
        format: { type: "string", enum: ["pdf", "xlsx"], required: true },
        title: { type: "string", required: true },
        content: { type: "string", required: true }, // Markdown veya JSON
        outputPath: { type: "string", default: "Desktop/rapor" }
    },
    execute: async ({ format, title, content, outputPath }) => {
        if (format === 'pdf') {
            // pdfkit ile PDF oluştur
        } else {
            // exceljs ile XLSX oluştur
        }
        return `Rapor oluşturuldu: ${outputPath}.${format}`;
    }
};
```

### QA Test Senaryosu

```
1. Ajana: "Bu haftanın özet raporunu PDF olarak Masaüstüne kaydet"
2. BEKLENEN: Ajan report_generator({format: "pdf", title: "Haftalık Özet", ...}) çağırır
3. Masaüstünde "rapor.pdf" oluşur ve açılabilir
```

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Profesyonel çıktı | +15MB bağımlılık (pdfkit + exceljs) |
| KOBİ'ler rapor sever | Karmaşık tablo formatları zor |
| Skill olarak izole (çekirdek etkilenmez) | PDF stil tasarımı zaman alır |

### Versiyon: 🔵 V4.0

---

## ÖZELLİK 11: TEK TIKLA KURULUM (MSI/EXE)

### Problem
Mühendis "npm nedir" bilmiyor. `.bat` dosyası iyi ama `node` kurulu olmalı. Tek bir `.exe` veya `.msi` lazım.

### Mevcut Durum
- `.bat` başlatıcılar VAR (AgentsHUB_Baslat.bat)
- `pkg` ile EXE denemesi YAPILDI ama ESM çakışması nedeniyle çöktü
- Node.js sistemde kurulu olmalı

### Çözüm Seçenekleri

| Yöntem | Avantaj | Dezavantaj | Tercih |
|---|---|---|---|
| `nexe` | Native modül desteği iyi | Aktif geliştirmesi yavaş | ❌ |
| `pkg` | Tek EXE | ESM çakışması yaşandı | ❌ |
| Inno Setup + Node.js gömülü | En stabil, resmi Node.js embedded | En az sürpriz | ✅ |
| Electron | GUI + tray + auto-update | +150MB boyut | Overkill |

**Önerilen:** Inno Setup ile `.msi` veya `.exe` installer. İçine Node.js portable gömülür. Kullanıcı çift tıklar → kurulur → tray'e oturur.

### QA Test Senaryosu

```
1. Farklı bir Windows makineye installer'ı kopyala (Node.js KURULU DEĞİL)
2. Çift tıkla → kurulum sihirbazı açılır
3. "İleri" → "Kur" → Masaüstüne kısayol oluşur
4. Kısayolu çift tıkla → Dashboard açılır
5. BAŞARISIZLIK KRİTERİ: "node bulunamadı" hatası alırsa → FAIL
```

### Versiyon: 🔵 V4.0

---

## ÖZELLİK 12: ÇOKLU AJAN ORKESTRASYONU (Inter-Agent Communication)

### Problem
Bir ajan müşteriden sipariş alsın, otomatik olarak diğer ajana "stok kontrolü yap" desin. Ajanlar arası iletişim yok.

### Mevcut Durum
- Her ajan izole çalışıyor
- Ajan başka bir ajanın varlığından bile habersiz
- Paylaşımlı mesaj kuyruk sistemi yok

### Çözüm Mimarisi

```javascript
// Yeni modül: orchestrator.js
// Ajan-ajan arası basit mesaj geçişi
class Orchestrator {
    // Ajan A → Ajan B'ye görev gönder
    async delegate(fromAgentId, toAgentId, message) {
        return LLMBridge.execute(toAgentId, 
            `[GELEN GÖREV - ${fromAgentId}]: ${message}`, [], {});
    }
}

// Ajan DNA'sına eklenir:
// "[AJAN DELEGASYONU]: Başka ajana görev devretmek için:
//  [DELEGATE]: {"to": "StokcuAjan", "task": "X ürününün stokunu kontrol et"}"
```

**Kritik Mimari Kararlar:**

| Soru | Cevap |
|---|---|
| Senkron mu asenkron mu? | Asenkron (ajan beklemeden görev atar) |
| Sonuç nasıl döner? | Callback thread'i veya paylaşımlı dosya |
| Güvenlik? | Sadece aynı sistemdeki ajanlar arası |
| Sonsuz döngü riski? | Max delegation depth = 3 |

### QA Test Senaryosu

```
1. Ajan A'ya: "Ajan B'ye sor: stokta kaç X ürünü var?"
2. BEKLENEN: A → [DELEGATE] → B çağrılır → B cevap verir → A kullanıcıya sunar
3. GÜVENLİK: A → B → A → B sonsuz döngü testi → MAX 3 seviyede dur
```

### Versiyon: ⚪ V5.0

---

## ÖZELLİK 13: DOSYA YÜKLEME (Upload + Parse)

### Problem
Kullanıcı PDF fatura veya Excel tablo yükleyip ajana analiz ettirmek istiyor. Şu an dosya yükleme yok.

### Mevcut Durum
- Upload endpoint yok
- PDF/Excel parse kütüphanesi yok
- Ajana "dosyayı oku" diyebiliyorsun ama byterover ile sadece text dosya okuyabiliyor

### Çözüm Mimarisi

```
[Frontend Drag&Drop] → [ui_server.js: multer middleware] → uploads/{agentId}/
                                                                 ↓
[Yeni Skill: file_parser.js] ← LLMBridge ← Ajan: "Bu dosyayı analiz et"
```

```javascript
// Bağımlılıklar:
// multer (~200KB) — dosya upload middleware
// pdf-parse (~500KB) — PDF metin çıkarma
// xlsx (~2MB) — Excel okuma

// file_parser.js skill:
module.exports = {
    name: "file_parser",
    parameters: { path: "string", format: "pdf|xlsx|csv|txt" },
    execute: async ({ path, format }) => {
        if (format === 'pdf') return (await pdfParse(fs.readFileSync(path))).text;
        if (format === 'xlsx') return XLSX.utils.sheet_to_csv(workbook.Sheets[0]);
        return fs.readFileSync(path, 'utf8');
    }
};
```

### QA Test Senaryosu

```
1. Dashboard'da sohbet alanına PDF fatura sürükle-bırak
2. Dosya uploads/{agentId}/ altına kaydedilir
3. Ajana: "Bu faturayı analiz et"
4. BEKLENEN: file_parser skill çağrılır → metin çıkarılır → ajan analiz eder
5. GÜVENLİK: .exe dosyası yüklemeye çalış → BEKLENEN: "İzin verilmeyen dosya türü"
```

### Avantaj / Dezavantaj

| ✅ Avantaj | ❌ Dezavantaj |
|---|---|
| Fatura/teklif okutma — KOBİ katil özelliği | Büyük dosya = çok token (50 sayfa = 20K+) |
| Skill olarak izole — çekirdek etkilenmez | Karmaşık Excel (pivot, makro) parse edilmez |
| Kaldırılası: skill silinirse sistem eski hali | +7-8MB bağımlılık |

### Versiyon: 🟡 V3.2

---

## ÖZELLİK 14: WHATSAPP BUSINESS ENTEGRASYONU

### Problem
Telegram güzel ama bazı KOBİ patronları WhatsApp kullanıyor. Telegram'la aynı mantık ama WhatsApp Business API ile.

### Mevcut Durum
- WhatsApp entegrasyonu yok
- Telegram bridge yazıldı → aynı pattern uygulanabilir

### Çözüm Mimarisi
Telegram bridge ile aynı pattern. Fark: WhatsApp Business API webhook gerektirir (Meta Developer Console).

```javascript
// whatsapp_bridge.js — telegram_bridge.js'in klonu
// Fark: Webhook (HTTPS gerekli) vs Telegram long-polling (HTTP yeterli)
// Meta Cloud API kullanılır
```

### Kritik Fark: WhatsApp vs Telegram

| | Telegram | WhatsApp |
|---|---|---|
| API Erişimi | Ücretsiz, açık | Meta onayı gerekli |
| Webhook | Gerekmez (long polling) | HTTPS webhook zorunlu |
| Bot Oluşturma | BotFather (2 dk) | Meta Developer Console (1-2 gün onay) |
| Dosya Limiti | 20MB | 16MB |
| Maliyet | Ücretsiz | 1000 mesaj/ay ücretsiz, sonra ücretli |

### Versiyon: 🔵 V4.0

---

## ÖZELLİK 15: OTONOM GÖREV KOŞUCUSU (Agentic Drive / Task Runner)

### Problem
"50 faturayı işle" gibi 30+ dakikalık görevler verilemez. Ajan 15. adımda context'i kaybeder, API çökerse görev ölür, kullanıcı ilerlemeyi göremez.

### Mevcut Durum
- Tek mesaj = tek HTTP request. 30 dk sığmaz.
- Checkpoint yok → çökerse sıfırdan başlaması lazım
- İlerleme göstergesi yok

### Çözüm: Hibrit Mimari (Turbo ReAct + Task Runner)

```
KULLANICI MESAJI
     │
     ▼
┌────────────────────────┐
│  GÖREV SINIFLANDIRICI  │
│  (Kısa mı? Uzun mu?)  │
└────┬───────────┬───────┘
  <5 dk         5-60 dk
     │           │
     ▼           ▼
┌──────────┐ ┌──────────────────────────────────┐
│ TURBO    │ │ TASK RUNNER                       │
│ REACT    │ │ Görevi adımlara böl               │
│ Loop: 25 │ │ Her adım = 1 Turbo ReAct çağrısı │
│ Cap: 80K │ │ Checkpoint → Retry → Devam        │
│ Time: 5m │ │ Progress: "7/20 fatura tamam"     │
└──────────┘ └──────────────────────────────────┘
```

**Task Runner:** Her adımda mevcut ReAct motorunu çağırır ama **temiz context** ile. Adımlar arası özet (max 500 token) enjekte edilir.

```javascript
// scheduler/task_runner.js — Yeni dosya (~150-200 satır)
class TaskRunner {
    async start(agentId, taskDescription) {
        const steps = await this._decompose(agentId, taskDescription);
        for (const step of steps) {
            const checkpoint = this._loadCheckpoint(taskId);
            if (checkpoint.stepsDone.includes(step.id)) continue; // Zaten yapıldı
            
            try {
                const result = await LLMBridge.execute(agentId, step.prompt, [], {});
                this._saveCheckpoint(taskId, step.id, result);
            } catch (e) {
                // 3x retry → park → 10dk sonra otomatik devam
            }
        }
    }
}
```

### QA Test Senaryosu

```
1. POST /api/agents/Asistan/task → body: {task: "3 farklı şehrin hava durumunu raporla"}
2. Task Runner: LLM'ye böldürür → ["İstanbul hava", "Ankara hava", "İzmir hava"]
3. Her adım bağımsız ReAct çağrısı
4. GET /api/agents/Asistan/task/{id}/status → {step: 2, total: 3, status: "running"}
5. 2. adımda API hata simülasyonu → retry → devamını doğrula
```

### Versiyon: 🟡 V3.2

---

## TOPLAM MALİYET ANALİZİ

| Özellik | Token Artışı/Sorgu | Aylık Ek Maliyet (1K sorgu/gün, Flash) |
|---|---|---|
| Araç Dokümantasyonu | +200 (prompt'a schema) | ~1₺ |
| Hata Raporları | +100 (hata detayı) | <1₺ |
| Cron Scheduler | 0 (idle, tetiklenince normal) | 0₺ |
| Telegram | 0 ek (aynı LLM çağrısı) | 0₺ |
| Turbo ReAct (25 loop) | +1-2K (daha fazla döngü - göreve bağlı) | ~3-5₺ |
| Vektör DB (RAG) | +1-2K (enjekte context) | ~5-10₺ |
| Self-Reflection | +500-1K (iç denetim) | ~2-4₺ |
| **TOPLAM** | **+2.5K-5K/sorgu** | **~10-20₺/ay** |

---

## ÖNCELİKLENDİRME MATRİSİ

| # | Özellik | Değer | Efor | Risk | Versiyon | Durum |
|---|---|---|---|---|---|---|
| 1 | Araç Dokümantasyonu | 🟢 High | 1-2 saat | 🟢 Low | V3.1 | ✅ YAPILDI |
| 2 | Hata Geri Bildirimi | 🟢 High | 30 dk | 🟢 Low | V3.1 | ✅ YAPILDI |
| 3 | Cron Zamanlayıcı | 🟢 High | 3-4 saat | 🟢 Low | V3.1 | ✅ YAPILDI |
| 4 | Telegram Per-Agent | 🟢 High | 12-18 saat | 🟡 Med | V3.1 | ✅ YAPILDI |
| 5 | Turbo ReAct | 🟢 High | 2 dk | 🟢 Low | V3.1 | ✅ YAPILDI |
| 6 | Araç Zinciri | 🟢 High | 0 (Turbo ReAct) | 🟢 Low | V3.1 | ✅ YAPILDI |
| 7 | Dashboard Maliyet | 🟡 Med | 6-8 saat | 🟢 Low | V3.2 | ⏳ |
| 8 | Dosya Yükleme | 🟢 High | 7-11 saat | 🟡 Med | V3.2 | ⏳ |
| 9 | Task Runner | 🟢 High | 4-6 saat | 🟡 Med | V3.2 | ⏳ |
| 10 | Vektör DB Stabilize | 🟡 Med | 2-3 saat | 🟢 Low | V3.2 | ⏳ |
| 11 | Self-Reflection | 🟡 Med | 4-6 saat | 🟡 Med | V4.0 | ⏳ |
| 12 | Raporlama Motoru | 🟡 Med | 8-12 saat | 🟡 Med | V4.0 | ⏳ |
| 13 | WhatsApp Business | 🟡 Med | 12-18 saat | 🟡 Med | V4.0 | ⏳ |
| 14 | Tek Tıkla Kurulum | 🟡 Med | 8-12 saat | 🔴 High | V4.0 | ⏳ |
| 15 | Çoklu Ajan Orkestra | 🔵 Vision | 30+ saat | 🔴 High | V5.0 | ⏳ |

---

## YOL HARİTASI

```
V3.1 ✅ (TAMAMLANDI - 20 Mart 2026)
  ├─ ✅ Araç Dokümantasyonu (11 araç detaylı referans)
  ├─ ✅ Hata Geri Bildirimi (3 handler zenginleştirildi)
  ├─ ✅ Cron Zamanlayıcı (persist + 5dk güvenlik)
  ├─ ✅ Telegram Per-Agent Bot (izole, auto folder)
  ├─ ✅ Turbo ReAct (Loop=25, 80K budget, 5dk limit)
  └─ ✅ Araç Zinciri (Turbo ReAct ile otomatik)

V3.2 (Hedef: Bu Ay)
  ├─ Dashboard Maliyet Takibi (₺ göstergesi + grafik)
  ├─ Dosya Yükleme (PDF/Excel parse skill)
  ├─ Task Runner (checkpoint + fire-and-forget)
  └─ Vektör DB Stabilizasyonu (L2 aktifleştir + kalibre)

V4.0 (Hedef: Q2 2026)
  ├─ Self-Reflection (iç denetçi)
  ├─ Raporlama Motoru (PDF/Excel üretimi)
  ├─ WhatsApp Business Entegrasyonu
  └─ Tek Tıkla MSI Installer

V5.0 (Hedef: Q3 2026)
  ├─ Çoklu Ajan Orkestrasyonu (Inter-Agent Comm)
  ├─ Agentic Drive (paylaşımlı dosya sistemi)
  └─ Ollama/LM Studio Offline Çalışma
```
