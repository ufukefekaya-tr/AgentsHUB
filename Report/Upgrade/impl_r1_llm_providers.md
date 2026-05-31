# AGENTsHUB İMPLEMENTASYON PLANI — R1
## LLM PROVIDER ADAPTÖR SİSTEMİ
### (Kritik + Yüksek + Orta Öncelikli Tüm Modeller)

> **Felsefe:** Her provider kendi izole `.js` adaptöründe yaşar. `llm_bridge.js` hangisini kullandığını bilmez — sadece `BaseAdapter` sözleşmesiyle konuşur. Yeni model eklemek mevcut kodu bozmaz.

---

## MİMARİ TEMEL: ADAPTÖR SİSTEMİ GENEL BAKIŞ

### Mevcut Durum
```
app/src/bridge/adapters/
  ├── base_adapter.js      ✅ Mevcut
  └── gemini_adapter.js    ✅ Mevcut
```

### Hedef Durum (Bu Planın Çıktısı)
```
app/src/bridge/adapters/
  ├── base_adapter.js        ✅ Mevcut (güncellenecek)
  ├── gemini_adapter.js      ✅ Mevcut
  ├── openrouter_adapter.js  🆕 Kritik
  ├── anthropic_adapter.js   🆕 Kritik
  ├── openai_adapter.js      🆕 Kritik (DeepSeek, Groq, Together, xAI, vLLM de buradan)
  ├── bedrock_adapter.js     🆕 Orta
  ├── mock_adapter.js        🆕 Yüksek (test)
  └── index.js               🆕 Provider router
```

### `llm_bridge.js`'e Eklenecek Tek Değişiklik
```
_resolveProvider(providerName, apiKey, config) {
    switch(providerName) {
        case 'gemini':    return new GeminiAdapter(apiKey, config);
        case 'openrouter': return new OpenRouterAdapter(apiKey, config);
        case 'anthropic': return new AnthropicAdapter(apiKey, config);
        case 'openai':    return new OpenAIAdapter(apiKey, config);
        // + deepseek, groq, ollama, mistral — hepsi OpenAIAdapter'dan türüyor
        case 'mock':      return new MockAdapter(apiKey, config);
        default: throw new Error(`Bilinmeyen provider: ${providerName}`);
    }
}
```

---

## 1. `openrouter_adapter.js` — KRİTİK

### Ne Yapacak
OpenRouter.ai'nin OpenAI-uyumlu endpoint'i üzerinden 200+ modele erişim.  
Model adı `"openai/gpt-4o"` veya `"anthropic/claude-3.5-sonnet"` formatında prefix ile gelir.

### Implementasyon Adımları
```
1. openai npm paketi (zaten kuruluysa yeniden kurulum yok)
2. openrouter_adapter.js yaz → OpenAIAdapter'ı extend ET, sadece baseURL ve header'ları override et
3. Ajan config'ine "provider: openrouter, model: anthropic/claude-3-5-sonnet" alanı ekle
4. llm_bridge.js içinde _resolveProvider'a 'openrouter' case'i ekle
5. Dashboard UI'ya provider dropdown'u ekle (opsiyonel, sonraya bırakılabilir)
```

### Dosya Değişiklikleri
| Dosya | İşlem | Etki |
|---|---|---|
| `adapters/openrouter_adapter.js` | 🆕 Yeni oluştur | ~40 satır |
| `bridge/llm_bridge.js` | ✏️ `_resolveProvider` metoduna 1 case ekle | 3 satır |
| `app/package.json` | ✏️ `openai` bağımlılığı ekle (yoksa) | 1 satır |

### Gerçekçi Zorluklar
- **Rate limit metadata:** OpenRouter model bazında farklı rate limit döner; `telemetry_tracker.js`'e yeni alan gerekmeyebilir ama dikkat edilmeli.
- **Model prefix çakışması:** Ajan config'inde `model: "gemini-2.5-pro"` yerine `model: "google/gemini-2.5-pro"` yazılması gerekecek — mevcut ajanların config dosyaları migrate edilmeli.
- **Streaming farkı:** OpenRouter bazı modellerde streaming'i tam desteklemeyebilir; `streamResponse` fallback mekanizması gerekli.

### Sistem Tehdidi
- OpenRouter down olursa tüm fallback zinciri çöker → **Zorunlu:** Native adapter'lar paralelde geliştirilmeli.
- OpenRouter'ın markup ücreti (%5–10) uzun vadede maliyet artışı yaratır.

### Gerçekçi AI Implementasyon Süresi
`openai_adapter.js` yazıldıktan sonra: **2–3 saat** (extend + override + test).  
`openai_adapter.js` yoksa baştan: **4–6 saat**.

---

## 2. `anthropic_adapter.js` — KRİTİK

### Ne Yapacak
Claude 3.5 Haiku, Sonnet, Opus modellerine direkt Anthropic API erişimi. `BaseAdapter`'ı extend eder; function calling, streaming ve sistem prompt formatı Gemini'den farklı olduğu için tam yeniden yazım gerekir.

### Implementasyon Adımları
```
1. npm install @anthropic-ai/sdk
2. anthropic_adapter.js → BaseAdapter extend
3. generateResponse: Anthropic Messages API formatına normalize et
   - system: systemPrompt (ayrı parametre)
   - messages: [...chatHistory, {role:"user", content: currentMessage}]
   - tools: AgentsHUB skill şemalarını Anthropic format'a çevir
4. streamResponse: Anthropic stream event'lerini AgentsHUB onChunk callback'ine bağla
5. Tool response: {role:"user", content:[{type:"tool_result", tool_use_id, content}]}
6. _normalizeResponse: Anthropic usage.input_tokens → standardize
7. llm_bridge.js'e 'anthropic' case ekle
8. Test: mock_adapter.js ile karşılaştırmalı output testi
```

### Kritik Format Farkları (Gemini vs Anthropic)
```js
// Gemini Function Declaration:
{ name: "weather", parameters: { type: "object", properties: {...} } }

// Anthropic Tool Declaration:
{ name: "weather", input_schema: { type: "object", properties: {...} } }

// Gemini Tool Response:
{ role: "user", parts: [{ text: "[Araç Sonucu]: {...}" }] }

// Anthropic Tool Response:
{ role: "user", content: [{ type: "tool_result", tool_use_id: "xxx", content: "..." }] }
```

### Dosya Değişiklikleri
| Dosya | İşlem | Tahmini Boyut |
|---|---|---|
| `adapters/anthropic_adapter.js` | 🆕 Tam yeni yazım | ~200 satır |
| `bridge/llm_bridge.js` | ✏️ 1 case + import | 5 satır |
| `app/package.json` | ✏️ `@anthropic-ai/sdk` ekle | 1 satır |

### Gerçekçi Zorluklar
- **Tool use döngüsü:** Anthropic'in `tool_use` → `tool_result` döngüsü, Gemini'nin function calling döngüsünden farklı. `llm_bridge.js`'deki ReAct döngüsü (`_runReActLoop`) Anthropic formatına da uyum sağlamalı veya adapter içinde normalize edilmeli.
- **Thinking modu:** Claude 3.7'nin "extended thinking" özelliği; `reasoning` alanı Gemini'nin `thought` modu gibi işlenmeli.
- **System prompt güncelleme:** Mevcut ajan DNA'ları Gemini'ye göre optimize. Claude çok uzun system prompt'larda context window farklı kullanır — bazı DNA dosyaları gözden geçirilmeli.

### Sistem Tehdidi
- Gemini'ye göre yazılmış prompt'lar Claude'da farklı davranabilir → Her ajan için A/B testi önerilir.
- `telemetry_tracker.js` input/output token sayım metodolojisini güncellemeli (Anthropic input: prompt + system + tools birlikte sayar).

### Gerçekçi AI Implementasyon Süresi
**8–12 saat** — en karmaşık format dönüşümlerinden biri.

---

## 3. `openai_adapter.js` — KRİTİK (+ 5 Provider Ücretsiz Gelir)

### Ne Yapacak
OpenAI modellerine (`gpt-4o`, `gpt-4o-mini`, `o1`, `o3`) erişim. `baseURL` parametresi ile aynı kod şu provider'ları da karşılar:
- **DeepSeek** → `https://api.deepseek.com`
- **Groq** → `https://api.groq.com/openai/v1`
- **Together.ai** → `https://api.together.xyz/v1`
- **xAI/Grok** → `https://api.x.ai/v1`
- **Ollama (yerel)** → `http://localhost:11434/v1`
- **Mistral** → `https://api.mistral.ai/v1`
- **vLLM / SGLang** → `http://localhost:8000/v1`

### Implementasyon Adımları
```
1. npm install openai
2. openai_adapter.js → BaseAdapter extend
3. generateResponse: OpenAI Chat Completions API
   - messages: [{role, content}] formatı
   - tools: AgentsHUB skill şemalarını OpenAI format'a normalize et (Gemini'ye çok benzer)
   - tool_call: response.choices[0].message.tool_calls[0]
4. streamResponse: SSE stream parsing → onChunk callback
5. Tool response: {role: "tool", tool_call_id: xxx, content: JSON.stringify(result)}
6. _resolveProvider'da: config.baseURL varsa OpenAIAdapter'a geç (DeepSeek/Groq için)
7. Ajan config'ine "provider: openai, baseURL: https://api.deepseek.com" seçeneği ekle
```

### Ajan Config Örneği (Esneklik)
```json
{
  "provider": "openai",
  "model": "deepseek-chat",
  "baseURL": "https://api.deepseek.com",
  "api_key_env": "DEEPSEEK_API_KEY"
}
```

### Dosya Değişiklikleri
| Dosya | İşlem | Tahmini Boyut |
|---|---|---|
| `adapters/openai_adapter.js` | 🆕 Yeni | ~180 satır |
| `bridge/llm_bridge.js` | ✏️ provider resolution güncelleme | 10 satır |
| `app/package.json` | ✏️ `openai` paketi | 1 satır |

### Gerçekçi Zorluklar
- **Streaming tool call:** OpenAI streaming'de `tool_calls` parçalı gelir (`delta.tool_calls[0].function.arguments` birleştirmek gerekli) — özenli buffer yönetimi şart.
- **o1/o3 modelleri:** Bu modeller streaming desteklemez ve `system` rol kabul etmez — adapter'da model adı kontrolü gerekli.
- **Context message format:** OpenAI `content` null olamaz; bazı edge case'lerde Gemini'den taşınan history formatı patlar.

### Gerçekçi AI Implementasyon Süresi
**6–10 saat** (streaming tool call buffer yönetimi nedeniyle).

---

## 4. `mock_adapter.js` — YÜKSEK (Test Altyapısı)

### Ne Yapacak
Gerçek API çağrısı yapmadan öngörülebilir yanıtlar döner. Tüm test suite'i bu adapter üzerinden çalışır — sıfır API maliyeti.

### Implementasyon Adımları
```
1. mock_adapter.js → BaseAdapter extend
2. generateResponse: fixtures/ klasöründen önceden yazılmış JSON yükle
3. streamResponse: aynı JSON'u parçalara bölerek onChunk'a feed et (streaming simülasyonu)
4. Tool call simülasyonu: config'de "mock_tool_call: true" varsa tool call response dön
5. vitest.config.js'te PROVIDER=mock environment variable ayarla
```

### Gerçekçi AI Implementasyon Süresi
**2–3 saat.**

---

## 5. `amazon-bedrock` Adaptörü — ORTA

### Ne Yapacak
AWS Bedrock üzerinden Claude, Titan modellerine erişim. Veriler AWS sınırlarını terk etmez.

### Kritik Zorluk: AWS IAM Labirenti
```
Problem: AWS'de Bedrock erişimi için:
  1. IAM User veya Role oluştur
  2. AmazonBedrockFullAccess policy ekle
  3. us-east-1 region'ında model access onayı iste (manuel, 1–24 saat)
  4. Access Key + Secret Key AgentsHUB ajan .env'e ekle
Bu IAM kurulumu AI'ın yapamayacağı insan müdahalesi gerektiriyor.
```

### Implementasyon Adımları
```
1. npm install @aws-sdk/client-bedrock-runtime
2. bedrock_adapter.js → BaseAdapter extend
3. generateResponse: BedrockRuntimeClient + InvokeModelCommand
   - Anthropic Claude için: anthropic.claude-3-5-sonnet-20241022-v2:0
   - Payload: Anthropic Messages API formatında JSON string
4. streamResponse: InvokeModelWithResponseStreamCommand
5. Region + credential yönetimi: her ajan için ayrı AWS credential
```

### Gerçekçi AI Implementasyon Süresi
Kod yazımı: **4–6 saat.** IAM kurulumu insan gerektirir: **+1–2 saat insan zamanı.**

---

## 6. `cloudflare-ai-gateway` — ORTA

### Ne Yapacak
Tüm LLM çağrıları Cloudflare edge üzerinden geçer; otomatik caching + analytics. Adapter değil, `llm_bridge.js`'deki baseURL düzeyinde config.

### Implementasyon (Kod Değişimi Minimumdur)
```
1. Cloudflare hesabında AI Gateway oluştur → gateway URL al
2. constants.js'e CLOUDFLARE_GATEWAY_URL ekle
3. llm_bridge.js'de her adapter başlatılırken:
   if (CLOUDFLARE_GATEWAY_URL) { config.baseURL = CLOUDFLARE_GATEWAY_URL + '/' + provider; }
4. Test: Cloudflare dashboard'dan cache hit/miss kontrol et
```

### Gerçekçi AI Implementasyon Süresi
**1–2 saat** (sadece baseURL değiştirme + test).

---

## 7. `litellm` Proxy — ORTA

### Ne Yapacak
Self-hosted LiteLLM proxy sunucusu 100+ provider'ı OpenAI uyumlu endpoint'e çevirir.

### Implementasyon Yaklaşımı
```
1. LiteLLM sunucu kurulumu: pip install litellm → litellm --model gpt-4o (Docker tercihli)
2. AgentsHUB tarafında: openai_adapter.js baseURL = LiteLLM sunucu URL
3. LiteLLM config.yaml: provider fallback zincirleri tanımla
4. Avantaj: Tüm routing LiteLLM'de, AgentsHUB sadece OpenAI konuşuyor
```

### Sistem Tehdidi
LiteLLM'in kendisi de SPOF olur. Docker container crash → tüm sistem kör.

### Gerçekçi AI Implementasyon Süresi
AgentsHUB tarafı: **1 saat.** LiteLLM Docker kurulumu: **2–3 saat.**

---

## 8. `microsoft-foundry` (Azure OpenAI) — ORTA

### Implementasyon Yaklaşımı
```
1. Azure Portal → Azure OpenAI Service → resource oluştur
2. Model deployment: gpt-4o deploy et (bölge seç)
3. openai_adapter.js'de Azure config modu:
   new OpenAI({ apiKey: AZURE_KEY, baseURL: AZURE_ENDPOINT, apiVersion: "2024-02-01" })
4. AzureOpenAI sınıfı openai npm paketinde mevcut — ayrı adapter GEREKMEZ
```

### Gerçekçi AI Implementasyon Süresi
**2–3 saat** (Azure Portal insan kurulumu + adapter config).

---

## GENEL SİSTEM TEHDİTLERİ (Tüm LLM Adaptörleri İçin)

| Tehdit | Açıklama | Önlem |
|---|---|---|
| **Format Drift** | Her model farklı tool call format → ReAct döngüsü karışır | Her adapter'da normalize layer zorunlu |
| **Token Sayım Tutarsızlığı** | Anthropic, OpenAI, Gemini farklı sayar | `telemetry_tracker.js`'de provider-aware token parser |
| **API Sürüm Çakışması** | Anthropic API v1 → v2 geçişi gibi | npm semver ile sabitlenmiş versiyon |
| **Prompt Davranış Farkı** | Aynı DNA Gemini'de x, Claude'da y davranır | Per-provider DNA dosyası opsiyonu ekle |
| **Streaming Kesintisi** | Uzun yanıtlarda network drop | Retry + partial buffer kaydetme mekanizması |

---

## TEST STRATEJİSİ

```
Implementasyon sırası (her adaptör için):
1. mock_adapter.js ile expected output define et
2. Her yeni adapter'ı mock çıktıyla karşılaştır (Vitest assertion)
3. Gerçek API ile smoke test (1 mesaj → yanıt alındı mı?)
4. Tool call döngüsünü test et: ajan hesap makinesini çağırmalı
5. Streaming testi: SSE stream kesintisiz akmalı
```

---

## ÖZET: LLM Adaptör Planı Zaman Tahmini

| Modül | Süre | Bağımlılık |
|---|---|---|
| `openai_adapter.js` | 6–10 saat | `openai` npm |
| `anthropic_adapter.js` | 8–12 saat | `@anthropic-ai/sdk` npm |
| `openrouter_adapter.js` | 2–3 saat | openai_adapter sonrası |
| `mock_adapter.js` | 2–3 saat | — |
| DeepSeek / Groq / Ollama | 0 ekstra | openai_adapter config ile |
| `bedrock_adapter.js` | 4–6 saat | `@aws-sdk/client-bedrock-runtime` |
| Cloudflare Gateway | 1–2 saat | — |
| LiteLLM proxy | 1 saat | LiteLLM server ayrı kurulum |
| Azure OpenAI | 2–3 saat | openai_adapter config ile |
| **TOPLAM** | **~2–3 gün** | Tam paralel test dahil |
