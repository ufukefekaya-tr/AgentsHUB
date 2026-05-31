# AgentsHUB — 28 Yetenek Manuel Test Kılavuzu

> **Nasıl kullanılır?** Her yeteneği test etmek için aşağıdaki "Ajan'a yaz" kutusundaki cümleyi **birebir kopyalayıp** ajan sohbet penceresine yapıştır ve gönder.  
> ✅ = Kurulum gerektirmez, hemen test edilebilir  
> ⚠️ = Ön kurulum veya API anahtarı gerektirir  
> 💻 = Sadece Windows'ta çalışır

---

## 1. 🧮 calculator

**Ne yapar:** Matematiksel ifadeleri hesaplar.

✅ Ön gereksinim yok.

**Test komutu:**
```
calculator yeteneğini kullanarak şu işlemi hesapla: 8500'ün yüzde 18'i kaç eder? Ayrıca sqrt(144) hesapla.
```

**Beklenen çıktı:** `1530` ve `12`

---

## 2. 🌤️ weather

**Ne yapar:** Herhangi bir şehir için anlık hava ve 3 günlük tahmin.

✅ Ön gereksinim yok.

**Test komutu:**
```
weather yeteneğini kullanarak İstanbul için anlık hava durumunu ve 3 günlük tahmini getir.
```

**Beklenen çıktı:** Sıcaklık, nem, rüzgar, yağış bilgileri.

---

## 3. 🕐 get_time

**Ne yapar:** Sunucunun anlık saat ve tarihini söyler.

✅ Ön gereksinim yok.

**Test komutu:**
```
get_time yeteneğini kullanarak şu an saat kaç ve bugün ne günü olduğunu söyle. Bir de Europe/Istanbul timezone'unda göster.
```

**Beklenen çıktı:** ISO tarih veya locale formatında saat + timezone karşılaştırması.

---

## 4. 🔍 google_search

**Ne yapar:** Gemini'nin yerleşik Google arama özelliği. API anahtarı gerekmez.

✅ Ön gereksinim yok.

**Test komutu:**
```
google_search yeteneğini kullanarak bugünkü USD/TRY döviz kurunu bul ve getir.
```

**Beklenen çıktı:** Güncel döviz kuru ve kaynak bilgisi.

---

## 5. 🦆 duckduckgo_search

**Ne yapar:** DuckDuckGo üzerinden ücretsiz web araması.

✅ Ön gereksinim yok.

**Test komutu:**
```
duckduckgo_search yeteneğini kullanarak 'yapay zeka 2025 haberleri' için arama yap ve ilk 3 sonucu getir.
```

**Beklenen çıktı:** 3 başlık + kaynak URL listesi.

---

## 6. 🌐 web_scraper

**Ne yapar:** Statik internet sayfasının metnini çeker (Haber, Blog, Wiki vb.).

✅ Ön gereksinim yok.

**Test komutu:**
```
web_scraper yeteneğini kullanarak 'https://tr.wikipedia.org/wiki/Türkiye' sayfasını oku ve ilk 500 karakterini getir.
```

**Beklenen çıktı:** Wikipedia Türkiye maddesinin açılış metni.

---

## 7. 🔗 url_opener

**Ne yapar:** Bilgisayarda tarayıcıyı açıp URL'ye gider. İçerik okumaz, sadece açar.

💻 Windows'ta çalışır.

**Test komutu:**
```
url_opener yeteneğini kullanarak 'https://www.google.com' adresini benim bilgisayarımda varsayılan tarayıcıda aç.
```

**Beklenen çıktı:** `[BAŞARILI] Tarayıcı açıldı.` + Google ekranınızda açılır.

---

## 8. 🌐 browser_agent

**Ne yapar:** Görünmez Chrome ile dinamik sayfa okur. Playwright gerektirir.

⚠️ Playwright kurulu olmalıdır.

**Test komutu:**
```
browser_agent yeteneğini kullanarak 'https://example.com' adresine git ve sayfadaki tüm metni getir.
```

**Beklenen çıktı:** `Example Domain` başlığını içeren sayfa metni.

> ⚠️ Playwright kurulu değilse: `Cannot find package 'playwright'` hatası alırsınız — bu normaldir, browser_agent yerine web_scraper kullanın.

---

## 9. 💾 write_file

**Ne yapar:** Ajan çalışma klasörüne dosya yazar veya sonuna ekler.

✅ Ön gereksinim yok.

**Test 1 — Yeni dosya yaz:**
```
write_file yeteneğini kullanarak 'test_notu.txt' adlı bir dosya oluştur ve içine 'Bu bir test notudur. Tarih: 30 Mart 2025.' yaz.
```

**Test 2 — Dosya sonuna ekle (append):**
```
write_file yeteneğini kullanarak 'test_notu.txt' dosyasının SONUNA 'İkinci satır eklendi.' metnini EKLE, eski içeriği SİLME. append modunu kullan.
```

**Beklenen çıktı:** `[BASARILI] Dosya kaydedildi` veya `[BASARILI] İçerik metnin SONUNA EKLENDİ`.

---

## 10. 💻 byterover

**Ne yapar:** Dosya oku/yaz/sil, klasör listele, terminal komutu çalıştır.

💻 PowerShell gerektirir (Windows).

**Test 1 — Klasör listele:**
```
byterover yeteneğini kullanarak 'C:/AgentsHUB' klasörünün içeriğini listele.
```

**Test 2 — Dosya oku:**
```
byterover yeteneğini kullanarak 'C:/AgentsHUB/app/package.json' dosyasını oku.
```

**Test 3 — Komut çalıştır:**
```
byterover yeteneğini kullanarak 'echo Merhaba Dünya' komutunu çalıştır.
```

**Test 4 — Append (ekleme):**
```
byterover yeteneğini kullanarak 'C:/AgentsHUB/app/test_append.txt' dosyasının sonuna 'Ek satır.' metnini append ile ekle.
```

---

## 11. 📸 screenshot

**Ne yapar:** Ekran görüntüsü alır ve kaydeder.

💻 Windows + PowerShell gerektirir.

**Test komutu:**
```
screenshot yeteneğini kullanarak ekranımın şu anki fotoğrafını al ve kaydet.
```

**Beklenen çıktı:** `[BAŞARILI] Ekran görüntüsü kaydedildi. 📁 Dosya: ...screenshots/screenshot_XXXXX.png`

---

## 12. 📊 system_monitor

**Ne yapar:** CPU, RAM, Disk ve aktif işlemleri raporlar.

💻 Windows'ta çalışır.

**Test komutu:**
```
system_monitor yeteneğini kullanarak bilgisayarımın CPU, RAM ve disk doluluk durumunu göster.
```

**Beklenen çıktı:** `CPU: %X | RAM: X GB / X GB | Disk: %X dolu` tarzı detaylı rapor.

---

## 13. 📋 clipboard

**Ne yapar:** Panodaki metni okur veya panoya metin yazar.

💻 Windows + PowerShell gerektirir.

**Test 1 — Panoya yaz:**
```
clipboard yeteneğini kullanarak 'AgentsHUB Test 2025' metnini bilgisayarımın panosuna kopyala.
```

**Test 2 — Panodan oku:**
```
clipboard yeteneğini kullanarak şu an bilgisayarımın panosunda ne olduğunu oku ve söyle.
```

**Beklenen çıktı:** İlk testten sonra pano içeriği `AgentsHUB Test 2025` olmalı.

---

## 14. 📄 pdf_reader

**Ne yapar:** PDF'ten metin çeker. Ek kurulum gerektirmez.

✅ Ön gereksinim yok (PowerShell kullanır).

**Test komutu:**
```
pdf_reader yeteneğini kullanarak 'C:/AgentsHUB/Report/DOSYA_ADI.pdf' dosyasını oku ve içeriğini özetle.
```

> 🔁 `DOSYA_ADI.pdf` kısmını bilgisayarınızda gerçekten var olan bir PDF dosya yoluyla değiştirin.

---

## 15. 📄 pdf_extractor

**Ne yapar:** PDF'ten yüksek kaliteli metin çeker. `pdf-parse` bağımlılığı gerektirir.

⚠️ `pdf-parse` npm paketi kurulu olmalıdır.

**Test komutu:**
```
pdf_extractor yeteneğini kullanarak 'C:/AgentsHUB/Report/DOSYA_ADI.pdf' dosyasının ilk 5 sayfasını oku ve özetle.
```

> ⚠️ `pdf-parse` kurulu değilse `Cannot find package 'pdf-parse'` hatası alırsınız — bu normaldir, pdf_reader'ı deneyin.

---

## 16. 🐍 python_runner

**Ne yapar:** Python kodu çalıştırır. Python kurulu olması şarttır.

⚠️ Sistemde `python.exe` PATH'e eklenmiş olmalıdır.

**Test komutu:**
```
python_runner yeteneğini kullanarak şu Python kodunu çalıştır:
print("Merhaba, AgentsHUB!")
print(2 ** 10)
```

**Beklenen çıktı:** `Merhaba, AgentsHUB!` ve `1024`

---

## 17. 🧠 auto_capture

**Ne yapar:** Konuşmadan öğrenilen bilgileri kalıcı UMI hafızasına kaydeder.

✅ Ön gereksinim yok.

**Test komutu:**
```
Benim adım Ufuk, İstanbul'da yaşıyorum ve metal sektöründe çalışıyorum. Bu bilgileri hafızana kaydet, auto_capture kullan.
```

**Sonrasında:** Yeni bir sohbet açıp `Adım ne?` deyin. Bilgiyi hatırlıyorsa test başarılıdır.

---

## 18. 🛡️ health_checker

**Ne yapar:** Web adresine ping atar, çalışıp çalışmadığını kontrol eder.

✅ Ön gereksinim yok.

**Test komutu:**
```
health_checker yeteneğini kullanarak şu 3 adresi kontrol et: ['https://www.google.com', 'https://httpstat.us/503', 'https://example.com']
```

**Beklenen çıktı:** Google ✅ UP, httpstat.us ⚠️ DEGRADED (503), example.com ✅ UP

---

## 19. 📦 clawhub_installer

**Ne yapar:** Yerel Marketplace'den ajan havuzuna yetenek kurar/kaldırır.

✅ Ön gereksinim yok.

**Test 1 — Mevcut yetenekleri listele:**
```
clawhub_installer yeteneğini kullanarak mevcut Marketplace'deki tüm yetenekleri listele.
```

**Test 2 — Bir yetenek kur:**
```
clawhub_installer yeteneğini kullanarak 'calculator' yeteneğini bu ajana kur.
```

**Beklenen çıktı:** 28 yeteneğin listesi veya `calculator.js kuruldu` onayı.

---

## 20. 🌐 clawhub_remote

**Ne yapar:** clawhub.ai uzak mağazasinda yetenek arar ve indirir.

✅ İnternet bağlantısı gerekir, API anahtarı gerektirmez.

**Test 1 — Mağazada ara:**
```
clawhub_remote yeteneğini kullanarak 'scraper' anahtar kelimesiyle Clawhub mağazasında arama yap.
```

**Test 2 — Yetenek detayına bak:**
```
clawhub_remote yeteneğini kullanarak 'web-scraper' slug'ı ile yetenek detayını getir.
```

---

## 21. ✨ skill_creator

**Ne yapar:** Ajan kendi kendine yeni bir JS yeteneği yazar ve havuzuna ekler.

✅ Ön gereksinim yok.

**Test komutu:**
```
skill_creator yeteneğini kullanarak 'random_joke' adında yeni bir yetenek yaz. Bu yetenek her çalıştığında Türkçe 3 farklı komik arasından rastgele birini döndürsün.
```

**Beklenen çıktı:** `BAŞARILI: 'random_joke.js' yeteneği yazıldı ve ajana eklendi.`

---

## 22. 📡 signal_agent

**Ne yapar:** Sistemdeki başka bir ajana mesaj/görev gönderir.

✅ Ön gereksinim yok (başka ajan aktif olmalı).

**Test komutu:**
```
signal_agent yeteneğini kullanarak ID'si 'agent_002' olan ajana 'Merhaba, test mesajı gönderiyorum.' diye mesaj at. Priority: normal.
```

> ⚠️ Hedef ajan aktif değilse `[HATA] Ajan bulunamadı` döner — bu normaldir.

---

## 23. 🌉 mcp_bridge

**Ne yapar:** MCP protokolüyle çalışan dış sunuculara bağlanır. İleri düzey teknik araç.

⚠️ Dış MCP sunucu gerektirir.

**Test komutu:**
```
mcp_bridge yeteneğini kullanarak 'http://localhost:8080' adresine 'ping' methodu ile bağlan.
```

> ⚠️ Localhost'ta MCP sunucu yoksa bağlantı hatası alınır — bu normaldir.

---

## 24. 🦁 brave_search

**Ne yapar:** Brave Search API ile web araması yapar.

⚠️ `BRAVE_API_KEY` ortam değişkeni olarak ayarlanmış olmalı.

**Test komutu:**
```
brave_search yeteneğini kullanarak 'AgentsHUB yapay zeka' için web araması yap.
```

> ⚠️ API anahtarı yoksa `BRAVE_API_KEY eksik` hatası alırsınız.

---

## 25. 🔍 tavily_search

**Ne yapar:** Tavily AI ile araştırma odaklı derin web araması yapar.

⚠️ `TAVILY_API_KEY` ortam değişkeni olarak ayarlanmış olmalı.

**Test komutu:**
```
tavily_search yeteneğini kullanarak 'KOBİ'ler için yapay zeka otomasyon faydaları' konusunu araştır ve özet sun.
```

> ⚠️ API anahtarı yoksa `TAVILY_API_KEY eksik` hatası alırsınız.

---

## 26. 📧 email_manager

**Ne yapar:** SMTP üzerinden e-posta gönderir.

⚠️ Ayarlar'da `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` tanımlı olmalıdır.

**Test komutu:**
```
email_manager yeteneğini kullanarak 'test@ornek.com' adresine 'Test Maili' konusuyla 'Bu AgentsHUB'dan gönderilmiş bir test mailidir.' içerikli mail gönder.
```

> ⚠️ SMTP yapılandırılmamışsa `SMTP ayarları eksik` hatası alırsınız.

---

## 27. 🐙 github_manager

**Ne yapar:** GitHub repo'sunu takip eder, issue açar, PR listeler.

⚠️ `GITHUB_TOKEN` ortam değişkeni olarak ayarlanmış olmalı.

**Test komutu:**
```
github_manager yeteneğini kullanarak 'microsoft/vscode' reposundaki son 5 açık issue'yu listele.
```

> ⚠️ Token yoksa `GITHUB_TOKEN eksik` hatası alırsınız.

---

## 28. ☁️ google_workspace

**Ne yapar:** Google Drive, Gmail ve Google Takvim'e erişir.

⚠️ Google Cloud OAuth 2.0 yapılandırması gerektirir.

**Test komutu:**
```
google_workspace yeteneğini kullanarak Gmail servisinde son 5 maili listele.
```

> ⚠️ OAuth yapılandırılmamışsa `Google OAuth token eksik` hatası alırsınız.

---

## 🔥 Hızlı Test Sırası (5 Dakikada Çalışması Gereken Yetenekler)

Bu 10 yetenek **kurulum gerektirmeden** anında test edilebilir:

| # | Yetenek | Test Cümlesi |
|---|---------|--------------|
| 1 | calculator | `8500'ün %18'i kaç? calculator kullan.` |
| 2 | weather | `İstanbul hava durumu, weather kullan.` |
| 3 | get_time | `Saat kaç? get_time kullan.` |
| 4 | google_search | `Bugün dolar kaç? google_search kullan.` |
| 5 | duckduckgo_search | `AI haberleri ara, duckduckgo kullan.` |
| 6 | web_scraper | `'https://example.com' oku, web_scraper kullan.` |
| 7 | write_file | `'merhaba.txt' oluştur içine 'test' yaz, write_file kullan.` |
| 8 | health_checker | `'https://google.com' çalışıyor mu? health_checker kullan.` |
| 9 | system_monitor | `RAM ve CPU durumu nedir? system_monitor kullan.` |
| 10 | clawhub_installer | `Marketplace'deki yetenekleri listele, clawhub_installer kullan.` |

---

> **Not:** `browser_agent`, `pdf_extractor` ve `duckduckgo_search` bağımlılık gerektiren modüllerdir (Playwright, pdf-parse, cheerio). Bunlar kurulum hatası verirse beklenen davranıştır.
