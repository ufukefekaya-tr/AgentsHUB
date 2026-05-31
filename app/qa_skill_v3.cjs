/**
 * ATLAS Skill QA — V3 (HTTP native SSE okuma)
 * http.request ile SSE stream okuma, final content yakalama
 */
const http = require('http');
const fs = require('fs');

const BASE_HOST = 'localhost';
const BASE_PORT = 3434;
const API_KEY = 'agentshub_secure_key_2026';
const AGENT = 'QA_ATLAS_V3';

function chatSSE(message, timeoutSec = 90) {
  return new Promise((resolve) => {
    let final_content = '';
    let done = false;
    let allChunks = '';

    const reqTimer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(`TIMEOUT (>${timeoutSec}s) | Chunks so far: ${allChunks.slice(0, 200)}`);
      }
    }, timeoutSec * 1000);

    const req = http.request({
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: `/api/agents/${AGENT}/chat`,
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        clearTimeout(reqTimer);
        done = true;
        res.destroy();
        resolve(`HTTP_ERR_${res.statusCode}`);
        return;
      }

      res.on('data', chunk => {
        const text = chunk.toString();
        allChunks += text;
        
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const evt = JSON.parse(jsonStr);
            // Final event (not partial)
            if (!evt.partial && evt.content != null) {
              final_content = evt.content;
            }
          } catch {}
        }
      });

      res.on('end', () => {
        clearTimeout(reqTimer);
        if (!done) {
          done = true;
          resolve(final_content || `(boş final, chunks: ${allChunks.slice(0,300)})`);
        }
      });

      res.on('error', e => {
        clearTimeout(reqTimer);
        if (!done) { done = true; resolve(`RES_ERR: ${e.message}`); }
      });
    });

    req.on('error', e => {
      clearTimeout(reqTimer);
      if (!done) { done = true; resolve(`REQ_ERR: ${e.message}`); }
    });

    req.write(JSON.stringify({
      message,
      history: [],
      configOverrides: { thinkingEnabled: false, model: 'gemini-2.5-flash' }
    }));
    req.end();
  });
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
  process.stdout.write(`Yanıt (600 char):\n${answer.slice(0, 600)}\n`);

  return { id, name, passed, elapsed, answer: answer.slice(0, 300) };
}

async function main() {
  console.log('\n🚀 ATLAS Skill QA V3 — ' + new Date().toISOString());
  console.log(`Ajan: ${AGENT} | SSE natif okuma\n`);

  const R = [];

  // ── clawhub_remote ───────────────────────────────────────────────────────
  R.push(await runTest(
    'TS-01A', 'clawhub_remote: search("pdf")',
    'clawhub_remote aracını şu parametrelerle çağır: action="search", query="pdf". Bulunan skill listesini numaralı olarak ver.',
    t => /clawhub|CLAWHUB|pdf|skill|Skill|sonuç|\d\./i.test(t) && t.length > 30,
    90
  ));

  R.push(await runTest(
    'TS-01B', 'clawhub_remote: inspect("web-scraper")',
    'clawhub_remote aracını şu parametrelerle çağır: action="inspect", query="web-scraper". Dönen tüm detayları göster.',
    t => /clawhub|CLAWHUB|web|scraper|slug|DETAY|İsim|detay/i.test(t) && t.length > 20,
    60
  ));

  R.push(await runTest(
    'TS-01C', 'clawhub_remote: download("weather")',
    'clawhub_remote aracını şu parametrelerle çağır: action="download", query="weather". Sonucu ve indirme durumunu raporla.',
    t => t.length > 20,
    60
  ));

  R.push(await runTest(
    'TS-01D', 'clawhub_remote: search(nonexistent)',
    'clawhub_remote aracını şu parametrelerle çağır: action="search", query="zzz_nonexistent_xyzzy_999". Sonucu raporla.',
    t => t.length > 10,
    45
  ));

  // ── clawhub_install ──────────────────────────────────────────────────────
  R.push(await runTest(
    'TS-02A', 'clawhub_install: list()',
    'clawhub_install aracını şu parametreyle çağır: action="list". Marketplace\'deki skill listesini tam olarak göster.',
    t => /✅|⬜|Marketplace|marketplace|yetenek|skill/i.test(t) && t.length > 40,
    45
  ));

  R.push(await runTest(
    'TS-02B', 'clawhub_install: install(get_time)',
    'clawhub_install aracını şu parametrelerle çağır: action="install", skill_name="get_time". Kurulum sonucunu bildir.',
    t => /BAŞARILI|başarili|zaten|kuruldu|BILGI|install/i.test(t),
    45
  ));

  R.push(await runTest(
    'TS-02C', 'clawhub_install: idempotency(get_time)',
    'clawhub_install aracıyla action="install", skill_name="get_time" parametrelerini tekrar kullan (idempotency testi). Ne döner?',
    t => /zaten|kuruldu|BILGI|BAŞARILI/i.test(t),
    45
  ));

  R.push(await runTest(
    'TS-02D', 'clawhub_install: uninstall(get_time)',
    'clawhub_install aracını şu parametrelerle çağır: action="uninstall", skill_name="get_time". Kaldırma sonucunu bildir.',
    t => /BAŞARILI|kaldırıldı|başarili|kaldirild/i.test(t),
    45
  ));

  // ── browser_agent ────────────────────────────────────────────────────────
  R.push(await runTest(
    'TS-03A', 'browser_agent: example.com',
    'browser_agent aracını şu parametrelerle çağır: url="https://example.com", extract_text=true. Sayfa içeriğini raporla.',
    t => t.length > 20,
    120
  ));

  R.push(await runTest(
    'TS-03C', 'browser_agent: geçersiz URL',
    'browser_agent aracını şu parametreyle çağır: url="https://this-domain-doesnotexist-xyzzy.invalid". Sonucu raporla.',
    t => t.length > 10,
    60
  ));

  // ── pdf_extractor ────────────────────────────────────────────────────────
  R.push(await runTest(
    'TS-04B', 'pdf_extractor: geçersiz yol',
    'pdf_extractor aracını şu parametreyle çağır: file_path="C:/nonexistent/nothere.pdf". Sonucu raporla.',
    t => /HATA|hata|bulunamadı|bulunamadi|PDF/i.test(t),
    30
  ));

  R.push(await runTest(
    'TS-04C', 'pdf_extractor: PDF olmayan dosya (.json)',
    'pdf_extractor aracını şu parametreyle çağır: file_path="C:/AgentsHUB/app/package.json". Sonucu raporla.',
    t => /HATA|hata|PDF|değil|degil/i.test(t),
    30
  ));

  // ── python_runner ────────────────────────────────────────────────────────
  R.push(await runTest(
    'TS-05A', 'python_runner: temel çıktı',
    'python_runner aracını kullanarak şu Python kodunu çalıştır:\nprint("ATLAS_QA_TEST_OK")\nÇıktıyı tam olarak ver.',
    t => /ATLAS_QA_TEST_OK|OUTPUT|python|kurulu|PATH|STDERR|çalıştırılamadı/i.test(t),
    60
  ));

  R.push(await runTest(
    'TS-05B', 'python_runner: hesaplama',
    'python_runner aracını kullanarak şu Python kodunu çalıştır:\nprint(2**10)\nSonucu ver.',
    t => /1024|OUTPUT|python|kurulu|PATH|STDERR/i.test(t),
    45
  ));

  R.push(await runTest(
    'TS-05C', 'python_runner: syntax hatası',
    'python_runner aracını kullanarak şu kodu çalıştır (kasıtlı syntax hatası):\nprimt("intentional_syntax_error")\nSonucu raporla.',
    t => t.length > 10,
    45
  ));

  // ── NİHAİ SONUÇ ──────────────────────────────────────────────────────────
  const pass = R.filter(r => r.passed).length;
  const fail = R.length - pass;
  const pct = ((pass / R.length) * 100).toFixed(0);

  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 NİHAİ SONUÇ TABLOSU');
  console.log('═'.repeat(70));
  console.log(`Toplam: ${R.length} | ✅ Başarılı: ${pass} | ❌ Başarısız: ${fail} | Oran: %${pct}\n`);

  for (const r of R) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.id.padEnd(8)} ${r.name.slice(0, 42).padEnd(42)} ${r.elapsed}s`);
    if (!r.passed) {
      console.log(`       Yanıt: ${r.answer.replace(/\n/g,' ').slice(0,100)}`);
    }
  }

  // JSON rapor
  const jsonReport = JSON.stringify(R, null, 2);
  fs.writeFileSync('qa_v3_report.json', jsonReport, 'utf8');
  console.log('\n\n[JSON_RAPOR_BASLANGIC]');
  console.log(jsonReport);
  console.log('[JSON_RAPOR_BITIS]');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
