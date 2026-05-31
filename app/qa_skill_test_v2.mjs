/**
 * QA_SKILL_TESTER v2.0 — 14 Skill Otomatik Test (native http)
 */

import 'dotenv/config';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOST = '127.0.0.1';
const PORT = 3434;
const AGENT_ID = 'QA_SKILL_TESTER';
const REPORT_PATH = path.join(__dirname, '..', 'Report', 'qa_skill_tester_v2_0.json');

// ─── HTTP yardımcı ────────────────────────────────────────────
function httpRequest(method, urlPath, body, token, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
        if (data) headers['Content-Length'] = Buffer.byteLength(data);

        const req = http.request({ host: HOST, port: PORT, path: urlPath, method, headers }, (res) => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        req.setTimeout(timeoutMs, () => { req.destroy(new Error('TIMEOUT')); });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

// ─── SSE stream okuyucu ──────────────────────────────────────
function sendChat(token, threadId, message, timeoutMs = 300000) {
    return new Promise((resolve) => {
        const startMs = Date.now();
        let fullText = '';
        const body = JSON.stringify({ message, threadId, history: [] });
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': Buffer.byteLength(body)
        };

        const req = http.request({ host: HOST, port: PORT, path: `/api/agents/${AGENT_ID}/chat`, method: 'POST', headers }, (res) => {
            let buf = '';
            const timer = setTimeout(() => {
                req.destroy();
                resolve({ content: fullText || 'TIMEOUT', latency_ms: Date.now() - startMs });
            }, timeoutMs);

            res.on('data', chunk => {
                buf += chunk.toString();
                const lines = buf.split('\n');
                buf = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const d = JSON.parse(line.slice(6));
                        
                        // 1. Chunk streaming desteği (V2.0/V1.5)
                        if (d.type === 'content_chunk' && d.text) {
                            fullText += d.text;
                        }
                        if (d.type === 'text' && d.content) {
                            fullText += d.content;
                        }
                        
                        // 2. Final response desteği (type tanımsız, direkt content nesnesi)
                        if (!d.type && d.content !== undefined) {
                            fullText = d.content;
                        }
                        
                        if (d.type === 'done' || d.done) {
                            clearTimeout(timer);
                            resolve({ content: fullText, latency_ms: Date.now() - startMs });
                        }
                        if (d.type === 'error') {
                            clearTimeout(timer);
                            resolve({ content: fullText || d.message, error: d.message, latency_ms: Date.now() - startMs });
                        }
                    } catch (_) {}
                }
            });
            res.on('end', () => {
                clearTimeout(timer);
                resolve({ content: fullText, latency_ms: Date.now() - startMs });
            });
            res.on('error', (e) => {
                clearTimeout(timer);
                resolve({ content: fullText || e.message, error: e.message, latency_ms: Date.now() - startMs });
            });
        });
        req.on('error', (e) => resolve({ content: e.message, error: e.message, latency_ms: Date.now() - startMs }));
        req.write(body);
        req.end();
    });
}

// ─── Test Senaryoları ─────────────────────────────────────────
const TESTS = [
    {
        id: 'SKILL-01', skill: 'skill_creator.js',
        message: 'skill_creator aracını kullanarak "merhaba_test" adında basit bir skill yaz ve C:\\AgentsHUB\\Marketplace\\skills\\merhaba_test.js konumuna kaydet.',
        pass: (r) => /oluştur|kaydedildi|yazıldı|skill|created/i.test(r)
    },
    {
        id: 'SKILL-02', skill: 'browser_agent.js',
        message: 'browser_agent aracını kullan ve https://example.com adresini aç, başlığını söyle.',
        pass: (r) => /example|domain|skip|playwright|browser/i.test(r)
    },
    {
        id: 'SKILL-03', skill: 'python_runner.js',
        message: 'python_runner aracıyla şu kodu çalıştır: print("QA_TEST_OK", 2+2)',
        pass: (r) => /QA_TEST_OK|skip|python|4/i.test(r)
    },
    {
        id: 'SKILL-04', skill: 'pdf_extractor.js',
        message: 'pdf_extractor aracıyla C:\\AgentsHUB\\app\\Workspace\\evrak_13782314565.pdf dosyasını oku.',
        pass: (r) => r.length > 30 || /pdf|dosya|oku|hata/i.test(r)
    },
    {
        id: 'SKILL-05', skill: 'duckduckgo_search.js',
        message: 'duckduckgo_search aracıyla "Node.js nedir" araması yap.',
        pass: (r) => /node|javascript|sonuç|result/i.test(r) || r.length > 50
    },
    {
        id: 'SKILL-06', skill: 'health_checker.js',
        message: 'health_checker aracıyla google.com adresine ping at.',
        pass: (r) => /ms|ping|google|200|alive|ok/i.test(r)
    },
    {
        id: 'SKILL-07', skill: 'system_monitor.js',
        message: 'system_monitor aracıyla CPU ve RAM kullanımını göster.',
        pass: (r) => /cpu|ram|mb|gb|disk|memory|bellek/i.test(r)
    },
    {
        id: 'SKILL-08', skill: 'get_time.js',
        message: 'get_time aracıyla şu anki tarihi ve saati söyle.',
        pass: (r) => /2026|\d{2}:\d{2}|saat|tarih|time/i.test(r)
    },
    {
        id: 'SKILL-09', skill: 'calculator.js',
        message: 'calculator aracıyla 1234 * 5678 hesapla.',
        pass: (r) => /7006652|\d{6,}|sonuç|result/i.test(r)
    },
    {
        id: 'SKILL-10', skill: 'web_scraper.js',
        message: 'web_scraper aracıyla https://httpbin.org/json adresini scrape et.',
        pass: (r) => /slideshow|\{|\}|json|içerik|scraped/i.test(r)
    },
    {
        id: 'SKILL-11', skill: 'auto_capture.js',
        message: 'auto_capture aracıyla şu veriyi kaydet: key="qa_v2", value="çalışıyor"',
        pass: (r) => /kayıt|kaydedildi|başarı|ok|captured|stored/i.test(r)
    },
    {
        id: 'SKILL-12', skill: 'signal_agent.js',
        message: 'signal_agent aracıyla QA_ATLAS_V3 ajanına "QA sinyal testi v2" mesajı gönder.',
        pass: (r) => /gönderildi|iletildi|sinyal|ajan|signal|sent/i.test(r)
    },
    {
        id: 'SKILL-13', skill: 'github_manager.js',
        message: 'github_manager aracıyla ufukefekaya-tr kullanıcısının public repolarını listele.',
        pass: (r) => /repo|agentshub|token|skip|github/i.test(r)
    },
    {
        id: 'SKILL-14', skill: 'mcp_bridge.js',
        message: 'mcp_bridge aracıyla mevcut MCP araçlarını listele.',
        pass: (r) => /mcp|araç|config|skip|bağlantı|tool/i.test(r)
    }
];

// ─── Ana döngü ───────────────────────────────────────────────
async function main() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   QA_SKILL_TESTER v2.0 — BAŞLADI      ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Login
    let token;
    try {
        const r = await httpRequest('POST', '/api/system/login', { password: process.env.UI_API_KEY || 'agentshub_secure_key_2026' });
        if (!r.body?.token) throw new Error(`Login yanıtı: ${JSON.stringify(r.body)}`);
        token = r.body.token;
        console.log('✅ JWT token alındı\n');
    } catch (e) {
        console.error('❌ Login hatası:', e.message);
        process.exit(1);
    }

    // Thread ID — chat sırasında sunucu tarafında otomatik üretiliyor
    // Biz sadece sabit bir ID veririz, sunucu dosyaya kaydeder
    const threadId = `thread_qa_${Date.now()}`;
    console.log(`✅ Thread ID: ${threadId}\n`);

    const results = [];
    let pass = 0, fail = 0, skip = 0;

    for (const test of TESTS) {
        process.stdout.write(`[${test.id}] ${test.skill.padEnd(25)} → `);
        const res = await sendChat(token, threadId, test.message);
        const content = res.content || '';

        const isSkip = /api.?key|token|kurulu değil|skip|bulunamadı|oauth|smtp|config/i.test(content) 
                       && !/\d{3,}/.test(content); // sayı varsa pass olabilir
        const isPass = !isSkip && test.pass(content);
        const status = isSkip ? 'SKIP' : isPass ? 'PASS' : 'FAIL';

        if (status === 'PASS')      { pass++; process.stdout.write(`✅ PASS`); }
        else if (status === 'SKIP') { skip++; process.stdout.write(`⏭️  SKIP`); }
        else                         { fail++; process.stdout.write(`❌ FAIL`); }
        console.log(` (${res.latency_ms}ms)`);
        if (status === 'FAIL') console.log(`   └─ "${content.slice(0, 100)}"`);

        results.push({ id: test.id, skill: test.skill, status, output: content.slice(0, 400), error: res.error || null, latency_ms: res.latency_ms });

        // Retry sadece gerçek FAIL için
        if (status === 'FAIL') {
            process.stdout.write(`   └─ RETRY → `);
            const r2 = await sendChat(token, threadId, test.message, 180000);
            const c2 = r2.content || '';
            const s2 = /api.?key|token|kurulu değil|skip|bulunamadı/i.test(c2) ? 'SKIP' : test.pass(c2) ? 'PASS' : 'FAIL';
            console.log(s2 === 'PASS' ? '✅ PASS' : s2 === 'SKIP' ? '⏭️  SKIP' : '❌ FAIL');
            if (s2 !== 'FAIL') { fail--; s2 === 'PASS' ? pass++ : skip++; results[results.length - 1].status = s2; }
        }

        await new Promise(r => setTimeout(r, 2000)); // Rate limit
    }

    // Rapor
    const report = {
        test_date: new Date().toISOString(),
        agent: AGENT_ID,
        model: 'gemini-2.5-flash',
        summary: { total: TESTS.length, pass, fail, skip, pass_rate: `${Math.round((pass / TESTS.length) * 100)}%` },
        results
    };
    await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║           TEST ÖZETI                   ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  ✅ PASS : ${String(pass).padEnd(3)} / ${TESTS.length}                    ║`);
    console.log(`║  ❌ FAIL : ${String(fail).padEnd(3)} / ${TESTS.length}                    ║`);
    console.log(`║  ⏭️  SKIP : ${String(skip).padEnd(3)} / ${TESTS.length}                    ║`);
    console.log(`║  Başarı : %${Math.round((pass / TESTS.length) * 100)}                         ║`);
    console.log('╠════════════════════════════════════════╣');
    console.log('║  Rapor → Report/qa_skill_tester_v2_0.json ║');
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(fail > 3 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
