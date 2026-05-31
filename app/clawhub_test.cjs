// ClawHub tam canli test - CommonJS
const fs = require('fs/promises');
const http = require('http');
const path = require('path');

const API_KEY = 'agentshub_secure_key_2026';
const AGENT_PORT = 3434;
const MARKET_DIR = 'C:/AgentsHUB/Marketplace/skills';

const report = [];

function log(section, status, detail) {
    const line = `[${status}] ${section}: ${String(detail).slice(0, 300)}`;
    console.log(line);
    report.push(line);
}

// HTTP fetch helper (Node built-in fetch)
async function fetchJSON(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
        const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
        clearTimeout(timer);
        return { status: r.status, ok: r.ok, ct: r.headers.get('content-type'), body: await r.text() };
    } catch(e) {
        clearTimeout(timer);
        return { status: 0, ok: false, ct: '', body: e.message };
    }
}

// Agent chat via SSE
function chatWithAgent(agentId, message, timeoutMs) {
    return new Promise((resolve) => {
        const data = JSON.stringify({ message });
        const opts = {
            hostname: 'localhost',
            port: AGENT_PORT,
            path: `/api/agents/${encodeURIComponent(agentId)}/chat`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'Content-Length': Buffer.byteLength(data)
            }
        };
        let fullText = '';
        let toolResults = [];
        let done = false;
        const timer = setTimeout(() => { if(!done) { done=true; resolve({ text: fullText || '[TIMEOUT]', tools: toolResults }); } }, timeoutMs);

        const req = http.request(opts, (res) => {
            res.on('data', chunk => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const json = JSON.parse(line.slice(6));
                        if (json.text) fullText += json.text;
                        if (json.tool_result !== undefined) toolResults.push(json.tool_result);
                        if (json.done && !done) { done=true; clearTimeout(timer); resolve({ text: fullText, tools: toolResults }); }
                    } catch(e) {}
                }
            });
            res.on('end', () => { if(!done) { done=true; clearTimeout(timer); resolve({ text: fullText, tools: toolResults }); } });
            res.on('error', e => { if(!done) { done=true; clearTimeout(timer); resolve({ text: '[HTTP ERR] ' + e.message, tools: [] }); } });
        });
        req.on('error', e => { if(!done) { done=true; clearTimeout(timer); resolve({ text: '[REQ ERR] ' + e.message, tools: [] }); } });
        req.write(data);
        req.end();
    });
}

async function getAgents() {
    return new Promise((resolve) => {
        const opts = { hostname: 'localhost', port: AGENT_PORT, path: '/api/agents', headers: { 'X-API-Key': API_KEY } };
        http.get(opts, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
        }).on('error', () => resolve([]));
    });
}

async function main() {
    console.log('=== CLAWHUB.AI CANLI SİSTEM TESTİ BAŞLIYOR ===\n');
    console.log('ANLAYIŞ: ClawHub.ai = Harici online skill registrydır (npm gibi ama AI skill\'leri için)');
    console.log('clawhub_remote = clawhub.ai\'den skill ara/indir → Marketplace/skills/ klasörüne kaydet');
    console.log('clawhub_installer = Marketplace/skills/ klasöründen → ajan kendi skills/ klasörüne kopyasın\n');
    console.log('──────────────────────────────────────────────────────\n');

    // ─── BÖLÜM 0: CLAWHUB.AI API DOĞRUDAN TEST ───
    console.log('BÖLÜM 0: CLAWHUB.AI API DOĞRUDAN TEST\n');

    // 0A Search
    const s0a = await fetchJSON('https://clawhub.ai/api/v1/search?q=calculator');
    if (s0a.ok) {
        try {
            const d = JSON.parse(s0a.body);
            const cnt = d.results?.length || 0;
            log('0A. Search API (calculator)', 'OK', `HTTP ${s0a.status} - ${cnt} sonuç döndü. İlk: ${d.results?.[0]?.displayName} [${d.results?.[0]?.slug}]`);
        } catch { log('0A. Search API', 'PARSE_ERR', s0a.body.slice(0,200)); }
    } else {
        log('0A. Search API', 'FAIL', `HTTP ${s0a.status}: ${s0a.body.slice(0,150)}`);
    }

    // 0B Inspect
    const s0b = await fetchJSON('https://clawhub.ai/api/v1/skills/weather');
    if (s0b.ok) {
        try {
            const d = JSON.parse(s0b.body);
            log('0B. Inspect API (weather)', 'OK', `v${d.latestVersion?.version} | ${d.skill?.stats?.downloads} indirme | Sahip: ${d.owner?.handle}`);
            // BUG TESPİT: clawhub_remote.js'in targetVersion mantığı
            const targetVersionCode = `skillData?.skill?.latestVersion || skillData?.latestVersion || 'latest'`;
            const actualCorrect = d.latestVersion?.version;
            log('0B. BUG TESPİT', 'WARN', `Kodun beklediği: skill.latestVersion → ama gerçek JSON yapısı: response.latestVersion.version="${actualCorrect}". Kod yanlış field okuyor → targetVersion nesne döner, string değil!`);
        } catch { log('0B. Inspect', 'PARSE_ERR', s0b.body.slice(0,200)); }
    } else {
        log('0B. Inspect API', 'FAIL', `HTTP ${s0b.status}`);
    }

    // 0C Download v1.0.0
    const s0c = await fetchJSON('https://clawhub.ai/api/v1/download?slug=weather&version=1.0.0');
    log('0C. Download (version=1.0.0)', s0c.ok ? 'OK' : 'FAIL', `HTTP ${s0c.status} | content-type: ${s0c.ct} | body: ${s0c.body.slice(0,200)}`);

    // 0D Download no version
    const s0d = await fetchJSON('https://clawhub.ai/api/v1/download?slug=weather');
    log('0D. Download (no version)', s0d.ok ? 'OK' : 'FAIL', `HTTP ${s0d.status} | content-type: ${s0d.ct} | body: ${s0d.body.slice(0,200)}`);

    // ─── BÖLÜM 1: Ajan seç ───
    console.log('\nBÖLÜM 1: AJAN SEÇİMİ\n');
    const agents = await getAgents();
    log('1A. Agent sayısı', 'OK', agents.length + ' ajan');
    const testAgent = agents.find(a => a.id === 'QA_ATLAS_V3') || agents.find(a => a.id.includes('test') || a.id.includes('Test')) || agents[0];
    const agentId = testAgent?.id;
    log('1B. Seçilen ajan', 'OK', `ID="${agentId}"`);

    const mktBefore = await fs.readdir(MARKET_DIR).catch(() => []);
    log('1C. Marketplace (ÖNCE)', 'OK', `${mktBefore.length} dosya`);

    // ─── BÖLÜM 2: Ajan → clawhub_remote SEARCH ───
    console.log('\nBÖLÜM 2: AJAN → clawhub_remote SEARCH\n');
    const r2 = await chatWithAgent(agentId,
        'Clawhub_remote yeteneğini kullan. Action: search, query: "weather". Clawhub.ai online mağazasinda ara ve bulduğun ilk 3 skill adını ve slug\'larını listele.',
        50000);
    log('2A. Search mesaj cevabı', r2.text.includes('HATA') || r2.text.includes('ERR') ? 'FAIL' : 'OK', r2.text.slice(0,500));
    log('2A. Tool calls', 'INFO', r2.tools.length > 0 ? JSON.stringify(r2.tools[0]).slice(0,300) : 'Tool result yok');

    await new Promise(r => setTimeout(r, 2000));

    // ─── BÖLÜM 3: Ajan → clawhub_remote DOWNLOAD ───
    console.log('\nBÖLÜM 3: AJAN → clawhub_remote DOWNLOAD\n');
    const r3 = await chatWithAgent(agentId,
        'Clawhub_remote yeteneğini kullan. Action: download, query: "weather". Clawhub.ai\'den "weather" skill\'ini indir ve nereye kaydedildiğini söyle.',
        70000);
    log('3A. Download mesaj cevabı', 'INFO', r3.text.slice(0,500));
    log('3A. Tool calls', 'INFO', r3.tools.length > 0 ? JSON.stringify(r3.tools[0]).slice(0,300) : 'Tool result yok');

    await new Promise(r => setTimeout(r, 2000));
    const mktAfter = await fs.readdir(MARKET_DIR).catch(() => []);
    const newFiles = mktAfter.filter(f => !mktBefore.includes(f));
    log('3B. Marketplace yeni dosyalar', newFiles.length > 0 ? 'OK' : 'FAIL',
        newFiles.length > 0 ? `Eklenen: ${newFiles.join(', ')}` : 'HİÇBİR YENİ DOSYA MARKETPLACE\'E DÜŞMEDİ');

    // ─── BÖLÜM 4: clawhub_installer LIST ───
    console.log('\nBÖLÜM 4: AJAN → clawhub_installer LIST\n');
    const r4 = await chatWithAgent(agentId,
        'clawhub_install yeteneğini kullan (action: list). Marketplace\'deki yetenekleri listele. Hangileri kurulu hangileri değil göster.',
        40000);
    log('4A. List cevabı', 'INFO', r4.text.slice(0,600));

    await new Promise(r => setTimeout(r, 2000));

    // ─── BÖLÜM 5: clawhub_installer INSTALL ───
    console.log('\nBÖLÜM 5: AJAN → clawhub_installer INSTALL\n');
    const agentSkillsDirBefore = await fs.readdir(`C:/AgentsHUB/app/Agents/${agentId}/skills`).catch(() => null);
    log('5A. Ajan skills (ÖNCE)', 'INFO', agentSkillsDirBefore ? agentSkillsDirBefore.join(', ') : 'Dizin yok veya boş');

    const r5 = await chatWithAgent(agentId,
        'clawhub_install yeteneğini kullan (action: install, skill_name: "calculator"). Calculator yeteneğini bana kur.',
        35000);
    log('5B. Install cevabı', r5.text.includes('BAŞARILI') ? 'OK' : 'FAIL', r5.text.slice(0,400));

    await new Promise(r => setTimeout(r, 2000));
    const agentSkillsDirAfter = await fs.readdir(`C:/AgentsHUB/app/Agents/${agentId}/skills`).catch(() => null);
    log('5C. Ajan skills (SONRA)', 'INFO', agentSkillsDirAfter ? agentSkillsDirAfter.join(', ') : 'Dizin yok veya boş');
    const newSkill = agentSkillsDirAfter && agentSkillsDirBefore
        ? agentSkillsDirAfter.filter(f => !(agentSkillsDirBefore||[]).includes(f))
        : [];
    log('5C. Yeni kurulan skill', newSkill.length > 0 ? 'OK' : 'FAIL',
        newSkill.length > 0 ? newSkill.join(', ') : 'Skill ajan klasörüne kopyalanmadı');

    // ─── BÖLÜM 6: KURULU SKILL ÇALIŞIYOR MU? ───
    console.log('\nBÖLÜM 6: KURULU SKILL KULLANILABILIYOR MU?\n');
    const r6 = await chatWithAgent(agentId,
        'calculator yeteneğini kullanarak 2^10 hesapla.',
        30000);
    log('6A. calculator kullanım testi', r6.text.includes('1024') ? 'OK' : 'FAIL', r6.text.slice(0,300));

    // ─── SONUÇ ───
    console.log('\n══════════════════════════════════════════════════');
    console.log('              CLAWHUB CANLI TEST RAPORU');
    console.log('══════════════════════════════════════════════════\n');
    console.log(report.join('\n'));
    await fs.writeFile('C:/AgentsHUB/app/clawhub_test_report.txt', report.join('\n'), 'utf8');
    console.log('\n[Rapor kaydı]: C:/AgentsHUB/app/clawhub_test_report.txt');
}

main().catch(console.error);
