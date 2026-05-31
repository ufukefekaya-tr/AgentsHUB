// ═══════════════════════════════════════════════════════════════
// SIGMA TEST HARNESS — GRUP 1: Anında Çalışması Gereken Skilleri
// ═══════════════════════════════════════════════════════════════
const http = require('http');
const fs = require('fs');
const path = require('path');

const AGENT_ID  = 'SIGMA_TESTER_V1';
const PORT      = 3434;
const API_KEY   = 'agentshub_secure_key_2026';
const AGENT_DIR = `C:/AgentsHUB/app/Agents/${AGENT_ID}`;

const results = [];

// ── Chat helper: Mesaj gönder, SSE parse et, tool_result var mı kontrol et ──
function chat(message, timeoutMs = 60000) {
    return new Promise((resolve) => {
        const body = JSON.stringify({ message });
        const opts = {
            hostname: 'localhost', port: PORT,
            path: `/api/agents/${encodeURIComponent(AGENT_ID)}/chat`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        let fullText = '';
        let toolResults = [];
        let toolCalls = [];
        let done = false;
        const timer = setTimeout(() => {
            if (!done) { done = true; resolve({ text: fullText || '[TIMEOUT]', toolResults, toolCalls, timeout: true }); }
        }, timeoutMs);

        const req = http.request(opts, (res) => {
            let buffer = '';
            res.on('data', chunk => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const json = JSON.parse(line.slice(6));
                        if (json.text) fullText += json.text;
                        if (json.tool_call) toolCalls.push(json.tool_call);
                        if (json.tool_result !== undefined) toolResults.push(json.tool_result);
                        if (json.done && !done) {
                            done = true; clearTimeout(timer);
                            resolve({ text: fullText, toolResults, toolCalls, timeout: false });
                        }
                    } catch {}
                }
            });
            res.on('end', () => {
                if (!done) { done = true; clearTimeout(timer); resolve({ text: fullText, toolResults, toolCalls, timeout: false }); }
            });
            res.on('error', e => {
                if (!done) { done = true; clearTimeout(timer); resolve({ text: `[HTTP_ERR] ${e.message}`, toolResults, toolCalls, timeout: false }); }
            });
        });
        req.on('error', e => {
            if (!done) { done = true; clearTimeout(timer); resolve({ text: `[REQ_ERR] ${e.message}`, toolResults, toolCalls, timeout: false }); }
        });
        req.write(body);
        req.end();
    });
}

// ── Test logger ──
function logTest(id, skill, scenario, resp, verification, finalVerdict) {
    const entry = {
        id, skill, scenario,
        toolTriggered: resp.toolCalls.length > 0 || resp.toolResults.length > 0,
        toolCallCount: resp.toolCalls.length,
        toolResultCount: resp.toolResults.length,
        timeout: resp.timeout,
        hallucination: !resp.timeout && resp.toolCalls.length === 0 && resp.toolResults.length === 0,
        responseSnippet: resp.text.slice(0, 400),
        verification,
        verdict: finalVerdict // SUCCESS | FAIL | HALLUCINATION | PARTIAL | ERROR_EXPECTED
    };
    results.push(entry);
    const icon = finalVerdict === 'SUCCESS' ? '✅' : finalVerdict === 'FAIL' ? '❌' : finalVerdict === 'HALLUCINATION' ? '🧠' : finalVerdict === 'ERROR_EXPECTED' ? '⚠️' : '🔶';
    console.log(`${icon} ${id} [${skill}]: ${finalVerdict} | tool=${entry.toolTriggered} | halüs=${entry.hallucination}`);
    console.log(`   Cevap: ${resp.text.slice(0, 150).replace(/\n/g, ' ')}`);
    console.log(`   Doğrulama: ${verification}\n`);
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════
async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  SIGMA TEST HARNESS — GRUP 1 BAŞLIYOR');
    console.log('═══════════════════════════════════════════\n');

    // ── T01a: calculator — 1250 * 875 ──
    {
        const resp = await chat('calculator aracini kullan. Hesapla: 1250 * 875');
        const expected = 1093750;
        const hasNumber = resp.text.includes('1093750') || resp.text.includes('1,093,750');
        const v = hasNumber ? `Beklenen ${expected} bulundu` : `Beklenen ${expected} BULUNAMADI cevap icinde`;
        logTest('T01a', 'calculator', '1250 * 875', resp, v, hasNumber ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T01b: calculator — sqrt(144) + 2^10 ──
    {
        const resp = await chat('calculator aracini kullan. Hesapla: sqrt(144) + 2^10');
        const hasNumber = resp.text.includes('1036');
        const v = hasNumber ? 'Beklenen 1036 bulundu' : 'Beklenen 1036 BULUNAMADI';
        logTest('T01b', 'calculator', 'sqrt(144)+2^10', resp, v, hasNumber ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T01c: calculator — sin(90)*pi ──
    {
        const resp = await chat('calculator aracini kullan. Hesapla: sin(90) * pi');
        // sin(90 rad) = 0.8939966... * 3.14159 = 2.808... VEYA sin(90 deg) = 1 * pi = 3.14159
        const hasPi = resp.text.includes('3.14') || resp.text.includes('2.80') || resp.text.includes('2.81');
        const v = hasPi ? 'Trigonometrik sonuc makul gorunuyor' : 'Sonuc bulunamadi veya yanlis';
        logTest('T01c', 'calculator', 'sin(90)*pi', resp, v, hasPi ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'PARTIAL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T02a: get_time — saat kac ──
    {
        const resp = await chat('get_server_time aracini kullan. Su an saat kac?');
        const now = new Date();
        const hasTime = resp.text.match(/\d{1,2}:\d{2}/) || resp.text.includes('T') || resp.text.includes('2026') || resp.text.includes('2025');
        const v = hasTime ? `Zaman verisi mevcut. Gercek: ${now.toISOString()}` : 'Zaman verisi bulunamadi';
        logTest('T02a', 'get_time', 'saat kac', resp, v, hasTime ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T02b: get_time — London timezone ──
    {
        const resp = await chat('get_server_time aracini kullan. timezone: Europe/London');
        const hasTime = resp.text.match(/\d{1,2}[:.]\d{2}/) || resp.text.includes('London') || resp.text.includes('GMT');
        const v = hasTime ? 'London saat verisi mevcut' : 'London saat verisi bulunamadi';
        logTest('T02b', 'get_time', 'London timezone', resp, v, hasTime ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T03a: weather — Istanbul ──
    {
        const resp = await chat('weather aracini kullan. Istanbul hava durumunu getir.');
        const hasTemp = resp.text.match(/-?\d+[°.]?C/i) || resp.text.match(/sicaklik|derece|temperature/i);
        const v = hasTemp ? 'Istanbul icin sicaklik verisi mevcut' : 'Sicaklik verisi bulunamadi';
        logTest('T03a', 'weather', 'Istanbul', resp, v, hasTemp ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T03b: weather — Londra ──
    {
        const resp = await chat('weather aracini kullan. London hava durumunu getir.');
        const hasTemp = resp.text.match(/-?\d+[°.]?C/i) || resp.text.match(/sicaklik|derece|temperature|humidity/i);
        const v = hasTemp ? 'London icin veri mevcut' : 'Veri bulunamadi';
        logTest('T03b', 'weather', 'London', resp, v, hasTemp ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T03c: weather — Ankara 3 gunluk ──
    {
        const resp = await chat('weather aracini kullan. Ankara icin 3 gunluk hava tahmini getir.');
        const hasForecast = resp.text.match(/gun|pazar|pazartesi|sali|carsamba|persembe|cuma|cumartesi|forecast|tahmin/i);
        const v = hasForecast ? 'Tahmin verisi mevcut' : 'Tahmin verisi bulunamadi';
        logTest('T03c', 'weather', 'Ankara 3gun', resp, v, hasForecast ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'PARTIAL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T04a: google_search — dolar kuru ──
    {
        const resp = await chat('google_search aracini kullan. Bugunun dolar TL kuru nedir?');
        const hasCurrency = resp.text.match(/\d+[.,]\d+/) && (resp.text.match(/dolar|USD|TL|kur/i));
        const v = hasCurrency ? 'Doviz verisi mevcut gorunuyor' : 'Doviz verisi yok';
        logTest('T04a', 'google_search', 'dolar kuru', resp, v, hasCurrency ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'PARTIAL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T04b: google_search — yapay zeka ──
    {
        const resp = await chat('google_search aracini kullan. "yapay zeka nedir" ara.');
        const hasResult = resp.text.length > 50;
        const v = hasResult ? `Cevap uzunlugu: ${resp.text.length} karakter` : 'Cevap cok kisa';
        logTest('T04b', 'google_search', 'yapay zeka nedir', resp, v, hasResult ? 'SUCCESS' : 'FAIL');
    }
    await delay(3000);

    // ── T05a: duckduckgo_search — Python ──
    {
        const resp = await chat('duckduckgo_search aracini kullan. "Python programming" ara.');
        const hasResult = resp.text.match(/python/i) && resp.text.length > 50;
        const v = hasResult ? 'Python arama sonuclari mevcut' : 'Sonuc yok veya cok kisa';
        logTest('T05a', 'duckduckgo_search', 'Python', resp, v, hasResult ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T05b: duckduckgo_search — baska terim ──
    {
        const resp = await chat('duckduckgo_search aracini kullan. "machine learning 2025" ara.');
        const hasResult = resp.text.length > 50;
        const v = hasResult ? `Sonuc var, ${resp.text.length} karakter` : 'Sonuc yok';
        logTest('T05b', 'duckduckgo_search', 'machine learning', resp, v, hasResult ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T06a: web_scraper — example.com ──
    {
        const resp = await chat('web_scraper aracini kullan. https://example.com adresini oku ve yaziyi getir.');
        const hasExample = resp.text.includes('Example Domain') || resp.text.includes('example');
        const v = hasExample ? '"Example Domain" metni bulundu' : '"Example Domain" BULUNAMADI';
        logTest('T06a', 'web_scraper', 'example.com', resp, v, hasExample ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T06b: web_scraper — httpbin.org ──
    {
        const resp = await chat('web_scraper aracini kullan. https://httpbin.org/html sayfa icerigini oku.');
        const hasMelville = resp.text.includes('Melville') || resp.text.includes('Moby') || resp.text.includes('Herman');
        const v = hasMelville ? 'Herman Melville metni bulundu' : 'Beklenen metin bulunamadi';
        logTest('T06b', 'web_scraper', 'httpbin.org/html', resp, v, hasMelville ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'PARTIAL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T07a: health_checker — canli siteler ──
    {
        const resp = await chat('health_checker aracini kullan. Su adresleri kontrol et: ["https://www.google.com", "https://example.com"]');
        const hasUp = resp.text.match(/UP|200|OK|saglik/i);
        const v = hasUp ? 'UP/OK durumu tespit edildi' : 'Durum bilgisi bulunamadi';
        logTest('T07a', 'health_checker', 'google+example', resp, v, hasUp ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T07b: health_checker — 503 endpoint ──
    {
        const resp = await chat('health_checker aracini kullan. Su adresi kontrol et: ["https://httpstat.us/503"]');
        const has503 = resp.text.match(/503|DEGRADED|DOWN|basarisiz/i);
        const v = has503 ? '503/DEGRADED durumu dogru tespit edildi' : '503 durumu TESPIT EDILEMEDI';
        logTest('T07b', 'health_checker', '503 endpoint', resp, v, has503 ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T08a: system_monitor — CPU RAM ──
    {
        const resp = await chat('system_monitor aracini kullan. CPU ve RAM durumunu goster.');
        const hasCPU = resp.text.match(/CPU|cpu|islemci/i) && resp.text.match(/%|\d+\s*GB/i);
        const v = hasCPU ? 'CPU/RAM verisi mevcut' : 'Sistem verisi bulunamadi';
        logTest('T08a', 'system_monitor', 'CPU+RAM', resp, v, hasCPU ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }
    await delay(3000);

    // ── T08b: system_monitor — Disk ──
    {
        const resp = await chat('system_monitor aracini kullan. Disklerin doluluk oranini goster.');
        const hasDisk = resp.text.match(/disk|GB|TB|%/i);
        const v = hasDisk ? 'Disk verisi mevcut' : 'Disk verisi bulunamadi';
        logTest('T08b', 'system_monitor', 'Disk', resp, v, hasDisk ? 'SUCCESS' : (resp.toolCalls.length > 0 ? 'FAIL' : 'HALLUCINATION'));
    }

    // ═══ SONUÇ ═══
    console.log('\n═══════════════════════════════════════════');
    console.log('  GRUP 1 SONUCLARI');
    console.log('═══════════════════════════════════════════\n');

    let s=0, f=0, h=0, p=0;
    for (const r of results) {
        if (r.verdict === 'SUCCESS') s++;
        else if (r.verdict === 'FAIL') f++;
        else if (r.verdict === 'HALLUCINATION') h++;
        else p++;
    }
    console.log(`TOPLAM: ${results.length} test`);
    console.log(`  ✅ BASARILI: ${s}`);
    console.log(`  ❌ BASARISIZ: ${f}`);
    console.log(`  🧠 HALUSİNASYON: ${h}`);
    console.log(`  🔶 KISMI/DIGER: ${p}`);

    // JSON kaydet
    fs.writeFileSync('C:/AgentsHUB/app/sigma_test_grup1.json', JSON.stringify(results, null, 2));
    console.log('\nJSON: C:/AgentsHUB/app/sigma_test_grup1.json');
}

main().catch(console.error);
