import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:3434';
const API_URL = `${BASE_URL}/api`;
const API_KEY = process.env.VITE_API_KEY || 'test1'; // we need to mock or grab real api key

let xApiKey = '';

async function loadSettings() {
    try {
        const set = JSON.parse(fs.readFileSync('C:\\AgentsHUB\\app\\.env.json', 'utf8')); // if exists
    } catch(e) {}
}

async function runTests() {
    console.log("=== ATLAS E2E QA-LOOP BAŞLIYOR ===");
    
    let report = [];
    let passed = 0;
    let failed = 0;

    const logTest = (testId, name, success, reason = "") => {
        const status = success ? 'BAŞARILI' : 'BAŞARISIZ';
        if (success) passed++; else failed++;
        console.log(`[${status}] ${testId} - ${name}`);
        if(reason) console.log(`   -> Neden: ${reason}`);
        
        report.push({ testId, name, success, reason });
    }

    // Launch playwright
    console.log("Tarayıcı başlatılıyor...");
    let browser;
    try {
       browser = await chromium.launch({ headless: true });
    } catch (e) {
       console.log("Playwright başlatılamadı...", e.message);
       process.exit(1);
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    // TEST-01: SİSTEM AYAKTA MI?
    try {
        const response = await page.goto(BASE_URL, { timeout: 10000 });
        if (response && response.status() === 200) {
            const content = await page.content();
            if (content.includes('Hoş geldin!')) {
                logTest("TEST-01", "SİSTEM AYAKTA MI?", true);
            } else {
                logTest("TEST-01", "SİSTEM AYAKTA MI?", false, "Hoş geldin metni bulunamadı. Build hatası veya yanlış sayfa.");
            }
        } else {
            logTest("TEST-01", "SİSTEM AYAKTA MI?", false, `HTTP Status: ${response?.status()}`);
        }
    } catch(e) {
        logTest("TEST-01", "SİSTEM AYAKTA MI?", false, e.message);
    }

    // TEST-02: NAVİGASYON GEZİNME
    try {
        let isSuccess = true;
        let pName = "";
        const navItems = ['SOHBET', 'AJAN MERKEZİ', 'İZLEME', 'KONSOL', 'ARŞİV', 'GLOBAL AYARLAR'];
        
        for(let item of navItems) {
            try {
               await page.click(`text="${item}"`);
               await page.waitForTimeout(500); // UI render wait
               // Check if empty layout
               const appNode = await page.locator('#root').innerHTML();
               if(appNode.length < 100) {
                   isSuccess = false; pName = item; break;
               }
            } catch(ex) {
               isSuccess = false; pName = item; break;
            }
        }

        if (isSuccess) {
            logTest("TEST-02", "NAVİGASYON GEZİNME (Modüler View Testi)", true);
        } else {
            logTest("TEST-02", "NAVİGASYON GEZİNME (Modüler View Testi)", false, `Sekmede çökme/lag: ${pName}`);
        }
    } catch (e) {
        logTest("TEST-02", "NAVİGASYON GEZİNME", false, e.message);
    }

    // Perform remaining via API because Playwright UI tests can be brittle without good selectors
    console.log("API testlerine geçiliyor...");
    
const API_KEY = 'agentshub_secure_key_2026';
    // TEST-10: AJAN OLUŞTURMA VE SİLME (API Over fetch)
    const agentName = "QA Test Ajanı " + Date.now();
    let agentId = null;
    try {
        const res = await fetch(`${API_URL}/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({ name: agentName, model: 'gpt-4o' })
        });
        const data = await res.json();
        if (res.status === 200 && data.id) {
            agentId = data.id;
            const delRes = await fetch(`${API_URL}/agents/${agentId}`, { method: 'DELETE', headers: { 'x-api-key': API_KEY } });
            if (delRes.status === 200) logTest("TEST-10", "AJAN OLUŞTURMA VE SİLME", true);
            else logTest("TEST-10", "AJAN OLUŞTURMA VE SİLME", false, "Silme başarısız.");
        } else {
            logTest("TEST-10", "AJAN OLUŞTURMA VE SİLME", false, `HTTP ${res.status}`);
        }
    } catch(e) { logTest("TEST-10", "AJAN OLUŞTURMA VE SİLME", false, e.message); }

    // TEST-05: TELEMETRİ DASHBOARD API
    try {
        const res = await fetch(`${API_URL}/telemetry/stats`, { headers: { 'x-api-key': API_KEY } });
        if (res.status === 200) {
            logTest("TEST-05", "TELEMETRİ DASHBOARD TESTİ", true);
        } else {
            logTest("TEST-05", "TELEMETRİ DASHBOARD TESTİ", false, `HTTP Status: ${res.status}`);
        }
    } catch(e) { logTest("TEST-05", "TELEMETRİ DASHBOARD TESTİ", false, e.message); }

    // TEST-11: KLASÖR YÖNETİMİ
    try {
        const res = await fetch(`${API_URL}/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({ name: "QA_Temp_Folder" })
        });
        const data = await res.json();
        if (res.status === 200 && data.id) {
             const delRes = await fetch(`${API_URL}/folders/${data.id}`, { method: 'DELETE', headers: { 'x-api-key': API_KEY } });
             if (delRes.status === 200) logTest("TEST-11", "KLASÖR YÖNETİMİ", true);
             else logTest("TEST-11", "KLASÖR YÖNETİMİ", false, "Silinemedi");
        } else {
             logTest("TEST-11", "KLASÖR YÖNETİMİ", false, `Oluşturma Hatası HTTP: ${res.status}`);
        }
    } catch(e) { logTest("TEST-11", "KLASÖR YÖNETİMİ", false, e.message); }

    // Geri kalan yeteneklerin listelenmesi (TEST-06 API)
    try {
        const agentsRes = await fetch(`${API_URL}/agents`, { headers: { 'x-api-key': API_KEY } });
        if (agentsRes.status === 200) {
            const agentsData = await agentsRes.json();
            if (agentsData.length > 0) {
               const firstAgentId = agentsData[0].id;
               const marketRes = await fetch(`${API_URL}/skills/market`, { headers: { 'x-api-key': API_KEY } });
               if (marketRes.status === 200) logTest("TEST-06", "YETENEK MARKETİ VE AJAN SKILL YÖNETİMİ", true);
               else logTest("TEST-06", "YETENEK MARKETİ", false, "Market okunamadı");
            } else { logTest("TEST-06", "YETENEK MARKETİ", false, "Test ajanı bulunamadı"); }
        } else { logTest("TEST-06", "YETENEK MARKETİ (API)", false, `HTTP: ${agentsRes.status}`); }
    } catch(e) { logTest("TEST-06", "YETENEK MARKETİ", false, e.message); }

    // Print summary to an output file
    const summary = {
         passed,
         failed,
         total: passed + failed,
         details: report
    };
    fs.writeFileSync('C:\\AgentsHUB\\qa_results_temp.json', JSON.stringify(summary, null, 2));

    await browser.close();
    console.log("QA Test Bitti.");
}

runTests();
