# AgentsHUB SKILL & EXTENSION ENTEGRASYON RAPORU
## PART 2 / 4 — MESSAGING CHANNEL EXTENSIONS
### (Önceliğe Göre: Kritik → Yüksek → Orta → Düşük)

> Bu grup; farklı mesajlaşma platformlarına ajan erişimi sağlayan kanal eklentileridir.
> AgentsHUB'ın halihazırda Telegram kanalı (`telegram_bridge.js`) çalışıyor.
> Her yeni kanal aynı mimari kalıpla: `mesaj gelir → LLMBridge.execute → cevap kanala akar`.
> Per-agent izolasyon zorunlu: her ajan kendi token/session'ıyla izole çalışır.

> **NOT:** Mac-only kanallar (iMessage, BlueBubbles) ve niş/Asya-odaklı kanallar (Feishu, Zalo, Tlon, Nostr, IRC) bu listede yer almaz — Platform Raporu'nda (Part 4) ele alınır.

---

## 🔴 KRİTİK ÖNCELİK

---

### 1. `whatsapp` — **WhatsApp (Baileys — KOBİ'nin Ana Kanalı)**
**Ne Yapar:** WhatsApp Web protokolünü (Baileys kütüphanesi) kullanarak her ajan için izole WhatsApp botu oluşturur; mesaj okuma ve gönderme.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Türkiye'de KOBİ iletişiminin %90'ı WhatsApp. Bu tek kanal AgentsHUB'ın ticari penetrasyonunu 10x artırır. Bir müşteri "Ben WhatsApp'ta konuşayım" dediğinde ajan orada. Resmi bir müşteri kayıt akışı, sipariş takibi, destek hattı kurulabilir. |
| **Zayıflık (W)** | WhatsApp multi-device session yönetimi: QR her numara için ayrı. State dosyası büyük (100MB+ /hesap). Cold start sonrası QR yenileme zorunluluğu. Resmi WhatsApp Business API değil — Baileys non-official; ToS riski var. |
| **Fırsat (O)** | Her ajan hücresi kendi telefon numarasıyla çalışır: "Satış Birimi → +90 555 xxx" kendi ajanıyla. Gelen mesaj → CRM'e log → ajan yanıtı. Tam otonom müşteri iletişim akışı. Idurar ERP + WhatsApp = KOBİ OS. |
| **Tehdit (T)** | WhatsApp otomasyon tespiti → ban. State dosyası bozulması → yeniden QR. Dashboard'da QR gösterimi olmadan sunucuda yönetilemez. Resmi Business API aylık $0.05–0.15/konuşma — hacimde pahalanır. |

**Entegrasyon Detayları:**

| Değişken | Değer |
|---|---|
| **Zorluk** | 🟡 Orta |
| **Tahmini Süre** | 1 hafta |
| **Maliyet** | Sıfır (Baileys açık kaynak) + sunucu RAM |
| **npm Paketi** | `@whiskeysockets/baileys` |
| **AgentsHUB Dosyası** | `app/src/channels/whatsapp_bridge.js` |
| **State Depolama** | `Agents/{agentId}/Chats/whatsapp_session/` |

**Mimari Not:**
```
telegram_bridge.js kalıbıyla birebir aynı yapı:
1. Her ajan için Baileys client başlatılır.
2. QR base64 → SSE ile Dashboard'a iletilir (kullanıcı tarar).
3. Mesaj gelir → auth filtresi → LLMBridge.execute → yanıt WhatsApp'a.
4. Konuşma Chats/ klasörüne JSON olarak kaydedilir.
```

---

## 🟠 YÜKSEK ÖNCELİK

---

### 2. `slack` — **Slack (Kurumsal İletişim Omurgası)**
**Ne Yapar:** Slack workspace'e mesaj gönderir, kanal okur, thread yapar, dosya paylaşır; Slack Event API ile gerçek zamanlı.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Kurumsal iletişim standardı. Ajanın Slack'e yazılı bildirim ve raporlar göndermesi: deploy durumu, müşteri şikayeti özeti, haftalık rapor. Event listener ile gelen mesaja otonom yanıt. |
| **Zayıflık (W)** | Slack App OAuth kurulumu 3–4 adım. Workspace admin onayı gerekiyor. Bot scope permissions karmaşık. |
| **Fırsat (O)** | `#alerts` kanalına kritik sistem uyarıları, `#sales` kanalına günlük satış raporu — tümü otonom. "DevOps Ajanı" deploy pipeline'ını Slack'ten izler. |
| **Tehdit (T)** | Slack API tier rate limit (Tier 1: 1 istek/sn). Workspace change → token yenileme. |

**Entegrasyon Detayları:**

| Değişken | Değer |
|---|---|
| **Zorluk** | 🟡 Orta |
| **Tahmini Süre** | 3–5 gün |
| **Maliyet** | Slack API: Ücretsiz; Pro: $7.25/kullanıcı/ay |
| **npm Paketi** | `@slack/web-api` + `@slack/events-api` |
| **AgentsHUB Dosyası** | `app/src/channels/slack_bridge.js` |

**Mimari Not:** Per-agent Slack Bot Token izolasyonu. Event endpoint'i `ui_server.js`'e eklenir: `POST /api/channels/slack/events`. Mesaj gelir → ajan ID tespiti → LLMBridge → yanıt.

---

## 🟡 ORTA ÖNCELİK

---

### 3. `discord` — **Discord (Geliştirici & Topluluk Kanalı)**
**Ne Yapar:** Discord guild mesajlarını dinler, kanala mesaj yazar, thread açar; Bot Event listener.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Geliştirici topluluğu ve oyun endüstrisi için kritik kanal. Ajan Discord server'ına bot olarak katılır. Community destek ajanı, mod yardımı. |
| **Zayıflık (W)** | `discord.js` kütüphanesi büyük (200+ bağımlılık). Discord Bot Token + webhook kurulumu gerektirir. |
| **Fırsat (O)** | AgentsHUB'ın kendi destek kanalı Discord olabilir — ajan soruları yanıtlar. Topluluk büyütme aracı. |
| **Tehdit (T)** | Discord API v10 değişiklikleri. Rate limit: 50 istek/sn. |

**Entegrasyon Detayları:**

| Değişken | Değer |
|---|---|
| **Zorluk** | 🟡 Orta |
| **Tahmini Süre** | 3–5 gün |
| **Maliyet** | Sıfır |
| **npm Paketi** | `discord.js` |
| **AgentsHUB Dosyası** | `app/src/channels/discord_bridge.js` |

---

### 4. `msteams` — **Microsoft Teams (Kurumsal Entegrasyon)**
**Ne Yapar:** Microsoft Teams kanalına mesaj gönderir, webhook ile bildirim yapar; Power Automate entegrasyonu.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Microsoft 365 kullanan büyük kurumsal müşterilere doğal kanal. Toplantı notu, görev ataması, ajan raporu Teams'e akar. |
| **Zayıflık (W)** | Microsoft Graph API + Azure App Registration karmaşık. Kurumsal IT departmanı onayı gerekir. |
| **Fırsat (O)** | Özellikle bankacılık ve kamu sektöründe AgentsHUB için doğal alt yapı. |
| **Tehdit (T)** | Microsoft 365 bağımlılığı. Azure AD izin yapısı iç politikalara takılabilir. |

**Entegrasyon Detayları:**

| Değişken | Değer |
|---|---|
| **Zorluk** | 🟡 Orta |
| **Tahmini Süre** | 4–6 gün |
| **Maliyet** | Microsoft 365 Business: $6+/kullanıcı/ay |
| **npm Paketi** | `@microsoft/microsoft-graph-client` |
| **AgentsHUB Dosyası** | `app/src/channels/msteams_bridge.js` |

---

### 5. `matrix` — **Matrix / Element (Şifreli Federatif Mesajlaşma)**
**Ne Yapar:** Matrix protokolü üzerinden uçtan uca şifreli mesajlaşma; self-hosted Synapse sunucu ile veri egemenliği.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Self-hosted kurulumda veriler şirkette kalır. Avrupa kamu kurumları ve gizlilik odaklı müşteriler için. |
| **Zayıflık (W)** | Kullanıcı tabanı küçük. Synapse server kurulumu ağır. |
| **Fırsat (O)** | GDPR-hassas sektörler: sağlık, hukuk, kamu. "Veriniz bizim sunucunuzda kalır" argümanı. |
| **Tehdit (T)** | Niş. Yaygınlık sorunu. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🔴 Zor | 1 hafta | Self-host sunucu maliyeti | `matrix-js-sdk` | `matrix_bridge.js` |

---

### 6. `mattermost` — **Mattermost (Self-Hosted Slack Alternatifi)**
**Ne Yapar:** Mattermost self-hosted mesajlaşma platformu; Slack'in kurumsal ve şirket içi alternatifi.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Veri şirkette kalır. Slack'i kullanamayan kapalı ağ kurumları (fabrika, askeri). |
| **Zayıflık (W)** | Çok niş; Slack ve Teams varken tercih edilmez. |
| **Fırsat (O)** | Bazı büyük sanayi müşterileri zaten Mattermost kullanıyor olabilir. |
| **Tehdit (T)** | Küçük kullanıcı tabanı. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟢 Kolay | 2 gün | Sıfır (API benzeri Slack) | `node-fetch` / REST | `mattermost_bridge.js` |

---

## 🔵 DÜŞÜK ÖNCELİK

---

### 7. `googlechat` — **Google Chat (Workspace Entegrasyonu)**
**Ne Yapar:** Google Chat bot kanalı; Space mesajlaşma, webhook bildirimi.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Google Workspace kullanan şirketlere native kanal. |
| **Zayıflık (W)** | Google Workspace plan gerektirir ($6+/kullanıcı/ay). Slack/Teams kadar yaygın değil. |
| **Fırsat (O)** | Google Workspace entegrasyonu (Part 3'teki `google` skill'i) tamamlandıktan sonra doğal ek adım. |
| **Tehdit (T)** | Az kullanıcı tabanı. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🟡 Orta | 3 gün | Workspace gerektiriyor | `googleapis` | `googlechat_bridge.js` |

---

### 8. `signal` — **Signal (Maksimum Gizlilik Kanalı)**
**Ne Yapar:** Signal mesajlaşma uygulaması kanalı; uçtan uca şifreli, log tutmayan iletişim.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | En güvenli mesajlaşma kanalı. Hukuk, finans, sağlık sektöründe hassas iletişim için. |
| **Zayıflık (W)** | `signal-cli` Java runtime gerektiriyor. Telefon numarası SMS aktivasyonu. Otomatik bot kullanımı Signal ToS'ta gri alan. |
| **Fırsat (O)** | "Verileriniz şifreli, log yok" argümanı ile premium kurumsal müşteri segmenti. |
| **Tehdit (T)** | ToS riski. Kurulum karmaşıklığı KOBİ'ye sunulamaz. |

| Zorluk | Süre | Maliyet | npm Paketi | Dosya |
|---|---|---|---|---|
| 🔴 Zor | 1 hafta | Sıfır | `signal-cli` (Java) | `signal_bridge.js` |

---

### 9. `nextcloud-talk` — **Nextcloud Talk (Self-Host Video & Mesajlaşma)**
**Ne Yapar:** Nextcloud Talk üzerinden mesajlaşma; self-hosted veri egemenliği.

| SWOT Boyutu | Analiz |
|---|---|
| **Güç (S)** | Nextcloud kullanan kurumsal/kamu müşterileri için native entegrasyon. |
| **Zayıflık (W)** | Çok niş; Nextcloud kurulumu gereği. |
| **Fırsat (O)** | Yerel yönetimler ve kamu kurumları için potansiyel. |
| **Tehdit (T)** | Küçük pazar. |

| Zorluk | Süre | Maliyet | Dosya |
|---|---|---|---|
| 🟡 Orta | 3 gün | Sıfır | `nextcloud_bridge.js` |
