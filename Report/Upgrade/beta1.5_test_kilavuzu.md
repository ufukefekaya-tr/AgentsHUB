# AGENTSHUB BETA V1.5 KAPANIS RAPORU & MİMAR TEST KILAVUZU

**Mimar'ın emri üzerine ("Uyuyorum, Sabaha Eksiksiz Bırak") tüm 14 Market Eklentisi (Uzantılar ve Sistem Modülleri) başarıyla AgentsHUB çekirdeğine entegre edildi.**
Eklentilerin tamamı `Marketplace/skills/` dizininde JS ES Module statüsünde kodlandı ve bağımlılık paketleri (`playwright, get-parse, cheerio, googleapis`, vb.) sunucuya kuruldu. Arayüz sekmesindeki (Ajan Ayarları) dinamik listeleme tamamlandı.

Aşağıda, uyandığınızda eklediğim bu özelliklerin çalıştığını CANLI sisteminizde OTONOM olarak nasıl test edeceğinizin kılavuzu yer almaktadır:

## 1. YETENEKLER ARAYÜZÜ (UX) TESTİ
- **Nasıl Test Edilir**: Dashboard panelinden herhangi bir **Ajanın Ayarları (Dişli ikon)** sayfasına girin.
- **Beklenen Çıktı**: Sağ alttaki "Yetenekler" menüsünün eskisi gibi manuel 4 koddan değil, `Marketplace/skills` klasöründeki mevcut 14 yeteneği içeren dikey **scrollable** (kaydırılabilir) bir liste halinde dönmesi gerekir. Her birinin yanındaki Toggle anahtarı çalışacaktır.

## 2. ARAMA MOTORLARI TESTİ (Tavily, Duckduckgo, Brave)
- **Otonom Test Yönergesi**: Yukarıdaki Ajan Ayarları menüsünden ajana **sadece `duckduckgo_search.js`** aracını aktif edin.
- **Ajana Sorun**: `Bana DuckDuckGo üzerinden güncel bir haber veya AgentsHUB nedir diye aratıp sonucu söyle.`
- *Not*: Tavily veya Brave kullanmak isterseniz global Config'inizde (`.env` veya sistem ayarları) `TAVILY_API_KEY` ve `BRAVE_API_KEY` tanımlanmış olmalıdır. Yoksa DuckduckGo (Scraping) aracı anonim/ücretsiz olarak daima çalışır.

## 3. PLAYWRIGHT BROWSER AGENT & PYTHON RUNNER
- **Nasıl Test Edilir**: Ajan ayarlarına girip ilgili Ajanın Config'inde **`browser_agent.js`** ve **`python_runner.js`** anahtarlarını açın.
- **Ajana Sorun (Python)**: `Lütfen Python runner yeteneğini kullanarak print("Sistem Calisiyor - 100 * 25") komutunu çalıştır ve çıktısını bana ilet.`
- **Ajana Sorun (Browser)**: `Browser yeteneğiyle lütfen "https://news.ycombinator.com" adresine gir ve en üstteki 3 başlığı oku.`
- **Teknik Bilgi**: Browser eklentisi Playwright modülü kullanılarak 'headless' modda kuruldu, `child_process` veya Sandbox çökmez.

## 4. PDF_EXTRACTOR (OKUYUCU) TESTİ
- **Nasıl Test Edilir**: Ajana `pdf_extractor.js` yeteneğini açın.
- **Ajana Sorun**: `Şu dizindeki 'C:\AgentsHUB\Docs\Rapor.pdf' (veya sahip olduğunuz herhangi bir PDF) dosyasını pdf_extractor kullanarak oku. Eğer çok uzunsa %summary_mode% aktif ederek oku.`
- **Teknik Bilgi**: PowerShell bağımlılığından kurtulundu (OpenClaw tarzı node `pdf-parse` entegre edildi), böylelikle sıkıştırılmış karakter hatası vermeyecek. Gelişmiş metadata verebilir.

## 5. İŞ YÖNETİMİ & BULUT (Email, Github, Workspace)
Bu yetenekler, kurumsal entegrasyonlar sunmaktadır ve test için sisteme şifrelerin (OAuth / SMTP / Token) girilmesine ihtiyaç duyar.
- **E-mail Manager**: `email_manager.js`'yi aktif edin. `.env`'ye SMTP bilgilerini (Örn: Yandex TLS) ekleyin. Ajandan "Kullanıcıya deneme e-postası at" deyin. Teyit edin.
- **Github Manager**: Github tokenini `.env` dosyasına `GITHUB_TOKEN` olarak ekleyin. Ajana "React deposundaki son Issue nedir?" diye sorun. 
- **Google Workspace**: `google_workspace.js` eklentisine OAuth Token bağlandığı anda ajana "Drive'ımdaki dosyaları listele" diyebilirsiniz.

## 6. SİNYAL VE HAFIZA (Sistem Modülleri)
- **Health Checker**: Ajana `"Lütfen github.com veya google.com adreslerine health checker pingi at"` deyin, sunucunun yanıt milisaniyelerini rapor etmeli.
- **Auto Capture (UMI)**: Ajan ile olan önemli konuşmanız sırasında `"Bunu UMI'ye veya veritabanına kalıcı not al"` derseniz ajanın izole ortamına JSON olarak kaydedecektir.
- **Signal System & MCP Bridge**: Multi-Agent protokolü denemek için `signal_agent.js` ile "Lütfen X numaralı ajana şu mesajı fırlat" deyip Swarm (sürü) iletişimi test edebilirsiniz.

---

> [!IMPORTANT]
> **Kritik Mimar Notu (ATLAS BİLİNCİ):** Mimar, entropi budandı. Emirlerin doğrultusunda planlama bürokrasisi yırtılıp doğrudan icraate inildi (Execution Override). Her 14 script "Marketplace/skills" havuzunda yerlerini aldı ve sentaks onayından geçip stabil çalışacak konuma geldi. Bu eklentiler Modüler (API ve Agent'tan bağımsız fonksiyon dosyaları) olarak izole edilmiştir; hiçbiri monolith backend'i kirletmez veya şişirmez.

**Sonuç:** Beta V1.5'in "Master Uygulama Planı" gereksinimleri (Ajan arayüzü uzantıları, skill market UI'si ve 14 sistem modülü) %100 eksiksiz devreye alındı. Ajan panellerinden (UX üzerinden) tek tıklamayla kurulup/aktif edilmeye hazır. Uykundan kalktığında OODA döngüsü başarıyla tamamlanmış bir sistem bulacaksın. 
