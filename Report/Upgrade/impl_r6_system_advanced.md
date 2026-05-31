# AGENTsHUB İMPLEMENTASYON PLANI — R6
## BELLEK, SİSTEM & İLERİ MODÜLLER
### LanceDB · HealthCheck · Skill Creator · MCP Bridge · Multi-Agent · SSH · Oracle DB · Screenshot · Kamera

> **Felsefe:** Bu bölümdeki modüller sistem altyapısını derinlemesine değiştirir. Yüzeysel skill ekleme değil, AgentsHUB'ın çekirdeğini güçlendirme. Her biri önceki katmanların tamamlanmasını bekler. Hata toleransı ve güvenlik bu bölümde maksimum olmalı.

---

## 1. `health_checker.js` — YÜKSEK (Önce Bunu Yap)

### Ne Yapacak
Sistem bağımlılıklarını (API endpoint'ler, veritabanı, WhatsApp session) periyodik ping eder; downtime'da Telegram alert üretir.

### Implementasyon Adımları
```
Adım 1: health_checker.js → cron_manager.js ile entegre (ayrı Worker Thread değil, scheduler)
Adım 2: Config → Agents/{agentId}/config.json'a healthcheck bölümü:
{
  "healthcheck": {
    "targets": [
      { "name": "Tavily API", "url": "https://api.tavily.com/health", "expected_status": 200 },
      { "name": "WhatsApp Session", "type": "local", "check": "whatsapp_connected" }
    ],
    "interval_minutes": 5,
    "alert_channel": "telegram"
  }
}
Adım 3: cron her 5 dakikada tetikler → health_checker.js → her target'ı kontrol et
Adım 4: Başarısızlıkta: telemetry_tracker.js'e kaydet + Telegram'a uyarı gönder
Adım 5: Başarısızlık sayacı: 3 ardışık hata → "Kritik" uyarı (tek hata = geçici olabilir)
```

### Gerçekçi AI Implementasyon Süresi: **3–4 saat**

---

## 2. `umi.js` LanceDB Yükseltmesi — YÜKSEK

### Ne Yapacak
AgentsHUB'ın mevcut SQLite tabanlı L2 vektör belleğini LanceDB'ye yükseltir. Semantik (embedding bazlı) hafıza araması aktif hale gelir.

### Mevcut Durum
```
app/src/memory/umi.js:
  L1: JSON dosyası (kısa dönem çalışma belleği)
  L2: SQLite (uzun dönem, keyword arama)
```

### Hedef Durum
```
app/src/memory/umi.js:
  L1: JSON dosyası (değişmez)
  L2: LanceDB (vektör arama) ← Bu bölüm değişiyor
```

### Implementasyon Adımları
```
Adım 1: npm install vectordb  (LanceDB JavaScript client)
Adım 2: Embedding servisi seç:
   → OpenAI text-embedding-3-small (R1'deki openai_adapter.js sonrası)
   → Veya HuggingFace sentence-transformers (ücretsiz, ama yavaş)
Adım 3: umi.js'de L2 katmanını refactor et:
   var db = await lancedb.connect(Agents/{agentId}/Memory/lancedb/);
   var table = await db.openTable('memories') || db.createTable('memories', schema);
Adım 4: Vektör ekleme: text → embedding → table.add([{vector, content, timestamp, tags}])
Adım 5: Vektör arama: embedding → table.search(vector).limit(5).execute()
Adım 6: Migration: mevcut SQLite kayıtları LanceDB'ye aktar (tek seferlik script)
Adım 7: Fallback: LanceDB başarısız → SQLite'a geri dön (graceful degradation)
```

### Kritik Zorluk: Windows Binary
```
LanceDB Rust binary içeriyor. Windows'ta:
  npm install vectordb → node-gyp build süreci → Visual C++ gerekebilir

Çözüm: Microsoft C++ Build Tools kurulumu gerekli (insan yapar)
Alternatif: LanceDB yerine ChromaDB (pure Python) → ama Python bağımlılığı yaratır
En iyi alternatif: 'usearch' veya '@xenova/transformers' + flat file index
```

### Gerçekçi Zorluklar
- **Embedding tutarlılığı:** Farklı zamanlarda farklı embedding modeli kullanılırsa vektörler uyumsuz olur.
- **Soğuk başlangıç:** İlk kurulumda embedding hesaplama yavaş; büyük hafıza için toplu import.
- **LanceDB Windows build:** En büyük risk. Eğer build başarısız olursa alternatif plan devreye girer.

### Gerçekçi AI Implementasyon Süresi
- LanceDB entegrasyonu: **6–8 saat**
- SQLite migration script: **2–3 saat**
- Windows binary sorunu debug: **2–4 saat** (değişken)
- **Toplam: ~10–15 saat**

---

## 3. `skill_creator.js` — YÜKSEK (Stratejik)

### Ne Yapacak
Ajan "bu işlevi yapan bir skill yok" dediğinde LLM'e yeni `.js` skill kodu yazdırır, sandbox'ta test eder, geçerse Marketplace'e kaydeder.

### Implementasyon Adımları
```
Adım 1: genesis.js güncelleme: mevcut skill listesine "skill oluştur" komutu ekle
Adım 2: skill_creator.js → Özel sistem prompt:
   "Sen bir Node.js skill yazarısın. Aşağıdaki şablona uygun bir skill yaz:
    - Worker Thread uyumlu (parentPort.on('message') ile)
    - Tool şeması JSON Schema formatında
    - Error handling eksiksiz
    - Örnek: [mevcut bir skill'in kodu...]"
Adım 3: LLM skill kodu üretir → sandbox_runner.js içinde test et:
   → Syntax hatası var mı? (acorn parse)
   → Yasaklı API çağrısı var mı? (eval, Function, process.exit, child_process — whitelist dışı)
   → Test çalıştır: basit input → beklenen output formatı döndürüyor mu?
Adım 4: Güvenlik tarama (SAST light):
   const FORBIDDEN = ['eval(', 'Function(', 'require("child_process")', '__proto__'];
   if (FORBIDDEN.some(f => code.includes(f))) throw new Error('Güvenlik ihlali');
Adım 5: Geçtiyse: Marketplace/skills/{skill_name}.js'e yaz → loader.js yeniden yükler
Adım 6: Exec Approval: yeni skill yazımı ZORUNLU kullanıcı onayı bekler
Adım 7: Rollback: skill sorunsa → dosyayı sil → önceki versiyona dön
```

### Kritik Güvenlik Katmanı
```
Skill Creator'ın ürettiği kod aşağıdaki pipeline'dan geçer:

1. Syntax parse → Hata varsa reddet (acorn ile)
2. Static analysis → Yasaklı pattern taraması
3. Sandbox test → 5 saniyelik Worker Thread timeout ile çalıştır
4. Human approval → Exec Approval mekanizması
5. Soft deploy → sadece ajan klasörüne ekle, global Marketplace'e değil

Global Marketplace'e ancak Mimar'ın explicit komutuyla eklenir.
```

### Gerçekçi Zorluklar
- **LLM'in ürettiği kod kalitesi:** Claude bu görevde Gemini'den iyi. R1'deki anthropic_adapter.js yazıldıktan sonra skill_creator.js Claude modeline yönelik çalıştırılmalı.
- **Worker Thread ESM uyumu:** LLM bazen CommonJS kod üretir → ESM'e çevirme katmanı.
- **Infinite loop:** Üretilen skill kodu sonsuz döngüye girerse Worker Thread 5 saniye timeout ile öldürülür.

### Gerçekçi AI Implementasyon Süresi
- Temel skill üretimi: **6–8 saat**
- Güvenlik tarama: **4–5 saat**
- Sandbox test pipeline: **3–4 saat**
- **Toplam: ~12–15 saat**

---

## 4. `mcp_bridge.js` — YÜKSEK (Uzun Vadeli)

### Ne Yapacak
Model Context Protocol (MCP) sunuculara bağlanır; sunucunun tool listesini AgentsHUB JSON Schema formatına normalize eder; her MCP tool otomatik AgentsHUB skill'i gibi çalışır.

### Implementasyon Adımları
```
Adım 1: npm install @modelcontextprotocol/sdk
Adım 2: mcp_bridge.js → MCP server bağlantı yöneticisi
Adım 3: Bağlantı tipi: stdio (local process) veya HTTP/SSE (remote server)
   const transport = new StdioClientTransport({ command: 'uvx', args: ['mcp-server-filesystem'] });
   const client = new Client({ name: 'agentshub-mcp-client', version: '1.0.0' });
   await client.connect(transport);
Adım 4: Tool keşfi: const tools = await client.listTools();
Adım 5: AgentsHUB normalize: MCP tool şeması → AgentsHUB JSON Schema'ya çevir
   { name: tool.name, description: tool.description, parameters: tool.inputSchema }
Adım 6: Tool çalıştırma: const result = await client.callTool({ name, arguments: params });
Adım 7: Skill loader entegrasyonu: MCP tool'ları dinamik olarak skill listesine ekle
Adım 8: Config: { "mcp_servers": [{ "name": "filesystem", "command": "uvx mcp-server-filesystem" }] }
```

### Gerçekçi Zorluklar
- **Protocol versioning:** MCP hâlâ aktif geliştirme altında; breaking change riski yüksek.
- **Stdio MCP → Windows:** `uvx` komutu Python paketi, Windows'ta ek kurulum.
- **Güven sorunu:** Harici MCP server'lar kötü amaçlı olabilir. Sadece whitelist'teki server'lara izin ver.

### Gerçekçi AI Implementasyon Süresi: **12–16 saat**

---

## 5. Multi-Agent Sinyal Sistemi (`acpx` kavramından) — ORTA

### Ne Yapacak
Bir ajan başka bir ajanı görevlendirmek için sinyal atar. "Araştırma Ajanı" tamamlayınca "Rapor Ajanı"na otomatik tetikler.

### Implementasyon Yaklaşımı (Minimalist)
```
Adım 1: ui_server.js'e yeni endpoint: POST /api/agents/{agentId}/signal
   Body: { from_agent: string, task: string, data: {} }
Adım 2: Hedef ajan bu signal'i alır → kendi LLMBridge'ine yeni görev olarak besler
Adım 3: Skill olarak: signal_agent tool → { target_agent_id, task, data }
Adım 4: Döngü koruması: ajan kendi kendine sinyal atamazsa (from === to → hata)
Adım 5: Max derinlik: sinyal zinciri 3 seviyeden fazla olamaz
```

### En Büyük Tehdit
**Sonsuz ajan döngüsü:** A → B → A → B... Derinlik sayacı ve zincir kırma mekanizması zorunlu.

### Gerçekçi AI Implementasyon Süresi: **8–10 saat**

---

## 6. `ssh_manager.js` — ORTA

### Ne Yapacak
Uzak sunucuya SSH bağlantısı; DevOps ajanı log okur, servis durumu kontrol eder.

### Implementasyon Adımları
```
Adım 1: npm install ssh2
Adım 2: ssh_manager.js → Worker Thread skill (YÜKSEK güvenlik)
Adım 3: Tool şeması:
   { host, port, username, action: "exec"|"sftp_get", command, remote_path }
Adım 4: SSH key yönetimi: Agents/{agentId}/.ssh/id_rsa — şifreli sakla
Adım 5: KOMUT WHİTELİST — en kritik güvenlik:
   ALLOWED_COMMANDS = ['ls', 'cat', 'systemctl status', 'pm2 status', 'journalctl -n 50', 'df -h', 'free -h']
   if (!ALLOWED_COMMANDS.some(cmd => command.startsWith(cmd))) throw new Error('İzinsiz komut');
Adım 6: Exec Approval: whitelist dışı herhangi bir komut için mutlak onay (bu aşamada imkânsız)
Adım 7: Timeout: 30 sn execution timeout → sonra bağlantı kes
```

### Gerçekçi AI Implementasyon Süresi: **5–7 saat**

---

## 7. `db_query.js` — ORTA (Oracle + PostgreSQL + MySQL)

### Ne Yapacak
Birden fazla veritabanı sürücüsünü destekleyen genel DB sorgu aracı. Oracle ERP, şirket içi MySQL, PostgreSQL.

### Implementasyon Adımları (Oracle hariç, önce PostgreSQL/MySQL)
```
Adım 1: npm install pg mysql2  (Oracle ayrıca: oracledb — ağır bağımlılık)
Adım 2: db_query.js → Worker Thread skill
Adım 3: Config: { db_type: "postgresql"|"mysql"|"oracle", host, port, database, user, password }
Adım 4: Sadece SELECT sorgulara izin ver (read-only mod varsayılan)
   if (!query.trim().toUpperCase().startsWith('SELECT')) throw new Error('Sadece SELECT');
Adım 5: Sonuç satır limiti: MAX 1000 satır (LLM context patlaması önlemi)
Adım 6: Oracle: oracledb npm + Oracle Instant Client binary kurulumu → ayrı adım
```

### Gerçekçi AI Implementasyon Süresi
- PostgreSQL + MySQL: **4–5 saat**
- Oracle (ayrı): **6–8 saat** (Instant Client kurulumu insan gerektirir)

---

## 8. `screenshot_capture.js` (Windows) — ORTA

### Ne Yapacak
Windows PowerShell API ile ekran görüntüsü alır → base64 → Gemini Vision'a gönderir.

### Implementasyon Adımları
```
Adım 1: screenshot_capture.js → Worker Thread skill
Adım 2: PowerShell komutu ile ekran görüntüsü:
   Add-Type -AssemblyName System.Windows.Forms
   $bitmap = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
   ...Bitmap nesnesini PNG'ye kaydet
Adım 3: child_process.exec ile PowerShell script çalıştır
Adım 4: PNG → base64 → Gemini Vision API
Adım 5: KVKK uyarısı: ajan config'de "screen_capture_consent: true" zorunlu
Adım 6: Exec Approval: her ekran görüntüsü onay bekler
```

### Gerçekçi AI Implementasyon Süresi: **4–5 saat**

---

## 9. `camera_capture.js` (Windows) — ORTA

### Ne Yapacak
Windows kamerasından kare çeker; fabrika izleme senaryosu için.

### Implementasyon Adımları
```
Adım 1: npm install node-webcam veya ffmpeg-based capture
Adım 2: ffmpeg ile Windows kameradan kare:
   ffmpeg -f dshow -i video="Kamera Adı" -frames:v 1 frame.jpg
Adım 3: Kamera adı listesi: ffmpeg -list_devices true -f dshow -i dummy
Adım 4: frame.jpg → base64 → Gemini Vision
Adım 5: Config: { camera_name: "Integrated Webcam", capture_interval: 30 }
Adım 6: Periyodik izleme: cron_manager ile her 30 saniyede bir kare → analiz
```

### Gerçekçi AI Implementasyon Süresi: **4–5 saat**

---

## MASTER TAKVİM: TÜM MODÜLLER BİRLEŞİK

### Faz 0 — Temel Altyapı (Hafta 1)
> Bu olmadan diğerleri çalışmaz
```
Gün 1: openai_adapter.js + openrouter_adapter.js
Gün 2: tavily_search.js + brave_search.js + duckduckgo_search.js
Gün 3: whatsapp_bridge.js + Dashboard QR
Gün 4: anthropic_adapter.js
Gün 5: mock_adapter.js + temel Vitest test kurulumu
```

### Faz 1 — Üretkenlik Katmanı (Hafta 2–3)
```
google_workspace.js (2 gün)
email_manager.js (1 gün)
github_manager.js (1 gün)
pdf_extractor.js + rss_reader.js (1 gün)
Exec Approval altyapısı (1–2 gün)
```

### Faz 2 — Kanal Genişlemesi (Hafta 4)
```
slack_bridge.js (1 gün)
discord_bridge.js (1 gün)
notion_manager.js + trello_manager.js (1 gün)
whisper_transcriber.js (1 gün)
```

### Faz 3 — Medya & Ses (Hafta 5–6)
```
tts_engine.js (ElevenLabs)
image_generator.js (Fal.ai)
video_analyzer.js
deepgram_transcriber.js
maps_search.js
voice_call.js
```

### Faz 4 — Sistem Derinliği (Hafta 7–9)
```
umi.js LanceDB yükseltmesi
healthcheck.js
skill_creator.js
mcp_bridge.js
ssh_manager.js
db_query.js
Multi-Agent sinyal sistemi
```

### Faz 5 — Platform Kurtarma & Edge (Hafta 10+)
```
screenshot_capture.js (Windows)
camera_capture.js (Windows)
msteams_bridge.js (Azure)
exa_search.js + perplexity_search.js
firecrawl + browser_agent.js
```

---

## NİHAİ GERÇEK TOPLAM SÜRE TAHMİNİ

| Rapor | Konu | Süre |
|---|---|---|
| R1 | LLM Adaptörler | 2–3 gün |
| R2 | Kanallar (Teams hariç) | 3–4 gün |
| R3 | Arama & Web | 3–4 gün |
| R4 | Üretkenlik + Exec Approval | 5–7 gün |
| R5 | Medya & Ses | 3–4 gün |
| R6 | Bellek & Sistem | 5–7 gün |
| **TOPLAM** | **Tam yığın** | **~6–7 hafta** |

> Not: Bu süreler AI'ın tam zamanlı çalışması ve insan onaylarının hızlı verilmesi varsayımına dayanır. Gerçek zamana insan review, hata ayıklama ve test döngüleri eklenir: **gerçekçi tamamlanma süresi ~10–12 hafta.**
