# AgentsHUB SKILL & EXTENSION ENTEGRASYON RAPORU
## PART 3 / 4 — UNIVERSAL SKILLS & TOOL EXTENSIONS
### (Önceliğe Göre: Kritik → Yüksek → Orta)

> Bu grup; platform bağımsız, genel amaçlı yetenekleri içerir.
> CLI-tabanlı Skills (.md) → AgentsHUB'ın native `.js` function calling formatına çevrilir.
> TypeScript Extensions → Vanilla JS ESM ile `BaseAdapter` veya izole Worker Thread skill'e port edilir.

---

## 🔴 KRİTİK ÖNCELİK

---

### 1. `tavily` — **Tavily Search (LLM-Odaklı Web Araması)**
**Ne Yapar:** Tavily Search API; LLM uygulamaları için optimize edilmiş web araması. Sonuçlar Markdown özet + kaynak URL formatında — LLM'e direkt sindirilebilir formda gelir.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | LLM için tasarlanmış tek search API. Sonuçları HTML değil, Markdown özet olarak döner; LLM prompt'a direkt eklenebilir. `basic` mod ile 1000 istek/ay ücretsiz. |
| **Zayıflık (W)** | Ücretli tier: $25/1000 istek. Ücretsiz kotası hızla dolabilir. |
| **Fırsat (O)** | Araştırma Ajanı'nın birincil veri kaynağı. Pazar analizi, rakip araştırması, teknik dökümantasyon taraması — tamamen otonom. Brave + DuckDuckGo ile 3 katmanlı arama zinciri kurulur. |
| **Tehdit (T)** | Yüksek hacimde maliyet patlaması. Tavily'nin API değişiklikleri. |

**Entegrasyon Detayları:**

| Değişken | Değer |
|---|---|
| **Zorluk** | 🟢 Kolay |
| **Tahmini Süre** | 1 gün |
| **Maliyet** | 1.000 istek/ay ücretsiz; $25/1.000 istek (paid) |
| **npm Paketi** | `tavily` veya düz `fetch` |
| **AgentsHUB Dosyası** | `app/Marketplace/skills/tavily_search.js` |

**Mimari Not:**
```js
// Parametre şeması:
{ query: string, search_depth: "basic"|"advanced", max_results: number }
// Dönen:
{ results: [{title, url, content, score}], answer: string }
```
Araştırma fallback zinciri: `tavily → brave → duckduckgo`

---

### 2. `google` — **Google Workspace (Gmail + Drive + Calendar)**
**Ne Yapar:** Gmail okuma/yazma, Google Drive dosya işlemleri, Google Calendar etkinlik yönetimi; OAuth 2.0 üzerinden.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Türkiye ve dünyada en yaygın kurumsal araç seti. "Sekreter Ajanı" e-posta okur, randevu oluşturur, dosya bulur. Sıfır kodlama ile KOBİ iş akışının tamamı otomatize edilir. |
| **Zayıflık (W)** | OAuth 2.0 kurulumu çok adımlı: Google Cloud Console → Credentials → Consent Screen → scope izinleri. Her servis (Gmail, Drive, Calendar) ayrı scope. Refresh token yönetimi gerekli. |
| **Fırsat (O)** | "Sekreter Ajanı" senaryosu: Müşteri e-posta atar → ajan okur → Drive'daki teklif şablonunu doldurur → Calendar'a toplantı ekler → yanıt yazar. Tamamen otonom. |
| **Tehdit (T)** | Google API rate limit. OAuth refresh token süresi. |

**Entegrasyon Detayları:**

| Değişken | Değer |
|---|---|
| **Zorluk** | 🟡 Orta |
| **Tahmini Süre** | 1 hafta |
| **Maliyet** | Gmail API: 1B istek/gün ücretsiz; Drive: 1TB storage $2.99/ay |
| **npm Paketi** | `googleapis` |
| **AgentsHUB Dosyası** | `app/Marketplace/skills/google_workspace.js` |

**Mimari Not:**
```js
// Parametre şeması:
{ service: "gmail"|"drive"|"calendar", action: "read"|"send"|"create"|"list", params: {...} }
// Token per-agent: Agents/{agentId}/.env içine GOOGLE_REFRESH_TOKEN yazılır.
// Token otomatik fresh: googleapis içindeki OAuth2Client.refreshAccessToken()
```

---

### 3. `memory-core` — **Gelişmiş Bellek Yönetimi (Arama + Yakalama)**
**Ne Yapar:** OpenClaw'ın core bellek arama ve otomatik kaydetme motoru; konuşmada geçen önemli bilgileri otomatik tespit edip saklar.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Ajan konuşmada "müşterinin ismi Ahmet, vergi numarası X" gibi kritik bilgileri **otomatik** belleğe yazar; sonraki konuşmada hatırlar. AgentsHUB'ın UMI L1 JSON hafızasına ek otonom tespit katmanı. |
| **Zayıflık (W)** | Yanlış pozitif otomatik kayıt (önemsiz bilgileri de saklayabilir, hafızayı kirletir). |
| **Fırsat (O)** | Kaizen Engine + memory-core kombinasyonu: ajan her konuşmadan hem kural öğrenir hem bilgi biriktirir. |
| **Tehdit (T)** | Hafıza şişmesi; periyodik temizlik mekanizması şart. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟡 Orta | 3–5 gün | Sıfır | — | `app/src/memory/auto_capture.js` |

---

## 🟠 YÜKSEK ÖNCELİK

---

### 4. `memory-lancedb` — **LanceDB Vektör Belleği (L2 Yükseltmesi)**
**Ne Yapar:** SQLite yerine LanceDB vektör veritabanı; embedding tabanlı semantik hafıza arama.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | AgentsHUB'ın mevcut SQLite L2 belleğini 100x hızlandırır. "Geçen ay müşteriyle konuştuğumuzda ne dedik?" sorusunu anlam bazlı (embedding) yakınlık araması ile yanıtlar. |
| **Zayıflık (W)** | `lancedb` npm paketi Rust binary içeriyor — Windows'ta kurulum bazen sorunlu. |
| **Fırsat (O)** | UMI'nin L2 katmanı LanceDB'ye geçince küçük kurumsal knowledge base tutulabilir; ajan şirketin kendi verilerinden öğrenir. |
| **Tehdit (T)** | Binary bağımlılık; platform bazlı kurulum sorunları. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟡 Orta | 3–5 gün | Sıfır | `vectordb` (LanceDB JS) | `app/src/memory/umi.js` güncelleme |

---

### 5. `openai-whisper-api` — **Ses → Metin (Bulut Tabanlı)**
**Ne Yapar:** OpenAI Whisper API ile ses dosyasını veya mikrofon kaydını metne çevirir; Türkçe dahil 99 dil desteği.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | 10 satır kodla ses tanıma. Telegram sesli mesaj → Whisper → metin → ajan yanıtlar. Saha çalışanı eldiven ile yazamaz, konuşur. |
| **Zayıflık (W)** | API ücreti $0.006/dakika. Ses verisi OpenAI'e gider (gizlilik). |
| **Fırsat (O)** | Telegram kanalıyla birleşince: saha personeli sesli mesaj → ajan anlar ve yanıtlar. WhatsApp ses notu → Whisper → CRM'e log. |
| **Tehdit (T)** | Gizli bilgi içeren ses gönderilirse OpenAI'e iletilmiş olur. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1–2 gün | $0.006/dakika | `openai` | `Marketplace/skills/whisper_transcriber.js` |

---

### 6. `brave` + `duckduckgo` — **Ücretsiz Arama Yedekleri**
**Ne Yapar:** Brave Search API (gizlilik odaklı, ücretli) ve DuckDuckGo (ücretsiz, API-key gerektirmez) ile web araması.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Tavily kotası dolduğunda veya ücret sorunu olduğunda sıfır kesinti. DuckDuckGo: tamamen ücretsiz. |
| **Zayıflık (W)** | Sonuç kalitesi Tavily'den düşük. DuckDuckGo HTML parse gerektirebilir. |
| **Fırsat (O)** | 3 katmanlı arama zinciri: Tavily (en iyi) → Brave ($3/1000) → DuckDuckGo (ücretsiz). Sistem hiçbir zaman "arama yapamıyorum" demez. |
| **Tehdit (T)** | DuckDuckGo bot engeli (user-agent rotasyonu gerekebilir). |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün her biri | Brave: $3/1K; DDG: Sıfır | `node-fetch` | `brave_search.js`, `duckduckgo_search.js` |

---

### 7. `firecrawl` — **Web Scraping (JS-Render Destekli)**
**Ne Yapar:** Firecrawl API ile JavaScript render eden siteleri de tarar; çıktıyı Markdown'a çevirir.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Rakip web sitesini, fiyat listesini, haber sayfasını tüm JS render edilmiş haliyle Markdown'a çeker. LLM'e ideal form. |
| **Zayıflık (W)** | 500 kredi/ay ücretsiz; Pro $16/ay. |
| **Fırsat (O)** | "Piyasa Araştırma Ajanı": rakip sitesini her gün tarar, fiyat değişikliklerini rapor eder. |
| **Tehdit (T)** | Maliyet birikimi. Bazı siteler scraping engeller. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | 500 kredi/ay ücretsiz | `node-fetch` | `web_scraper.js` güncelleme |

---

### 8. `exa` — **Semantik Araştırma Motoru**
**Ne Yapar:** Exa.ai; anlam tabanlı (embedding-first) web araması. "Bu konudaki son akademik çalışmalar" gibi nüanslı sorgulara kaliteli yanıt.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Google'dan farklı: keyword değil anlam bazlı. Araştırma ve analiz ajanı için birincil motor. |
| **Zayıflık (W)** | $25/1000 istek — pahalı. |
| **Fırsat (O)** | Pazar analizi, yatırımcı araştırması, teknik dokümantasyon taraması — tamamen otonom. |
| **Tehdit (T)** | Yüksek hacimde maliyet. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1–2 gün | $25/1.000 | `exa-js` | `exa_search.js` |

---

### 9. `browser` — **Headless Web Otomasyonu (Playwright)**
**Ne Yapar:** Headless Chromium ile web sayfasını açar, tıklar, form doldurur, metin çıkarır, ekran görüntüsü alır.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Firecrawl'ın yetersiz kaldığı CAPTCHA+login gerektiren siteleri açar. E-ticaret portal login, banka ekstresi çekme, kamu portal form doldurma. |
| **Zayıflık (W)** | Playwright: 150MB+ indirme. Her session büyük bellek. Bot korumaları (Cloudflare) aşılmayabilir. |
| **Fırsat (O)** | "Web Otomasyon Ajanı": KOBİ patronu her ay aynı forma girer. Ajan bu formu doldurup onay bekler. |
| **Tehdit (T)** | Bellek sızıntısı. Cloudflare bot koruması. Session'lar kapatılmazsa sunucu çöker. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🔴 Zor | 1 hafta | Sıfır (sunucu RAM maliyeti) | `playwright` | `browser_agent.js` |

---

### 10. `github` — **GitHub Yönetimi (CTO Ajanı)**
**Ne Yapar:** GitHub repo, PR, issue, CI/CD run yönetimi; Octokit REST API ile.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | "CTO Ajanı" sprint başında açık PR'ları listeler, CI hataları okur, yorum yazar. Haftalık geliştirici raporu otonom üretilir. |
| **Zayıflık (W)** | GitHub Personal Access Token veya App kurulumu. |
| **Fırsat (O)** | PR merge → webhook → ajan deploy başlatır. Tamamen otonom CI/CD akışı. |
| **Tehdit (T)** | Yanlış `git push --force` → kod tabanı zarar görür. Exec approval şart. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟡 Orta | 3–5 gün | Sıfır (Public API) | `@octokit/rest` | `github_manager.js` |

---

### 11. `himalaya` — **E-posta Yönetimi (SMTP/IMAP)**
**Ne Yapar:** SMTP ile e-posta gönderme, IMAP ile gelen kutusu okuma; müşteri iletişimi otomasyonu.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Müşteri e-postasını ajan okur, kategorilendirir, yanıt taslağı oluşturur, onay bekler. Sıfır e-posta yönetim yükü. |
| **Zayıflık (W)** | SMTP/IMAP kimlik bilgileri güvenli saklanmalı. Yanlış e-posta gönderimi kurumsal itibar riski. |
| **Fırsat (O)** | "Müşteri Hizmetleri Ajanı": Sabah gelen 50 e-postayı okur, önem sırasına koyar, standart soruları yanıtlar, karmaşıkları Mimara iletir. |
| **Tehdit (T)** | Halüsinasyon → yanlış e-posta → ciddi kurumsal zarar. Onay mekanizması (Exec Approval) zorunlu. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟡 Orta | 4–6 gün | Sıfır (protokol) | `nodemailer` + `imapflow` | `email_manager.js` |

---

### 12. `nano-pdf` — **PDF Metin Çıkarma**
**Ne Yapar:** PDF dosyasından metin çıkarır; fatura, sözleşme, teknik şartname okuma.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | KOBİ'nin günlük iş akışında PDF her yerde — fatura, teklif, şartname. Ajan PDF okuyabilirse doküman işi otonom. |
| **Zayıflık (W)** | Görüntü tabanlı (taranmış) PDF'ler çözülemez; OCR gerekir. |
| **Fırsat (O)** | "Doküman Analisti Ajanı": müşteri sözleşmesi gönderir → ajan okur → önemli maddeleri özetler → imza tarihi kaydeder. |
| **Tehdit (T)** | Şifreli PDF'ler açılamaz. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | Sıfır | `pdf-parse` veya `pdfjs-dist` | `pdf_extractor.js` |

---

### 13. `video-frames` — **Video Kare Analizi (Sanayi)**
**Ne Yapar:** FFMPEG ile video dosyasından belirli aralıklarla kare koparır; Gemini Vision'a görseli iletir.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Fabrika güvenlik kamerası görüntüsünü ajan analiz eder: "Bandda hata var, satır durdu." Sanayi KOBİ'si için altın değer. |
| **Zayıflık (W)** | FFMPEG kurulumu. Yüksek frame sayısında token maliyet patlaması. |
| **Fırsat (O)** | Mimar'ın "saha mühendisi" avantajı burada devreye girer. Rakipler bu kadar derine inemez. |
| **Tehdit (T)** | Token bütçesi: max 10 kare/analiz sınırı konulmalı. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟡 Orta | 3–5 gün | Sıfır + token maliyeti | `fluent-ffmpeg` | `video_analyzer.js` |

---

### 14. `healthcheck` — **Sistem İzleme & Uyarı**
**Ne Yapar:** URL'lerin HTTP durumunu periyodik kontrol eder; downtime tespitinde Telegram + e-posta uyarı üretir.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Ajan kendi bağımlı olduğu servisleri izler. Cron Manager ile entegre: her 5 dakikada otomatik ping. |
| **Zayıflık (W)** | Yanlış pozitif alarmlar; geçici ağ sorunları. |
| **Fırsat (O)** | Müşterinin web sitesi downtime → ajan alarm verir → müşteri 5 dakika içinde bilgilendirilir. |
| **Tehdit (T)** | Alarm yorgunluğu (alert fatigue) eğer eşik iyi ayarlanmazsa. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | Sıfır | `node-fetch` | `health_checker.js` |

---

### 15. `skill-creator` — **Meta-Skill: Ajan Kendi Yeteneğini Üretir**
**Ne Yapar:** LLM'in yeni `.js` function calling skill dosyası oluşturmasını sağlayan sistem; ajan kendi kapasitesini genişletir.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | HOT-SWITCH'in evrimi. Ajan "bu görevi yapacak skill yok" deyip durmuyor; kendisi yazar. Kaizen Engine ile birleşince tam oto-evrim döngüsü. |
| **Zayıflık (W)** | LLM'in ürettiği kod doğrudan `eval` edilemez — güvenlik açığı. Sandbox katmanı zorunlu. |
| **Fırsat (O)** | AgentsHUB Marketplace'in otomatik zenginleşmesi; ajan bir görevi çözmek için kendi skill'ini üretir ve Marketplace'e kaydeder. |
| **Tehdit (T)** | Kötü niyetli veya hatalı üretilen kod. Sandbox dışına çıkış girişimi. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🔴 Zor | 1–2 hafta | Sıfır | — | `genesis.js` güncelleme + `sandbox_runner.js` |

---

### 16. `mcporter` — **MCP Bridge (Model Context Protocol)**
**Ne Yapar:** Anthropic öncülüğündeki Model Context Protocol (MCP) sunuculara bağlanır; MCP toollarını AgentsHUB skill'i olarak kullanır.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Tek bağlantıyla MCP ekosistemindeki yüzlerce tool AgentsHUB'a açılır: dosya sistemi, veritabanı, custom servisler. |
| **Zayıflık (W)** | MCP protokolü hâlâ gelişiyor; breaking change riski. |
| **Fırsat (O)** | AgentsHUB'ın gerçek anlamda açık ekosistem bağlantısı. 3. taraf geliştiriciler MCP server yazınca AgentsHUB otomatik yeteneklenir. |
| **Tehdit (T)** | Protokol değişiklikleri. Güvenilmez MCP sunucularına bağlanma riski. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🔴 Zor | 1–2 hafta | Sıfır | `@modelcontextprotocol/sdk` | `mcp_bridge.js` |

---

## 🟡 ORTA ÖNCELİK

---

### 17. `notion` | 18. `trello` | 19. `obsidian` — **Proje & Bilgi Yönetimi**

| Modül | Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|---|
| `notion` | Proje DB okuma/yazma; KOBİ'nin %40'ı Notion kullanıyor | 🟢 | 2–3 gün | Ücretsiz tier | `notion_manager.js` |
| `trello` | Kanban takip; görev → alan → teslim otomasyonu | 🟢 | 1–2 gün | Ücretsiz | `trello_manager.js` |
| `obsidian` | Yerel Markdown vault; ajan bilgiyi Obsidian'a yazar | 🟢 | 1–2 gün | Sıfır | `obsidian_memory.js` |

---

### 20. `elevenlabs` — **Yüksek Kalite TTS**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| En kaliteli AI ses sentezi; sesli bildirim, randevu hatırlatma | 🟢 | 2 gün | $5–330/ay | `tts_engine.js` |

---

### 21. `fal` — **Görüntü Üretimi**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| Ürün görseli, pazarlama materyali otonom üretimi | 🟢 | 1–2 gün | $0.003–0.05/görsel | `image_generator.js` |

---

### 22. `perplexity` — **Gerçek Zamanlı + Kaynaklı Arama**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| Güncel haberi kaynaklı + özet verir | 🟢 | 1–2 gün | $5/1.000 | `perplexity_search.js` |

---

### 23. `blogwatcher` — **RSS/Atom Besleme Okuyucu**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| Sektör haberleri otonom izleme; Kaizen Engine için veri | 🟢 | 1–2 gün | Sıfır | `rss_reader.js` |

---

### 24. `node-connect` — **SSH Uzak Sunucu Erişimi**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| DevOps ajanı deploy yapar, log okur | 🔴 (Güvenlik) | 1 hafta | Sıfır | `ssh_manager.js` |

---

### 25. `goplaces` — **Google Maps/Places**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| Lojistik rota, servis alanı analizi | 🟢 | 1–2 gün | $0–200/ay | `maps_search.js` |

---

### 26. `oracle` — **Oracle DB Bağlantısı**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| Büyük kurumsal ERP veritabanından rapor çekme | 🔴 | 1 hafta | Oracle lisansı | `db_query.js` |

---

### 27. `deepgram` — **Gerçek Zamanlı STT**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| Whisper'dan hızlı streaming ses tanıma; Türkçe destekli | 🟢 | 2 gün | $0.0043/dakika | `deepgram_transcriber.js` |

---

### 28. `ordercli` / `erp-connector` — **ERP Sipariş Yönetimi**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| Idurar ERP ile birleşince tam otonom KOBİ OS | 🟡 | 3–4 gün | Sıfır | `erp_connector.js` |

---

### 29. `voice-call` — **Sesli Arama (Twilio)**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| Randevu hatırlatma, sipariş onayı sesli arama | 🔴 | 2 hafta | $1/ay + dakika ücreti | `voice_call.js` |

---

### 30. `acpx` — **Multi-Agent İletişim Protokolü**
| Güç | Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|---|
| Ajanlar birbirine sinyal iletir; orkestra şefi ajanı | 🔴 | 2–3 hafta | Sıfır | `ui_server.js` güncelleme |
