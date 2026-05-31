# AGENTsHUB İMPLEMENTASYON PLANI — R5
## MEDYA, SES & GÖRSEL ARAÇLAR
### Whisper STT · Deepgram · ElevenLabs TTS · Fal.ai · Video Analiz · Sesli Arama · Harita

> **Felsefe:** Ses ve görsel pipeline'ları, metin pipeline'ından izole Worker Thread'lerde çalışır. Büyük dosyalar (ses, video, görüntü) asla bellekte tutulmaz — disk'e yazılır, işlenir, silinir. Token maliyeti kontrolü kritik: görsel ve ses LLM çağrıları normal metin çağrılarından kat kat pahalı.

---

## MİMARİ TEMEL: MEDYA PIPELINE

```
Gelen Medya (ses/görüntü/video)
  ↓
[Media Receiver] → temp dosyaya yaz (Agents/{id}/tmp/)
  ↓
[Media Processor] (Worker Thread)
  → STT: ses → metin
  → Vision: görsel → base64 → LLM
  → Video: video → frame → base64 → LLM
  ↓
[Metin çıktı] → llm_bridge.js normal akışa girer
  ↓
[Temizleyici] → tmp/ dosyaları sil
```

---

## 1. `whisper_transcriber.js` — YÜKSEK

### Ne Yapacak
OpenAI Whisper API ile ses dosyasını metne çevirir. Telegram/WhatsApp ses notları, saha personeli sesli komutları için.

### Implementasyon Adımları
```
Adım 1: openai npm paketi (zaten mevcut veya R1'den geliyor)
Adım 2: whisper_transcriber.js → Worker Thread skill
Adım 3: Tool şeması:
   { file_path: string, language: "tr"|"en"|"auto", response_format: "text"|"srt"|"vtt" }
Adım 4: Ses dosyasını oku → FormData → OpenAI audio/transcriptions endpoint
   const formData = new FormData();
   formData.append('file', fs.createReadStream(filePath), { filename: 'audio.ogg' });
   formData.append('model', 'whisper-1');
   formData.append('language', language);
Adım 5: WhatsApp/Telegram entegrasyonu:
   – Baileys: ses mesajı geldiğinde → ogg dosyasını tmp/ klasörüne indir → whisper
   – Telegram: voice message → download → whisper → metin → LLM
Adım 6: Temizlik: işlem biter bitmez tmp/ dosyayı sil
```

### Kritik Teknik Detay: Ses Formatı Uyumu
```
WhatsApp ses → Opus/OGG format
Telegram ses → OGG format (Opus codec)
Whisper API: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg destekler → OGG çalışır

Ama çekim kalitesi düşüksa: ffmpeg ile önce 16kHz WAV'a çevir → daha iyi tanıma
```

### Gerçekçi Zorluklar

**Zorluk 1: Dosya Boyutu Limiti**
Whisper API: maksimum 25MB. Uzun ses için parça parça gönderme gerekir.
```js
// 25MB'den büyükse ses dosyasını böl (ffmpeg ile)
const MAX_SIZE = 24 * 1024 * 1024; // 24MB güvenli limit
if (fileSize > MAX_SIZE) {
    const chunks = await splitAudioFile(filePath, MAX_SIZE);
    const transcripts = await Promise.all(chunks.map(c => transcribe(c)));
    return transcripts.join(' ');
}
```

**Zorluk 2: Türkçe Tanıma Kalitesi**
`language: "tr"` olmadan Whisper bazen Türkçeyi başka dil olarak algılar.
```
Çözüm: Her zaman language: "tr" ile gönder; "auto" sadece çok dilli içerik için
```

**Zorluk 3: WhatsApp Ses İndirme**
Baileys ile gelen ses mesajında `downloadMediaMessage` fonksiyonu kullanılır. Ağ bağlantısı kötüyse başarısız olabilir.

### Gerçekçi AI Implementasyon Süresi
- Temel transcriber: **2–3 saat**
- WhatsApp entegrasyonu: **2–3 saat** (bridge güncelleme gerektirir)
- Ses bölme (ffmpeg): **2–3 saat**
- **Toplam: ~6–8 saat**

---

## 2. `deepgram_transcriber.js` — ORTA

### Ne Yapacak
Deepgram API ile gerçek zamanlı streaming + toplu ses → metin. Whisper'dan hızlı, Türkçe destekli.

### Implementasyon Adımları
```
Adım 1: npm install @deepgram/sdk
Adım 2: deepgram_transcriber.js → whisper_transcriber.js ile aynı interface
Adım 3: Toplu dosya: const { result } = await deepgram.listen.prerecorded.transcribeFile(buffer, opts);
Adım 4: Streaming (opsiyonel): deepgram.listen.live → WebSocket → gerçek zamanlı transkript
Adım 5: Model seçimi: nova-2 (en iyi kalite) veya nova (hız/maliyet dengesi)
Adım 6: Türkçe: model:"nova-2", language:"tr"
```

### Whisper vs Deepgram Seçim Mantığı
```
config.json'a transcription_backend ekle:
{
  "transcription": {
    "backend": "whisper",   // veya "deepgram"
    "language": "tr",
    "fallback": "deepgram"  // whisper başarısızsa deepgram dene
  }
}
```

### Gerçekçi AI Implementasyon Süresi
Whisper tamamlandıktan sonra: **2–3 saat** (aynı interface, farklı SDK).

---

## 3. `tts_engine.js` — ORTA

### Ne Yapacak
ElevenLabs API ile yüksek kaliteli ses sentezi. Yanıtları sesli mesaj olarak WhatsApp/Telegram'a gönderir.

### Implementasyon Adımları
```
Adım 1: ElevenLabs API Key → .env → ELEVENLABS_API_KEY
Adım 2: tts_engine.js → Worker Thread skill
Adım 3: Tool şeması:
   { text: string, voice_id: string, output_format: "mp3_44100"|"pcm_16000", speed: number }
Adım 4: fetch ile POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Adım 5: Yanıt: ses binary → tmp/ klasörüne .mp3 kaydet → file_path döner
Adım 6: WhatsApp entegrasyonu: ses dosyasını WhatsApp voice note olarak gönder
   await sock.sendMessage(jid, { audio: fs.readFileSync(audioPath), mimetype: 'audio/mpeg', ptt: true });
Adım 7: Temizlik: gönderim sonrası tmp/ dosyayı sil
```

### Karakter Limiti Yönetimi
```
ElevenLabs: tek istekte max 5000 karakter
Büyük metin → parçalara böl → her parçayı sentezle → dosyaları birleştir (ffmpeg concat)
```

### Gerçekçi Zorluklar
- **WhatsApp Ses Gönderimi:** Baileys ile ses dosyası göndermek; `ptt: true` → "ses notu" formatı (kayıt ikonuyla gönderilir). Düz `audio: false` → dosya olarak gönderilir. Hangisi isteniyor ajan config'den alınmalı.
- **Maliyet Yönetimi:** Çok uzun yanıtlar için TTS otomatik tetiklenirse maliyet patlar. Karakter limiti koy: 300+ karakter → TTS opsiyonel (kullanıcı toggle'ı).

### Gerçekçi AI Implementasyon Süresi: **4–5 saat**

---

## 4. `image_generator.js` — ORTA

### Ne Yapacak
Fal.ai üzerinden Flux, SDXL modelleriyle görüntü üretimi. Pazarlama materyali, ürün görseli.

### Implementasyon Adımları
```
Adım 1: npm install @fal-ai/client
Adım 2: image_generator.js → Worker Thread skill
Adım 3: Tool şeması:
   { prompt: string, negative_prompt: string, width: number, height: number, model: "flux"|"sdxl" }
Adım 4: const result = await fal.run("fal-ai/flux/schnell", { input: { prompt, image_size: {width,height} } });
Adım 5: Yanıt: result.images[0].url → indir → tmp/ kaydet → file_path döner
Adım 6: WhatsApp/Telegram entegrasyonu: görüntü dosyasını mesaj olarak gönder
```

### Gerçekçi Zorluklar
- **Prompt mühendisliği:** Türkçe prompt → İngilizce'ye çevir önce (çeviri skill gerekli veya prompt template'de belirt).
- **İçerik politikası:** Uygunsuz görüntü promptları Fal tarafından reddedilir → hata handling şart.
- **Görüntü saklama:** Üretilen görseli nereye saklayacağız? Ajan'ın `Media/` klasörüne mi? Kalıcı mı geçici mi?

### Gerçekçi AI Implementasyon Süresi: **3–4 saat**

---

## 5. `video_analyzer.js` — YÜKSEK (Sanayi)

### Ne Yapacak
FFMPEG ile video dosyasından kare koparır → Gemini Vision'a gönderir → analiz üretir. Fabrika bant izleme senaryosu.

### Implementasyon Adımları
```
Adım 1: npm install fluent-ffmpeg
Adım 2: ffmpeg binary kurulumu: Windows'ta ffmpeg.exe PATH'e eklenmeli (insan yapar)
Adım 3: video_analyzer.js → Worker Thread skill
Adım 4: Tool şeması:
   { video_path: string, interval_seconds: number, max_frames: number, analysis_prompt: string }
Adım 5: ffmpeg ile kare kopar:
   ffmpeg -i video.mp4 -vf fps=1/5 frames/frame%03d.jpg (her 5 saniyede bir kare)
Adım 6: Kareleri base64'e çevir → Gemini Vision multimodal çağrı
Adım 7: Token bütçesi kontrolü: max_frames varsayılan 5 → her kare ~500 token (görsel)
Adım 8: Kare analiz sonuçlarını birleştir → tek özet rapor üret
Adım 9: Temizlik: frames/ klasörünü sil
```

### Gerçekçi Zorluklar

**Zorluk 1: ffmpeg Windows PATH**
ffmpeg.exe Windows'ta PATH'te yoksa komut başarısız. `fluent-ffmpeg`'e binary yolu verilmeli.
```js
ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');
// Veya: npm install ffmpeg-static → otomatik binary
```

**Zorluk 2: Kare Başına Token Maliyeti**
Gemini Vision: bir görsel ~500–800 token. 10 kare → 5000–8000 token → pahalı.
```
Çözüm: max_frames: 3 varsayılan. Kullanıcı artırırsa maliyet uyarısı ver.
```

**Zorluk 3: Büyük Video Dosyası**
5GB'lık güvenlik kamerası kaydı → ffmpeg açma yavaş. Streaming analiz gerekebilir.

**Zorluk 4: Gerçek Zamanlı Kamera**
Bu plan dosya analizi için. Gerçek zamanlı kamera stream analizi tamamen farklı mimarı gerektirir (RTSP + buffer + periyodik kare). Bu ileride ayrı modül.

### Gerçekçi AI Implementasyon Süresi
- Temel kare analizi: **4–6 saat**
- ffmpeg binary yönetimi: **1–2 saat**
- Token bütçe kontrolü: **1 saat**
- **Toplam: ~6–9 saat**

---

## 6. `voice_call.js` — ORTA

### Ne Yapacak
Twilio Programmable Voice API ile otonom sesli arama; metin → TTS → telefon araması.

### Implementasyon Adımları
```
Adım 1: npm install twilio
Adım 2: Twilio hesabı + telefon numarası (insan satın alır, ~$1/numara)
Adım 3: voice_call.js → Worker Thread skill
Adım 4: Tool şeması:
   { to: "+90555...", message: string, voice: "alice", language: "tr-TR" }
Adım 5: Twilio TwiML ile arama:
   const twiml = '<Response><Say language="tr-TR" voice="alice">' + message + '</Say></Response>';
   const call = await twilio.calls.create({ to, from: TWILIO_NUMBER, twiml });
Adım 6: Exec Approval: her arama ZORUNLU onay bekler (spam riski)
Adım 7: Arama durumu takip: call.sid ile Twilio'dan status sorgula
```

### Gerçek Zorluklar
- **Türkçe TTS Kalitesi:** Twilio'nun native Türkçe sesi robotik. ElevenLabs + Twilio TTS entegrasyonu: ElevenLabs ile ses üret → URL'ye upload → Twilio o URL'yi arar ($0.11/dakika ek ElevenLabs + Twilio maliyeti).
- **Spam Yasası:** Türkiye'de otomatik arama için sıkı KVKK ve BTK kuralları. Arama öncesi izin kontrolü zorunlu.
- **Webhook Gereksinimi:** Twilio aramaya yanıt aldığında ne yapacağını callback URL'den öğrenir → URL dışarıya açık olmalı.

### Gerçekçi AI Implementasyon Süresi
- Temel arama: **3–4 saat**
- ElevenLabs TTS entegrasyonu: **2–3 saat** (tts_engine.js sonrası)
- **Toplam: ~5–7 saat**

---

## 7. `maps_search.js` — ORTA

### Ne Yapacak
Google Maps / Places API ile konum araması, rota hesaplama, yakın mekan bulma.

### Implementasyon Adımları
```
Adım 1: Google Maps API Key → .env → GOOGLE_MAPS_KEY
Adım 2: maps_search.js → Worker Thread skill
Adım 3: Tool şeması:
   { action: "search_places"|"get_directions"|"geocode", query, location, type, origin, destination }
Adım 4: Places API: GET https://maps.googleapis.com/maps/api/place/textsearch/json
Adım 5: Directions API: GET ...directions/json?origin=...&destination=...
Adım 6: Yanıt normalize: { places: [{name, address, rating, location}] }
Adım 7: Maliyet kontrolü: Places API her istek $0.017 → aylık bütçe limiti koy
```

### Gerçekçi AI Implementasyon Süresi: **2–3 saat**

---

## MEDYA SİSTEMİ GENEL TEHDİTLERİ

| Tehdit | Risk Seviyesi | Önlem |
|---|---|---|
| tmp/ klasörü şişmesi | Yüksek | Periyodik temizleyici: 1 saatten eski tmp dosyayı sil |
| Ses gönderimi yerine metin sızıntısı | Orta | Ses dosyası path'i asla LLM'e gönderilmez |
| Görsel içerik politikası ihlali | Orta | Fal.ai ve Gemini Vision content filter aktif tutulmalı |
| Twilio ile spam araması | Yüksek | Exec Approval zorunlu + günlük arama limiti |
| ffmpeg not found Windows | Yüksek | ffmpeg-static npm paketi ile otomatik binary yönetimi |

---

## ÖZET: R5 Zaman Tahmini

| Modül | Süre |
|---|---|
| `whisper_transcriber.js` | 6–8 saat |
| `deepgram_transcriber.js` | 2–3 saat |
| `tts_engine.js` | 4–5 saat |
| `image_generator.js` | 3–4 saat |
| `video_analyzer.js` | 6–9 saat |
| `voice_call.js` | 5–7 saat |
| `maps_search.js` | 2–3 saat |
| **TOPLAM** | **~3–4 gün** |
