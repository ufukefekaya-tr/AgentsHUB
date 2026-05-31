# TEST-07: YETENEK (SKILL) DERİN TEST PLANI — FAZ 2
**Sistem:** AgentsHUB Beta V1.5  
**Test Ajanı:** QA_ATLAS_V3 (gemini-2.5-flash)  
**Test Metodu:** Canlı Ortam — Arayüz Üzerinden Ajan ile Gerçek Komut

> [!IMPORTANT]
> Bu testler TEK TEK ajanla canlı sohbet üzerinden gerçekleştirilecek. Her yetenek için 3 senaryo tanımlanmıştır: Temel, Hata Yönetimi, ve Edge Case (Sınır Durumu).

---

## 7.1 — SKILL CREATOR (`skill_creator.js`)

**Yetenek Açıklaması:** Ajanın kendi JavaScript yeteneğini kodlayıp `Marketplace/skills/` dizinine kaydetmesi.

### Senaryo A — Temel Yetenek Yazma
**Komut:** `"selamlama" adında bir yetenek yaz. Girilen isme "Merhaba X!" desin. Dosyayı kaydet.`  
**Beklenen:** `.js` dosyası `Marketplace/skills/selamlama.js` olarak oluşmalı.  
**Onay Kontrolü:** Exec Approval devreye girmeli (dosya yazma).

### Senaryo B — Hata Yönetimi (Üzerine Yazma)
**Komut:** `Aynı "selamlama" yeteneğini yeniden yaz ama bu sefer "İyi günler X!" desin.`  
**Beklenen:** Üzerine yazma onayı istenmeli, dosya güncellenmeli.

### Senaryo C — Edge Case (Geçersiz Kod)
**Komut:** `"bozuk_skill" adında bir yetenek yaz ama export etme.`  
**Beklenen:** Ajan geçersiz skill yapısını fark edip hata vermeli veya export eklemeli.

---

## 7.2 — BROWSER AGENT (`browser_agent.js`)

**Yetenek Açıklaması:** Playwright headless modda web gezgini — gerçek URL'lere gidip içerik okuma.

### Senaryo A — Temel URL Okuma
**Komut:** `Browser yeteneğiyle "https://news.ycombinator.com" adresine git ve en üstteki 3 başlığı oku.`  
**Beklenen:** Playwright headless açılıp H1/başlık elementleri döndürülmeli.  
**Gerekli:** `playwright` paketi yüklü (✅ Zaten kurulu).

### Senaryo B — JavaScript Gerektiren Sayfa
**Komut:** `Browser yeteneğiyle "https://example.com" adresine git ve sayfa başlığını al.`  
**Beklenen:** "Example Domain" başlığı dönmeli.

### Senaryo C — Hata Durumu (Olmayan URL)
**Komut:** `Browser ile "https://bu-adres-hic-yoktur-99999.xyz" adresine git.`  
**Beklenen:** Ajan timeout/hata mesajını düzgün raporlamalı. Crash yapmamalı.

---

## 7.3 — PYTHON RUNNER (`python_runner.js`)

**Yetenek Açıklaması:** Sistemdeki Python yorumlayıcısını kullanarak kod çalıştırma.

### Senaryo A — Temel Python Çalıştırma
**Komut:** `Python ile şu kodu çalıştır: print("Merhaba dünya, 2+2 =", 2+2)`  
**Beklenen Çıktı:** `Merhaba dünya, 2+2 = 4`  
**Gerekli:** Sistemde `python` veya `python3` kurulu olmalı.

### Senaryo B — Matematik Hesaplama
**Komut:** `Python ile 1'den 100'e kadar asal sayıları bul ve listele.`  
**Beklenen:** Python kodu çalışıp sonucu döndürmeli.

### Senaryo C — Hata Durumu (Hatalı Kod)
**Komut:** `Python ile şu kodu çalıştır: print(undefined_variable)`  
**Beklenen:** Python hata mesajı ajan tarafından anlamlı şekilde iletilmeli.

---

## 7.4 — PDF EXTRACTOR (`pdf_extractor.js`)

**Yetenek Açıklaması:** `pdf-parse` ile PDF dosyalarından metin çıkarma.

### Senaryo A — PDF Okuma
**Komut:** `C:\AgentsHUB\Report klasöründeki en büyük dosyayı PDF olarak oku ve ilk 500 kelimesini özetle.`  
**Beklenen:** PDF içeriği okunup özetlenmeli.  
**Gerekli:** `pdf-parse` paketi yüklü (✅ package.json'da var).

### Senaryo B — Olmayan PDF
**Komut:** `C:\olmayan_dosya.pdf dosyasını oku.`  
**Beklenen:** "Dosya bulunamadı" hatası anlamlı şekilde gelmeli.

### Senaryo C — Büyük PDF Performans
**Komut:** `PDF'yi oku ama sadece Sayfa 1-3'ü getir.`  
**Beklenen:** Sayfa sınırlaması çalışmalı, timeout olmamalı.

---

## 7.5 — TAVILY SEARCH (`tavily_search.js`)

**Yetenek Açıklaması:** Tavily API ile LLM-optimize web araması.

### Senaryo A — Temel Arama
**Komut:** `Tavily ile "yapay zeka 2026 trendleri" araştır ve sonuçları özetle.`  
**Gerekli:** `.env → TAVILY_API_KEY=tvly-xxxxx`  
**Beklenen:** LLM-optimize arama sonuçları ve özet.

### Senaryo B — API Key Yokken
**Komut:** (API key silinirse) Tavily ile arama yap.  
**Beklenen:** "TAVILY_API_KEY yapılandırması eksik" açık hata mesajı.

### Senaryo C — Özel Alan Araması
**Komut:** `Tavily ile "AgentsHUB nodejs" araştır sadece github.com sitesinde.`  
**Beklenen:** Domain filtreli arama sonuçları.

---

## 7.6 — DUCKDUCKGO SEARCH (`duckduckgo_search.js`)

**Yetenek Açıklaması:** Ücretsiz DuckDuckGo API scraping.

### Senaryo A — Temel Arama
**Komut:** `DuckDuckGo ile "Node.js 22 yenilikleri" araştır.`  
**Gerekli:** Yok (ücretsiz).  
**Beklenen:** Web arama sonuçları (başlıklar, URL'ler, özetler).

### Senaryo B — Aynı Anda 2 Sorgu
**Komut:** `DuckDuckGo ile önce "OpenAI" sonra "Google AI" araştır ve karşılaştır.`  
**Beklenen:** İki arama sonucu yan yana gösterilmeli.

### Senaryo C — Türkçe Sorgu
**Komut:** `DuckDuckGo ile "Türkiye teknoloji startup ekosistemi 2026" araştır.`  
**Beklenen:** Türkçe/ingilizce karma sonuçlar gelmeli.

---

## 7.7 — BRAVE SEARCH (`brave_search.js`)

**Yetenek Açıklaması:** Brave Search API entegrasyonu.

### Senaryo A — Temel Arama
**Komut:** `Brave Search ile "AgentsHUB" araştır.`  
**Gerekli:** `.env → BRAVE_API_KEY=BSAxxxxx`  
**Beklenen:** Arama sonuçları başlık ve URL ile.

### Senaryo B — API Key Yokken Graceful Failure
**Komut:** (API key yoksa) Brave ile arama yap.  
**Beklenen:** "BRAVE_API_KEY eksik" hatası anlamlı şekilde.

---

## 7.8 — GOOGLE WORKSPACE (`google_workspace.js`)

**Yetenek Açıklaması:** Google Drive, Mail, Calendar entegrasyonu (OAuth).

### Senaryo A — OAuth Yapılandırması Olmadan
**Komut:** `Google Drive'ımdaki dosyaları listele.`  
**Beklenen:** "Google OAuth yapılandırması eksik veya token geçersiz" hatası açık mesajla.

### Senaryo B — OAuth Token Varken
**Komut:** (Token yapılandırıldıysa) `Son 5 Google Drive dosyasını listele.`  
**Beklenen:** Dosya adları ve linkleri döndürülmeli.

### Senaryo C — Calendar Event
**Komut:** (Token varsa) `Yarınki takvim etkinliklerimi göster.`  
**Beklenen:** Google Calendar eventleri okunup listelenebilmeli.

---

## 7.9 — EMAIL MANAGER (`email_manager.js`)

**Yetenek Açıklaması:** SMTP ve IMAP e-posta yönetimi.

### Senaryo A — SMTP Yapılandırması Olmadan
**Komut:** `test@example.com adresine "Deneme" konulu e-posta gönder.`  
**Beklenen:** "SMTP yapılandırması eksik" açık hata mesajı.  
**Dikkat:** Exec Approval devreye girmeli.

### Senaryo B — SMTP Yapılandırıldığında
**Komut:** (`.env → SMTP_HOST` varsa) `test@example.com adresine deneme maili at.`  
**Beklenen:** Mail gönderildi onayı.

### Senaryo C — Gelen Kutusu Okuma (IMAP)
**Komut:** `Son 3 e-postamı oku.`  
**Gerekli:** `.env → IMAP_HOST, IMAP_USER, IMAP_PASS`  
**Beklenen:** E-posta başlıkları/gönderenler listelenmeli.

---

## 7.10 — GITHUB MANAGER (`github_manager.js`)

**Yetenek Açıklaması:** GitHub API ile repo yönetimi.

### Senaryo A — GitHub Token Olmadan
**Komut:** `GitHub'daki repos'umu listele.`  
**Beklenen:** "GITHUB_TOKEN eksik" hatası anlamlı şekilde.

### Senaryo B — Public Repo Get (Token Varsa)
**Komut:** (`.env → GITHUB_TOKEN` varsa) `microsoft/vscode reposunun son 3 issue'sunu listele.`  
**Beklenen:** Issue başlıkları, URL'ler ve durumları döndürülmeli.

### Senaryo C — PR Yönetimi
**Komut:** `AgentsHUB reposundaki açık pull request'leri listele.`  
**Beklenen:** PR listesi veya "Repo bulunamadı" hatası.

---

## 7.11 — HEALTH CHECKER (`health_checker.js`)

**Yetenek Açıklaması:** URL ping ve uptime monitörü.

### Senaryo A — Temel Ping
**Komut:** `google.com ve github.com adreslerine ping at ve yanıt sürelerini raporla.`  
**Gerekli:** Yok.  
**Beklenen:** ms cinsinden ping süreleri ve HTTP status kodları.

### Senaryo B — Çoklu URL
**Komut:** `Şu 5 URL'ye ping at: google.com, github.com, openai.com, microsoft.com, localhost:3434`  
**Beklenen:** Her birinin yanıt süresi ve status kodu tablo halinde.

### Senaryo C — Timeout Durumu
**Komut:** `bu-adres-hic-yok-99999.xyz adresine ping at.`  
**Beklenen:** Timeout veya DNS çözümleneme hatası anlamlı mesajla.

### Senaryo D — Periyodik İzleme
**Komut:** `google.com'u 5 saniyede bir 3 kez kontrol et ve değişiklikleri raporla.`  
**Beklenen:** 3 ayrı ping sonucu, ortalama latency hesaplanmış.

---

## 7.12 — AUTO CAPTURE (`auto_capture.js`)

**Yetenek Açıklaması:** Sohbetten bilgi otomatik hafızaya (UMI) yazma.

### Senaryo A — Temel Hafıza Kayıt
**Komut:** `Bu önemli bilgiyi kalıcı hafızana kaydet: "Mimar'ın favori rengi mavi"`  
**Beklenen:** Bilgi ajanın local hafıza dosyasına JSON olarak kaydedilmeli.

### Senaryo B — Alınan Bilgiyi Sorgulama
**Komut:** (Bilgi kaydedildikten sonra) `Mimar'ın favori rengi ne?`  
**Beklenen:** Ajan hafızadan bilgiyi okuyup `mavi` diyebilmeli.

### Senaryo C — Çoklu Bilgi Kayıt
**Komut:** `Şu bilgileri kaydet: 1) Proje adı: AgentsHUB 2) Versiyon: V1.5 3) Durum: Beta`  
**Beklenen:** 3 farklı fact JSON'a yazılmalı.

### Senaryo D — Hafıza Sınırı
**Komut:** `100 farklı bilgi kaydet: Bilgi1, Bilgi2, ... Bilgi100`  
**Beklenen:** Sistem çökmeden tüm bilgileri kaydetmeli veya limit mesajı vermeli.

---

## 7.13 — SIGNAL AGENT (`signal_agent.js`)

**Yetenek Açıklaması:** Multi-Agent arası mesajlaşma (Çapraz sinyal).

### Senaryo A — Temel Sinyal Gönderimi
**Komut:** `"Test SKILL" ajanına şu mesajı gönder: "Selam, bu bir çapraz sinyal testidir."`  
**Gerekli:** En az 2 ajan kayıtlı olmalı (✅ 6 ajan mevcut).  
**Beklenen:** Hedef ajana mesaj iletilmeli.

### Senaryo B — Kendi Kendine Sinyal (Loop Koruması)
**Komut:** `QA_ATLAS_V3 ajanına (yani kendine) mesaj gönder.`  
**Beklenen:** "Self-loop engellendi" mesajı veya gönderim tamamlanmalı.

### Senaryo C — Olmayan Ajana Sinyal
**Komut:** `"bu_ajan_yoktur_xyz" ajanına mesaj gönder.`  
**Beklenen:** "Hedef ajan bulunamadı" hatası açık şekilde.

### Senaryo D — Çoklu Sinyal
**Komut:** `Tüm ajanlara broadcast mesaj gönder: "Sistem testi yapılıyor"`  
**Beklenen:** Mevcut tüm ajanlara mesaj iletilmeli.

---

## 7.14 — MCP BRIDGE (`mcp_bridge.js`)

**Yetenek Açıklaması:** Model Context Protocol köprüsü — harici MCP tool sunucularına bağlanma.

### Senaryo A — MCP Sunucu Yapılandırması Olmadan
**Komut:** `MCP sunucusu üzerinden mevcut araçları listele.`  
**Gerekli:** MCP sunucu yapılandırması.  
**Beklenen:** "MCP sunucu yapılandırması eksik" açık hata mesajı veya boş tool listesi.

### Senaryo B — Yapılandırıldığında Tool Listesi
**Komut:** (MCP sunucu varsa) `MCP araçlarını listele ve birini çalıştır.`  
**Beklenen:** Tool listesi ve çalıştırma sonucu.

### Senaryo C — MCP Zaman Aşımı
**Komut:** `Erişilemeyen bir MCP sunucusuna bağlan.`  
**Beklenen:** Timeout sonrası anlamlı hata mesajı.

---

## YÜRÜTME SIRASI VE ÖNERİLEN AKIŞ

```
FAZ 2 UYGULAMA SIRASI:
1. health_checker    → Bağımlılık yok, en hızlı test
2. duckduckgo_search → API key gerekmez, güvenilir
3. python_runner     → python yüklüyse çalışır
4. calculator        → Direkt hesaplama (otomatik)
5. browser_agent     → Playwright zaten yüklü
6. auto_capture      → Hafıza sistemi testi
7. signal_agent      → Multi-ajan mevcut
8. skill_creator     → Dosya yazma (Approval gerekir)
9. pdf_extractor     → PDF dosyası lazım
10. tavily_search    → API key gerekir
11. brave_search     → API key gerekir
12. email_manager    → SMTP/IMAP config gerekir
13. github_manager   → GitHub token gerekir
14. google_workspace → OAuth gerekir
15. mcp_bridge       → MCP sunucu gerekir
```

**Her test için:**
- Ajanın yeteneği sisteme yüklü olduğunu doğrula
- Canlı sohbette gerçek komut ver
- Sonucu ekran görüntüsüyle belgele
- Başarı: Araç kullanıldı ve anlamlı sonuç döndü
- Başarısız: Hata mesajı raporla ve kök nedeni analiz et

---

*Bu plan, TEST-07 Faz 2 aktivasyonu için teknik temel bilgi gerektirmez — arayüzden doğrudan ajan ile sohbet yeterlidir.*
