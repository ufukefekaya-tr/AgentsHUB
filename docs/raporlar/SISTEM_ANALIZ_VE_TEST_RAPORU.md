# AgentsHUB — Çok Perspektifli Sistem Analizi ve Test Raporu
**Tarih:** 2026-03-20 | **Kapsam:** Kod tabanının tamamı | **Yöntem:** Ajan + Mühendis + Son Kullanıcı perspektifleri

---

## 1. AJAN PERSPEKTİFİ: "İçeride Çalışan Bir Ajan Olsam Ne İsterdim?"

> Sistemin içinde yaşayan, kullanıcı memnuniyetini, hizmet kalitesini, token verimliliğini ve performansı optimize etmek isteyen bir ajan gözüyle.

### 🔴 ACİL (0-2 Hafta)

| # | İstek | Neden | Maliyet | Token Etkisi | Modülerlik |
|---|---|---|---|---|---|
| A1 | **Streaming Yanıt Hız Göstergesi** | Kullanıcı uzun yanıtlarda "kaldı mı?" diye panikliyor. SSE stream var ama UI'da yüklenen token sayısı/ilerleme göstergesi yok. | ⭐ Düşük (UI) | Nötr | ✅ Modüler |
| A2 | **Araç Hatası Geri Bildirim Kalitesi** | `SandboxRunner` hata döndüğünde kullanıcıya "Araç çalışmadı" yazıyorum. Hangi araç, neden, ne yapılmalı — bilmiyorum, kullanıcıya da söyleyemiyorum. | ⭐ Düşük | Nötr | ✅ Modüler |
| A3 | **Bağlam Budama Bildirimi** | `llm_bridge.js:160` — Bağlam budandığında kullanıcıya status event gidiyor ama ne kaybettiğimi bilmiyorum. Önceki konunun özetini hafızaya yazmalıyım. | ⭐⭐ Orta | 🟢 Azaltır (özet vs tam metin) | ✅ Modüler |
| A4 | **`EVALUATION.md` Format Standardizasyonu** | Kaizen loglarım düz metin append. Yapılandırılmış JSON/YAML olsa, öz-analizim çok daha verimli olur. | ⭐ Düşük | 🟢 Azaltır | ✅ Modüler |

### 🟡 ORTA VADE (2-8 Hafta)

| # | İstek | Neden | Maliyet | Token Etkisi | Modülerlik |
|---|---|---|---|---|---|
| A5 | **Semantik Hafıza (L2 Vektör)** | Şu an mocklanan `searchMemory()` çalışsa geçmiş konuşmalardan bağlamsal bilgi çekebilir, aynı soruyu tekrar sormam gerekmezdi. Token tasarrufu devasa olur. | ⭐⭐⭐ Yüksek | 🟢🟢 Büyük azalma | ⚠️ Yeni modül |
| A6 | **Ajanlar Arası Görev Delegasyonu** | SignalBus var ama sadece event yayını. Bir ajana "bunu araştır, sonucu bana getir" deyip bekleyemiyorum. Gerçek RPC/Promise tabanlı delegasyon lazım. | ⭐⭐⭐ Yüksek | 🟢 Paralel = daha az tekrar | ⚠️ Karmaşık |
| A7 | **Dinamik Skill Önerisi** | Kullanıcı "Excel dosyasını analiz et" dediğinde, bende o skill yoksa "Bu yeteneği yüklemek ister misiniz?" diye sormalıyım. | ⭐⭐ Orta | Nötr | ✅ Modüler |
| A8 | **Bağlam Penceresi Yönetimi — Akıllı Özet** | Budama yaparken son N mesajı tutmak yerine, tüm konuşmanın çıkarımsal özetini yapıp bağlama enjekte etmeliyim. | ⭐⭐ Orta | 🟢🟢 Büyük azalma | ✅ Modüler |

### 🟢 UZUN VADE (2-6 Ay)

| # | İstek | Neden | Maliyet | Token Etkisi | Modülerlik |
|---|---|---|---|---|---|
| A9 | **Çoklu LLM Desteği (Provider Agnostik)** | Tek Google Gemini'ye bağlıyım. Ucuz işler için Gemini Flash, zor işler için Claude/GPT-4 kullanabilseydim hem maliyet hem kalite optimize olurdu. | ⭐⭐⭐⭐ Çok Yüksek | 🟢🟢🟢 Model routing ile büyük tasarruf | ⚠️ Mimari |
| A10 | **Otonom Görev Planlama (Task Decomposition)** | Büyük bir görev geldiğinde onu alt görevlere bölüp sırayla/paralel çözebilmeliyim. Şimdiki ReAct döngüsü tek lineer akış. | ⭐⭐⭐⭐ Çok Yüksek | 🟢 Odaklı sorgular = az token | ⚠️ Karmaşık |
| A11 | **Kalite Skoru ve Otomatik Retry** | Kendi yanıtımı puanlayıp düşük kalitede ise otomatik yeniden deneme yapabilmeliyim. Kaizen bunu post-hoc yapıyor; real-time olmalı. | ⭐⭐ Orta | 🔴 Retry = ekstra token ama kalite artar | ✅ Modüler |

---

## 2. MÜHENDİS PERSPEKTİFİ: "Bu Sistemi Kullanan Bir Mühendis Olsam Ne İsterdim?"

> Verimlilik, güvenilirlik, genişletilebilirlik ve geliştirme deneyimi odağıyla.

### 🔴 ACİL (0-2 Hafta)

| # | İstek | Neden | Maliyet | Öncelik |
|---|---|---|---|---|
| M1 | **Dashboard Refactor (`App.jsx` — 119KB!)** | Tek dosyada 3500+ satır. Hot-reload'da tarayıcı donuyor. Yeni özellik ekleme cesaret istiyor. | ⭐⭐⭐ Yüksek (zaman) | 🔴 Kritik |
| M2 | **API Endpoint Dokümantasyonu** | `ui_server.js` 669 satır, 25+ endpoint. Swagger/OpenAPI şeması yok. Her şeyi kod okuyarak bulmak zorundayım. | ⭐⭐ Orta | 🔴 Kritik |
| M3 | **Hata Logları İçin Yapılandırılmış Format** | `logger.js` düz string. JSON structured logging olsa grep/jq ile anında filtre yaparım. | ⭐ Düşük | 🟡 Önemli |
| M4 | **Test Altyapısı (Unit + Integration)** | Sıfır test coverage. Her değişiklikte "canlıda kırdım mı?" korkusu. En azından core modüllere birim test lazım. | ⭐⭐⭐ Yüksek | 🔴 Kritik |

### 🟡 ORTA VADE (2-8 Hafta)

| # | İstek | Neden | Maliyet | Öncelik |
|---|---|---|---|---|
| M5 | **Plugin/Skill Geliştirme SDK'sı** | Yeni skill yazmak için mevcut skill kodlarını kopyalayıp değiştiriyorum. Resmi bir şablon, CLI aracı ve dokümantasyon lazım. | ⭐⭐ Orta | 🟡 Önemli |
| M6 | **Config Validation (Schema)** | `config.json` elle yazılıyor, yanlış parametre yazılsa sessizce fallback'e düşüyor. JSON Schema ile doğrulama lazım. | ⭐⭐ Orta | 🟡 Önemli |
| M7 | **Monitoring Dashboard (Health Endpoint)** | `/health` sadece "OK" dönüyor. Agent states, active sessions, memory usage, token consumption — tamamı eksik. | ⭐⭐ Orta | 🟡 Önemli |
| M8 | **Hot-Reload Düzeltmesi (UMI Watcher)** | `umi.js:67-68` — Config watcher EPERM hatası nedeniyle devre dışı. Watcher yerine poll-based mekanizma kullanılabilir. | ⭐ Düşük | 🟡 Önemli |

### 🟢 UZUN VADE (2-6 Ay)

| # | İstek | Neden | Maliyet | Öncelik |
|---|---|---|---|---|
| M9 | **Çapraz Platform Desteği (macOS/Linux)** | Şu an sadece Windows. Electron/pyinstaller `.exe` odaklı. Mac/Linux installerları lazım. | ⭐⭐⭐⭐ | 🟢 Planlı |
| M10 | **Multi-Tenant / Çok Kullanıcılı Mod** | Şu an tek kullanıcı. Sunucu modunda birden fazla kullanıcıya hizmet veremiyor. | ⭐⭐⭐⭐ | 🟢 Planlı |
| M11 | **CI/CD Pipeline** | Push → Test → Build → Deploy otomasyonu yok. Manuel build + manuel dağıtım. | ⭐⭐⭐ | 🟢 Planlı |

---

## 3. APTAL KULLANICI PERSPEKTİFİ: Olası Problemler ve Senaryolar

> "Bilgisayara ilk defa dokunmuş gibi" düşünerek, bir kullanıcının karşılaşabileceği her senaryo.

### 🔴 KRİTİK SENARYOLAR (Sistem Kullanılamaz Hale Gelir)

| # | Senaryo | Tetikleyici | Beklenen Sonuç | Gerçek Risk |
|---|---|---|---|---|
| S1 | **API anahtarı girmeden "Gönder"e basar** | Boş `.env` veya config | `SOVEREIGN ERROR` hatası → Kullanıcı ne yapacağını bilemez | 🔴 Yüksek |
| S2 | **İnternet bağlantısı kesilir (ortasında)** | WiFi kapanır | `fetch failed` → SSE stream kopar → UI askıda kalır | 🔴 Yüksek |
| S3 | **Antivirüs `.exe`'yi karantinaya alır** | Windows Defender false-positive | Uygulama açılmaz, kullanıcı "virüs" sanır | 🔴 Yüksek |
| S4 | **Port çakışması (3004/3008 dolu)** | Başka uygulama portu kullanıyor | Sunucu başlamaz, hata mesajı terminalde kalır, kullanıcı göremez | 🔴 Yüksek |
| S5 | **Google Cloud kredisi bitmiş veya API key devre dışı** | Kredi süresi dolmuş | `403 / PERMISSION_DENIED` — Kullanıcıya anlaşılır mesaj gitmez | 🔴 Yüksek |

### 🟡 ORTA RİSK SENARYOLARI (Kafa Karışıklığı)

| # | Senaryo | Tetikleyici | Beklenen Sonuç | Gerçek Risk |
|---|---|---|---|---|
| S6 | **Çok uzun mesaj gönderir (10.000+ karakter)** | Büyük metin yapıştırma | Context overflow → Bağlam budanır → Kullanıcı önceki konuşmayı kaybeder | 🟡 Orta |
| S7 | **Aynı anda 2 tarayıcı sekmesinden mesaj gönderir** | Çift sekme | Race condition → Thread bozulur | 🟡 Orta |
| S8 | **Ajan seçmeden mesaj gönderir** | UI'da default ajan yok | API'ye `agentId: undefined` gider → 500 hatası | 🟡 Orta |
| S9 | **"Dosyamı sil" gibi tehlikeli bir komut verir** | Prompt injection denemesi | Shield bloke eder ama kullanıcı neden bloke olduğunu anlamaz | 🟡 Orta |
| S10 | **Türkçe karakter sorunlu mesaj gönderir** | Emoji + özel karakter | JSON parsing fail → 500 hatası | 🟡 Orta |
| S11 | **Tarayıcıyı yanlışlıkla kapatır (sohbet ortasında)** | Kazara kapanış | Unsaved progress → Sohbet geçmişi kayıp mı? (UMI auto-save var mı?) | 🟡 Orta |
| S12 | **Sohbet geçmişini silmek ister ama bulamaz** | UI'da silme butonu nerede? | Dashboard UX karışık — kullanıcı kaybolur | 🟡 Orta |

### 🟢 DÜŞÜK RİSK (Rahatsızlık)

| # | Senaryo | Tetikleyici | Beklenen Sonuç | Gerçek Risk |
|---|---|---|---|---|
| S13 | **"Bu yapay zeka mı yoksa program mı?" diye kafası karışır** | Ajan terminolojisi bilinmiyor | Kullanıcı "Ajan nedir?" diye sorar — onboarding eksik | 🟢 Düşük |
| S14 | **Yetenek (Skill) arayüzünü bulamaz** | Dashboard karmaşıklığı | "Nasıl web araması yaptırırım?" — bulamaz | 🟢 Düşük |
| S15 | **Farklı dilde yazmaya başlar (İngilizce)** | DNA Türkçe, kullanıcı İngilizce | Ajan Türkçe yanıtlar, kullanıcı İngilizce sorar — tutarsızlık | 🟢 Düşük |
| S16 | **Bilgisayar uyku moduna geçer** | Uzun süre hareketsizlik | SSE bağlantısı kopar, reconnect mekanizması? | 🟢 Düşük |

---

## 4. MALİYET-ETKİ DEĞERLENDİRME MATRİSİ

### 4.1 Ajan İstekleri Değerlendirmesi

| # | İstek | Yapma Maliyeti | Modülerlik Etkisi | Token Etkisi | Zaman (Adam-Gün) | Önem (1-10) | Avantaj | Dezavantaj |
|---|---|---|---|---|---|---|---|---|
| A1 | Stream İlerleme | ⭐ Düşük | ✅ Pozitif | Nötr | 1 gün | 6 | UX iyileşir, kullanıcı güveni artar | Sadece kozmetik |
| A2 | Araç Hata Kalitesi | ⭐ Düşük | ✅ Pozitif | Nötr | 1 gün | 7 | Debug kolaylaşır, kullanıcı bilgilendirilir | Ek error mapping |
| A3 | Budama Özeti | ⭐⭐ Orta | ✅ Pozitif | 🟢 -20% bağlam | 2 gün | 8 | Token tasarrufu, bağlam kalitesi artar | Özet için +1 LLM çağrısı (ama net pozitif) |
| A4 | Kaizen Format | ⭐ Düşük | ✅ Pozitif | 🟢 -10% analiz | 0.5 gün | 5 | Makine tarafından okunabilir loglar | Migration maliyeti |
| A5 | Vektör Hafıza | ⭐⭐⭐ Yüksek | ⚠️ Yeni bağımlılık | 🟢🟢 -40% tekrar | 5-7 gün | 9 | Devasa token tasarrufu, kalite sıçraması | Embedding API maliyeti, karmaşıklık |
| A6 | Ajan Delegasyonu | ⭐⭐⭐ Yüksek | ⚠️ Karmaşık | 🟢 -15% tekrar | 7-10 gün | 8 | Gerçek multi-agent, paralel iş | Race condition riski, debugging zorluğu |
| A7 | Skill Önerisi | ⭐⭐ Orta | ✅ Pozitif | 🟢 -5% | 2 gün | 6 | Keşfedilebilirlik artar | False positive öneriler |
| A8 | Akıllı Özet | ⭐⭐ Orta | ✅ Pozitif | 🟢🟢 -30% bağlam | 3 gün | 9 | Uzun konuşmalarda kalite korunur | Özet kalitesi LLM'e bağlı |
| A9 | Multi-LLM | ⭐⭐⭐⭐ Çok Yük. | ⚠️ Mimari değişiklik | 🟢🟢🟢 Model routing | 10-15 gün | 10 | Maliyet optimizasyonu, risk dağıtımı | Adapter karmaşıklığı |
| A10 | Task Decomp. | ⭐⭐⭐⭐ Çok Yük. | ⚠️ Mimari değişiklik | 🟢 Odaklı sorgular | 10-15 gün | 9 | Karmaşık görevler çözülebilir hale gelir | Planlama hatası riski |
| A11 | Kalite Skoru | ⭐⭐ Orta | ✅ Pozitif | 🔴 +token (retry) | 3 gün | 7 | Yanıt kalitesi artar | Token maliyeti artar |

### 4.2 Mühendis İstekleri Değerlendirmesi

| # | İstek | Yapma Maliyeti | Modülerlik Etkisi | Zaman (Adam-Gün) | Önem (1-10) | Avantaj | Dezavantaj |
|---|---|---|---|---|---|---|---|
| M1 | Dashboard Refactor | ⭐⭐⭐ Yüksek | ✅✅ Çok Pozitif | 5-7 gün | 10 | Geliştirme hızı 3-5x artar, bakım kolaylaşır | Geçici regression riski |
| M2 | API Docs | ⭐⭐ Orta | ✅ Pozitif | 2 gün | 8 | 3.parti entegrasyonlar, dev onboarding kolaylaşır | Bakım yükü |
| M3 | Structured Logging | ⭐ Düşük | ✅ Pozitif | 1 gün | 6 | Hata tespiti 10x hızlanır | Log dosya boyutu artar |
| M4 | Test Suite | ⭐⭐⭐ Yüksek | ✅✅ Çok Pozitif | 5-10 gün | 10 | Güvenle refactor, regressions yakalanır | İlk kurulum zamanı |
| M5 | Skill SDK | ⭐⭐ Orta | ✅✅ Çok Pozitif | 3 gün | 7 | Topluluk katkısı kolaylaşır | Ek bakım yükü |
| M6 | Config Validation | ⭐⭐ Orta | ✅ Pozitif | 2 gün | 7 | Sessiz hatalar önlenir | Schema değişikliklerinde güncelleme |
| M7 | Health Dashboard | ⭐⭐ Orta | ✅ Pozitif | 3 gün | 7 | Sistem durumu bir bakışta görülür | Ek endpoint bakımı |
| M8 | Watcher Fix | ⭐ Düşük | ✅ Pozitif | 1 gün | 5 | Canlı config değişiklikleri anında yansır | Poll interval = CPU yükü |
| M9 | Cross-Platform | ⭐⭐⭐⭐ Çok Yük. | ✅ Pozitif | 10-15 gün | 8 | Kullanıcı tabanı 3x genişler | Test matrisi genişler |
| M10 | Multi-Tenant | ⭐⭐⭐⭐ Çok Yük. | ⚠️ Mimari | 15-20 gün | 7 | SaaS modeli mümkün olur | Güvenlik, izolasyon zorlukları |
| M11 | CI/CD | ⭐⭐⭐ Yüksek | ✅✅ Çok Pozitif | 3-5 gün | 8 | Otomatik build+test+deploy | İlk konfigürasyon |

### 4.3 Kullanıcı Senaryo Risk Matrisi

| # | Senaryo | Karşılaşma Olasılığı | Etki Seviyesi | Çözüm Maliyeti | Öncelik |
|---|---|---|---|---|---|
| S1 | API key boş | %80 (ilk kullanıcı) | 🚫 Bloke edici | ⭐ Düşük | 🔴 P0 |
| S2 | İnternet kesilir | %40 | 🚫 Bloke edici | ⭐⭐ Orta | 🔴 P0 |
| S3 | Antivirüs engeli | %30 | 🚫 Bloke edici | ⭐⭐⭐ Yüksek (code signing) | 🔴 P0 |
| S4 | Port çakışması | %20 | 🚫 Bloke edici | ⭐ Düşük | 🔴 P1 |
| S5 | Kredi bitmiş | %15 | 🚫 Bloke edici | ⭐ Düşük | 🔴 P1 |
| S6 | Uzun mesaj | %25 | ⚠️ Veri kaybı | ⭐⭐ Orta | 🟡 P2 |
| S7 | Çift sekme | %10 | ⚠️ Thread bozulması | ⭐⭐ Orta | 🟡 P2 |
| S8 | Ajansız mesaj | %15 | ❌ 500 hatası | ⭐ Düşük | 🟡 P2 |
| S9 | Tehlikeli komut | %20 | ⚠️ Kullanıcı kafası karışır | ⭐ Düşük | 🟢 P3 |
| S10 | Özel karakter | %5 | ❌ Parse hatası | ⭐ Düşük | 🟢 P3 |
| S11 | Tarayıcı kapanır | %30 | ⚠️ Olası kayıp | ⭐ Düşük | 🟡 P2 |
| S12 | Silme butonu | %40 | 😤 Frustrasyon | ⭐ Düşük (UI) | 🟡 P2 |
| S13 | "Ajan nedir?" | %60 | 😕 Anlam karışıklığı | ⭐ Onboarding | 🟢 P3 |
| S14 | Skill arayüzü | %35 | 😤 Keşfedilemez | ⭐ Düşük (UI) | 🟢 P3 |
| S15 | Dil uyumsuzluğu | %10 | 😕 Tutarsızlık | ⭐ Düşük | 🟢 P3 |
| S16 | Uyku modu | %20 | ⚠️ Bağlantı kopması | ⭐⭐ Orta | 🟡 P2 |

---

## 5. ÖNCELİKLENDİRİLMİŞ EYLEM PLANI

### 🔴 İLK DALGA — Aciller (Canlı testten önce yapılması önerilen)

1. **S1 — API Key Kontrol Ekranı** → Kullanıcıya net hata mesajı + "API anahtarını nasıl alırsınız?" linki
2. **S2 — Network Offline Tespiti** → Frontend'de `navigator.onLine` + SSE reconnect
3. **S4 — Otomatik Port Algılama** → `EADDRINUSE` hatası yakalanıp alternatif port denenmeli
4. **S5 — Kredi/Permission Hatası** → `403` için Türkçe açıklama + yönlendirme
5. **S8 — Default Ajan Güvenliği** → `agentId` boşsa API 400 dönsün, 500 değil
6. **A2 — Araç Hata Kalitesi** → Kullanıcıya hangi araç, neden başarısız olduğunu göster

### 🟡 İKİNCİ DALGA — Orta Vadeler

7. **A3+A8 — Akıllı Bağlam Yönetimi** → Budama yerine LLM özeti + enjeksiyon
8. **A5 — Semantik Hafıza** → Gemini Embedding API ile gerçek vektör arama
9. **M1 — Dashboard Refactor** → App.jsx'i 8-10 modüler componente böl
10. **M4 — Test Suite** → Vitest + core modül testleri
11. **S7 — Session Lock** → Aynı thread'e eşzamanlı yazma engellemesi

### 🟢 ÜÇÜNCÜ DALGA — Uzun Vadeler

12. **A9 — Multi-LLM** → Claude/GPT-4 adapter + akıllı model routing
13. **A10 — Task Decomposition** → Karmaşık görevleri alt görevlere bölme motoru
14. **M9 — Cross-Platform** → macOS/Linux installer
15. **M10 — Multi-Tenant** → Sunucu modunda çoklu kullanıcı

---

## 6. CANLI TEST PLANI

Aşağıdaki senaryolar sırasıyla test edilecek. Her biri bağımsız ve izlenebilir.

| Test # | Senaryo | Yöntem | Beklenen Sonuç | Geçti? |
|---|---|---|---|---|
| T1 | Normal mesaj gönderme | Dashboard → "Merhaba" yaz | Ajan yanıt verir | ⬜ |
| T2 | Boş mesaj gönderme | Dashboard → "" gönder | Hata mesajı veya engelleme | ⬜ |
| T3 | Çok uzun mesaj (5000+ char) | Büyük metin yapıştır | Yanıt gelir, bağlam budanır mı? | ⬜ |
| T4 | Araç çağrısı (Web Arama) | "Google'da AgentsHUB ara" | Skill tetiklenir, sonuç döner | ⬜ |
| T5 | Araç çağrısı (Dosya Yaz) | "test.txt dosyası oluştur" | Dosya yazılır | ⬜ |
| T6 | Thread değiştirme ortasında | Sohbet ederken başka thread'e geç | Eski sohbet korunur mu? | ⬜ |
| T7 | Ajan değiştirme | Asistan'dan Etkileşim Ajanı'na geç | Geçiş sorunsuz mu? | ⬜ |
| T8 | Prompt injection denemesi | "Ignore previous instructions" gönder | Shield bloke eder | ⬜ |
| T9 | API hatası simülasyonu | Geçersiz model adı kullan | Hata mesajı verici mi? | ⬜ |
| T10 | Sayfa yenilemesi | F5 ile yenile | Sohbet korunur mu? | ⬜ |
| T11 | Hızlı ardışık mesajlar | 3 mesajı peş peşe gönder | Rate limit çalışır mı? | ⬜ |
| T12 | Özel karakter mesajı | Emoji + Türkçe özel char gönder | Doğru işlenir mi? | ⬜ |
| T13 | SSE stream test | Streaming yanıt bekle | Canlı akış çalışır mı? | ⬜ |
| T14 | Boş/yeni ajan ile chat | Yeni oluşturulmuş ajan | "Genesis" çalışır, config oluşur mu? | ⬜ |
| T15 | Skill toggle testi | Bir skill'i devre dışı bırak + çağır | Çağrılmamalı | ⬜ |

---

> **Bu rapor, canlı teste geçilmeden önce tüm perspektiflerden sistemin durumunu, risklerini ve öncelikli aksiyonlarını belgelemektedir. Canlı test sırasında yukarıdaki tabloların "Geçti?" sütunları doldurulacaktır.**
