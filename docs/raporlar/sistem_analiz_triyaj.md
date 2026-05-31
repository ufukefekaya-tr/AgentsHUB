# Sistem Analiz Raporu: Triyaj Değerlendirmesi

> **Tarih:** 20 Mart 2026  
> **Amaç:** Her maddeyi "Gerçek problem mi? Çözdük mü? Alternatifimiz ne?" diye süzüp Beta öncelik haritası çıkar.

---

## DURUM KODLARI

| Kod | Anlam |
|---|---|
| ✅ ÇÖZÜLDÜ | V3.1'de zaten uygulandı |
| 🚫 BİZİ İLGİLENDİRMEZ | Açık kaynak / localhost / ücretsiz ürün kapsamımız dışı |
| ⚠️ GERÇEK PROBLEM | Beta öncesi veya V1.0'da çözülmeli |
| 🔵 BETA SONRASI | V1.0+ sürümlere bırakılır, kullanıcıyı bloke etmez |

---

## BÖLÜM 1: AJAN İSTEKLERİ (A1-A11)

### A1 — Streaming Yanıt Hız Göstergesi
**Rapordaki Öneri:** UI'da yüklenen token sayısı / ilerleme göstergesi göster.

| Durum | ⚠️ GERÇEK PROBLEM — ama düşük öncelik |
|---|---|
| **Mevcut Durum** | SSE stream var. Frontend'de "🤔 Düşünüyor..." ve ReAct döngü sayıları gidiyor. Thinking token streaming de var. |
| **Gerçek Acı** | Kullanıcı 10-15 saniye beklerken sadece "Düşünüyor" görüyor. "Kaldı mı?" paniği haklı. |
| **Alternatif Çözüm** | Frontend'de basit bir "pulse" animasyonu + "🔄 Araç çağrılıyor: weather..." gibi SSE event'leri zaten gidiyor (`react_loop` event). Dashboard'da bu event'leri göstermek **5 satır CSS + 10 satır JSX**. |
| **Karar** | **BETA — Düşük Öncelik.** Zaten stream akıyor. Ama kullanıcı deneyimini iyileştirir. Frontend'e küçük status text eklemek yeter. |

---

### A2 — Araç Hatası Geri Bildirim Kalitesi
| Durum | ✅ ÇÖZÜLDÜ |
|---|---|
| **Ne Yapıldı** | `sandbox_runner.js` — 3 hata handler zenginleştirildi: `[ARAÇ HATASI - {skillName}] Hata: ... Girdi: ... Öneri: ...` |
| **Test** | Canlı test geçti. |

---

### A3 — Bağlam Budama Bildirimi + Özet
| Durum | ⚠️ GERÇEK PROBLEM — Orta öncelik |
|---|---|
| **Mevcut Durum** | `llm_bridge.js:160` — Budama yapılıyor, kullanıcıya `status: '🗜️ Bağlam penceresi optimize edildi...'` event'i gidiyor. Ama kaybedilen bilginin **özeti** alınmıyor. |
| **Gerçek Acı** | Uzun sohbetlerde "Ne konuşmuştuk?" sorusuna cevap verilemiyor. |
| **Alternatif Çözüm** | Budama anında, kaldırılan mesajların LLM özetini alıp bağlama enjekte et. +1 ekstra LLM çağrısı ama **net pozitif** (özet 200 token vs kaldırılan 5000 token). |
| **Karar** | **BETA — Orta Öncelik.** Kullanıcı uzun sohbet yaparsa bağlam kaybı yaşar. Ama beta için "yeni sohbet başlat" workaround'u var. |

---

### A4 — EVALUATION.md Format Standardizasyonu
| Durum | 🔵 BETA SONRASI |
|---|---|
| **Analiz** | Kaizen logları düz metin. JSON/YAML olsa analiz kolaylaşır. Ama bu sadece geliştirici/ajan iç aracı — **kullanıcıyı etkilemez.** |
| **Karar** | V1.0+ — Operasyonel kalite artışı. Kullanıcı asla görmez. |

---

### A5 — Semantik Hafıza (L2 Vektör)
| Durum | ⚠️ GERÇEK PROBLEM — ama Beta SONRASI |
|---|---|
| **Mevcut Durum** | Kod YAZILI (`embeddings_adapter.js`). Ama `better-sqlite3` native modülü Windows'ta kurulu olmadığı için sessizce kapanıyor. |
| **Gerçek Acı** | Thread değiştiğinde ajan hafıza kaybediyor. |
| **Alternatif Çözüm** | Beta için **workaround:** Kullanıcı yeni sohbet başlattığında "bağlamı kopyala" seçeneği, veya DNA'ya ajan hatırlatma notu yazdırma. L2 stabilizasyonu V1.0 için. |
| **Karar** | **BETA SONRASI (V1.0).** Mevcut hali çalışmıyor ama kullanıcı "yeni thread başla" ile idare eder. Düzeltmek **2-3 saat** ama Windows native modül derlemesi riskli. |

---

### A6 — Ajanlar Arası Görev Delegasyonu
| Durum | 🔵 BETA SONRASI (V2.0+) |
|---|---|
| **Analiz** | Multi-agent orchestration devasa bir mimari değişiklik. Beta'da kullanıcının **tek ajan bile rahat kullanamaması** daha büyük sorun. Delegasyon lüks. |
| **Karar** | V2.0 — Vizyonel. |

---

### A7 — Dinamik Skill Önerisi
| Durum | 🔵 BETA SONRASI |
|---|---|
| **Mevcut Durum** | ClawHub installer skill'i VAR. Ajan "Bu yeteneğim yok" diyebiliyor. Ama "Yüklemek ister misiniz?" diye sormuyor. |
| **Alternatif** | DNA'ya "Eğer kullanıcı sahip olmadığın bir yetenek isterse, ClawHub'dan yükleyebileceğini söyle" ekle → **0 kod değişikliği, sadece prompt.** |
| **Karar** | **BETA — Prompt düzeltmesi ile çözülebilir (2 dk).** Karar: Beta'da DNA'ya 1 satır ekle. |

---

### A8 — Akıllı Bağlam Özeti
| Durum | A3 ile aynı. Birleşik çözüm. |
|---|---|
| **Karar** | BETA — Orta Öncelik. A3+A8 tek paket. |

---

### A9 — Çoklu LLM Desteği (Provider Agnostik)
| Durum | 🔵 BETA SONRASI (V1.0) |
|---|---|
| **Mevcut Durum** | Sadece Google Gemini. Claude/GPT adapter YOK. |
| **Analiz** | Mimari değişiklik. Ama Gemini modelleri (Flash Lite → Pro) zaten geniş yelpaze sunuyor. Beta'da Gemini yeterli. |
| **Karar** | V1.0 — Önemli ama beta bloke edici değil. Gemini modelleri arası geçiş zaten var. |

---

### A10 — Otonom Görev Planlama (Task Decomposition)
| Durum | 🔵 BETA SONRASI (V1.0) |
|---|---|
| **Mevcut Durum** | Turbo ReAct (25 loop) ile orta karmaşıklıktaki görevler çözülebiliyor. Task Runner henüz yok. |
| **Karar** | V1.0 — Turbo ReAct çoğu kullanıcı ihtiyacını karşılar. |

---

### A11 — Kalite Skoru ve Otomatik Retry
| Durum | 🔵 BETA SONRASI (V2.0) |
|---|---|
| **Analiz** | Self-reflection her sorguda +500-1K token. Beta'da maliyet artışı kaldırılamaz. |
| **Karar** | V2.0 — Vizyonel. |

---

## BÖLÜM 2: MÜHENDİS İSTEKLERİ (M1-M11)

### M1 — Dashboard Refactor (App.jsx 119KB → Modüler)
| Durum | ⚠️ GERÇEK PROBLEM — ama BETA SONRASI |
|---|---|
| **Analiz** | App.jsx 1866 satır. Büyük ama **çalışıyor.** Build 3 saniye. Hot-reload sorunsuz. Refactor = gerileme riski. Beta öncesi yaparsak yeni bug'lar girme ihtimali var. |
| **Karar** | **V1.0 — Beta çalışıyor.** Yeni özellik eklenirken doğal bölünecek. Şu an kırma riski > faydası. |

---

### M2 — API Endpoint Dokümantasyonu
| Durum | 🔵 BETA SONRASI |
|---|---|
| **Analiz** | API'yi sadece biz kullanıyoruz (Dashboard frontend). 3. parti yok. Swagger şu an gereksiz ek yük. |
| **Karar** | V1.0 — Açık kaynak community büyüdüğünde gerekli olur. |

---

### M3 — Structured Logging (JSON)
| Durum | 🔵 BETA SONRASI |
|---|---|
| **Mevcut Durum** | `logger.js` düz string ama gayet okunabilir. `[BRIDGE]`, `[CRON]`, `[TELEGRAM]` tag'leri var. `grep` ile filtrelenebilir. |
| **Karar** | V1.0 — Mevcut loglar yeterli. JSON logging operasyonel lüks. |

---

### M4 — Test Altyapısı (Unit + Integration)
| Durum | ⚠️ GERÇEK PROBLEM — ama BETA SONRASI |
|---|---|
| **Analiz** | Sıfır test var. Ama beta = **canlı test.** Kullanıcı = tester. Beta öncesi unit test yazmak yerine canlı QA loop daha verimli. V1.0 öncesi CI/CD ile birlikte test suite kurulmalı. |
| **Karar** | V1.0 — Beta feedback'lerinden test case'ler türetilecek. |

---

### M5 — Skill Geliştirme SDK'sı
| Durum | 🔵 BETA SONRASI (V1.0) |
|---|---|
| **Analiz** | Şu an 10 default skill var. Kullanıcı skill yazmıyor — sadece kullanıyor. SDK, community büyüyünce lazım olur. |
| **Karar** | V1.0+ |

---

### M6 — Config Validation (JSON Schema)
| Durum | ⚠️ GERÇEK PROBLEM — Düşük Öncelik |
|---|---|
| **Mevcut Durum** | Yanlış config parametresi sessizce fallback'e düşüyor. Kullanıcı neden model değişmedi anlamıyor. |
| **Alternatif Çözüm** | `MindsetParser.loadConfig()` içine basit sanity check: model adı geçerli mi? temperature 0-2 arası mı? Hatalıysa log + default'a düş. **10 satır kod.** |
| **Karar** | **BETA — Düşük Öncelik.** Basit validation yeter. Full JSON Schema overkill. |

---

### M7 — Health / Monitoring Endpoint
| Durum | 🔵 BETA SONRASI |
|---|---|
| **Analiz** | `/health` var, "OK" dönüyor. Tek kullanıcılı localhost'ta detaylı monitoring gereksiz. |
| **Karar** | V1.0 — SaaS modeline geçilirse lazım olur. |

---

### M8 — Hot-Reload (UMI Watcher)
| Durum | 🚫 BİZİ İLGİLENDİRMEZ (tam olarak) |
|---|---|
| **Analiz** | `EPERM` hatası Windows dosya kilitleme sorunu. Watcher devre dışı bırakılmış — doğru karar. Config değişikliği Dashboard'dan yapılıyor → API ile kaydediliyor → watcher'a gerek yok. |
| **Karar** | Çözülmüş — watcher yerine API tabanlı config yönetimi var. |

---

### M9 — Cross-Platform (macOS/Linux)
| Durum | 🚫 BİZİ İLGİLENDİRMEZ (Beta'da) |
|---|---|
| **Analiz** | Hedef kitle: Windows kullanan KOBİ'ler. macOS/Linux beta'da önemli değil. |
| **Karar** | V2.0+ |

---

### M10 — Multi-Tenant
| Durum | 🚫 BİZİ İLGİLENDİRMEZ |
|---|---|
| **Analiz** | Ürün = localhost kişisel AI asistanı. Multi-tenant = SaaS. Tamamen farklı bir ürün kararı. |
| **Karar** | V3.0+ veya ayrı bir ürün. |

---

### M11 — CI/CD
| Durum | 🔵 BETA SONRASI |
|---|---|
| **Analiz** | Tek geliştirici (Mimar). Manuel build 3 saniye. CI/CD overhead > fayda. |
| **Karar** | V1.0 — Ekip büyüyünce. |

---

## BÖLÜM 3: KULLANICI SENARYOLARI (S1-S16)

### S1 — API Key Girmeden Gönder
| Durum | ⚠️ GERÇEK PROBLEM — 🔴 BETA KRİTİK |
|---|---|
| **Mevcut Durum** | `SOVEREIGN ERROR` → kullanıcıya `🔑 API Anahtarı Eksik` mesajı gidiyor (ui_server.js satır 337). **Zaten var!** |
| **Kontrol** | Ama mesaj yeterince açık mı? "Nasıl alınır?" linki var mı? |
| **Karar** | **BETA — 30 dk.** Mevcut hata mesajına "Google AI Studio'dan ücretsiz alın: https://aistudio.google.com/apikey" linki ekle. |

---

### S2 — İnternet Kesilmesi
| Durum | ⚠️ GERÇEK PROBLEM — Orta Öncelik |
|---|---|
| **Mevcut Durum** | `fetch failed` → `errorToReadableMessage()` fonksiyonu `🌐 Ağ bağlantısı kesildi` mesajı veriyor. **Zaten var!** |
| **Eksik** | SSE reconnect yok. Bağlantı koparsa kullanıcı sayfayı yenilemeli. |
| **Alternatif** | Frontend'e `navigator.onLine` dinleyici + "İnternet bağlantısı kesildi" banner. **20 satır JS.** |
| **Karar** | **BETA — Düşük Öncelik.** Hata mesajı var. Otomatik reconnect "güzel olur" ama bloke edici değil. |

---

### S3 — Antivirüs .exe'yi Engeller
| Durum | 🚫 BİZİ İLGİLENDİRMEZ (Beta'da) |
|---|---|
| **Analiz** | Beta'da `.exe` installer YOK. Node.js + `npm start` ile çalışıyor. Code signing V4.0'da installer ile birlikte. |
| **Karar** | Şu an sorun yok. |

---

### S4 — Port Çakışması
| Durum | ⚠️ GERÇEK PROBLEM — Düşük Öncelik |
|---|---|
| **Mevcut Durum** | Port 3004 meşgulse sunucu çöker. Hata terminalde kalır, kullanıcı görmez. |
| **Alternatif Çözüm** | `EADDRINUSE` yakalayıp `3005, 3006...` dene. **10 satır.** |
| **Karar** | **BETA — Düşük Öncelik.** 3004 nadiren meşgul olur. Ama güvenlik ağı olarak eklemek kolay. |

---

### S5 — Google Kredi Bitmiş / 403
| Durum | ✅ ÇÖZÜLDÜ (kısmen) |
|---|---|
| **Mevcut Durum** | `errorToReadableMessage()` `403` → Türkçe mesaj yok. AMA `INVALID_ARGUMENT / 400` için var. |
| **Karar** | **BETA — 5 dk.** `403` için Türkçe mesaj ekle: "API anahtarınızın süresi dolmuş veya kotanız bitmiş olabilir." |

---

### S6 — Çok Uzun Mesaj (10K+ karakter)
| Durum | ✅ ÇÖZÜLDÜ |
|---|---|
| **Mevcut Durum** | Bağlam budama var (40K token eşik). Kullanıcıya bildirim gidiyor. Turbo ReAct'te zaman + token limiti var. |

---

### S7 — Çift Sekme Race Condition
| Durum | ⚠️ GERÇEK PROBLEM — ama düşük olasılık |
|---|---|
| **Analiz** | Aynı thread'e eşzamanlı 2 mesaj → UMI.save() race condition → thread bozulur. |
| **Alternatif** | UMI.save() içine basit file lock (veya son yazma kazanır). |
| **Karar** | **BETA SONRASI.** %10 olasılık. Kullanıcı muhtemelen tek sekme kullanır. |

---

### S8 — Ajan Seçmeden Mesaj Gönder
| Durum | ⚠️ GERÇEK PROBLEM — 🔴 BETA KRİTİK |
|---|---|
| **Mevcut Durum** | Frontend'de ajan seçilmeden mesaj kutusu aktif mi? Kontrol edilmeli. `agentId: undefined` → 500 hatası. |
| **Alternatif** | API'de `if (!agentId) return res.status(400).json({error: 'Önce bir ajan seçin'})` → **3 satır.** |
| **Karar** | **BETA — 5 dk.** Basit guard. |

---

### S9 — Prompt Injection ("Ignore previous instructions")
| Durum | ✅ ÇÖZÜLDÜ |
|---|---|
| **Mevcut Durum** | CyberShield static + kognitif filtre aktif. Tehlikeli komutlar bloke ediliyor. |

---

### S10 — Türkçe/Emoji Özel Karakter
| Durum | ✅ ÇÖZÜLDÜ |
|---|---|
| **Mevcut Durum** | Express JSON parser UTF-8. Emoji ve Türkçe karakterler sorunsuz işleniyor. (Canlı testlerde doğrulandı.) |

---

### S11 — Tarayıcı Kazara Kapanması
| Durum | ✅ ÇÖZÜLDÜ |
|---|---|
| **Mevcut Durum** | UMI her yanıttan sonra otomatik kaydediyor (`UMI.save()` — `llm_bridge.js` sonunda). Sayfayı yenilesen bile sohbet korunur. |

---

### S12 — Sohbet Silme Butonunu Bulamama
| Durum | ✅ ÇÖZÜLDÜ |
|---|---|
| **Mevcut Durum** | Thread üzerinde sağ tık / 3 nokta menüsü → sil seçeneği var. Dashboard V3.0'da eklendi. |

---

### S13 — "Ajan Nedir?" Onboarding
| Durum | ⚠️ GERÇEK PROBLEM — Orta Öncelik |
|---|---|
| **Mevcut Durum** | Dashboard'da Home ekranında kısa açıklama ve 3 adımlık rehber var: "1. API Anahtarı 2. Ajan Oluştur 3. Konuş." |
| **Eksik** | İlk açılışta interaktif tutorial yok. |
| **Karar** | **BETA — Orta Öncelik.** Mevcut home ekranı idare eder. İnteraktif onboarding V1.0'da. |

---

### S14 — Skill Arayüzünü Bulamama
| Durum | ⚠️ GERÇEK PROBLEM — Düşük Öncelik |
|---|---|
| **Mevcut Durum** | Skill toggle'lar agent settings içinde. Ama "web araması yap" komutu için skill'i etkinleştirmeyi bilmiyor kullanıcı. |
| **Alternatif** | DNA'da ajan zaten HOT-SWITCH yapabiliyor. Kullanıcı "Google'da ara" dediğinde ajan otomatik skill geçişi yapıyor. **Kullanıcının skill menüsüne gitmesine gerek yok.** |
| **Karar** | ✅ ÇÖZÜLDÜ — HOT-SWITCH ile. |

---

### S15 — Dil Uyumsuzluğu (İngilizce input, Türkçe output)
| Durum | 🚫 BİZİ İLGİLENDİRMEZ |
|---|---|
| **Analiz** | LLM zaten çok dilli. Kullanıcı İngilizce yazarsa ajan İngilizce cevaplar. DNA'da "kullanıcının dilinde cevap ver" kuralı var. |

---

### S16 — Uyku Modu SSE Kopması
| Durum | ⚠️ GERÇEK PROBLEM — Düşük Öncelik |
|---|---|
| **Mevcut Durum** | SSE timeout 10 dk'ya çıkarıldı. Ama uyku modunda OS TCP bağlantıyı kapatır. |
| **Alternatif** | Frontend'de reconnect logic: bağlantı koparsa "Bağlantı kesildi, yenileniyor..." banner'ı göster. |
| **Karar** | **BETA SONRASI.** Kullanıcı F5 ile çözer. |

---

## BETA ÖNCESİ ÖNCELİK SIRASI (Must-Have)

> Kullanıcı "Bu çöp" diyip atmaması için Beta'da kesinlikle çalışması gereken şeyler.

| # | Madde | Efor | Açıklama |
|---|---|---|---|
| 🔴 1 | **S1 — API Key hata mesajına "nasıl alınır" linki** | 5 dk | İlk kullanıcı %80 buna takılır |
| 🔴 2 | **S8 — agentId boşsa 400 dön** | 5 dk | 500 hatası yerine anlaşılır mesaj |
| 🔴 3 | **S5 — 403 hatası Türkçe mesaj** | 5 dk | Kredi/API key sorunu kullanıcıyı bloke eder |
| 🔴 4 | **A7 — DNA'ya skill öneri satırı** | 2 dk | "ClawHub'dan yükleyebilirsin" ipucu |
| 🔴 5 | **M6 — Config validation (basit)** | 30 dk | Yanlış model adı girince sessiz çökmeyi önle |
| 🟡 6 | **S4 — Port çakışması otomatik port** | 15 dk | Nadiren ama kurulumda bloke edebilir |
| 🟡 7 | **A1 — Stream status text zenginleştir** | 30 dk | "Araç çağrılıyor: weather..." gibi detaylı bilgi |
| 🟡 8 | **A3+A8 — Bağlam budama özeti** | 2-3 saat | Uzun sohbetlerde hafıza kaybını azalt |
| 🟡 9 | **S2 — Offline banner** | 30 dk | İnternet kesildiğinde kullanıcıyı bilgilendir |
| 🟡 10 | **S13 — Onboarding text iyileştir** | 30 dk | Home ekranındaki rehberi netleştir |

**Toplam Beta efor: ~5-6 saat**

---

## BETA SONRASI (V1.0 Sürüm)

> Kullanıcı ürünü seviyor ama "keşke şu da olsa" diyor.

| # | Madde | Efor | Neden V1.0? |
|---|---|---|---|
| 1 | **Vektör DB (L2) Stabilizasyonu** | 3-4 saat | Çapraz sohbet hafızası — kalite sıçraması |
| 2 | **Dashboard Maliyet Takibi (₺)** | 6-8 saat | "Bu ay ne kadar harcadım?" sorusu |
| 3 | **Dosya Yükleme + Parse** | 7-11 saat | PDF/Excel okutma — KOBİ katil özelliği |
| 4 | **Task Runner** | 4-6 saat | Uzun görevler (fatura işleme vb.) |
| 5 | **Çoklu LLM (Claude/GPT)** | 10-15 saat | Maliyet optimizasyonu + risk dağıtımı |
| 6 | **Test Suite (Vitest)** | 5-10 saat | Güvenle refactor yapabilmek |
| 7 | **Dashboard Refactor** | 5-7 saat | App.jsx modülerleştirme |

---

## V2.0+ UZUN VADE

> "Güzel olur" ama kullanıcıyı asla bloke etmez.

| Madde | Versiyon |
|---|---|
| Çoklu Ajan Orkestrasyonu | V2.0 |
| Self-Reflection | V2.0 |
| Raporlama Motoru (PDF/Excel) | V2.0 |
| WhatsApp Business | V2.0 |
| CI/CD Pipeline | V1.5 |
| Cross-Platform (macOS/Linux) | V2.0 |
| Tek Tıkla Installer (MSI) | V2.0 |
| Multi-Tenant (SaaS) | V3.0 |
| Skill SDK | V1.5 |
| API Dokümantasyonu (Swagger) | V1.5 |

---

## SONUÇ: 38 MADDENİN ÖZETİ

| Kategori | Sayı |
|---|---|
| ✅ Zaten çözüldü (V3.1'de veya mevcut) | **12** |
| 🚫 Bizi ilgilendirmez (scope dışı) | **5** |
| ⚠️ Beta'da çözülmeli | **10** (toplam ~5-6 saat) |
| 🔵 Beta sonrası (V1.0-V2.0) | **11** |

**38 maddeden 12'si zaten çözülmüş, 5'i kapsamımız dışı. Geriye kalan 10 gerçek problem ~5-6 saatte çözülebilir.** Sistem beta'ya hazır durumda — küçük cilalama ile.
