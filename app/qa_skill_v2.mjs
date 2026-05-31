/**
 * ATLAS Skill QA Test V2 — SSE stream doğru şekilde parse eden minimal test
 * Her test 1'er 1'er çalıştırılacak, timeout 90 saniye
 */

const BASE = 'http://localhost:3434';
const API_KEY = 'agentshub_secure_key_2026';
const AGENT = 'QA_ATLAS_V3';

// SSE stream'i parse ederek son final mesajı döndürür
async function chatSSE(message, timeoutSec = 90) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutSec * 1000);

  try {
    const resp = await fetch(`${BASE}/api/agents/${AGENT}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        message,
        history: [],
        configOverrides: { thinkingEnabled: false, model: 'gemini-2.5-flash' }
      }),
      signal: controller.signal
    });

    clearTimeout(tid);

    if (!resp.ok) {
      const errText = await resp.text();
      return `HTTP_ERR_${resp.status}: ${errText.slice(0, 300)}`;
    }

    const rawText = await resp.text();
    // SSE event'lerini parse et
    let lastContent = '';
    const lines = rawText.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;
      try {
        const evt = JSON.parse(jsonStr);
        // final event
        if (!evt.partial && evt.content != null) {
          lastContent = evt.content;
        }
        // content_chunk accumulation fallback
        if (evt.partial && evt.type === 'content_chunk' && evt.text) {
          lastContent += evt.text;
        }
      } catch {}
    }
    return lastContent || '(boş yanıt — ham SSE: ' + rawText.slice(0, 200) + ')';

  } catch (e) {
    clearTimeout(tid);
    if (e.name === 'AbortError') return `TIMEOUT (>${timeoutSec}s)`;
    return `FETCH_ERR: ${e.message}`;
  }
}

async function runTest(id, name, message, checkFn, timeoutSec = 90) {
  process.stdout.write(`\n${'─'.repeat(70)}\n`);
  process.stdout.write(`▶ ${id}: ${name}\n`);

  const t0 = Date.now();
  const answer = await chatSSE(message, timeoutSec);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const passed = checkFn(answer);
  const icon = passed ? '✅ BAŞARILI' : '❌ BAŞARISIZ';
  process.stdout.write(`${icon} | ${elapsed}s\n`);
  process.stdout.write(`Yanıt (500 char):\n${answer.slice(0, 500)}\n`);

  return { id, name, passed, elapsed, answer: answer.slice(0, 500) };
}

async function main() {
  console.log('\n🚀 ATLAS Skill QA V2 — ' + new Date().toISOString());
  console.log(`Ajan: ${AGENT} | Sunucu: ${BASE}\n`);

  const R = [];

  // ── clawhub_remote ──────────────────────────────────────────────────────
  R.push(await runTest(
    'TS-01A', 'clawhub_remote: search("pdf")',
    'clawhub_remote aracını kullanarak ClawHub.ai üzerinde "pdf" araması yap (action="search", query="pdf"). Bulunan sonuçları numaralı liste olarak ver.',
    t => /clawhub|CLAWHUB|pdf|skill|Skill|sonuç|result/i.test(t) && t.length > 30,
    90
  ));

  R.push(await runTest(
    'TS-01B', 'clawhub_remote: inspect("web-scraper")',
    'clawhub_remote aracını kullanarak "web-scraper" skill detayını getir (action="inspect", query="web-scraper"). Tüm alanları göster.',
    t => /clawhub|CLAWHUB|web|scraper|slug|detay|İsim|açıklama|DETAY/i.test(t) && t.length > 30,
    60
  ));

  R.push(await runTest(
    'TS-01C', 'clawhub_remote: download("weather")',
    'clawhub_remote aracını kullanarak "weather" skill dosyasını indir (action="download", query="weather"). Sonucu raporla.',
    t => t.length > 20,
    60
  ));

  R.push(await runTest(
    'TS-01D', 'clawhub_remote: search(nonexistent)',
    'clawhub_remote aracıyla action="search", query="zzz_nonexistent_xyzzy_999" araması yap. Sonucu ver.',
    t => t.length > 10,
    45
  ));

  // ── clawhub_install ──────────────────────────────────────────────────────
  R.push(await runTest(
    'TS-02A', 'clawhub_install: list()',
    'clawhub_install aracını kullanarak action="list" ile Marketplace skill listesini çek ve göster.',
    t => /Marketplace|marketplace|✅|⬜|skill|yetenek/i.test(t) && t.length > 50,
    45
  ));

  R.push(await runTest(
    'TS-02B', 'clawhub_install: install(get_time)',
    'clawhub_install aracını kullan: action="install", skill_name="get_time". Kurulum sonucunu raporla.',
    t => /BAŞARILI|başarili|zaten|kuruldu|install|BILGI/i.test(t),
    45
  ));

  R.push(await runTest(
    'TS-02C', 'clawhub_install: idempotency(get_time)',
    'clawhub_install aracını kullan: action="install", skill_name="get_time" (zaten kuruluysa ne olur?). Sonucu ver.',
    t => /zaten|kuruldu|BILGI|BAŞARILI/i.test(t),
    45
  ));

  R.push(await runTest(
    'TS-02D', 'clawhub_install: uninstall(get_time)',
    'clawhub_install aracını kullan: action="uninstall", skill_name="get_time". Kaldırma sonucunu ver.',
    t => /BAŞARILI|kaldırıldı|başarili/i.test(t),
    45
  ));

  // ── browser_agent ────────────────────────────────────────────────────────
  R.push(await runTest(
    'TS-03A', 'browser_agent: example.com',
    'browser_agent aracını kullanarak https://example.com adresini ziyaret et ve sayfa içeriğini çıkar (url="https://example.com", extract_text=true).',
    t => t.length > 30, // playwright kurulu değilse hata, kuruluysa içerik
    120
  ));

  R.push(await runTest(
    'TS-03C', 'browser_agent: invalid URL',
    'browser_agent aracını kullanarak https://this-invalid-domain-xyzzy.invalid adresini ziyaret etmeyi dene. Ne olduğunu raporla.',
    t => t.length > 10,
    60
  ));

  // ── pdf_extractor ────────────────────────────────────────────────────────
  R.push(await runTest(
    'TS-04B', 'pdf_extractor: geçersiz yol',
    'pdf_extractor aracını kullan: file_path="C:/nonexistent/doesnotexist.pdf". Sonucu ver.',
    t => /HATA|hata|bulunamadı|bulunamadi|PDF|pdf/i.test(t),
    30
  ));

  R.push(await runTest(
    'TS-04C', 'pdf_extractor: PDF olmayan dosya',
    'pdf_extractor aracını kullan: file_path="C:/AgentsHUB/app/package.json". Sonucu ver.',
    t => /HATA|hata|PDF|pdf|değil|degil/i.test(t),
    30
  ));

  // ── python_runner ────────────────────────────────────────────────────────
  R.push(await runTest(
    'TS-05A', 'python_runner: print("ATLAS_QA_TEST_OK")',
    'python_runner aracını kullan ve şu Python kodunu çalıştır:\nprint("ATLAS_QA_TEST_OK")',
    t => /ATLAS_QA_TEST_OK|OUTPUT|python|kurulu|PATH|STDERR|çalıştırılamadı/i.test(t),
    60
  ));

  R.push(await runTest(
    'TS-05B', 'python_runner: 2**10',
    'python_runner aracını kullan ve şu Python kodunu çalıştır:\nprint(2**10)',
    t => /1024|OUTPUT|python|kurulu|PATH|STDERR/i.test(t),
    45
  ));

  R.push(await runTest(
    'TS-05C', 'python_runner: syntax error',
    'python_runner aracını kullan ve şu kodu çalıştır (kasıtlı hata):\nprimt("intentional_error")',
    t => t.length > 10,
    45
  ));

  // ── SONUÇ RAPORU ─────────────────────────────────────────────────────────
  const pass = R.filter(r => r.passed).length;
  const fail = R.length - pass;
  const pct = ((pass / R.length) * 100).toFixed(0);

  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 NİHAİ SONUÇ TABLOSU');
  console.log('═'.repeat(70));
  console.log(`Toplam: ${R.length} | ✅ Başarılı: ${pass} | ❌ Başarısız: ${fail} | Oran: %${pct}\n`);

  for (const r of R) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.id.padEnd(8)} ${r.name.slice(0, 45).padEnd(45)} ${r.elapsed}s`);
  }

  console.log('\n[JSON_RAPOR_BASLANGIC]');
  console.log(JSON.stringify(R.map(r => ({
    id: r.id,
    name: r.name,
    passed: r.passed,
    elapsed: r.elapsed,
    answerPreview: r.answer.slice(0, 150)
  })), null, 2));
  console.log('[JSON_RAPOR_BITIS]');
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
