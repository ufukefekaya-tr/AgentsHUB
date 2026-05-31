# OpenClaw vs AgentsHUB — Açık Kaynak Ajan Platformları Karşılaştırması

**Tarih:** Mayıs 2026  
**Kapsam:** İki açık kaynak AI ajan platformunun teknik ve kullanıcı deneyimi açısından karşılaştırması.

---

## Genel Bakış

Her iki platform da yapay zeka ajanlarının yerel bilgisayarda çalıştırılmasını sağlar, ancak farklı hedef kitlelere ve kullanım senaryolarına odaklanır.

| | OpenClaw | AgentsHUB |
|---|---|---|
| **Odak** | Geliştiriciler, terminal kullanıcıları | Son kullanıcılar, KOBİ'ler, bireyler |
| **Arayüz** | Terminal (CLI/TUI) | Görsel Dashboard (React SPA) |
| **Dil** | TypeScript | JavaScript (ESM) |
| **Kurulum** | `npm install -g` + terminal komutları | Çift tıkla → çalışır (.exe veya START.bat) |
| **Lisans** | MIT | MIT |

---

## Mimari Yaklaşım

### OpenClaw
- **Daemon + Gateway** modeli: Arka plan process'i olarak çalışır
- **Plugin SDK** ile genişletilebilir mimari
- 15+ LLM provider desteği (Google, OpenAI, Anthropic, Ollama, Mistral...)
- 12+ iletişim kanalı (Discord, Slack, Telegram, iMessage, Matrix...)
- CLI tabanlı yönetim

### AgentsHUB
- **Tek process Express sunucu** + React Dashboard
- **Sandbox tabanlı** skill sistemi — yetenekler izole worker thread'lerde çalışır
- 29 yerleşik yetenek (dosya, web, terminal, görsel üretme, PDF, Excel...)
- **3 katmanlı hafıza**: L1 RAM → L2 SQLite/Vektör → L3 Google Cache
- **Kaizen Engine**: Ajanın kendi davranışını otonom iyileştirmesi
- **Genesis**: Bir ajanın başka ajanlar oluşturabilmesi
- Görsel arayüz üzerinden tüm yönetim

---

## Temel Farklılıklar

### Kullanıcı Deneyimi

| Kriter | OpenClaw | AgentsHUB |
|--------|----------|-----------|
| Kurulum süresi | ~10 dk (terminal bilgisi gerekir) | ~2 dk (çift tıkla) |
| Teknik bilgi gereksinimi | Yüksek (CLI, config dosyaları) | Düşük (görsel arayüz) |
| Ajan oluşturma | Terminal komutları | Dashboard üzerinden tıkla-oluştur |
| Yetenek ekleme | `clawhub install skill-name` | Marketplace'ten tek tıkla kur |
| İlk çalıştırma deneyimi | Terminal çıktıları | Modern web arayüzü |

### Teknik Altyapı

| Kriter | OpenClaw | AgentsHUB |
|--------|----------|-----------|
| Model desteği | 15+ provider | Google Gemini (AI Studio + Vertex AI) |
| Kanal desteği | 12+ kanal | Web Dashboard + Telegram |
| Skill sayısı | 51 (doküman tabanlı) | 29 (çalıştırılabilir kod) |
| Hafıza sistemi | LanceDB vektör + QMD | 3 katmanlı (RAM + SQLite + Cache) |
| Otonom öğrenme | — | Kaizen Engine (otonom iyileştirme) |
| Çoklu ajan | ACP protokolü | Sinyal sistemi (ajan-ajan iletişim) |
| Circuit breaker | Retry mekanizması | Tam devre kesici (3 hata → devre aç) |
| Zamanlanmış görevler | Cron (izole process) | Cron Manager (node-cron) |

### Güvenlik

| Katman | OpenClaw | AgentsHUB |
|--------|----------|-----------|
| SSRF koruması | Outbound proxy | CyberShield + URL doğrulama |
| Sandbox | Ayrı process | Worker thread izolasyonu |
| Path koruması | realpath + symlink guard | Path Guard modülü |
| API key maskeleme | Regex maskeleme | Regex maskeleme |
| Girdi sanitizasyonu | Kanal bazlı allowlist | CyberShield AI analizi |

---

## Hangi Platform Kime Uygun?

### OpenClaw tercih edilebilir:
- Terminal kullanımında rahatsanız
- Birden fazla LLM provider'ı (OpenAI, Anthropic, Ollama) kullanmak istiyorsanız
- Discord, Slack gibi çoklu kanal entegrasyonuna ihtiyacınız varsa
- Plugin geliştirmek istiyorsanız

### AgentsHUB tercih edilebilir:
- Terminal kullanmak istemiyorsanız — tamamen görsel arayüz
- Hızlı kurulum istiyorsanız — çift tıkla çalışır
- Google Gemini ekosistemini kullanıyorsanız (ücretsiz $300 kredi)
- Ajanlarınızın kendi kendini geliştirmesini istiyorsanız (Kaizen)
- Çoklu ajan sistemi kurarak ajanların birbirleriyle iletişim kurmasını istiyorsanız
- Türkçe dil desteği ve yerel çalışma öncelikliyse
- Sıfır maliyet ile başlamak istiyorsanız

---

## Sonuç

Her iki platform da farklı ihtiyaçlara cevap verir. OpenClaw, geniş model ve kanal desteğiyle geliştirici odaklı güçlü bir altyapı sunar. AgentsHUB ise sıfır teknik bilgi gerektiren arayüzü, otonom öğrenme yetenekleri ve tek tıkla kurulum deneyimiyle son kullanıcı odaklı bir platform olarak öne çıkar.

Teknik altyapıda OpenClaw'un plugin ekosistemi ve çoklu provider desteği dikkat çekerken, AgentsHUB'ın 3 katmanlı hafıza sistemi, Kaizen otonom iyileştirme motoru ve çift tıkla çalışan kurulum deneyimi kendi alanında benzersizdir.
