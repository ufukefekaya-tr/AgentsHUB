# AgentsHUB SKILL & EXTENSION ENTEGRASYON RAPORU
## PART 1 / 4 — LLM MODEL PROVIDER EXTENSIONS
### (Önceliğe Göre: Kritik → Yüksek → Orta)

> Bu grup; farklı yapay zeka şirketlerinin modellerine erişim sağlayan TypeScript eklentileri içerir.
> AgentsHUB'ın mevcut TEK sağlayıcısı (`gemini_adapter.js`) bu liste ile çok başlı, resilient bir sisteme dönüşür.
> Tüm bu adaptörler `BaseAdapter` sözleşmesini extend eder; `llm_bridge.js` değişmeden kalır.

---

## 🔴 KRİTİK ÖNCELİK

---

### 1. `openrouter` — **OpenRouter.ai (200+ Model, Tek API)**
**Ne Yapar:** OpenRouter.ai gateway'i üzerinden Gemini, Claude, GPT-4o, Mistral, LLaMA, DeepSeek dahil 200+ modele **tek bir API anahtarıyla** erişim.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Tek `openrouter_adapter.js` ile tüm provider sorunu 1 günde çözülür. Multi-provider stratejisi anında aktif hale gelir. Model seçimi config'de tek satır. |
| **Zayıflık (W)** | OpenRouter outage = tüm fallback zinciri çöker (SPOF). Her modele %5–10 markup ekler. |
| **Fırsat (O)** | Kritik 6 modülün hepsini tek adaptörle kapsar. Uzun vadede native adaptörler yazılırken OpenRouter kısa vadeli köprü görevini görür. |
| **Tehdit (T)** | OpenRouter fiyat artışı veya kapanması durumunda bağımlılık. Native adaptörler mutlaka paralelde geliştirilmeli. |

**Entegrasyon Detayları:**

| Değişken | Değer |
|---|---|
| **Zorluk** | 🟢 Kolay |
| **Tahmini Süre** | 1 gün |
| **Maliyet** | Model ücreti + %5–10 OpenRouter markup |
| **npm Paketi** | `openai` (OpenAI-uyumlu endpoint) |
| **AgentsHUB Dosyası** | `app/src/bridge/adapters/openrouter_adapter.js` |

**Mimari Not:**
```
baseURL: "https://openrouter.ai/api/v1"
Authorization: "Bearer OPENROUTER_KEY"
X-Title: "AgentsHUB"
model: "anthropic/claude-3.5-sonnet" veya "openai/gpt-4o"
```
`llm_bridge.js` içindeki `_resolveProvider()` metoduna `"openrouter"` case'i eklenir. Model adı prefix ile sağlayıcı tespiti yapılır.

---

### 2. `anthropic` — **Anthropic Claude (3.5 Sonnet, Haiku, Opus)**
**Ne Yapar:** Anthropic'in Claude model ailesine direkt API erişimi; enterprise sınıfı dil, analiz ve kodlama.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Kodlama ve karmaşık analiz görevlerinde GPT-4o ile rekabet eder. Büyük context window (200K token). Gemini çöktüğünde birincil fallback. |
| **Zayıflık (W)** | System prompt formatı Gemini'den farklı: ayrı `system` parametresi + Anthropic `tool_use` / `tool_result` blokları. Mevcut prompt şablonlarının güncellenmesi gerekir. |
| **Fırsat (O)** | Hibrit strateji: Rutin görevler → Gemini Flash (ucuz), Derin analiz → Claude Sonnet (kaliteli). Circuit Breaker ile otonom geçiş. |
| **Tehdit (T)** | Token sayım metodolojisi Gemini'den farklı; `telemetry_tracker.js`'in token raporlaması güncellenmeli. |

**Entegrasyon Detayları:**

| Değişken | Değer |
|---|---|
| **Zorluk** | 🟡 Orta |
| **Tahmini Süre** | 3–5 gün |
| **Giriş Maliyeti** | Claude 3.5 Haiku: $0.8/M input; Sonnet: $3/M input |
| **npm Paketi** | `@anthropic-ai/sdk` |
| **AgentsHUB Dosyası** | `app/src/bridge/adapters/anthropic_adapter.js` |

**Mimari Not:** Function Calling formatı fark yaratır:
```
// Gemini'de:        functionDeclarations[{name, parameters}]
// Anthropic'te:     tools[{name, input_schema}]
// Tool yanıtı:      {role:"user", content:[{type:"tool_result", tool_use_id, content}]}
```
`anthropic_adapter.js`, mevcut AgentsHUB skill JSON Schema'larını Anthropic formatına normalize ederek `BaseAdapter._normalizeResponse()` ile standart çıktı verir.

---

### 3. `openai` — **OpenAI (GPT-4o, GPT-4o-mini, o1, o3)**
**Ne Yapar:** OpenAI model ailesine direkt API erişimi; vision, embedding, function calling, streaming.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Endüstri standartı. GPT-4o Vision ile görsel analiz. `text-embedding-3-small` ile UMI L2 vektör hafızası güçlenir. Geniş topluluk, kapsamlı dokümantasyon. |
| **Zayıflık (W)** | GPT-4o pahalı ($5/M input). Streaming'de function call handling Gemini'den farklı. |
| **Fırsat (O)** | GPT-4o-mini ($0.15/M) rutin görevler için; o3 (yüksek akıl yürütme) kritik analizler için ajan bazında config. DeepSeek + Groq bu adaptöre `baseURL` değişiciyle bağlanır. |
| **Tehdit (T)** | OpenAI fiyat politikası değişiklikleri. |

**Entegrasyon Detayları:**

| Değişken | Değer |
|---|---|
| **Zorluk** | 🟡 Orta |
| **Tahmini Süre** | 3–5 gün |
| **Giriş Maliyeti** | GPT-4o-mini: $0.15/M; GPT-4o: $5/M |
| **npm Paketi** | `openai` |
| **AgentsHUB Dosyası** | `app/src/bridge/adapters/openai_adapter.js` |

**Mimari Not:** OpenAI adaptörü aynı zamanda `baseURL` parametresiyle şu modellere de hizmet verir:
- **DeepSeek** → `https://api.deepseek.com`
- **Groq** → `https://api.groq.com/openai/v1`
- **Together.ai** → `https://api.together.xyz/v1`
- **xAI/Grok** → `https://api.x.ai/v1`
- **vLLM/SGLang yerel** → `http://localhost:8000/v1`

Tek adapter yazımı, 5+ sağlayıcıyı karşılar.

---

## 🟠 YÜKSEK ÖNCELİK

---

### 4. `deepseek` — **DeepSeek V3 / R1 (Maliyet Kırıcı)**
**Ne Yapar:** DeepSeek'in V3 ve R1 modellerine erişim; GPT-4 sınıfı performans, 10x düşük maliyet.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Kodlama benchmark'larında GPT-4o ile eşdeğer. V3: $0.27/M input — Gemini Flash ile rekabet. R1 modeli: "Thinking" modu; derin analiz için. |
| **Zayıflık (W)** | Çin menşeili; hassas kurumsal veriler için risk. |
| **Fırsat (O)** | Non-critical görevler (özetleme, çeviri, basit kodlama) için maliyet %90 düşer. |
| **Tehdit (T)** | ABD yaptırımları riski. Kurumsal müşterilerde kabul sorunu. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | $0.27/M (V3) | `openai` (baseURL değişimi) | `openai_adapter.js` üzerinden |

---

### 5. `groq` — **Groq LPU (Ultra-Hız Inference)**
**Ne Yapar:** Groq'un özel LPU donanımında LLaMA, Mixtral, Gemma modellerini 500+ token/sn hızında çalıştırır.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Piyasanın en hızlı API'si. Kullanıcı deneyimi: anlık yanıt. LLaMA 3.1 70B: $0.89/M — hem ucuz hem hızlı. |
| **Zayıflık (W)** | Sadece açık kaynak modeller; GPT-4o veya Claude kalitesi yok. Karmaşık görevlerde yetersiz. |
| **Fırsat (O)** | Hız gerektiren basit görevler (hava durumu, hesap, soru-cevap) için ideal. Fallback zincirinde "hız" kolu: Gemini yavaş gelirse Groq devreye girer. |
| **Tehdit (T)** | Model kalitesi sınırı; yüksek riskli kararlarda kullanılmamalı. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | $0.05–0.89/M | `openai` (baseURL değişimi) | `openai_adapter.js` üzerinden |

---

### 6. `synthetic` — **Mock LLM Provider (Test Altyapısı)**
**Ne Yapar:** Gerçek API çağrısı yapmadan sabit yanıtlar dönen sahte LLM adaptörü; CI/CD ve birim test ortamı için.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | AgentsHUB'ın sıfır olan test kapsamını hızla genişletir. Her test çalışmasında API ücreti sıfır. |
| **Zayıflık (W)** | Sadece test ortamı için; üretimde çalışmaz. |
| **Fırsat (O)** | Vitest test altyapısıyla birleşince tüm ajan mantığı gerçek model olmadan test edilebilir. Regression riski minimal seviyeye iner. |
| **Tehdit (T)** | Mock yanıtlar gerçekle birebir örtüşmeyebilir; entegrasyon testleri yine de gerçek API ile yapılmalı. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | Sıfır | — | `app/src/bridge/adapters/mock_adapter.js` |

---

## 🟡 ORTA ÖNCELİK

---

### 7. `amazon-bedrock` — **AWS Bedrock (Kurumsal/GDPR)**
**Ne Yapar:** AWS Bedrock üzerinden Claude, Titan, Mistral modellerine erişim; veriler AWS sınırlarını terk etmez.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Veriyi AWS'de tutan kurumsal müşterilere (bankacılık, sigorta) erişim. GDPR uyumlu AWS region seçimi. |
| **Zayıflık (W)** | IAM setup karmaşık. AWS ücreti + Bedrock model ücreti çift katman maliyet. |
| **Fırsat (O)** | AgentsHUB'ı kurumsal B2B satışa hazırlar; "Verileriniz AWS'de kalır" argümanı satışı kolaylaştırır. |
| **Tehdit (T)** | AWS bağımlılığı; maliyet denetimi zor. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟡 Orta | 3–5 gün | Değişken | `@aws-sdk/client-bedrock-runtime` | `bedrock_adapter.js` |

---

### 8. `huggingface` — **HuggingFace (Embedding & Açık Modeller)**
**Ne Yapar:** HuggingFace Inference API üzerinden 100.000+ açık kaynak model; özellikle embedding ve NLP görevleri.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | `sentence-transformers` embedding modelleri ücretsiz. UMI L2 vektör hafızası için harici embedding kaynağı. |
| **Zayıflık (W)** | Serverless inference yavaş (cold start 5–30 sn). Production için unreliable. |
| **Fırsat (O)** | `umi.js`'in embedding işlemi OpenAI embedding'e bağımlı değil hale gelir. Yerel alternatif. |
| **Tehdit (T)** | Cold start ve uptime sorunu. Production'da dedicated endpoint gerekebilir ($0.06+/saat). |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1–2 gün | Ücretsiz tier mevcut | `@huggingface/inference` | `embedding_engine.js` |

---

### 9. `ollama` — **Yerel LLM (Offline / Air-Gap)**
**Ne Yapar:** Ollama ile yerel makinede LLaMA, Mistral, Gemma, Phi modellerini GPU/CPU üzerinde çalıştırır.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Sıfır API ücreti. İnternet bağlantısı gerektirmez. Veri tamamen yerel kalır. Windows + macOS + Linux desteği. |
| **Zayıflık (W)** | Minimum 8GB RAM; güçlü GPU olmadan yavaş. Model kalitesi bulut modellerinin gerisinde. |
| **Fırsat (O)** | Tam air-gap kurulum: internetsiz fabrika ortamında AgentsHUB çalışır. Demo ve geliştirme ortamında sıfır maliyet. |
| **Tehdit (T)** | Müşteri donanımı yetersizse model düzgün çalışmaz. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | Sıfır | `openai` (baseURL: localhost:11434) | `openai_adapter.js` üzerinden |

---

### 10. `mistral` — **Mistral AI (Avrupa Menşeili Model)**
**Ne Yapar:** Mistral'ın modellerine (Mistral Large, Small, Codestral) API erişimi; Avrupa veri egemenliği.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | AB menşeili; GDPR native uyumluluk. Codestral modeli kodlama için güçlü ve ucuz. |
| **Zayıflık (W)** | GPT-4o / Claude 3.5 seviyesi değil. |
| **Fırsat (O)** | AB merkezli kurumsal müşterilere veri egemenliği argümanı. |
| **Tehdit (T)** | Pazar konumlanması belirsiz. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | $0.1–2/M | `openai` (baseURL değişimi) | `openai_adapter.js` üzerinden |

---

### 11. `together` — **Together.ai (Ucuz Açık Model Hosting)**
**Ne Yapar:** Together.ai üzerinde LLaMA, Mixtral, QWEN modellerine erişim; açık modeller için uygun fiyatlı cloud.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | LLaMA 3.1 8B: $0.10/M — piyasanın en ucuz seçeneklerinden. Fallback zincirinin en ucuz ayağı. |
| **Zayıflık (W)** | Kapsamlı görevler için kalite sınırlı. |
| **Fırsat (O)** | Groq + Together zinciri: Groq doluysa Together ikinci hız-maliyet dengesi kolu. |
| **Tehdit (T)** | Uptime garantisi zayıf. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | $0.10–0.9/M | `openai` (baseURL değişimi) | `openai_adapter.js` üzerinden |

---

### 12. `xai` — **xAI Grok (Gerçek Zamanlı X/Twitter Verisi)**
**Ne Yapar:** Elon Musk'ın xAI tarafından geliştirilen Grok modeline API erişimi; X/Twitter veri entegrasyonu.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Gerçek zamanlı Twitter/X verisiyle entegre; piyasa haberleri, trend analizi. Uzun context window (1M token). |
| **Zayıflık (W)** | Pahalı ($5/M). Platform güvenilirliği henüz olgunlaşmamış. |
| **Fırsat (O)** | Sosyal medya izleme ajanı; "X'te ne konuşuluyor?" gerçek zamanlı yanıtı. |
| **Tehdit (T)** | xAI kurumsal güvenilirliği sınırlı. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | $5/M | `openai` (baseURL: api.x.ai) | `openai_adapter.js` üzerinden |

---

### 13. `cloudflare-ai-gateway` — **Cloudflare AI Gateway (Caching + Analytics)**
**Ne Yapar:** Tüm LLM çağrılarını Cloudflare edge üzerinden geçirir; otomatik caching, maliyet analizi, rate limit.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Tekrarlayan sorgularda cache sayesinde token maliyeti düşer. Tüm model çağrıları tek dashboard'da izlenir. |
| **Zayıflık (W)** | Ekstra latency. Cloudflare outage = sistemin gözü kör. |
| **Fırsat (O)** | `llm_bridge.js`'in tüm provider'larına şeffaf caching katmanı eklenir; kaynak koda dokunulmaz. |
| **Tehdit (T)** | Cloudflare bağımlılığı. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 1 gün | 10.000 istek/ay ücretsiz | — (baseURL değişimi) | `llm_bridge.js` config |

---

### 14. `litellm` — **LiteLLM (100+ Provider Proxy)**
**Ne Yapar:** LiteLLM proxy server; OpenAI uyumlu endpoint ile 100+ LLM sağlayıcısına tek arayüz.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | OpenRouter'a alternatif; self-hosted çalıştırılabilir (veri dışarı çıkmaz). |
| **Zayıflık (W)** | Kendi sunucusunda çalıştırmak ek DevOps yükü. |
| **Fırsat (O)** | OpenRouter'a güvenmek istemeyenlere kurumsal seçenek. |
| **Tehdit (T)** | Self-host bakım yükü. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟡 Orta | 2–3 gün | Sıfır (self-hosted) | `openai` (baseURL: litellm_server) | `openai_adapter.js` üzerinden |

---

### 15. `microsoft-foundry` — **Microsoft Foundry (Azure OpenAI)**
**Ne Yapar:** Azure üzerindeki OpenAI modellerine (GPT-4o, o1) erişim; veri Azure'da kalır.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Microsoft kurumsal müşteriler için GDPR/ISO uyumlu GPT-4 erişimi. |
| **Zayıflık (W)** | Azure kurulum karmaşıklığı; deployment region seçimi. |
| **Fırsat (O)** | Microsoft 365 kullanan kurumsal müşterilere doğal entegrasyon. |
| **Tehdit (T)** | Azure maliyet yönetimi; fatura sürprizleri. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟡 Orta | 3–4 gün | GPT-4o Azure: ~$5/M | `openai` (Azure endpoint) | `openai_adapter.js` (Azure config) |
