# AGENTsHUB İMPLEMENTASYON PLANI — R2
## MESAJLAŞMA KANALLARI
### WhatsApp · Slack · Discord · Microsoft Teams

> **Felsefe:** Her kanal kendi izole `{platform}_bridge.js` dosyasında yaşar. `telegram_bridge.js` şablonu referans alınır — aynı mimari kalıp, farklı SDK. Per-agent token/session izolasyonu: hiçbir ajan başka ajanın konuşmasını göremez.

---

## MİMARİ TEMEL: KANAL SİSTEMİ

### Mevcut Durum
```
app/src/channels/
  └── telegram_bridge.js    ✅ Mevcut (şablon)
```

### Hedef Durum
```
app/src/channels/
  ├── telegram_bridge.js    ✅ Mevcut
  ├── whatsapp_bridge.js    🆕 Kritik
  ├── slack_bridge.js       🆕 Yüksek
  ├── discord_bridge.js     🆕 Orta
  └── msteams_bridge.js     🆕 Orta
```

### Kanal Başlatma Noktası: `ui_server.js`
```js
// Her ajan Config'i okunduğunda, aktif kanallar başlatılır:
if (agentConfig.channels?.whatsapp?.enabled) {
    const bridge = new WhatsAppBridge(agentId, agentConfig);
    bridge.start();
}
```

### İzolasyon Garantisi
```
Agents/
  ├── SatisAjani/
  │   ├── config.json             ← { "channels": {"whatsapp": {"enabled": true}} }
  │   └── Chats/
  │       └── whatsapp_session/   ← Sadece bu ajana ait Baileys state
  └── DestekAjani/
      ├── config.json
      └── Chats/
          └── whatsapp_session/   ← Tamamen farklı oturum
```

---

## 1. `whatsapp_bridge.js` — KRİTİK

### Ne Yapacak
Baileys (`@whiskeysockets/baileys`) kütüphanesi ile her ajan için izole WhatsApp botu. Mesaj gelir → `LLMBridge.execute()` → yanıt WhatsApp'a döner.

### Implementasyon Adımları
```
Adım 1: npm install @whiskeysockets/baileys
Adım 2: whatsapp_bridge.js dosyasını yaz (telegram_bridge.js şablonundan)
Adım 3: Session state → Agents/{agentId}/Chats/whatsapp_session/ klasörüne izole et
Adım 4: QR kod üretimi → base64 → ui_server.js SSE endpoint'e gönder
Adım 5: Dashboard'a "WhatsApp QR" sekmesi ekle → kullanıcı QR tarar
Adım 6: Mesaj geldiğinde: auth filtresi → LLMBridge.execute → metin formatla → gönder
Adım 7: WhatsApp markdown sanitizer: **bold** → *bold*, ```code``` → _code_
Adım 8: Session reconnect mekanizması: bağlantı kopunca otomatik yeniden bağlan
```

### Kritik Teknik Detay: QR Akışı
```
whatsapp_bridge.js:
    sock.ev.on('connection.update', (update) => {
        if (update.qr) {
            // QR'ı base64'e çevir
            const qrBase64 = await QRCode.toDataURL(update.qr);
            // SSE ile Dashboard'a gönder
            uiServer.sendSSE(agentId, { type: 'whatsapp_qr', data: qrBase64 });
        }
    });

Dashboard (React):
    useEffect(() => {
        eventSource.onmessage = (e) => {
            if (e.type === 'whatsapp_qr') {
                setQrImage(e.data); // <img src={qrImage} /> göster
            }
        }
    }, []);
```

### Dosya Değişiklikleri
| Dosya | İşlem | Tahmini Boyut |
|---|---|---|
| `channels/whatsapp_bridge.js` | 🆕 Yeni | ~300 satır |
| `gateway/ui_server.js` | ✏️ Kanal başlatma + SSE QR endpoint | +30 satır |
| `dashboard/src/App.jsx` | ✏️ WhatsApp QR sekmesi | +50 satır |
| `app/package.json` | ✏️ Baileys bağımlılığı | 1 satır |

### Gerçekçi Zorluklar

**Zorluk 1: Baileys Node.js ESM Uyumluluğu**
AgentsHUB `"type": "module"` kullanıyor (ESM). Baileys bazen CommonJS/ESM çakışması çıkarır.
```
Çözüm: package.json'da Baileys için "exports" koşulu veya
        dynamic import() ile lazy loading
```

**Zorluk 2: Session State Bozulması**
WhatsApp protokol güncellemesi → mevcut session geçersiz → QR yeniden gerekli.
```
Çözüm: Session bozulma tespiti → otomatik session temizle → yeni QR üret
        ui_server.js'e "whatsapp_reconnect" endpoint ekle
```

**Zorluk 3: Mesaj Format Uyumsuzluğu**
LLM Markdown üretir, WhatsApp farklı format kullanır.
```
Gemini yanıtı: "**Merhaba!** Bu bir *test* mesajıdır."
WhatsApp formatı: "*Merhaba!* Bu bir _test_ mesajıdır."
Çözüm: whatsapp_sanitizer.js fonksiyonu regex ile dönüştürür
```

**Zorluk 4: Büyük Grup Mesajları**
Ajanın ekleneceği WhatsApp gruplarında her mesaj gelir → LLM çağrısı → maliyet patlar.
```
Çözüm: Grup filtreleme: yalnızca @mention veya belirli keyword içeren mesajlara yanıt
        config.json: { "whatsapp": { "respond_to_groups": false, "trigger_word": "@ajan" } }
```

### Sistem Tehditleri
| Tehdit | Olasılık | Ağırlık | Önlem |
|---|---|---|---|
| WhatsApp ban (otomasyon tespiti) | Orta | Kritik | Gecikme ekle (1–3 sn), insan-benzeri yazış hızı, mesaj limiti |
| Session file bozulması | Yüksek | Yüksek | Otomatik backup + yeniden bağlanma |
| Baileys kütüphane update kırması | Orta | Orta | Sabitlenmiş npm versiyon + semver lock |
| Disk dolması (büyük session) | Düşük | Orta | Periyodik session temizleme |

### Gerçekçi AI Implementasyon Süresi
- Temel bridge + QR akışı: **6–8 saat**
- Dashboard QR UI: **2–3 saat**
- Format sanitizer + grup filtresi: **2–3 saat**
- **Toplam: ~12–14 saat**

---

## 2. `slack_bridge.js` — YÜKSEK

### Ne Yapacak
Slack Event API ile ajan Slack workspace'ini dinler. Direkt mesaj veya mention → LLMBridge → yanıt thread'e gönderilir.

### Implementasyon Adımları
```
Adım 1: npm install @slack/web-api @slack/events-api
Adım 2: slack_bridge.js yaz (telegram_bridge.js şablonundan)
Adım 3: ui_server.js'e Slack event webhook endpoint'i ekle:
        POST /api/channels/slack/{agentId}/events
Adım 4: Slack App kurulumu rehberi (insan yapar):
        → api.slack.com/apps → Create App → Event Subscriptions → Request URL gir
Adım 5: Bot Token → Agents/{agentId}/.env → SLACK_BOT_TOKEN
Adım 6: Signing Secret → Event doğrulama (HMAC-SHA256)
Adım 7: Thread yanıt: gelen mesajın thread_ts'ini kullan → yanıt aynı thread'e
Adım 8: Rate limit handler: 429 yanıtında Retry-After header bekle
```

### Kritik Teknik Detay: Event URL Doğrulaması
```js
// Slack, webhook URL'ye "challenge" token gönderir — doğrulanmazsa çalışmaz
POST /api/channels/slack/{agentId}/events
Body: { "type": "url_verification", "challenge": "abc123" }
Yanıt: { "challenge": "abc123" } // Bunu döndürmek zorundayız
```

### Dosya Değişiklikleri
| Dosya | İşlem | Boyut |
|---|---|---|
| `channels/slack_bridge.js` | 🆕 Yeni | ~200 satır |
| `gateway/ui_server.js` | ✏️ Slack event endpoint + routing | +20 satır |
| `app/package.json` | ✏️ Slack bağımlılıkları | 2 satır |

### Gerçekçi Zorluklar

**Zorluk 1: Webhook URL'nin Dışarıya Açık Olması**
Slack, event URL'ye dışarıdan POST atar. AgentsHUB localhost'ta çalışıyorsa URL erişilemez.
```
Çözüm: ngrok veya Cloudflare Tunnel ile geçici tünel (geliştirme)
        Production: statik IP + reverse proxy (nginx)
        Bu insan konfigürasyonu gerektirir
```

**Zorluk 2: Slack Bot Scope İzinleri**
Yanlış scope = olaylar gelmez ve hata mesajları belirsizdir.
```
Gerekli scope'lar:
  - channels:history (kanal geçmişi)
  - chat:write (mesaj gönder)
  - app_mentions:read (mention'ları dinle)
  - im:history (DM geçmişi)
```

### Gerçekçi AI Implementasyon Süresi
- Bridge kodu: **4–5 saat**
- URL validation + rate limit: **2 saat**
- **Toplam: ~6–8 saat** (insan: Slack App kurulumu +1 saat)

---

## 3. `discord_bridge.js` — ORTA

### Ne Yapacak
Discord.js ile ajan bir Discord sunucusuna bot olarak katılır. Kanal mesajı veya DM → LLMBridge → yanıt.

### Implementasyon Adımları
```
Adım 1: npm install discord.js
Adım 2: discord_bridge.js yaz
Adım 3: Client intents tanımla: Guilds, GuildMessages, DirectMessages, MessageContent
Adım 4: Bot Token → Agents/{agentId}/.env → DISCORD_BOT_TOKEN
Adım 5: Mesaj filtresi: bot'un kendi mesajlarına cevap vermesin (infinite loop)
Adım 6: Discord'un 2000 karakter limiti: uzun yanıtları parçalara böl
Adım 7: Slash command desteği (opsiyonel): /soru [metin] → ajan yanıtlar
Adım 8: Rate limit: Discord Tier 1 = 5 mesaj/5 sn → burst koruma
```

### Kritik Teknik Detay: Karakter Limiti Yönetimi
```js
// Discord 2000 karakter limiti var
function splitMessage(text, maxChars = 1990) {
    const chunks = [];
    while (text.length > maxChars) {
        let splitAt = text.lastIndexOf('\n', maxChars);
        if (splitAt === -1) splitAt = maxChars;
        chunks.push(text.slice(0, splitAt));
        text = text.slice(splitAt);
    }
    chunks.push(text);
    return chunks;
}
```

### Gerçekçi Zorluklar
- **MessageContent privileged intent:** Discord, mesaj içeriğini okumak için `MESSAGE_CONTENT` privileged intent gerektirir. 100+ sunucuya sahip botlar için Discord onayı gerektirir — anlık değil.
- **Bot token güvenliği:** Token sızdırılırsa bot anında kötüye kullanılır → `.env` şifreleme veya 1Password entegrasyonu.

### Gerçekçi AI Implementasyon Süresi
**4–6 saat** (karakter limit handling ve intent yönetimi dahil).

---

## 4. `msteams_bridge.js` — ORTA

### Ne Yapacak
Microsoft Graph API üzerinden Teams kanalına mesaj gönderir; webhook ile gelen mesajları dinler.

### Implementasyon Adımları
```
Adım 1: npm install @microsoft/microsoft-graph-client @azure/msal-node
Adım 2: Azure AD'de App Registration: insan yapar (~1 saat)
Adım 3: msteams_bridge.js → Graph API auth + message send
Adım 4: Webhook: Teams'den event almak için Azure Bot Service gerekiyor (karmaşık)
         Alternatif basit yol: Outgoing Webhook ile belirli anahtar kelimede tetikleme
Adım 5: Teams Adaptive Card formatı: zengin metin yerine JSON card formatı
Adım 6: Token yönetimi: msal-node ile client credentials flow
```

### Gerçekçi Zorluklar
**Bu en karmaşık kanal entegrasyonu.** Microsoft'un Bot Framework, Adaptive Cards, Azure AD, Graph API ve Teams App Manifest zincirleri birbirine bağlı. Slack'ten 3x daha karmaşık setup.
```
En büyük engel: "Incoming Webhook" Teams'de artık deprecated.
Yeni yol: Azure Bot Service + Bot Framework SDK kurulumu
Pratik alternatif: Power Automate Webhook → Graph API mesaj post
```

### Gerçekçi AI Implementasyon Süresi
**1–2 hafta** (Azure kurulum + Graph API auth + Teams manifest).

---

## KANAL SİSTEMİ GENEL TEHDİTLERİ

| Tehdit | Kanallar | Önlem |
|---|---|---|
| Ajan halüsinasyonu → yanlış mesaj gönderir | Hepsi | Exec Approval katmanı: hassas işlemler onay bekler |
| Rate limit ban | WhatsApp, Discord | Exponential backoff + mesaj kuyruğu |
| Webhook URL değişimi | Slack, Teams | Dynamic URL registrar; restart sonrası re-register |
| Çok ajan aynı kanalda çakışır | Hepsi | Per-ajan izolasyon: her bot token benzersiz |
| Konuşma geçmişi yanlış ajan'a yazılır | Hepsi | `Agents/{agentId}/Chats/{channel}/` zorunlu path izolasyonu |

## TOPLAM KANAL SİSTEMİ ZAMAN TAHMİNİ

| Kanal | Süre | Zorluk |
|---|---|---|
| `whatsapp_bridge.js` | 12–14 saat | 🟡 Orta (ESM + QR akışı) |
| `slack_bridge.js` | 6–8 saat | 🟡 Orta (webhook URL) |
| `discord_bridge.js` | 4–6 saat | 🟢 Kolay |
| `msteams_bridge.js` | 1–2 hafta | 🔴 Zor (Azure) |
| **TOPLAM** | **~4–5 gün** (Teams hariç) | |
