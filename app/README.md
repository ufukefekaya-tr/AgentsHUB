# AgentsHUB v1.0 Beta

**EHARTE Elektrikli Hava Araçları Teknolojileri Ltd. Şti. tarafından geliştirilmiştir.**
**Tüm Hakları Saklıdır.**

---

Kişisel bilgisayarınızda çalışan, otonom AI ajan platformu. Ajanlarınız dosya okur/yazar, terminal komutu çalıştırır, internet araması yapar, hava durumu sorgular, ekran görüntüsü alır ve daha fazlasını — sizin yerinize yapar.

## Hızlı Kurulum

### 1. Gereksinimler
- **Node.js** v18 veya üzeri
- **Google AI Studio** API anahtarı → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 2. Kurulum
```bash
npm install
```

### 3. Ortam Değişkenleri
`.env.example` dosyasını `.env` olarak kopyalayın ve düzenleyin:
```bash
cp .env.example .env
```

### 4. Başlatma
```bash
npm start
```
Dashboard otomatik olarak `http://localhost:3004` adresinde açılır.

### 5. İlk Adımlar
1. Dashboard'da **Ayarlar** → Google AI Studio API anahtarınızı yapıştırın
2. **Forge** → Yeni bir ajan oluşturun
3. **Arena** → Ajanınızla konuşmaya başlayın

## Özellikler

| Özellik | Açıklama |
|---|---|
| 🤖 Çoklu Ajan | Birden fazla bağımsız ajan oluşturma ve yönetme |
| 🧠 10+ Yetenek | Dosya işlemleri, terminal, hesaplama, hava durumu, web scraping, ekran görüntüsü... |
| 🔍 Google Arama | Güncel internet araması ve bilgi çekme |
| 💬 Telegram | Telegram bot entegrasyonu ile uzaktan erişim |
| ⏰ Cron Zamanlayıcı | Zamanlanmış otonom görevler |
| 📊 Telemetri | Canlı token harcaması ve performans izleme |
| 🛡️ Güvenlik | 3 kademeli izin sistemi (Güvenli/Sınırlı/Sınırsız) |
| 🧬 Kaizen | Otonom öz-öğrenme ve evrimleşme motoru |

## Mimari

```
app/
├── Agents/              # Ajan hücreleri (her biri bağımsız)
│   └── {AjanAdı}/
│       ├── Mind-Set_Core/   # DNA, config, kurallar
│       ├── Chats/           # Sohbet geçmişi
│       └── skills/          # Ajan yetenekleri
├── src/
│   ├── bridge/          # LLM bağlantı katmanı (Gemini adapter)
│   ├── core/            # Motor: shield, backoff, circuit breaker, kaizen
│   ├── gateway/         # API sunucusu ve SSE streaming
│   ├── memory/          # Genesis, UMI, parser, L2/L3 bellek
│   ├── channels/        # Telegram bridge
│   ├── scheduler/       # Cron zamanlayıcı
│   ├── skills/          # Skill loader, sandbox, worker
│   └── utils/           # Logger, telemetri, dosya yönetimi
├── dashboard/           # React frontend (Vite)
└── .env                 # Ortam değişkenleri
```

## Ortam Değişkenleri

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `UI_PORT` | 3004 | Dashboard port numarası |
| `UI_API_KEY` | — | Dashboard API güvenlik anahtarı |
| `NODE_ENV` | production | Çalışma ortamı |
| `CORS_ORIGINS` | localhost | İzin verilen origin'ler |

## Lisans

© 2026 EHARTE Elektrikli Hava Araçları Teknolojileri Ltd. Şti. — Tüm Hakları Saklıdır.
