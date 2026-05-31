// ClawHub tam test scripti
// 1. SEARCH API çalışıyor mu?
// 2. INSPECT (detay) çalışıyor mu?
// 3. DOWNLOAD endpoint nedir?
// 4. Dosya Marketplace/skills'e düşüyor mu?
// 5. Agent skill listesine ekleniyor mu?
// 6. Agent bunu kullanabiliyor mu?

import fs from 'fs/promises';
import path from 'path';
import https from 'https';

const API_KEY = 'agentshub_secure_key_2026';
const AGENT_PORT = 3434;
const MARKET_DIR = 'C:/AgentsHUB/Marketplace/skills';

const report = [];
let agentId = null;

function log(section, status, detail) {
    const line = `[${status}] ${section}: ${detail}`;
    console.log(line);
    report.push(line);
}

// Helper: AgentsHUB API'ye HTTP çağrı
async function apiCall(method, path_, body = null) {
    return new Promise((resolve) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'localhost',
            port: AGENT_PORT,
            path: path_,
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const req = https.request ? https.request(opts) : require('http').request(opts, (res) => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        // Use http instead
        const http = await import('http');
        const req2 = http.default.request(opts, (res) => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        req2.on('error', e => resolve({ status: 0, body: e.message }));
        if (data) req2.write(data);
        req2.end();
    });
}

// Helper: Agent'a mesaj gönder ve cevap bekle
async function chatWithAgent(agentId_, message, timeoutMs = 30000) {
    return new Promise((resolve) => {
        const data = JSON.stringify({ message });
        const opts = {
            hostname: 'localhost',
            port: AGENT_PORT,
            path: `/api/agents/${encodeURIComponent(agentId_)}/chat`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                'Content-Length': Buffer.byteLength(data)
            }
        };
        let fullResponse = '';
        let timer = setTimeout(() => resolve(`[TIMEOUT] ${timeoutMs}ms içinde cevap gelmedi.`), timeoutMs);
        
        import('http').then(({ default: http }) => {
            const req = http.request(opts, (res) => {
                res.on('data', chunk => {
                    const lines = chunk.toString().split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const json = JSON.parse(line.slice(6));
                                if (json.text) fullResponse += json.text;
                                if (json.done) {
                                    clearTimeout(timer);
                                    resolve(fullResponse || '[BOŞ CEVAP]');
                                }
                                if (json.tool_result) {
                                    fullResponse += '\n[TOOL RESULT]: ' + JSON.stringify(json.tool_result).slice(0, 500);
                                }
                            } catch {}
                        }
                    }
                });
                res.on('end', () => { clearTimeout(timer); resolve(fullResponse || '[BOŞ CEVAP]'); });
                res.on('error', e => { clearTimeout(timer); resolve('[HTTP ERR]: ' + e.message); });
            });
            req.on('error', e => { clearTimeout(timer); resolve('[REQ ERR]: ' + e.message); });
            req.write(data);
            req.end();
        });
    });
}

async function main() {
    console.log('=== CLAWHUB CANLI TEST BAŞLIYOR ===\n');
    
    // ── BÖLÜM 0: ClawHub.ai API'sini doğrudan test et ──────────────
    console.log('\n─── BÖLÜM 0: CLAWHUB.AI API DOĞRUDAN TEST ───\n');
    
    // 0A. Search test
    try {
        const resp = await fetch('https://clawhub.ai/api/v1/search?q=calculator');
        const data = await resp.json();
        const count = data.results?.length || 0;
        log('0A. ClawHub Search API', 'OK', `HTTP ${resp.status} - ${count} sonuç döndü`);
        if (count > 0) {
            const first = data.results[0];
            log('0A. İlk Sonuç', 'OK', `slug=${first.slug} | ${first.displayName} | ${first.summary?.slice(0,80)}`);
        }
    } catch(e) {
        log('0A. ClawHub Search API', 'FAIL', e.message);
    }
    
    // 0B. Inspect test
    try {
        const resp = await fetch('https://clawhub.ai/api/v1/skills/weather');
        const data = await resp.json();
        const skill = data.skill;
        log('0B. ClawHub Inspect API', 'OK', `HTTP ${resp.status} - ${skill?.displayName} v${data.latestVersion?.version} | ${skill?.stats?.downloads} indirme`);
        log('0B. LatestVersion field', 'INFO', `data.latestVersion=${JSON.stringify(data.latestVersion)}`);
        log('0B. skill.latestVersion', 'INFO', `skill.latestVersion=${JSON.stringify(skill?.latestVersion)}`);
    } catch(e) {
        log('0B. ClawHub Inspect API', 'FAIL', e.message);
    }
    
    // 0C. Download endpoint test
    try {
        const resp = await fetch('https://clawhub.ai/api/v1/download?slug=weather&version=1.0.0');
        const ct = resp.headers.get('content-type') || 'unknown';
        log('0C. Download Endpoint (version=1.0.0)', resp.ok ? 'OK' : 'FAIL', `HTTP ${resp.status} | content-type: ${ct}`);
        if (!resp.ok) {
            const body = await resp.text();
            log('0C. Download Error Body', 'INFO', body.slice(0, 200));
        } else {
            const body = await resp.text();
            log('0C. Download Body (first 300)', 'INFO', body.slice(0, 300));
        }
    } catch(e) {
        log('0C. Download Endpoint', 'FAIL', e.message);
    }

    // 0C2. Download endpoint without version
    try {
        const resp = await fetch('https://clawhub.ai/api/v1/download?slug=weather');
        const ct = resp.headers.get('content-type') || 'unknown';
        log('0C2. Download Endpoint (no version)', resp.ok ? 'OK' : 'FAIL', `HTTP ${resp.status} | content-type: ${ct}`);
        if (!resp.ok) {
            const body = await resp.text();
            log('0C2. Error Body', 'INFO', body.slice(0, 200));
        } else {
            const body = await resp.text();
            log('0C2. Download Body (first 300)', 'INFO', body.slice(0, 300));
        }
    } catch(e) {
        log('0C2. Download Endpoint (no version)', 'FAIL', e.message);
    }
    
    // ── BÖLÜM 1: Ajan seç ──────────────────────────────────────────
    console.log('\n─── BÖLÜM 1: AJAN SEÇİMİ ───\n');
    
    const agentsResp = await fetch(`http://localhost:${AGENT_PORT}/api/agents`, {
        headers: { 'X-API-Key': API_KEY }
    });
    const agents = await agentsResp.json();
    log('1A. Agent listesi', 'OK', `${agents.length} ajan bulundu`);
    
    // QA_ATLAS_V3 veya ilki
    const testAgent = agents.find(a => a.id === 'QA_ATLAS_V3') || agents.find(a => a.id === 'TestAjani') || agents[0];
    agentId = testAgent?.id;
    log('1B. Test ajanı', 'OK', `ID: "${agentId}" | Mevcut skills: ${JSON.stringify(testAgent?.skills || []).slice(0,100)}`);
    
    // Marketplace'i kontrol et
    const marketFiles = await fs.readdir(MARKET_DIR).catch(() => []);
    log('1C. Marketplace skill sayısı (ÖNCE)', 'OK', `${marketFiles.length} dosya`);
    
    // ── BÖLÜM 2: Ajan üzerinden SEARCH ──────────────────────────────
    console.log('\n─── BÖLÜM 2: AJANLA CLAWHUB SEARCH TEST ───\n');
    
    const searchMsg = 'clawhub_remote yeteneğini kullanarak "calculator" kelimesiyle Clawhub.ai uzak skill mağazasında arama yap. En az 3 sonuç listele.';
    log('2A. Gönderilen mesaj', 'INFO', searchMsg);
    
    const searchResp = await chatWithAgent(agentId, searchMsg, 45000);
    log('2A. Ajan cevabı', searchResp.includes('FAIL') || searchResp.includes('HATA') ? 'FAIL' : 'OK', searchResp.slice(0, 600));
    
    await new Promise(r => setTimeout(r, 3000));
    
    // ── BÖLÜM 3: Ajan üzerinden INSPECT ─────────────────────────────
    console.log('\n─── BÖLÜM 3: AJANLA CLAWHUB INSPECT TEST ───\n');
    
    const inspectMsg = 'clawhub_remote yeteneğini kullanarak "weather" slug\'ını incele (action: inspect). Versiyonu, indirme sayısı ve açıklamasını söyle.';
    log('3A. Gönderilen mesaj', 'INFO', inspectMsg);
    
    const inspectResp = await chatWithAgent(agentId, inspectMsg, 45000);
    log('3A. Ajan cevabı', inspectResp.includes('FAIL') || inspectResp.includes('HATA') ? 'FAIL' : 'OK', inspectResp.slice(0, 500));
    
    await new Promise(r => setTimeout(r, 3000));
    
    // ── BÖLÜM 4: Ajan üzerinden DOWNLOAD ────────────────────────────
    console.log('\n─── BÖLÜM 4: AJANLA CLAWHUB DOWNLOAD TEST ───\n');
    
    const downloadMsg = 'clawhub_remote yeteneğini kullanarak "weather" slug\'ını indir (action: download). İndirilen dosyanın nereye kaydedildiğini söyle.';
    log('4A. Gönderilen mesaj', 'INFO', downloadMsg);
    
    const downloadResp = await chatWithAgent(agentId, downloadMsg, 60000);
    log('4A. Ajan cevabı', 'INFO', downloadResp.slice(0, 600));
    
    // Marketplace'e düştü mü?
    await new Promise(r => setTimeout(r, 2000));
    const marketFilesAfter = await fs.readdir(MARKET_DIR).catch(() => []);
    const newFiles = marketFilesAfter.filter(f => !marketFiles.includes(f));
    log('4B. Marketplace yeni dosyalar (SONRA)', newFiles.length > 0 ? 'OK' : 'FAIL', 
        newFiles.length > 0 ? newFiles.join(', ') : 'Hiçbir yeni dosya oluşmadı!');
    
    // ── BÖLÜM 5: clawhub_installer ile kurulum ────────────────────
    console.log('\n─── BÖLÜM 5: AJANIN YETENEK LİSTELEME VE KURMA TESTİ ───\n');
    
    const listMsg = 'clawhub_install yeteneğini kullanarak marketplace\'deki mevcut tüm yetenekleri listele. Hangileri kurulu, hangileri kurulmamış göster.';
    log('5A. Gönderilen mesaj', 'INFO', listMsg);
    
    const listResp = await chatWithAgent(agentId, listMsg, 45000);
    log('5A. Ajan cevabı', 'INFO', listResp.slice(0, 800));
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Kurma testi
    const installMsg = 'clawhub_install yeteneğini kullanarak "calculator" yeteneğini bana kur (action: install).';
    log('5B. Gönderilen mesaj', 'INFO', installMsg);
    
    const installResp = await chatWithAgent(agentId, installMsg, 30000);
    log('5B. Kurulum cevabı', installResp.includes('BAŞARILI') ? 'OK' : 'FAIL', installResp.slice(0, 400));
    
    // Ajan skills dizinini kontrol et
    await new Promise(r => setTimeout(r, 2000));
    const agentSkillsDir = `C:/AgentsHUB/app/Agents/${agentId}/skills`;
    const agentSkills = await fs.readdir(agentSkillsDir).catch(() => null);
    if (agentSkills) {
        log('5C. Ajan skills dizini', 'OK', `${agentSkills.length} dosya: ${agentSkills.join(', ')}`);
    } else {
        log('5C. Ajan skills dizini', 'FAIL', `Dizin bulunamadı: ${agentSkillsDir}`);
    }
    
    // ── SONUÇ RAPORU ─────────────────────────────────────────────────
    console.log('\n\n══════════════════════════════════════════════');
    console.log('         CLAWHUB CANLI TEST RAPORU');
    console.log('══════════════════════════════════════════════\n');
    report.forEach(r => console.log(r));
    
    // Raporu dosyaya yaz
    await fs.writeFile('C:/AgentsHUB/app/clawhub_test_report.txt', report.join('\n'), 'utf8');
    console.log('\nRapor kaydedildi: clawhub_test_report.txt');
}

main().catch(console.error);
