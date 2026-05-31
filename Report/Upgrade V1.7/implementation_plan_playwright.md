# Playwright Omni-Engine İzolasyon ve Ortogonal Entegrasyon Planı

Bu rapor, ATLAS'ın (Benim) AgentsHUB sistemine tam otonom ve **"Token/Maliyet Tasarrufu"** odaklı bir Playwright yeteneğini entegre etmesinin mimari vizyonunu ve risk haritasını içermektedir.

## 1. Hız ve Uygulama Süresi (Yapay Zeka OODA Otobanı)

Bunu bir insanın (senior developer) araştırması, paketleri kurması, asenkron testleri yazması ve DOM parsing hatalarıyla boğuşması ortalama **1.5 ila 3 gün** sürer. Benim işlemci hızımda ise mutlak süre:

*   **Kodun Yazılması ve Sisteme Enjeksiyonu:** ~15 ila 35 saniye.
*   **Bağımlılıkların Kurulması (NPM / Playwright Binaries):** ~1.5 dakika (Ağın indirme hızına bağlı).
*   **Canlı Test / QA Döngüsü:** ~45 saniye.
*   **TOPLAM SÜRE:** Kodla komutunu verdiğin andan itibaren maksimum **3 Dakika**.

## 2. Planlanan Mimari Değişiklikler ve Görevler

Belirttiğin 3 kritik kurala sadık kalarak `omni_browser.js` adında yeni bir skill yazılacak. 

### Faz 1: Altyapı ve Kurulum
- Node ortamına `playwright`, `turndown` ve `jsdom` kütüphanelerinin enjekte edilmesi.
- Playwright'ın çalıştığı Chromium (headless) tarayıcısına özgü Otonom Binary Kurulum Mantığının eklenmesi.

### Faz 2: Skill Kodlaması (The 3 Pillars of E2E Web)
Bağımsız yetenek dosyası 3 eksenli çalışacak:
1.  **Semantik Filtre (Readability / Markdown Mode):** Ajan sayfaya bağlanınca, gereksiz DOM ağaçları (Header, Nav, reklamlar) Readability ile silinecek. Kalan saf veri (Article) Markdown'a (text) çevrilerek içeri alınacak. Token maliyeti 150K'dan mermi gibi 2K'ya çekilecek.
2.  **Ağ Seviyesinde İzolasyon (Kaynak Yamyamlığı Tıkacı):** Koda `page.route` mekanizması zerk edilecek. Amaç eğer 'Metin/Markdown' modunda ise *Resim, Font, Medya ve CSS* isteklerini ağ katmanında bloklayıp (`route.abort()`) sadece Document ve XHR çekmek; CPU, RAM ve Bant Genişliği israfını engellemek.
3.  **Vision Destekli Çöküş Modu (Screenshot Fallback):** Eğer DOM yapısı Markdown'a dönüşemeyecek kadar şifreli veya karmaşıksa ajan "Vision" moduna geçecek. Headless render alıp sayfanın tam PDF/Screenshot'ını çekecek ve metin dökmek yerine o muazzam 258 tokenlik Gemini Vision'a fotoğraf okutacak.

### Faz 3: Güvenlik Sınırı (Sandbox Koruması)
- Arıza anında bellekte askıda (leak) kalan zombi tarayıcı oluşmaması için Destructor (Apoptoz) kod satırları `finally` bloklarıyla sigortalanacak.

## 3. Riskler, Zorluklar ve Anti-Kırılganlıklar

> [!WARNING]  
> Zombi Süreçler (Zombie Chromium Processes)
> **Zorluk:** Eğer kod arıza yaşarsa (Network timeout vb.), arkada milyonlarca memory leak (açık process) kalır.
> **Çözüm:** Kesintisiz bir `browser.close()` zinciri ve Sandbox `45 sn` TimeOut uyumu koda dahil edilecek.

> [!CAUTION]  
> İndirme Kesintileri (I/O Bottleneck)
> **Zorluk:** `playwright` paketini kurunca tarayıcı `exe`'lerini (~200MB) ayrıca kurmak gerekir (`npx playwright install`). Eğer sunucuda (Windows) ilk seferde kurulmazsa skill çöker.
> **Çözüm:** Ajan yeteneği çalıştırıldığında otonom olarak `child_process` ile indirme doğrulamasını yapacak, eksikse kendi indirecek.

> [!TIP]  
> Cloudflare / Anti-Bot Sistemleri
> **Zorluk:** Saf Chromium bazen WAF/Firewall'lara "Ben botum" diye bağırır ve siteler engeller.
> **Çözüm:** Şimdilik sadece yalın sürümü basıp verimini ölçeceğiz. Engel yediğimiz siteler olursa bir sonraki versiyonda `playwright-extra` ve `stealth` eklentileriyle kamuflaj açacağız.

## 4. Avantajlar (Sahadaki Nakdi Değeri)
- Normal scraper (axios/cheerio) ile erişilemeyen React, Vue ve JS tabanlı modern Web3 ve E-Ticaret SPA'lerini rahatça deşifre eder.
- Karmaşık aramasını ve "butona tıkla 3 saniye bekle listeyi çek" işini sadece metin tokenı verimliliğiyle yapar.
- Şirketin yapacağı amele veri girişleri/çıkışları sıfırlanır, LLM API harcamaları minimal faturada kalır.

---

**[ONAY BEKLENİYOR]**
Mimar, felsefede ve zaman diliminde anlaştıysak onayı ver, ilk satırı dizmeye başlayayım.
