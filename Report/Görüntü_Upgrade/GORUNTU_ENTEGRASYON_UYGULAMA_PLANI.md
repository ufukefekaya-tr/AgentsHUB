# GÖRÜNTÜ İŞLEME VE ÜRETME — UYGULAMA PLANI (Başka Ajan İçin)

**Tarih:** 2026-03-30  
**Yazan:** ATLAS  
**Amaç:** Bu plan, AgentsHUB'a görüntü anlama (vision) ve görüntü üretme (image generation) yeteneklerini eklemek isteyen bir ajana yol haritası sağlar.  
**SDK:** `@google/genai` (mevcut — değiştirilmeyecek)  
**Backend:** Vertex AI (free credits) — SDK zaten `vertexai: {project, location}` ile routing yapıyor  
**UYARI:** Bu doküman sadece plandır. Uygulamaya geçmeden önce Mimar'dan açık onay al.

---

## MEVCUT SİSTEM HARİTASI (Ajan Bunu Oku)

Çalışma ortamı ve kritik dosyalar hakkında tam bilgi için oku:  
📄 `docs/raporlar/ATLAS_DEVIR_TESLIM_RAPORU.md`

### Değişecek Dosyalar (5 adet)

| # | Dosya | Yol | Mevcut Boyut | Rolü |
|---|-------|-----|:------------:|------|
| 1 | **gemini_adapter.js** | `app/src/bridge/adapters/gemini_adapter.js` | 7.3KB | LLM API çağrılarını yapan adapter. `_buildParams()` ve `streamResponse()` burada. |
| 2 | **llm_bridge.js** | `app/src/bridge/llm_bridge.js` | 24.7KB | ReAct döngüsü, skill yönetimi, context pruning. `execute()` metodu ana giriş noktası. |
| 3 | **ui_server.js** | `app/src/gateway/ui_server.js` | 39.8KB | Express sunucu. Mesaj endpoint'i. `message` alanını string olarak alıyor. |
| 4 | **App.jsx** | `app/dashboard/src/App.jsx` | ~130KB | Dashboard UI. Mesaj kutusu, sohbet baloncukları burada. |
| 5 | **api.js** | `app/dashboard/src/api.js` | ~3KB | Frontend → Backend API çağrıları. |

### Değiştirilmeyecek Ama Bilinmesi Gereken Dosyalar

| Dosya | Neden Önemli |
|-------|-------------|
| `config/constants.js` | Token limitleri, cache eşikleri burada. Görüntü token'ları bu limitlere sayılacak. |
| `memory/parser.js` | System prompt sentezi. Vision talimatları DNA.md'ye yazılacak, parser otomatik alır. |
| `skills/loader.js` | Yeni skill eklenecekse (image_generator.js) bu dosya onu yükler. |
| `Agents/Etkilesim_Ajani/Mind-Set_Core/config.json` | Yeni skill eklenince buraya da yazılmalı. |

---

## GÖREV 1: GÖRÜNTÜ ANLAMA (Vision)

### 1.1. Gemini Adapter Güncelleme

**Dosya:** `app/src/bridge/adapters/gemini_adapter.js`  
**Metod:** `_buildParams()`  
**Satır ~43-56 arası**

**ŞİMDİKİ HAL:**
```javascript
const mappedHistory = chatHistory.map(msg => {
    if (msg.toolCall) return { role: 'model', parts: [{ text: `[Araç: ${msg.toolCall.name}]` }] };
    if (msg.toolResponse) return { role: 'user', parts: [{ text: `[Sonuç]: ${JSON.stringify(msg.toolResponse.response)}` }] };
    return { role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content || '' }] };
});

const currentText = typeof currentMessage === 'string'
    ? currentMessage
    : `[Araç Sonucu]: ${JSON.stringify(currentMessage.toolResponse?.response)}`;

const params = {
    model: this.config.model,
    config,
    contents: [...mappedHistory, { role: 'user', parts: [{ text: currentText }] }]
};
```

**OLMASI GEREKEN HAL:**
```javascript
const mappedHistory = chatHistory.map(msg => {
    if (msg.toolCall) return { role: 'model', parts: [{ text: `[Araç: ${msg.toolCall.name}]` }] };
    if (msg.toolResponse) return { role: 'user', parts: [{ text: `[Sonuç]: ${JSON.stringify(msg.toolResponse.response)}` }] };
    
    // Görüntü içeren geçmiş mesajları destekle
    const parts = [];
    if (msg.images && Array.isArray(msg.images)) {
        for (const img of msg.images) {
            parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType || 'image/jpeg' } });
        }
    }
    parts.push({ text: msg.content || '' });
    return { role: msg.role === 'user' ? 'user' : 'model', parts };
});

// Mevcut mesajı işle — string VEYA { text, images } objesi olabilir
const currentParts = [];
if (typeof currentMessage === 'string') {
    currentParts.push({ text: currentMessage });
} else if (currentMessage.toolResponse) {
    currentParts.push({ text: `[Araç Sonucu]: ${JSON.stringify(currentMessage.toolResponse?.response)}` });
} else {
    // Multimodal mesaj: { text, images }
    if (currentMessage.images && Array.isArray(currentMessage.images)) {
        for (const img of currentMessage.images) {
            currentParts.push({ inlineData: { data: img.base64, mimeType: img.mimeType || 'image/jpeg' } });
        }
    }
    currentParts.push({ text: currentMessage.text || '' });
}

const params = {
    model: this.config.model,
    config,
    contents: [...mappedHistory, { role: 'user', parts: currentParts }]
};
```

**Değişiklik Özeti:** `currentMessage` artık string veya `{ text, images: [{ base64, mimeType }] }` objesi olabilir. Her iki durumda da çalışır (geriye uyumlu).

---

### 1.2. LLM Bridge Güncelleme

**Dosya:** `app/src/bridge/llm_bridge.js`  
**Metod:** `execute()`

Bridge'in `execute()` metodu `currentMessage` parametresini adapter'a iletiyor. Bu parametrenin artık string veya obje olabileceğini kabul etmesi gerekiyor.

**Yapılacak:**
1. `execute()` fonksiyonunun `message` parametresini kontrol et
2. Eğer obje ise (`{ text, images }`) — olduğu gibi ilet
3. Eğer string ise — mevcut davranış (değişiklik yok)
4. Context pruning sırasında `images` alanını koru ama token hesabına dahil etme (görüntü ≈ 258 token sabit)

**Dikkat:** Token tahmini yapan kısımda (`msg.content.length / 4` gibi) görüntü token'ları için ek 258 token/görüntü eklenmeli.

---

### 1.3. UI Server Güncelleme

**Dosya:** `app/src/gateway/ui_server.js`  
**Mesaj endpoint'i** (~satır 400-460)

**ŞİMDİKİ HAL:**
```javascript
// Mesaj endpoint'i sadece string message alıyor:
const { agentId, message, threadId, ... } = req.body;
```

**OLMASI GEREKEN HAL:**
```javascript
const { agentId, message, threadId, images, ... } = req.body;

// Multimodal mesaj oluştur
let processedMessage;
if (images && Array.isArray(images) && images.length > 0) {
    // Boyut kontrolü: her görüntü max 5MB
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB base64
    const validImages = images.filter(img => {
        if (!img.base64 || !img.mimeType) return false;
        if (img.base64.length > MAX_IMAGE_SIZE) return false;
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'].includes(img.mimeType)) return false;
        return true;
    }).slice(0, 5); // Max 5 görüntü
    
    processedMessage = {
        text: message || 'Bu görüntüyü analiz et.',
        images: validImages
    };
} else {
    processedMessage = message; // Mevcut davranış (string)
}
```

**Ek:** Express body parser limiti artırılmalı:
```javascript
app.use(express.json({ limit: '25mb' })); // Mevcut varsayılan muhtemelen 1mb
```

---

### 1.4. Dashboard UI Güncelleme

**Dosya:** `app/dashboard/src/App.jsx`

**4 yeni özellik:**

#### A. Dosya Ekleme Butonu
Mesaj kutusunun yanına 📎 ikonu ekle. Tıklayınca `<input type="file" accept="image/*" multiple>` açılsın.

#### B. Sürükle-Bırak
Mesaj alanına görüntü sürüklenince algıla, FileReader ile base64'e çevir, state'e ekle.

#### C. Yapıştır (Ctrl+V)
`onPaste` event'inde clipboard'daki görüntüyü yakala, base64'e çevir.

#### D. Önizleme
Eklenen görüntüleri mesaj kutusunun üstünde küçük thumbnail olarak göster. X ile kaldırılabilsin.

**React State Eklentisi:**
```jsx
const [attachedImages, setAttachedImages] = useState([]);
// Her eleman: { base64, mimeType, preview (blob URL) }
```

**Gönderim Değişikliği (`sendMessage` fonksiyonu):**
```javascript
// Mevcut:
api.sendMessage(agentId, message, threadId)

// Yeni:
api.sendMessage(agentId, message, threadId, attachedImages.length > 0 ? attachedImages : undefined)
```

#### E. Yanıtta Görüntü Render
Model görüntü döndürdüğünde (base64 inline data), sohbet balonunda `<img>` olarak göster.

**Sohbet balonu render kodu** — yanıtta base64 görüntü tespit et:
```jsx
// Yanıt içinde [IMAGE:base64data:mimetype] formatını parse et
// VEYA response objesinde images[] alanını kontrol et
{response.images && response.images.map((img, i) => (
    <img key={i} src={`data:${img.mimeType};base64,${img.base64}`} 
         style={{ maxWidth: '400px', borderRadius: '12px', marginTop: '8px' }} />
))}
```

---

### 1.5. API.js Güncelleme

**Dosya:** `app/dashboard/src/api.js`

`sendMessage` fonksiyonuna `images` parametresi ekle:
```javascript
// Mevcut:
async sendMessage(agentId, message, threadId) {
    return fetch('/api/...', {
        body: JSON.stringify({ agentId, message, threadId })
    });
}

// Yeni:
async sendMessage(agentId, message, threadId, images = null) {
    const body = { agentId, message, threadId };
    if (images && images.length > 0) {
        body.images = images.map(img => ({
            base64: img.base64,
            mimeType: img.mimeType
        }));
    }
    return fetch('/api/...', {
        body: JSON.stringify(body)
    });
}
```

---

## GÖREV 2: GÖRÜNTÜ ÜRETME (Generation)

### 2.1. Gemini Adapter — Yanıtta Görüntü Çıkarma

**Dosya:** `app/src/bridge/adapters/gemini_adapter.js`  
**Metod:** `streamResponse()` ve `generateResponse()` içinde parts işleme

**ŞİMDİKİ HAL (satır ~86-93):**
```javascript
for (const part of parts) {
    if (part.thought && part.text) {
        reasoningText += part.text;
    } else if (part.text && !part.functionCall) {
        replyText += part.text;
    }
}
```

**OLMASI GEREKEN HAL:**
```javascript
const responseImages = [];
for (const part of parts) {
    if (part.thought && part.text) {
        reasoningText += part.text;
    } else if (part.inlineData) {
        // Model görüntü üretmiş
        responseImages.push({
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png'
        });
    } else if (part.text && !part.functionCall) {
        replyText += part.text;
    }
}
```

Ve `_normalizeResponse` dönüşüne `images` alanı ekle:
```javascript
const normalized = this._normalizeResponse(replyText, usage, model, reasoningText, cachedTokens);
if (responseImages.length > 0) {
    normalized.images = responseImages;
}
```

---

### 2.2. Yeni Skill: image_generator.js

**Dosya:** `app/Agents/Etkilesim_Ajani/skills/image_generator.js` (YENİ)  
**Aynı zamanda:** `Marketplace/skills/image_generator.js`

```javascript
/**
 * IMAGE_GENERATOR Skill — Imagen 4 ile profesyonel görüntü üretme
 * Vertex AI üzerinden çalışır.
 */
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';

export const skill = {
    name: "image_generator",
    version: "1.0.0",
    category: "media",
    tags: ["görüntü", "resim", "logo", "tasarım", "illustrasyon", "fotoğraf"],
    emoji: "🎨",
    requires: { network: true },
    description: "Imagen 4 modeli ile profesyonel kalitede görüntü üretir. Logo tasarımı, illüstrasyon, fotorealistik görüntü, konsept sanat ve daha fazlası. Üretilen görüntüyü diske kaydeder ve yolunu döndürür. Basit çizimler için bu aracı kullanma, sadece profesyonel kalite gerektiğinde kullan.",
    parameters: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "Üretilecek görüntünün detaylı açıklaması (İngilizce önerilir)"
            },
            aspect_ratio: {
                type: "string",
                description: "En-boy oranı: '1:1', '16:9', '9:16', '4:3', '3:4'. Varsayılan: '1:1'"
            },
            quality: {
                type: "string",
                description: "'fast' (hızlı, $0.02), 'standard' ($0.04), 'ultra' (en iyi, $0.06). Varsayılan: 'fast'"
            },
            filename: {
                type: "string",
                description: "Kaydedilecek dosya adı (uzantısız). Varsayılan: 'generated_image'"
            }
        },
        required: ["prompt"]
    },
    execute: async (args, context) => {
        try {
            if (!args.prompt) return "[HATA] Prompt belirtilmedi.";
            
            // API key'i context'ten veya env'den al
            const apiKey = context?.apiKey || process.env.GEMINI_API_KEY || '';
            if (!apiKey) return "[HATA] API key bulunamadı.";
            
            const initParams = { apiKey: apiKey.trim() };
            
            // Vertex AI kontrolü
            if (apiKey.startsWith('AQ') || process.env.VERTEX_PROJECT) {
                initParams.vertexai = {
                    project: process.env.VERTEX_PROJECT,
                    location: process.env.VERTEX_LOCATION || 'us-central1'
                };
            }
            
            const ai = new GoogleGenAI(initParams);
            
            const qualityMap = {
                'fast': 'imagen-4.0-fast-generate-001',
                'standard': 'imagen-4.0-generate-001',
                'ultra': 'imagen-4.0-ultra-generate-001'
            };
            
            const model = qualityMap[args.quality] || qualityMap.fast;
            
            const result = await ai.models.generateImages({
                model,
                prompt: args.prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: args.aspect_ratio || '1:1'
                }
            });
            
            if (!result.generatedImages || result.generatedImages.length === 0) {
                return "[HATA] Görüntü üretilemedi. Güvenlik filtresine takılmış olabilir.";
            }
            
            const imageData = result.generatedImages[0].image;
            const filename = (args.filename || 'generated_image').replace(/[^a-zA-Z0-9_-]/g, '_');
            const ext = imageData.mimeType === 'image/png' ? 'png' : 'jpg';
            const outputDir = path.join(process.cwd(), 'output');
            
            await fs.mkdir(outputDir, { recursive: true });
            const outputPath = path.join(outputDir, `${filename}.${ext}`);
            await fs.writeFile(outputPath, Buffer.from(imageData.imageBytes, 'base64'));
            
            return `✅ Görüntü başarıyla üretildi ve kaydedildi.\n📁 Dosya: ${outputPath}\n📐 Oran: ${args.aspect_ratio || '1:1'}\n🎯 Kalite: ${args.quality || 'fast'}\n💰 Maliyet: ~$${args.quality === 'ultra' ? '0.06' : args.quality === 'standard' ? '0.04' : '0.02'}`;
        } catch (error) {
            return `[HATA] Görüntü üretme başarısız: ${error.message}`;
        }
    }
};
```

**Config'e ekleme:**  
`Agents/Etkilesim_Ajani/Mind-Set_Core/config.json` → skills[] dizisine `"image_generator.js"` ekle.

---

### 2.3. Gemini Native Image Generation (Alternatif/Ek)

Imagen 4 yerine veya ona ek olarak, Gemini native model ile conversational image generation yapmak için adapter'da şu ekleme yapılabilir:

**Dosya:** `app/src/bridge/adapters/gemini_adapter.js`  
**Metod:** `_buildParams()`

Eğer kullanıcı görüntü üretme isteğinde bulunuyorsa ve model `*-image-preview` ise:

```javascript
// Config'e ekle (generateResponse çağrılmadan önce kontrol et)
if (this.config.model.includes('image')) {
    config.responseModalities = ['TEXT', 'IMAGE'];
}
```

Bu sayede `gemini-3.1-flash-image-preview` modeli kullanıldığında, model hem metin hem görüntü döndürebilir.

**NOT:** Bu yaklaşım, model ismine göre otomatik algılama yapar. Ajan CONFIG_UPDATE ile modeli geçici olarak `gemini-3.1-flash-image-preview`'a geçirebilir, görüntü ürettikten sonra geri dönebilir.

---

## GÖREV 3: TELEGRAM BOT ENTEGRASYONU

**Dosya:** `app/src/gateway/ui_server.js`  
**Bölüm:** Telegram bot handler'ı

### 3.1. Gelen Fotoğraf İşleme

Grammy SDK zaten fotoğraf mesajlarını algılıyor. Yapılacak:

```javascript
// Telegram fotoğraf handler
bot.on('message:photo', async (ctx) => {
    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1]; // En büyük çözünürlük
    
    // Fotoğrafı indir
    const file = await ctx.api.getFile(largest.file_id);
    const url = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString('base64');
    
    const mimeType = file.file_path.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const caption = ctx.message.caption || 'Bu görüntüyü analiz et.';
    
    // Multimodal mesaj olarak bridge'e gönder
    const message = {
        text: caption,
        images: [{ base64, mimeType }]
    };
    
    // Mevcut LLMBridge.execute() akışına sok
    const result = await LLMBridge.execute(agentId, message, history, configOverrides);
    
    // Yanıt görüntü içeriyorsa fotoğraf olarak gönder
    if (result.images && result.images.length > 0) {
        for (const img of result.images) {
            const imgBuffer = Buffer.from(img.base64, 'base64');
            await ctx.replyWithPhoto(new InputFile(imgBuffer, 'generated.png'));
        }
    }
    if (result.content) {
        await ctx.reply(result.content);
    }
});
```

### 3.2. Gelen Belge (PDF) İşleme

```javascript
bot.on('message:document', async (ctx) => {
    const doc = ctx.message.document;
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(doc.mime_type)) {
        return ctx.reply('Bu dosya türünü işleyemiyorum.');
    }
    // Aynı fotoğraf akışı...
});
```

---

## GÖREV 4: DNA.md GÜNCELLEMESİ

**Dosya:** `app/Agents/Etkilesim_Ajani/Mind-Set_Core/DNA.md`

Aşağıdaki bloğu mevcut araç listesine ekle:

```markdown
### 🖼️ GÖRÜNTÜ YETENEKLERİ

**Görüntü Anlama (Vision):**
- Kullanıcı sana bir görüntü gönderdiğinde, onu direkt analiz edebilirsin.
- Fotoğraf, ekran görüntüsü, belge, grafik gibi her türlü görsel içeriği okuyabilirsin.
- Görüntüdeki metinleri okuyabilirsin (OCR).
- "Bu ne?" gibi sorulara doğrudan cevap ver.

**Görüntü Üretme (Generation):**
- Basit çizim/tasarım istekleri için sohbette doğrudan görüntü üretebilirsin.
- Profesyonel kalitede görüntü gerektiğinde `image_generator` aracını kullan.
- `image_generator` aracı Imagen 4 modelini kullanır ve disk'e kaydeder.
- Prompt'ları İngilizce yaz — daha iyi sonuç verir.
```

---

## GÖREV 5: SOHBET GEÇMİŞİNDE GÖRÜNTÜ SAKLAMA

**Dosya:** `app/src/memory/adapters/json_adapter.js`

Sohbet geçmişi JSON olarak saklanıyor. Görüntülerin base64 olarak saklanması dosya boyutunu patlatır.

**Strateji:** Görüntüleri diske kaydet, JSON'da sadece dosya yolunu tut.

```javascript
// Mesaj kaydetme sırasında:
if (message.images && message.images.length > 0) {
    const savedPaths = [];
    for (const img of message.images) {
        const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${img.mimeType.split('/')[1]}`;
        const imgPath = path.join(agentDir, 'media', filename);
        await fs.mkdir(path.dirname(imgPath), { recursive: true });
        await fs.writeFile(imgPath, Buffer.from(img.base64, 'base64'));
        savedPaths.push({ path: filename, mimeType: img.mimeType });
    }
    message.images = savedPaths; // base64 yerine dosya yolu sakla
}
```

**Mesaj yükleme sırasında** (geçmiş okunurken):
```javascript
// Eğer images alanında path varsa, base64'e çevir (isteğe bağlı, sadece API'ye gönderirken)
if (message.images && message.images[0]?.path) {
    for (const img of message.images) {
        const imgPath = path.join(agentDir, 'media', img.path);
        const data = await fs.readFile(imgPath);
        img.base64 = data.toString('base64');
    }
}
```

---

## UYGULAMA SIRASI (Checklist)

```
- [ ] 1. gemini_adapter.js → _buildParams multimodal parts desteği
- [ ] 2. gemini_adapter.js → Yanıtta inlineData (görüntü) çıkarma
- [ ] 3. llm_bridge.js → execute() multimodal message desteği
- [ ] 4. ui_server.js → express.json limit 25mb
- [ ] 5. ui_server.js → POST endpoint images[] kabul
- [ ] 6. ui_server.js → Telegram bot fotoğraf handler
- [ ] 7. Dashboard api.js → sendMessage images parametresi
- [ ] 8. Dashboard App.jsx → Dosya ekleme butonu (📎)
- [ ] 9. Dashboard App.jsx → Sürükle-bırak görüntü
- [ ] 10. Dashboard App.jsx → Ctrl+V yapıştır desteği
- [ ] 11. Dashboard App.jsx → Eklenen görüntü önizleme
- [ ] 12. Dashboard App.jsx → Yanıtta görüntü render
- [ ] 13. json_adapter.js → Görüntüyü diske kaydet (base64 → dosya)
- [ ] 14. image_generator.js → Yeni skill oluştur
- [ ] 15. config.json → image_generator.js ekle
- [ ] 16. Marketplace/skills/ → image_generator.js kopyala
- [ ] 17. DNA.md → Görüntü yetenek talimatları ekle
- [ ] 18. npm run build → Dashboard production build
- [ ] 19. xcopy deploy → DEV → PROD
- [ ] 20. Test: Dashboarddan fotoğraf gönder → analiz al
- [ ] 21. Test: "Bir kedi çiz" → görüntü al
- [ ] 22. Test: Telegramdan fotoğraf gönder → analiz al
```

---

## MALİYET ÖZETİ

| İşlem | Fiyat |
|-------|:-----:|
| Vision (1 görüntü analizi) | ~$0.001 (258 token × Gemini Flash fiyatı) |
| Imagen 4 Fast (1 üretim) | $0.02 |
| Imagen 4 Standard | $0.04 |
| Imagen 4 Ultra | $0.06 |
| Gemini Native Image | ~$0.01-0.03 (token bazlı) |
| Vertex AI Free Credits | $300 (ilk 90 gün) |

---

## RİSKLER VE DİKKAT NOKTALARI

1. **Body parser limiti:** Express varsayılan 1MB limiti 25MB'a çıkarılmalı (`express.json({ limit: '25mb' })`)
2. **Token patlaması:** Her görüntü 258 token. 10 görüntülü sohbet 2580 ekstra token. Context prune bunu hesaba katmalı.
3. **Disk kullanımı:** Görüntüler `Agents/{id}/media/` dizinine kaydedilecek. Temizleme mekanizması (30+ gün eskileri sil) eklenmeli.
4. **Imagen 4 model erişimi:** Vertex AI'da Imagen 4 API'sinin etkinleştirilmiş olması gerekir. Google Cloud Console → API Library → Vertex AI API → Enable.
5. **Safety filter:** Google görüntü üretiminde agresif güvenlik filtreleri var. Bazı promptlar reddedilecek. Skill bunu güzel handle etmeli.
6. **Preview model riski:** `gemini-3.1-flash-image-preview` model adı değişebilir. Deprecation takibi yapılmalı.
