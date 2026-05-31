# AGENTsHUB İMPLEMENTASYON PLANI — R4
## ÜRETKENLİK & WORKSPACE ARAÇLARI
### Google Workspace · E-posta · GitHub · Notion · Trello · Obsidian · PDF · RSS · ERP

> **Felsefe:** Bu skill'lerin tamamı `Marketplace/skills/` altında izole `.js` dosyaları. Worker Thread sandbox içinde çalışır. Yazma işlemleri (e-posta gönderme, dosya oluşturma) Exec Approval katmanıyla korunur.

---

## 1. `google_workspace.js` — KRİTİK

### Ne Yapacak
Gmail okuma/yazma, Google Drive dosya yönetimi, Google Calendar etkinlik oluşturma/okuma.

### Implementasyon Adımları
```
Adım 1: npm install googleapis
Adım 2: Google Cloud Console (insan yapar ~1 saat):
   → Proje oluştur → OAuth 2.0 Credentials → Authorized redirect URIs
   → Gmail, Drive, Calendar API'lerini enable et
Adım 3: İlk kimlik doğrulama akışı:
   → Kullanıcı tarayıcıda onay URL'sini açar → kod döner → refresh token sakla
Adım 4: Refresh token → Agents/{agentId}/.env → GOOGLE_REFRESH_TOKEN
Adım 5: google_workspace.js → her servis için alt fonksiyon:
   gmail_read(maxResults), gmail_send(to, subject, body)
   drive_list(query), drive_read(fileId), drive_create(name, content)
   calendar_list(timeMin, timeMax), calendar_create(summary, start, end)
Adım 6: Token auto-refresh: googleapis OAuth2Client otomatik yapar (yerleşik)
Adım 7: Tool şeması:
   { service: "gmail"|"drive"|"calendar", action: "read"|"send"|"create"|"list", params: {...} }
```

### OAuth 2.0 Akışı (İlk Kurulum)
```
1. AgentsHUB'da yeni endpoint: GET /api/agents/{id}/google-auth → URL döner
2. Kullanıcı URL'yi açar → Google onay sayfası → "İzin Ver"
3. Google redirect_uri'ye code döner → POST /api/agents/{id}/google-callback
4. Code → access_token + refresh_token → Agents/{agentId}/.env'e kaydet
5. Sonraki tüm isteklerde refresh_token kullanılır (expires olmaz)
```

### Gerçekçi Zorluklar

**Zorluk 1: OAuth redirect_uri localhost problemi**
Google, localhost redirect_uri'yi kabul BETİ eder (test amaçlı). Production'da statik URL + HTTPS şart.

**Zorluk 2: Scope Granülaritesi**
Gmail için ayrı scope, Drive için ayrı scope. Fazla scope isteyince Google "Unverified App" uyarısı gösterir.
```
Minimum scope seti:
  gmail.readonly (okuma) → gmail.send (gönderme için ayrı)
  drive.readonly (okuma) → drive.file (yazma için)
  calendar.readonly → calendar.events (yazma)
Öneri: Başlangıçta sadece readonly scope ile başla, yazma sonra ekle.
```

**Zorluk 3: Gmail ile Büyük Inbox**
`maxResults=50` varsayılan → 50 e-posta başlığı LLM'e geliyor → context şişer.
```
Çözüm: Başlangıçta sadece unread + son 24 saat filtresi:
   q: "is:unread newer_than:1d"
   maxResults: 10
```

**Zorluk 4: Drive Dosya Tipi**
Google Docs, Sheets, Slides MIME tipi özel → string olarak `export` gerekli.
```js
// Google Docs'u metin olarak çek:
const response = await drive.files.export({ fileId, mimeType: 'text/plain' });
```

### Exec Approval Gerektiren İşlemler
```
gmail_send(), drive_create(), drive_delete(), calendar_create(), calendar_delete()
→ Bu işlemler LLMBridge'den önce "onay bekleniyor" durumuna geçer
→ Dashboard'da onay butonu çıkar
→ Kullanıcı onaylarsa işlem devam eder
```

### Gerçekçi AI Implementasyon Süresi
- Kod yazımı: **8–12 saat**
- OAuth akışı (UI dahil): **4–6 saat**
- Test: **3–4 saat**
- **Toplam: ~15–20 saat** (en karmaşık productivity skill'i)

---

## 2. `email_manager.js` — YÜKSEK

### Ne Yapacak
SMTP ile e-posta gönderme (nodemailer), IMAP ile gelen kutusu okuma (imapflow). Provider bağımsız — Gmail, Outlook, Yandex, özel SMTP.

### Implementasyon Adımları
```
Adım 1: npm install nodemailer imapflow
Adım 2: email_manager.js → Worker Thread skill
Adım 3: Config → Agents/{agentId}/.env:
   EMAIL_HOST=smtp.gmail.com, EMAIL_PORT=587, EMAIL_USER, EMAIL_PASS
   IMAP_HOST=imap.gmail.com, IMAP_PORT=993
Adım 4: Gönderme:
   const transporter = nodemailer.createTransport({host, port, auth});
   await transporter.sendMail({from, to, subject, text, html})
Adım 5: Okuma:
   const client = new ImapFlow({host, port, auth, tls: true});
   await client.connect();
   const messages = await client.fetchAll('INBOX', {envelope: true, bodyText: true});
Adım 6: E-posta kategorilendirme: LLM'e "bu e-postayı kategorile" komutu
Adım 7: Exec Approval: sendMail her zaman onay bekler
```

### Gerçekçi Zorluklar

**Zorluk 1: Gmail'in App Password Zorunluluğu**
Gmail 2FA aktifse normal şifre çalışmaz. Google'ın "App Password" özelliğini kullanmak gerekir.
```
Kullanıcıya setup rehberi gerekli:
Google Hesap → Güvenlik → 2 Adımlı Doğrulama → Uygulama Şifreleri
```

**Zorluk 2: IMAP Büyük Inbox Performansı**
10.000+ e-posta olan inbox'ta `fetchAll` zaman aşımı. Sayfalama şart.
```js
// Sayfalama ile son 20 e-posta:
const mailbox = await client.mailboxOpen('INBOX');
const lastUid = mailbox.uidNext - 1;
const range = `${Math.max(1, lastUid - 20)}:${lastUid}`;
```

**Zorluk 3: Attachment Güvenliği**
E-posta eklerini indirmek + LLM'e göndermek veri sızıntısı riski.
```
Önlem: Attachment içeriği asla LLM'e gönderilmez; sadece dosya adı ve tipi.
       Ek okumak için ayrı explicit komut + Exec Approval.
```

### Gerçekçi AI Implementasyon Süresi: **6–8 saat**

---

## 3. `github_manager.js` — YÜKSEK

### Ne Yapacak
GitHub repo, PR, issue, CI/CD yönetimi. Octokit REST API ile — `gh` CLI bağımlılığı yok.

### Implementasyon Adımları
```
Adım 1: npm install @octokit/rest
Adım 2: github_manager.js → Worker Thread skill
Adım 3: GitHub Personal Access Token → .env → GITHUB_PAT
Adım 4: Tool şeması:
{
  action: "list_prs"|"get_pr"|"create_issue"|"get_run_log"|
          "list_issues"|"merge_pr"|"comment_issue"|"get_repo_info",
  repo: "owner/repo",
  id: number (PR veya issue numarası),
  body: string (yorum veya issue içeriği)
}
Adım 5: Octokit kullanımı:
   const octokit = new Octokit({ auth: GITHUB_PAT });
   const { data } = await octokit.rest.pulls.list({ owner, repo, state: 'open' });
Adım 6: CI run log çekme: şifte byte[] → text → son 100 satır kes (log çok uzun)
Adım 7: Exec Approval: merge_pr ve comment_issue işlemleri onay bekler
```

### Gerçekçi Zorluklar

**Zorluk 1: CI Log Boyutu**
GitHub Actions log bazen 50MB. Ham log LLM context'ini patlatır.
```js
// Sadece son 100 satırı al ve hata içeren satırları filtrele:
const logLines = rawLog.split('\n');
const errorLines = logLines.filter(l => l.includes('Error') || l.includes('FAILED'));
const lastHundred = logLines.slice(-100);
const summary = [...new Set([...errorLines, ...lastHundred])].join('\n');
```

**Zorluk 2: GitHub Rate Limit**
Unauthenticated: 60 istek/saat. PAT ile: 5.000 istek/saat. Sorun yok ama monitor edilmeli.

**Zorluk 3: Fine-Grained Token İzinleri**
Yeni GitHub fine-grained PAT'lerde her repo için ayrı izin gerekiyor. Klasik PAT daha kolay ama güvenlik riski.

### Gerçekçi AI Implementasyon Süresi: **4–6 saat**

---

## 4. `notion_manager.js` — ORTA

### Ne Yapacak
Notion workspace sayfası okuma, veritabanı sorgulama, yeni içerik ekleme.

### Implementasyon Adımları
```
Adım 1: npm install @notionhq/client
Adım 2: Notion Integration Token → .env → NOTION_TOKEN
Adım 3: notion_manager.js → Worker Thread skill
Adım 4: Tool şeması:
{
  action: "read_page"|"query_database"|"append_block"|"create_page",
  page_id: string, database_id: string, filter: {}, data: {}
}
Adım 5: Rate limit: 3 req/sn → her istekten sonra 340ms bekle (otomatik)
Adım 6: Rich text parse: Notion'ın blok formatı karmaşık → yardımcı parser fonksiyonu
   blocks → düz metin dönüşümü LLM için
Adım 7: Exec Approval: append_block ve create_page onay bekler
```

### Gerçekçi Zorluklar

**Zorluk 1: Notion Rich Text Formatı**
Notion sayfası düz metin değil, nested block tree yapısı döner. LLM'e verilebilmesi için parse şart.
```js
// Örnek Notion block yapısı → düz metin
function blocksToText(blocks) {
    return blocks.map(block => {
        if (block.type === 'paragraph') {
            return block.paragraph.rich_text.map(t => t.plain_text).join('');
        }
        if (block.type === 'heading_1') {
            return '# ' + block.heading_1.rich_text.map(t => t.plain_text).join('');
        }
        // ... diğer block tipleri
    }).join('\n');
}
```

**Zorluk 2: Sayfa Erişim İzinleri**
Integration sadece "shared" edilen sayfalara erişebilir. Tüm workspace otomatik erişilemez.

### Gerçekçi AI Implementasyon Süresi: **4–5 saat**

---

## 5. `trello_manager.js` — ORTA

### Ne Yapacak
Trello board, liste, kart yönetimi. REST API v1 ile — çok basit entegrasyon.

### Implementasyon Adımları
```
Adım 1: Trello API Key + Token → .env
Adım 2: trello_manager.js → Worker Thread skill
Adım 3: Tool şeması:
   { action: "list_boards"|"list_cards"|"create_card"|"move_card"|"archive_card",
     board_id, list_id, card_id, name, desc, due }
Adım 4: fetch ile Trello REST API:
   GET https://api.trello.com/1/boards/{id}/cards?key={KEY}&token={TOKEN}
Adım 5: Exec Approval: create_card ve move_card onay bekler (opsiyonel)
```

### Gerçekçi AI Implementasyon Süresi: **2–3 saat** (en basit skill)

---

## 6. `obsidian_memory.js` — ORTA

### Ne Yapacak
Obsidian vault klasörüne not okuma/yazma/arama. Dosya sistemi erişimi — API yok.

### Implementasyon Adımları
```
Adım 1: Vault yolu → Agents/{agentId}/.env → OBSIDIAN_VAULT_PATH
Adım 2: obsidian_memory.js → Worker Thread skill
Adım 3: Tool şeması:
   { action: "read"|"write"|"search"|"list", filename, content, query }
Adım 4: read: fs.readFile(path.join(vault, filename), 'utf8')
Adım 5: write: frontmatter ekle → fs.writeFile (Exec Approval)
Adım 6: search: fs.readdirSync + her .md dosyasında content.includes(query)
         Büyük vault için: glob + readline stream
Adım 7: Frontmatter: her yazılan nota tarih + ajan ID ekle
   ---
   date: 2026-03-30
   agent: SatisAjani
   tags: [gorüsme, müşteri]
   ---
```

### Gerçekçi Zorluklar
- **Büyük vault arama yavaşlığı:** 10.000+ dosyada string search yavaşlar. Çözüm: `fuse.js` fuzzy search veya sadece son N günün notlarında arama.
- **Eşzamanlı yazma:** İki ajan aynı nota yazarsa çakışma. Her ajan kendi alt klasörüne yazmalı.

### Gerçekçi AI Implementasyon Süresi: **2–3 saat**

---

## 7. `pdf_extractor.js` — YÜKSEK

### Ne Yapacak
PDF dosyasından metin çıkarır. Fatura, sözleşme, teknik doküman analizi için temel araç.

### Implementasyon Adımları
```
Adım 1: npm install pdf-parse
Adım 2: pdf_extractor.js → Worker Thread skill
Adım 3: Tool şeması:
   { file_path: string, max_pages: number, summary_mode: boolean }
Adım 4: const pdfData = await pdf(fs.readFileSync(filePath));
         return { text: pdfData.text, pages: pdfData.numpages, info: pdfData.info }
Adım 5: Token limiti: max 5000 karakter → sonrası "... devamı için sayfa numarası belirtin"
Adım 6: summary_mode: true ise sadece ilk 3 sayfa + son sayfa (yönetici özeti)
```

### Gerçekçi Zorluklar
- **Taranmış PDF (image-only):** `pdf-parse` metin bulamaz → OCR gerekli (Tesseract.js — ayrı entegrasyon, karmaşık).
- **Büyük PDF:** 100 sayfalık doküman → LLM context patlar. Sayfa sınırı zorunlu.
- **PDF şifresi:** Şifreli PDF açılamaz → kullanıcıya şifre sorar.

### Gerçekçi AI Implementasyon Süresi: **2–3 saat**

---

## 8. `rss_reader.js` — ORTA

### Ne Yapacak
RSS/Atom beslemelerini parse eder; yeni makaleleri özet formatta döner. Cron Manager ile birleşince periyodik haber takibi yapılır.

### Implementasyon Adımları
```
Adım 1: npm install rss-parser
Adım 2: rss_reader.js → Worker Thread skill
Adım 3: Tool şeması:
   { url: string, max_items: number, since_hours: number }
Adım 4: const parser = new Parser(); const feed = await parser.parseURL(url);
Adım 5: Tarih filtresi: since_hours ile son N saatte yayınlananları filtrele
Adım 6: Format: { title, link, pubDate, summary } listesi
Adım 7: Cron ile: her sabah 08:00 → tanımlı RSS listemi tara → Telegram'a özet gönder
```

### Gerçekçi AI Implementasyon Süresi: **2 saat**

---

## 9. `erp_connector.js` — ORTA

### Ne Yapacak
Idurar ERP REST API ile sipariş, müşteri, stok sorgulama. AgentsHUB + Idurar ERP = tam otonom KOBİ OS.

### Implementasyon Adımları
```
Adım 1: Idurar API Base URL ve API Key → .env
Adım 2: erp_connector.js → Worker Thread skill
Adım 3: Tool şeması:
{
  action: "list_orders"|"get_order"|"list_customers"|"get_customer"|
          "list_products"|"get_stock"|"create_invoice",
  params: { status, dateFrom, dateTo, customerId, productId }
}
Adım 4: Idurar REST API: GET /api/order?page=1&items=20&q=...
Adım 5: Auth: IDURAR_TOKEN header ile
Adım 6: Exec Approval: create_invoice mutlaka onay bekler
```

### Gerçekçi AI Implementasyon Süresi: **3–4 saat** (Idurar API dökümantasyonu okunarak)

---

## GENEL EXEC APPROVAL KATMANI

Tüm yazma işlemleri için standart approval mekanizması gerekli. Bu mekanizma henüz AgentsHUB'da **yok** — R4 için yeni bir sistem bileşeni eklenmeli.

### Exec Approval Implementasyon (Genel Altyapı)
```
1. llm_bridge.js'de özel işaretçi: skill yanıtında { requires_approval: true, pending_action: {...} }
2. ui_server.js: pending action'ı SSE ile Dashboard'a gönder
3. Dashboard: "Onay Bekliyor" kartı göster — "Onayla" / "Reddet" butonları
4. Kullanıcı onaylarsa: POST /api/agents/{id}/approve?action_id=xxx
5. llm_bridge.js işlemi devam ettirir veya iptal eder
```

Bu approval altyapısı: **~8–12 saat** ek implementasyon.

---

## ÖZET: R4 Zaman Tahmini

| Modül | Süre |
|---|---|
| `google_workspace.js` | 15–20 saat |
| `email_manager.js` | 6–8 saat |
| `github_manager.js` | 4–6 saat |
| `notion_manager.js` | 4–5 saat |
| `pdf_extractor.js` | 2–3 saat |
| `trello_manager.js` | 2–3 saat |
| `obsidian_memory.js` | 2–3 saat |
| `rss_reader.js` | 2 saat |
| `erp_connector.js` | 3–4 saat |
| Exec Approval altyapısı | 8–12 saat |
| **TOPLAM** | **~5–7 gün** |
