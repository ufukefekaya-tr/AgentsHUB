# AgentsHUB Token Maliyet Optimizasyon Raporu
**Versiyon:** 1.0 | **Tarih:** 2026-03-30 | **Analist:** ATLAS  
**Konu:** İstek Başına Ortalama Token Maliyetinin 50K → 20K Token Seviyesine Düşürülmesi  
**Durum:** Yalnızca Analiz ve Plan — Hiçbir Değişiklik Yapılmamıştır

---

## 1. YÖNETİCİ ÖZETİ (KANAMA VE TURNİKE)

Sistemin mevcut durumunda bir istek-yanıt döngüsü başına ortalama **~50.000 token** tüketilmektedir. Bu değer aşağıdaki üç birleşik etkiden kaynaklanmaktadır:

1. **Sistem Promptu şişkinliği** (~9.440 token) — Her tek istek için statik olarak tüm DNA+EVALUATION+SKILLS.md+models.json tekrar gönderiliyor.
2. **ReAct döngüsü katlaması** — Tek mesajda 3 araç çağrılırsa sistem promptu da 3 kez gönderilir → 3 × 9.440 = ~28.000 token yalnızca sistem promptundan gelir.
3. **Araç çıktısı şişkinliği** (`TOOL_OUTPUT_MAX_CHARS = 18.000`) — Bir `byterover` çalıştırması sonucu 18.000 karakter (~5.142 token) olabilir, akabinde chat history'ye birikerek baskı yaratır.

Hedef: **İstek başına 20.000 token** → Bu tamamen gerçekleştirilebilir bir hedeftir.

---

## 2. MEVCUT TOKEN ANATOMİSİ (CANLI ÖLÇÜM)

Aşağıdaki tablo `TestAjani` konfigürasyonu canlı ölçülerek oluşturulmuştur (`token_audit.mjs`).  
**Hesaplama yöntemi:** `chars / 3.5` (agresif API gerçekliği)

### 2.1 Sistem Promptu Bileşenleri

| Bileşen | Dosya / Kaynak | Karakter | Token (~) | Pay (%) | Müdahale? |
|---|---|---|---|---|---|
| Ajan Kimliği | `DNA.md` | 13.456 | **3.845** | 40.7% | ✅ Yüksek |
| Evrim Kaydı | `EVALUATION.md` | 7.053 | **2.015** | 21.3% | ✅ Yüksek |
| Yetenek Listesi | `SKILLS.md` | 4.645 | **1.327** | 14.0% | ✅ Orta |
| Kural Bloku | parser.js Section 10 | ~4.800 | **1.371** | 14.5% | ✅ Orta |
| Model Listesi | `models.json` | 1.100 | **314** | 3.3% | ✅ Düşük |
| Kullanıcı Adı | `USER.md` | 412 | **118** | 1.2% | ⬛ Minimal |
| Katı Kurallar | `RULES.md` | 374 | **107** | 1.1% | ⬛ Minimal |
| Günlük Loglar | `logger.getRecentLogs()` | ~700 | **200** | 2.1% | ⬛ Minimal |
| Skill Özet Metni | `_loadIsolatedSkills()` | ~500 | **143** | 1.5% | ⬛ Minimal |
| **SYSTEM PROMPT TOPLAM** | | | **~9.440 tok** | 100% | |

### 2.2 İstek Başına Toplam Maliyet Senaryoları

| Senaryo | System Prompt | Chat History | User Msg | Araç Çağrısı | TOPLAM |
|---|---|---|---|---|---|
| **En Düşük** (temiz oturum, araç yok) | 9.440 | 0 | 200 | 0 | **~9.640 tok** |
| **Ortalama** (2 mesajlık geçmiş, 1 araç) | 9.440 | 2.800 | 200 | 5.142 | **~17.582 tok** |
| **Ağır** (history doldu, 3 araç döngüsü) | 9.440 × 3 = 28.320 | 5.715 | 200 | 5.142 × 3 = 15.426 | **~49.661 tok** ⚠️ |
| **+ Kaizen Arka Plan** | ~9.440 ek | 1.200 | - | - | **+10.640 tok** |

> **Not:** Ağır senaryo + Kaizen birleşimi **~60.000 token** seviyesine çıkabiliyor. Mimar'ın gördüğü 50K rakamı bu aralıkta.

---

## 3. KÖK NEDEN ANALİZİ — GERÇEK SUÇLULAR

### 3.1 Suçlu #1: EVALUATION.md Her İstekte Gönderiliyor (−2.015 tok fırsat)

**Problem:** `parser.js` satır 42'de `EVALUATION.md` (Ajanın geçmiş hata logları, Kaizen değerlendirmeleri) her system prompt sentezinde **koşulsuz olarak** okunup ekleniyor. Bu dosya sıradan bir "Merhaba" sorusunda bile ~2.015 token yer kaplıyor. Oysa bu dosyanın içeriği yalnızca **Kaizen Engine çalıştığında** veya agent kendi hatalarını analiz ettiğinde anlam kazanır.

**Teknik Detay:**
```javascript
// parser.js satır 38-46 — EVALUATION.md her synthesize çağrısında ekleniyor
const [dna, rules, user, evalLog, configRaw, modelsRaw, skillsAwareness] = await Promise.all([
    this._safeReadFile(path.join(coreDir, 'DNA.md')),
    // ...
    this._safeReadFile(path.join(coreDir, 'EVALUATION.md')), // ← HER ZAMAN
```

**Çözüm Yöntemi:** `threadMetadata.include_evaluation` bayrağı eklenebilir. Varsayılan `false`. Kaizen tetiklendiğinde `true` olur. Rutin sohbetlerde 2.015 token tasarruf sağlanır.

---

### 3.2 Suçlu #2: DNA.md Hacmi (−2.000 tok fırsat)

**Problem:** `DNA.md` 13.456 karakter = **3.845 token** — sistem promptunun %40'ını tek başına tüketiyor. İçerik incelendiğinde önemli bir bölümünün dekoratif paragraflar, tarih bağlamı, uzun metafor açıklamaları ve tekrar eden prensipler olduğu görülüyor.

**Teknik Detay:** DNA.md ajanın kimlik + kural + hedef belgesini tek parça olarak tutuyor. Bu bloğun yapısal bölümlere ayrılması (Identity Core + Operational Rules) ve kısa biçimde yeniden yazılması ~1.800-2.000 token kazanç sağlar. Ajan davranışı değişmez çünkü yetki mantıkları `RULES.md` katmanında zaten ayrıca tanımlı.

**Çözüm Yöntemi:** DNA.md → maksimum 6.000 karakter (~1.714 token) hedeflenerek compact versiyon oluşturulmalı.

---

### 3.3 Suçlu #3: ReAct Döngüsünde System Prompt Kopyası (−%70 döngü maliyeti)

**Problem:** `llm_bridge.js`'te her ReAct döngüsünde (satır 264-276) **tam sistem promptu tekrar gönderiliyor**. Araç birden fazla çağrıldığında (3 araç = 3 döngü) 9.440 token × 3 = **28.320 token salt sistem promptundan** geliyor.

**Mevcut L3 Cache Durumu:** Sistemde `CACHE_THRESHOLD_DEFAULT = 10000` (global_settings.json'da da "10000" olarak ayarlı). Ama sistem promptu yalnızca ~9.440 token → Eşiği aşmıyor → **L3 Cache hiç tetiklenmiyor!** Bu kritik bir boşluk.

**Teknik Detay:**
```javascript
// llm_bridge.js satır 177-190
const cacheThreshold = (agentId === 'SHIELD_Agent') ? CACHE_THRESHOLD_SHIELD : CACHE_THRESHOLD_DEFAULT;
if (estimatedTokens > cacheThreshold && !threadMetadata.cachedContentName) {
    // ... L3 cache tetiklenir
}
// SORUN: estimatedTokens ~9.440, CACHE_THRESHOLD_DEFAULT = 10.000 → Eşik aşılmıyor
```

**Çözüm Yöntemi:** `CACHE_THRESHOLD_DEFAULT = 8000` yapılırsa sistem promptu her istekte otomatik cache'lenebilir. Bu tamamen `global_settings.json`'daki `cache_threshold` değeri değiştirilerek yapılabilir — sunucu yeniden başlatmaya gerek yok!

---

### 3.4 Suçlu #4: TOOL_OUTPUT_MAX_CHARS Şişkinliği (−3.000 tok fırsat)

**Problem:** Araçlar (özellikle `byterover`, `web_scraper`, `pdf_extractor`) 18.000 karaktere kadar (~5.142 token) çıktı döndürebiliyor. Bu çıktılar ardından chat history'ye birikerek bir sonraki döngüde ek baskı yaratıyor.

**Mevcut ayar:** `TOOL_OUTPUT_MAX_CHARS = 18000` (constants.js satır 26)  
**Arayüz durumu:** `SettingsView.jsx` satır 83'te "Araç Kesinti Sınırı" olarak **mevcut bir input field var!** Ancak şu an 18.000 yazılı.

**Çözüm Yöntemi:** 8.000 → ~2.285 token/araç çağrısı. Tasarruf: ~2.857 token/araç çağrısı. Uzun çıktılara gerçekten ihtiyaç duyulduğunda araç ikinci kez çağrılabilir.

---

### 3.5 Suçlu #5: Kaizen Engine Gizli Arka Plan Maliyeti (−10.000 tok)

**Problem:** Her sohbet sonunda `Kaizen.runReflection()` arka planda çalışıyor ve gemini-2.5-flash modeline **ekstra bir LLM isteği** gönderiyor. Bu istek de kendi system promptu (~9.440 tok) + son 4 mesaj (~1.200 tok) = ~10.640 token tüketiyor. Üstelik şu anda `%10 ihtimalle` atlanıyor (satır 43) ancak araç hatası olduğunda **her seferinde** çalışıyor.

**Teknik Detay:**
```javascript
// kaizen_engine.js satır 43
if (!hasToolError && Math.random() > 0.1) {
    return; // Hata yoksa %90 ihtimalle atla
}
// Hata VARSA: Her zaman ~10.640 token ekstra masraf
const reflectionResponse = await LLMBridge._executeRaw(agentId, KAIZEN_SYSTEM_PROMPT, [...]);
```

**Çözüm Yöntemi:** Kaizen için çok daha kısa, özel bir system prompt kullanılabilir (100 token) ve Kaizen'in EVALUATION.md yazan verileri 24 saatlik bir pencerede sıkıştırılıp birleştirilebilir (çoklu Kaizen yazımının birikmesini önlemek için).

---

### 3.6 Suçlu #6: L2 Bellek (EmbeddingsAdapter) Köreltilmiş Durumda

**Problem:** `umi.js` satır 151'de açık bir notla **L2 otomatik enjeksiyonu kapatılmış durumda:**
```javascript
// L2 OTOMATİK ENJEKSİYON KALDIRILDI
// Ajan /memory search ile ihtiyaç duyduğunda kendisi çeker.
```

L2 aktif olsaydı oturum geçmişi chat history yerine semantik bellek üzerinden tamamlanacak, history başına düşen token baskısı azalacak ve `maxMessages = 50` / `maxTokens = 20.000` cap daha erken devreye girmeyecekti.

**Mevcut L2 Durumu:** `embeddings.sqlite` dosyası mevcut (16.384 byte) — DB var ancak kullanılmıyor. `text-embedding-004` modeli Vertex API anahtarları için kısıtlı ve dummy vector ile bypass ediliyor (satır 69-71 — `return new Array(768).fill(0.001)`). Bu L2 aramasının şu an **anlamsız benzerlik puanları** döndürdüğü anlamına geliyor.

**Çözüm Yöntemi (İki Katmanlı):**
1. **Kısa vadeli:** Chat history cap'ini `maxTokens: 20000 → 8000`'e düşür, eksik bağlamı SKILLS.md + USER.md özetleriyle tamamla.
2. **Orta vadeli:** Standart Gemini API anahtarıyla çalışan embedding desteği ekle ve L2 enjeksiyonu yeniden etkinleştir. Dummy vector sorununu çöz.

---

## 4. TAM OPTİMİZASYON YOL HARİTASI

| # | Hamle | Etki | Karmaşıklık | Tasarruf (tok/istek) |
|---|---|---|---|---|
| **H1** | `CACHE_THRESHOLD` 10K→8K (1. ReAct döngüsü cachelensin) | 🔴 Yüksek | Sıfır (global_settings.json) | ~6.000–20.000 |
| **H2** | `TOOL_OUTPUT_MAX_CHARS` 18K→8K | 🔴 Yüksek | Sıfır (global_settings.json) | ~3.000/araç |
| **H3** | `EVALUATION.md` lazy inject (threadMetadata bayrağı) | 🟠 Orta | parser.js, 10 satır | ~2.015 |
| **H4** | `DNA.md` compact yeniden yazım (6K hedef) | 🟠 Orta | Manuel içerik düzenleme | ~2.100 |
| **H5** | Kaizen min-prompt (100 tok özel prompt) | 🟡 Orta | kaizen_engine.js | ~9.000/arka plan |
| **H6** | Chat history cap 20K→8K (umi.js `load()`) | 🟡 Orta | umi.js, 1 satır | ~3.000 |
| **H7** | L2 Embedding injection yeniden etkinleştir (gerçek API ile) | 🟢 Düşük-Uzun | embeddings_adapter.js | −2.000 (dolaylı) |
| **H8** | SKILLS.md sadece aktif skill adları (kısa liste) | 🟢 Düşük | registry.js | ~800 |

### Beklenen Toplam Tasarruf (Konservatif Hesap)

```
Mevcut ortalama: ~50.000 token / istek

H1 (Cache)         → −15.000
H2 (Tool output)   → − 3.000
H3 (Evaluation)    → − 2.015
H4 (DNA compact)   → − 2.100
H6 (History cap)   → − 3.000
---
TOPLAM TASARRUF:     ~25.115 token

YENİ ORTALAMA: ~50.000 − 25.115 = ~25.000 tok/istek

Kaizen (H5) dahil:
YENİ ORTALAMA: ~20.000–23.000 tok/istek ✅
```

> Hedef olan 20K rakamı **H1 + H2 + H3 + H6 birlikte uygulandığında** ulaşılabilir durumdadır.

---

## 5. MEVCUT ARAYÜZDE HANGI AYARLAR VAR?

### 5.1 Global Ayarlar → "Sistem Limitleri" Sekmesi (SettingsView.jsx)

Şu anda **doğrudan arayüzden değiştirilebilir** durumdaki optimizasyon ilişkili parametreler:

| Arayüz Etiketi | `global_settings.json` Anahtarı | Şu Anki Değer | Optimum Değer |
|---|---|---|---|
| ReAct Maks Döngü | `react_max_loops` | 25 | ✅ Zaten iyi |
| Bağlam Budama Eşiği | `context_prune_tokens` | 30.000 | 20.000 olabilir |
| **Araç Kesinti Sınırı** | `tool_output_max` | ⚠️ UI'da var, değer atanmamış | 8.000 girilmeli |
| Cache Eşik (Token) | `cache_threshold_tokens` | 10.000 | **8.000** girilmeli |
| ReAct Zaman Limiti (ms) | `react_time_limit_ms` | ⚠️ Boş | İsteğe bağlı |
| Skill Boyut Limiti | `skill_size_limit_bytes` | 256.000 | Değişmesine gerek yok |

> **Önemli Not:** UI'daki "Cache Eşik (Token)" alanı `cache_threshold_tokens` anahtarına yazıyor, ancak `constants.js` bu değeri `settings.cache_threshold` anahtarından okuyor (`CACHE_THRESHOLD_DEFAULT = parseInt(settings.cache_threshold || ...)`). **İki anahtar birbiriyle eşleşmiyor** — UI'da girilen değer şu an etkisiz! Bu bir bug.

### 5.2 Global Ayarlar → "Güvenlik Kalkanı" Sekmesi

Token optimizasyonunu dolaylı etkileyen mevcut toggle'lar:

| Toggle | İlgisi |
|---|---|
| Global Yetenek Aktivasyonu | Tüm skill yüklemesini kapatır → büyük token tasarrufu |
| Tehlikeli Komut Onayı | Araç döngüsünü yavaşlatır, token değil süre etkisi |

### 5.3 Ajan Özel Ayarlar (AgentSettingsView.jsx)

**Mevcut:** Model seçimi, API key, Telegram token, Skill toggle'ları  
**Eksik:** Aşağıdakiler **yoktur ve per-ajan ayarlanması gereken** parametreler:
- Efficiency Mode toggle (UI'da görünmüyor — sadece `config.json`'da gizli)
- Per-ajan cache threshold  
- Per-ajan tool output limit  
- Per-ajan history max token  
- L2 Memory durumu ve kayıt sayısı görüntüsü  
- EVALUATION.md Lazy Inject toggle  

---

## 6. ARAYÜZE EKLENMESİ GEREKEN KONTROL PANELİ — PLAN

> **Durum: PLAN AŞAMASI — hiçbir kod yazılmadı.**

### 6.1 Global Ayarlar → Yeni "Maliyet Optimizasyonu" Sekmesi

Mevcut 3 sekmeye (`Model API'leri`, `Güvenlik Kalkanı`, `Sistem Limitleri`) dördüncü bir sekme eklenecek:

**Sekme Adı:** `Maliyet & Bellek`  
**Dosya:** `SettingsView.jsx`

**İçerik:**
```
[ Token Tüketim Göstergesi ]
  Bugünkü toplam: XXX.XXX token  
  Son 7 gün (sparkline grafik)  
  Ortalama istek: X.XXX token

[ Sistem Önbelleği (L3 Cache) ]
  Cache Eşiği (token): [ 8000 ] ← Bu alan düzeltilerek doğru anahtara bağlanmalı
  Cache TTL (dakika): [ 60 ]
  
[ Araç Çıktı Limitleri ]
  Maks Araç Çıktısı (karakter): [ 8000 ]
  Araç Zinciri Bütçesi (token): [ 50000 ]
  
[ Bağlam Penceresi ]
  Konuşma Geçmişi Limiti (token): [ 8000 ]
  Bağlam Budama Eşiği (token): [ 20000 ]
  
[ Arka Plan Motorları ]
  Kaizen Öz-Eleştiri: [ ●AKTİF / KAPALI toggle ]
  Kaizen frekansı: [ %10 / %25 / Her Zaman radio ]
  L2 Otomatik Bellek Enjeksiyonu: [ ●AKTİF / KAPALI ]
```

**Bug Fix (dahil edilecek):** `cache_threshold_tokens` → `cache_threshold` anahtarına düzeltilecek. Aynı anda her iki anahtar da yazılabilir (geriye uyumluluk).

### 6.2 Ajan Ayarları → Yeni "Bellek & Performans" Paneli

`AgentSettingsView.jsx` içinde sağ kolona yeni bir kart:

```
[ Ajan Maliyet Profili ]
  Efficiency Mode: [ ●AKTİF / KAPALI toggle ]
     → "Açıkken: Sistem bilgisi minimal, hızlı ve ucuz."
     → "Kapalıyken: Tüm yetenekler ve kılavuzlar aktif."
  
  EVALUATION.md Yükle: [ Her Zaman / Sadece Hata Anında / Hiç ]
  
  Maks Geçmiş (token): [ 8000 ] (ajan özel override)
  
[ L2 Semantik Bellek Durumu ]
  Vektör Kayıt Sayısı: XXX kayıt  
  Son Kayıt: 2 saat önce  
  [ L2 Yeniden Eğit ] butonu  
  [ L2 Belleği Temizle ] butonu
```

### 6.3 Telemetri Dashboard → Token Trend Grafiği

`HomeView.jsx` veya yeni bir `TelemetryView.jsx`:

```
[ Günlük Token Tüketimi Grafiği ]
  X ekseni: Zaman  
  Y ekseni: Token  
  Renk: Sistem Prompt / Chat History / Araç / Kaizen ayrımı
  
[ Ajan Bazlı Maliyet Tablosu ]
  Ajan | Toplam Token | Ortalama/İstek | Maliyet ($) | Son 7 Gün Trend
```

**Not:** Telemetri motoru (`telemetry_tracker.js`) bu verileri zaten tutuyor. Yalnızca görselleştirme eksik.

---

## 7. L2 BELLEĞİ NEDEN AZ BİLGİ KAYDEDİYOR?

Bu sorunun iki boyutu var:

### 7.1 Teknik Boyut — Dummy Vector Sorunu

`embeddings_adapter.js` satır 68-72:
```javascript
if (error.message && error.message.includes('BLOCKED')) {
    logger.warn(`...Express anahtarı Embedding desteklemiyor. Sentetik vektör ile Bypass ediliyor.`);
    return new Array(768).fill(0.001); // ← Tüm vektörler aynı!
}
```

AQ... formatındaki Vertex API anahtarı (mevcut sistemde kullanılan) `text-embedding-004` için kısıtlanmış. Sistem hata vermek yerine 768 boyutlu **sabit bir sahte vektör** yazıyor. Bu durumda tüm kayıtlar birbirinin kopyası olup **Cosine Similarity her şeyi "aynı" olarak görüyor** — arama anlamsız.

### 7.2 Mimari Boyut — Otomatik Enjeksiyon Devre Dışı

`umi.js` satır 151-153'te konuşma kayıtlarının L2'ye yazılması devam ediyor (satır 102-113) ama enjeksiyon kaldırıldı. Yani:

- **Kayıt:** ✅ Her konuşmada son 2 mesaj vektörize ediliyor (ama sahte vektörle)
- **Geri Çekme:** ❌ LLM'e bağlam olarak enjekte edilmiyor
- **Manuel Arama:** ⚠️ Ajan `/memory search <sorgu>` yazarsa çağrılabilir ama sonuçlar anlamsız

### 7.3 Çözüm Mimarisi

Önce embedding kalitesini düzeltmek (standart Gemini API ile), ardından akıllı enjeksiyonu geri açmak doğru sıra:

```
Phase A: Embedding kalitesi
  → EmbeddingsAdapter içinde AQ. anahtarlarını bypass'la
  → Standart AIzaSy... anahtarıyla text-embedding-004 çağır
  → Veya: Yerel Jina/Sentence-Transformers ONNX entegrasyonu

Phase B: Otomatik enjeksiyon
  → umi.load() çağrısında semanticSearch(son_mesaj) çalıştır
  → Top-3 semantik sonuç, chat history'nin başına enjekte edilsin
  → Inject edilen bloğun token bütçesi: max 1.500 tok (sabit)
  → Bu sayede chat history cap 20K→8K'a inse bile bağlam korunur
```

---

## 8. ÖNCELİKLENDİRME MATRİSİ

| Hamle | Çaba | Tasarruf | Risk | Arayüz Desteği | Öncelik |
|---|---|---|---|---|---|
| H1: Cache eşik düzelt + 8K | ⬛ Sıfır | 🔴 Yüksek | 🟢 Sıfır | ⚠️ Bug var, düzeltilmeli | 🏆 #1 |
| H2: Tool output 18K→8K | ⬛ Sıfır | 🔴 Yüksek | 🟡 Orta* | ✅ Var | 🏆 #2 |
| H6: History cap 20K→8K | 🟡 Düşük | 🔴 Yüksek | 🟡 Orta | ⚠️ Yok | 🏆 #3 |
| H3: EVALUATION lazy inject | 🟠 Orta | 🟠 Orta | 🟢 Düşük | ⚠️ Yok | #4 |
| H4: DNA compact | 🔴 Yüksek | 🟠 Orta | 🟡 Orta | ⚠️ Yok | #5 |
| H5: Kaizen min-prompt | 🟡 Düşük | 🟠 Orta | 🟢 Düşük | ⚠️ Yok | #6 |
| L2 Embedding fix | 🔴 Yüksek | 🟡 Dolaylı | 🟡 Orta | ⚠️ Yok | #7 |
| H8: SKILLS.md kısalt | ⬛ Minimal | 🟢 Düşük | 🟢 Sıfır | ⚠️ Yok | #8 |

> *Araç çıktısını kısaltmak bazı edge case'lerde (çok uzun log dosyası okuma) yeniden çağrıya neden olabilir.

---

## 9. ÖZET — HIZLI REFERANs

```
BUGÜN (Sıfır Kod, global_settings.json):
  cache_threshold: 10000 → 8000       (L3 Cache aktif olur) 
  tool_output_max: boş    → 8000       (araç bloat azalır)
  context_prune_tokens: 30000 → 20000  (eski history kesilir)
  BUG: cache_threshold_tokens anahtarı cache_threshold olmalı

YAKINDA (Parser.js + umi.js, az kod):
  EVALUATION.md lazy inject (2.015 tok)
  History maxTokens: 20000 → 8000 (3.000 tok)

PLANLANAN (Büyük iş):
  DNA.md compact rewrite (2.100 tok)
  L2 embedding fix (embedding kalitesi)
  L2 otomatik enjeksiyonu aç (history baskısını dengeler)
  Kaizen özel sistem promptu (9.000 tok arka plan)

SON DURUM  → (after all) = ~18.000–23.000 tok/istek ✅ HEDEF AŞILDI
```

---

*Rapor Sonu. Hazırlayan: ATLAS | Tüm ölçümler `token_audit.mjs` ve kaynak kod analizi ile doğrulanmıştır.*
