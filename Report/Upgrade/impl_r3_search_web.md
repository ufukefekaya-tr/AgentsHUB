# AGENTsHUB İMPLEMENTASYON PLANI — R3
## ARAMA & WEB ZEKASI
### Tavily · Brave · DuckDuckGo · Exa · Firecrawl · Browser (Playwright) · Perplexity

> **Felsefe:** Her arama motoru izole Worker Thread'de çalışan bir `.js` skill dosyasıdır. Arama sonuçları normalize edilmiş formatta döner: `{results: [{title, url, content, score}]}`. Ajan hangi motoru kullanacağını bilmez — sadece `web_search({query})` çağırır; router hangi servisin aktif olduğuna bakarak yönlendirir.

---

## MİMARİ TEMEL: ARAMA ROUTER SİSTEMİ

### Hedef Yapı
```
Marketplace/skills/
  ├── search/
  │   ├── search_router.js       🆕 Ana router (hangi motoru kullan?)
  │   ├── tavily_search.js       🆕 Kritik
  │   ├── brave_search.js        🆕 Yüksek
  │   ├── duckduckgo_search.js   🆕 Yüksek
  │   ├── exa_search.js          🆕 Yüksek
  │   ├── firecrawl_scraper.js   🆕 Yüksek
  │   ├── perplexity_search.js   🆕 Orta
  │   └── browser_agent.js       🆕 Yüksek (Playwright)
```

### `search_router.js` Mantığı
```js
// Ajanın tek bir "web_search" tool'u var — router arkada doğru servise yönlendirir
async function routeSearch(query, agentConfig) {
    const providers = agentConfig.search_providers || ['tavily', 'brave', 'duckduckgo'];
    for (const provider of providers) {
        try {
            const result = await searchWith(provider, query);
            if (result.results.length > 0) return result;
        } catch (e) {
            logger.warn(`${provider} başarısız, sonraki deneniyor: ${e.message}`);
        }
    }
    throw new Error('Tüm arama motorları başarısız oldu');
}
```

---

## 1. `tavily_search.js` — KRİTİK

### Ne Yapacak
Tavily Search API — LLM için optimize edilmiş, Markdown formatında sonuçlar dönen araştırma motoru.

### Implementasyon Adımları
```
Adım 1: Tavily API key → Agents/{agentId}/.env → TAVILY_API_KEY
Adım 2: tavily_search.js yaz (Worker Thread skill formatında)
Adım 3: Tool şeması tanımla:
   { query: string, search_depth: "basic"|"advanced", max_results: number, include_domains: [] }
Adım 4: fetch ile Tavily REST API: POST https://api.tavily.com/search
Adım 5: Yanıt normalize: { results: [{title, url, content, score}], answer: string }
Adım 6: Token limiti: content alanlarını 500 karakter ile kırp (LLM prompt şişmesin)
Adım 7: Loader.js'e kayıt: skill loader bu skill'i otomatik yüklesin
```

### Kritik Teknik Detay: Content Truncation
```js
// Tavily bazen 2000+ karakter içerik döner — LLM context'i şişirir
const MAX_CONTENT_PER_RESULT = 500;
const normalized = results.map(r => ({
    title: r.title,
    url: r.url,
    content: r.content?.slice(0, MAX_CONTENT_PER_RESULT) || '',
    score: r.score
}));
```

### Gerçekçi Zorluklar
- **Rate limiti:** Ücretsiz tier 1.000 istek/ay — aktif kullanımda 1–2 haftada dolar.
- **Advanced search modu:** `search_depth: "advanced"` arama başına 2 kredi tüketir; ajan bunu gereksiz kullanabilir.
- **`include_domains` alanı:** Ajan yanlış domain listeyle çağırırsa sonuç dönmez — varsayılan boş bırakılmalı.

### Sistem Tehdidi
Ücretsiz kota dolunca ajan arama yapamaz → sisteme fallback mekanizması şart (brave → duckduckgo).

### Gerçekçi AI Implementasyon Süresi: **2–3 saat**

---

## 2. `brave_search.js` + `duckduckgo_search.js` — YÜKSEK

### Ne Yapacak
Tavily kotası dolduğunda devreye giren yedek motorlar. Brave: kaliteli ücretli API. DuckDuckGo: tamamen ücretsiz.

### Brave Search Implementasyon
```
Adım 1: Brave Search API key → .env → BRAVE_SEARCH_API_KEY
Adım 2: fetch ile GET https://api.search.brave.com/res/v1/web/search
         Headers: { "X-Subscription-Token": BRAVE_KEY }
Adım 3: Yanıt → normalize et (Tavily ile aynı format)
```

### DuckDuckGo Implementasyon
```
Adım 1: api.duckduckgo.com/?q={query}&format=json&no_redirect=1
         API key GEREKMEZ
Adım 2: Yanıt HTML parse gerekebilir (structured JSON her zaman gelmez)
         Alternatif: 'duck-duck-scrape' npm paketi
Adım 3: User-agent rotation: bot tespitini engellemek için
```

### Gerçekçi Zorluklar — DuckDuckGo
- **HTML scraping istikrarsızlığı:** DuckDuckGo sayfa yapısını değiştirebilir → parser kırılır.
- **Bot engeli:** Çok hızlı istek → IP engeli → user-agent + gecikme stratejisi.
- **JSON endpoint sınırlı:** `format=json` her zaman web sonucu vermez — instant answer odaklıdır.

```
En güvenilir DDG çözümü: duck-duck-scrape paketi
npm install duck-duck-scrape
const { search } = require('duck-duck-scrape');
const results = await search(query, { safeSearch: SafeSearchType.OFF });
```

### Gerçekçi AI Implementasyon Süresi
- Brave: **2 saat**
- DuckDuckGo: **3–4 saat** (bot engeli ve parsing düzensizliği nedeniyle)

---

## 3. `exa_search.js` — YÜKSEK

### Ne Yapacak
Exa.ai semantik (embedding-first) web araması. "Bu konudaki derinlemesine analizler" gibi nüanslı araştırma sorgularında Google'dan üstün.

### Implementasyon Adımları
```
Adım 1: npm install exa-js
Adım 2: exa_search.js → Worker Thread skill
Adım 3: Tool şeması: { query, type: "neural"|"keyword", use_autoprompt: bool, num_results }
Adım 4: Exa SDK: const exa = new Exa(API_KEY); const result = await exa.search(query, opts);
Adım 5: Highlight alanı: sayfa içindeki alakalı paragrafları çek (exa.searchAndContents)
Adım 6: Token optimize: highlights kullan, tam sayfa içerik değil
```

### Kritik Fark: Exa `searchAndContents`
```js
// Normal search: sadece başlık + URL (LLM için yetersiz)
// searchAndContents: URL'yi de fetch eder, önemli paragrafları highlights olarak döner
const result = await exa.searchAndContents(query, {
    highlights: { numSentences: 3, highlightsPerUrl: 2 }
});
// Bu hem kaliteli hem token-ekonomik
```

### Gerçekçi AI Implementasyon Süresi: **3–4 saat**

---

## 4. `firecrawl_scraper.js` — YÜKSEK

### Ne Yapacak
Firecrawl API ile JavaScript render eden siteleri Markdown'a çevirir. Mevcut `web_scraper.js`'e ek backend olarak eklenir.

### Implementasyon Adımları
```
Adım 1: npm install @mendable/firecrawl-js
Adım 2: web_scraper.js güncellemesi: backend seçimi ekle
   { url, backend: "firecrawl"|"fetch", mode: "scrape"|"crawl" }
Adım 3: Firecrawl scrape: const app = new FirecrawlApp({apiKey}); const result = await app.scrapeUrl(url);
Adım 4: Yanıt: result.markdown → LLM'e gönder
Adım 5: Crawl modu: tüm site için, kredi limiti kontrolü yap önce
Adım 6: Fallback: Firecrawl başarısız → basit fetch + cheerio parse
```

### Gerçekçi Zorluklar
- **Kredi tükenmesi:** Crawl modu (tüm site) çok kredi harcar. Ajan "tüm siteyi tara" derse bütçe patlar.
- **Cloudflare koruması:** Firecrawl bazı Cloudflare sitelerini geçemez.

### Gerçekçi AI Implementasyon Süresi: **2–3 saat**

---

## 5. `browser_agent.js` — YÜKSEK (En Karmaşık)

### Ne Yapacak
Playwright Headless Chromium ile tam web otomasyonu: tıklama, form doldurma, ekran görüntüsü, metin çıkarma.

### Implementasyon Adımları
```
Adım 1: npm install playwright
Adım 2: npx playwright install chromium (150MB binary indirir)
Adım 3: browser_agent.js → WORKER THREAD ZORUNLU (bellek izolasyonu)
Adım 4: Tool şeması tanımla:
   { action: "navigate"|"click"|"fill"|"get_text"|"screenshot"|"wait", url, selector, value }
Adım 5: Browser lifecycle yönetimi:
   - Her "task" için yeni browser context (izole)
   - Task biter → context.close() ZORUNLU (bellek sızıntısı engeli)
Adım 6: Timeout: her action maksimum 30 sn → sonra hata fırlat
Adım 7: Screenshot → base64 → Gemini Vision'a gönder (görsel analiz için)
Adım 8: Content Security Policy bypass: bazı scraper önlemleri için user-agent ayarla
```

### Kritik Teknik Detay: Bellek Yönetimi
```js
// Her ajanın browser context'i izole
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    viewport: { width: 1280, height: 720 }
});
try {
    const page = await context.newPage();
    // İşlemler
} finally {
    await context.close(); // HER KOŞULDA kapat
    // browser.close() dikkat: sunucu boyunca tek browser instance
}
```

### Worker Thread İzolasyonu
```
Browser Agent normal skill gibi sandbox_runner.js içinde Worker Thread'de çalışmaz.
Playwright Worker Thread içinde çalışamaz (non-serializable objects).
Çözüm: browser_agent.js ana process'te, ama per-request context izolasyonu ile.
Güvenlik: sandbox altında değil → komut whitelist'i kritik önem taşır.
```

### Gerçekçi Zorluklar

**Zorluk 1: Playwright ESM Uyumu**
AgentsHUB ESM. Playwright'ın bazı iç modülleri CJS. Dynamic import() gerekebilir.

**Zorluk 2: Cloudflare Bot Koruması**
Headless browser Cloudflare'i geçemeyebilir. Çözüm: `playwright-extra` + `puppeteer-extra-plugin-stealth`.

**Zorluk 3: Bellek Sızıntısı**
Context kapatılmazsa sunucu saatlerce sonra çöker. `finally` bloğu zorunlu; ek olarak periyodik "zombie context" temizleyici.

**Zorluk 4: Paralel Kullanım**
İki ajan aynı anda browser kullanırsa bellek 2x yükselir. Concurrency limiti gerekli: max 2 eşzamanlı browser context.

### Sistem Tehdidi
| Tehdit | Açıklama |
|---|---|
| Bellek patlaması | Her context 100–300MB. 5 eşzamanlı → 1.5GB |
| Komut enjeksiyonu | Ajan keyfi `selector` parametresiyle XSS dener → input validation şart |
| Sonsuz döngü | `wait` action yanlış selector'a → 30sn timeout korur |

### Gerçekçi AI Implementasyon Süresi
- Temel browser action: **8–10 saat**
- Bellek yönetimi + timeout: **3–4 saat**
- ESM/CJS sorunları debug: **2–4 saat** (değişken)
- **Toplam: ~14–18 saat**

---

## 6. `perplexity_search.js` — ORTA

### Ne Yapacak
Perplexity API — gerçek zamanlı internet araması + LLM yorumu + kaynak URL. "Bugün piyasada ne oldu?" tarzı.

### Implementasyon Adımları
```
Adım 1: npm install yok — sadece fetch yeterli (Perplexity OpenAI-uyumlu endpoint)
Adım 2: perplexity_search.js → Worker Thread skill
Adım 3: fetch ile POST https://api.perplexity.ai/chat/completions
         model: "sonar" (web arama dahil)
         messages: [{role:"user", content: query}]
Adım 4: Yanıt: choices[0].message.content + citations (kaynak URL listesi)
Adım 5: Normalize: { answer: string, sources: [{url, title}] }
```

### Gerçekçi AI Implementasyon Süresi: **2–3 saat**

---

## ARAMA SİSTEMİ GENEL DEĞERLENDİRMESİ

### Öncelik ve Süre Özeti
| Modül | Süre | Zorluk | Bağımlılık |
|---|---|---|---|
| `tavily_search.js` | 2–3 saat | 🟢 Kolay | Tavily API key |
| `brave_search.js` | 2 saat | 🟢 Kolay | Brave API key |
| `duckduckgo_search.js` | 3–4 saat | 🟡 Orta | `duck-duck-scrape` |
| `exa_search.js` | 3–4 saat | 🟢 Kolay | `exa-js` + key |
| `firecrawl_scraper.js` | 2–3 saat | 🟢 Kolay | `@mendable/firecrawl-js` |
| `perplexity_search.js` | 2–3 saat | 🟢 Kolay | Perplexity API key |
| `browser_agent.js` | 14–18 saat | 🔴 Zor | `playwright` + stealth |
| **TOPLAM** | **~3–4 gün** | | |

### Tavsiye Edilen Geliştirme Sırası
```
1. tavily_search.js (1 gün) → Hemen çalışır, en değerli
2. brave + duckduckgo (1 gün) → Ücretsiz fallback tamamlanır
3. exa + firecrawl + perplexity (1 gün) → Araştırma stack genişler
4. browser_agent.js (2+ gün) → En riskli, en iyi test ortamında
```
