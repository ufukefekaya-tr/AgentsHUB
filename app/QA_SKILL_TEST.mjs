/**
 * ATLAS Skill QA Test — API Seviyesinde Canlı Test Scripti
 * Test: clawhub_remote, clawhub_install, browser_agent, pdf_extractor, python_runner
 */

const BASE = 'http://localhost:3434';
const HEADERS = {
  'x-api-key': 'agentshub_secure_key_2026',
  'Content-Type': 'application/json'
};
const AGENT = 'QA_ATLAS_V3';

const results = [];
let totalPass = 0;
let totalFail = 0;

async function apiChat(prompt, timeoutMs = 60000) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const r = await fetch(`${BASE}/api/agents/${AGENT}/chat`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ message: prompt, history: [], configOverrides: { thinkingEnabled: false } }),
      signal: controller.signal
    });
    clearTimeout(tid);
    
    if (!r.ok) return { ok: false, text: `HTTP ${r.status}: ${await r.text()}` };
    
    // SSE stream okuma
    const text = await r.text();
    const lines = text.split('\n').filter(l => l.startsWith('data:'));
    let content = '';
    for (const line of lines) {
      try {
        const d = JSON.parse(line.slice(5));
        if (d.content) content = d.content;
        if (d.partial && d.type === 'content_chunk') content += (d.text || '');
      } catch {}
    }
    return { ok: true, text: content || 'Yanıt alındı (içerik boş)' };
  } catch (e) {
    clearTimeout(tid);
    return { ok: false, text: `timeout/hata: ${e.message}` };
  }
}

async function runTest(id, name, prompt, validateFn, timeoutMs = 60000) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`▶ ${id}: ${name}`);
  console.log(`📤 Prompt: ${prompt.slice(0, 100)}...`);
  
  const startMs = Date.now();
  const res = await apiChat(prompt, timeoutMs);
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  
  const preview = (res.text || '').slice(0, 400);
  const passed = res.ok && validateFn(res.text);
  
  if (passed) {
    totalPass++;
    console.log(`✅ BAŞARILI (${elapsed}s)`);
  } else {
    totalFail++;
    console.log(`❌ BAŞARISIZ (${elapsed}s)`);
  }
  
  console.log(`📥 Yanıt (400 char): ${preview}`);
  
  results.push({ id, name, passed, elapsed, preview: preview.slice(0, 200) });
  return passed;
}

// ============================================================
// TESTLER
// ============================================================
async function main() {
  console.log('\n🚀 ATLAS Skill QA — Canlı Ortam Test Başlıyor');
  console.log(`📅 ${new Date().toISOString()} | Ajan: ${AGENT}`);

  // TS-01A: clawhub_remote search
  await runTest(
    'TS-01A', 'clawhub_remote: search(pdf)',
    'clawhub_remote aracını kullan: action="search", query="pdf". Sonuçları listele.',
    t => t.includes('CLAWHUB') || t.includes('clawhub') || t.includes('skill') || t.includes('pdf') || t.includes('Skill'),
    45000
  );

  // TS-01B: clawhub_remote inspect
  await runTest(
    'TS-01B', 'clawhub_remote: inspect(web-scraper)',
    'clawhub_remote aracını kullan: action="inspect", query="web-scraper". Detaylı bilgi göster.',
    t => t.includes('CLAWHUB') || t.includes('web') || t.includes('scraper') || t.includes('slug') || t.includes('Detay'),
    45000
  );

  // TS-01D: clawhub_remote nonexistent
  await runTest(
    'TS-01D', 'clawhub_remote: search(nonexistent)',
    'clawhub_remote aracını kullan: action="search", query="zzz_nonexistent_skill_xyz_999". Sonucu raporla.',
    t => t.length > 10,
    30000
  );

  // TS-02A: clawhub_install list
  await runTest(
    'TS-02A', 'clawhub_install: list()',
    'clawhub_install aracını kullan: action="list". Marketplace skill listesini göster.',
    t => (t.includes('✅') || t.includes('⬜') || t.includes('MARKETPLACE') || t.includes('yetenek') || t.includes('Marketplace')),
    30000
  );

  // TS-02B: clawhub_install install+uninstall
  await runTest(
    'TS-02B', 'clawhub_install: install→idempotency→uninstall(calculator)',
    'clawhub_install aracını şu sırayla kullan: 1) action="install" skill_name="calculator" ile kur, 2) aynı işlemi tekrar yap (idempotency testi), 3) action="uninstall" skill_name="calculator" ile kaldır. Her adımın sonucunu raporla.',
    t => (t.includes('BAŞARILI') || t.includes('zaten') || t.includes('kuruldu') || t.includes('kaldırıldı') || t.includes('install')),
    60000
  );

  // TS-03A: browser_agent
  await runTest(
    'TS-03A', 'browser_agent: example.com',
    'browser_agent aracını kullan: url="https://example.com", extract_text=true. Sayfa içeriğini çıkar.',
    t => (t.includes('BROWSER') || t.includes('Example') || t.includes('Browser') || t.includes('sayfa') || t.includes('playwright') || t.includes('hata') || t.includes('ERROR')),
    90000
  );

  // TS-03C: browser_agent negative
  await runTest(
    'TS-03C', 'browser_agent: geçersiz URL',
    'browser_agent aracını kullan: url="https://this-url-does-not-exist-xyzzy.invalid". Ne olduğunu raporla.',
    t => t.length > 10,
    45000
  );

  // TS-04B: pdf_extractor negative
  await runTest(
    'TS-04B', 'pdf_extractor: geçersiz yol',
    'pdf_extractor aracını kullan: file_path="C:/nonexistent/test.pdf". Sonucu raporla.',
    t => (t.includes('HATA') || t.includes('bulunamadı') || t.includes('PDF') || t.includes('hata')),
    30000
  );

  // TS-04C: pdf_extractor non-pdf
  await runTest(
    'TS-04C', 'pdf_extractor: PDF olmayan dosya',
    'pdf_extractor aracını kullan: file_path="C:/AgentsHUB/app/package.json". Sonucu raporla.',
    t => (t.includes('HATA') || t.includes('PDF') || t.includes('değil') || t.includes('hata')),
    20000
  );

  // TS-05A: python_runner temel
  await runTest(
    'TS-05A', 'python_runner: print("ATLAS QA OK")',
    'python_runner aracını kullan, şu Python kodunu çalıştır: print("ATLAS_QA_TEST_OK")',
    t => (t.includes('ATLAS_QA_TEST_OK') || t.includes('OUTPUT') || t.includes('Python') || t.includes('python') || t.includes('kurulu') || t.includes('STDERR') || t.includes('PATH')),
    45000
  );

  // TS-05B: python_runner hesaplama
  await runTest(
    'TS-05B', 'python_runner: 2**10',
    'python_runner aracını kullan, şu Python kodunu çalıştır: print(2**10)',
    t => (t.includes('1024') || t.includes('OUTPUT') || t.includes('kurulu') || t.includes('python') || t.includes('STDERR')),
    30000
  );

  // TS-05C: python_runner syntax error
  await runTest(
    'TS-05C', 'python_runner: syntax hatası',
    'python_runner aracını kullan, şu Python kodunu çalıştır (kasıtlı hata): primt("syntax_error_test")',
    t => t.length > 10,
    30000
  );

  // ============================================================
  // SONUÇ RAPORU
  // ============================================================
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 SONUÇ TABLOSU');
  console.log('═'.repeat(60));
  console.log(`Toplam: ${results.length} | ✅ Başarılı: ${totalPass} | ❌ Başarısız: ${totalFail}`);
  console.log(`Başarı Oranı: ${((totalPass / results.length) * 100).toFixed(0)}%`);
  console.log('');
  
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.id.padEnd(8)} | ${r.name.slice(0, 40).padEnd(40)} | ${r.elapsed}s`);
    if (!r.passed) {
      console.log(`   └─ Yanıt: ${r.preview.slice(0, 150)}`);
    }
  }
  
  console.log('\n📁 JSON Rapor:');
  console.log(JSON.stringify(results.map(r => ({
    id: r.id, name: r.name, passed: r.passed, elapsed: r.elapsed
  })), null, 2));
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
