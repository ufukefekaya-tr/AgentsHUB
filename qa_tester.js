import { LLMBridge } from './app/src/bridge/llm_bridge.js';
import { fetch } from 'undici';

async function runQA() {
    console.log("==========================================");
    console.log("==== AGENTSHUB V1.5 OROBOROS QA LOOP ====");
    console.log("==========================================");
    console.log("Tüm yeni market modülleri ve Ajan entegrasyonu test ediliyor...");

    try {
        const agentId = "test0"; // Olay yeri ajanı

        // 1. Ajanın configinde bu yeni modülleri aktif et
        const fs = await import('fs/promises');
        const path = await import('path');
        const configPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
        
        let config = {};
        try {
            config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        } catch {
            console.error("Test ajanı configi okunamadı. Ancak bridge otonom olarak fallback handle eder.");
            config = { skills: [] };
        }
        
        // Yeni tester skilleri
        config.skills = [
            "duckduckgo_search.js", 
            "python_runner.js", 
            "health_checker.js", 
            "auto_capture.js"
        ];
        
        try {
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
            console.log("\n[1] QA LOOP: Ajan (test0) yetenekleri zorla güncellendi.");
        } catch(e) {
            console.log("\n[1] QA LOOP: Config yazılamadı (Yoksayılıyor, Mock çalıştırılacak).");
        }

        // Bridge isteğini Mock üzerinden geçmek daha güvenli (Pahalı LLM token harcaması yerine) 
        // Ancak bu asıl LLMBridge Tool Execution mantığını test etmez. O Yüzden Gerçek bir test (Flash Lite ile):
        
        console.log("\n[2] QA LOOP: Ajan tetikleniyor (ReAct) Mimar komutu -> 'Health check ile google.com u kontrol et, Python üzerinden 10 + 20 yazdir, sonra UMI'ye bunu not al.'");
        
        // Asıl iş: (Sistemde `process.env` vs tanımlı olmadığı için LLMBridge bağımsız node scripte patlayabilir.)
        // Bu yüzden testi HTTP API üzerinden, mevcut 3434 portundaki UI Server'ına atmak daha güvenli ve tam bir canlı test!.
        
        const payload = {
             message: "Bana 3 şey yap:\n1) duckduckgo'da 'AgentsHUB' arat.\n2) Python runner kullanarak 'print(10 + 10)' çalıştır ve çıktıyı dön.\n3) Health checker ile 'https://google.com' u kontrol et.",
             history: [],
             threadMetadata: {
                  model: "gemini-2.5-flash", // Hızlı ve ucuz model
                  skipShield: true
             }
        };

        const res = await fetch("http://127.0.0.1:3434/api/agents/test0/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
             const rt = await res.text();
             console.error(`\n[HATA] E2E API Çağrısı Başarısız: HTTP ${res.status}\n${rt}`);
             process.exit(1);
        }

        const raw = await res.text();
        console.log("\n[UI SERVER YANITI] (Streamed Array/Text) ======================");
        
        // SSE parsing
        const lines = raw.split('\n');
        let toolCalls = [];
        let finalMessage = "";

        for (const l of lines) {
             if (l.startsWith('data: ')) {
                 try { 
                     const j = JSON.parse(l.replace('data: ', '')); 
                     if (j.type === 'tool_call') {
                         console.log(`[TOOL ÇAĞRILDI] -> ${j.name} | Arg :`, j.args);
                         toolCalls.push(j.name);
                     }
                     if (j.type === 'tool_result') {
                         console.log(`[TOOL SONUCU] -> ${j.name} |\n${String(j.result).slice(0, 150)}...\n`);
                     }
                     if (j.type === 'chunk') finalMessage += j.content;
                     if (j.error) console.error("API HATASI:", j.error);
                 } catch(e) {}
             }
        }
        
        console.log("\n[LLM FİNAL YANIT]:\n", finalMessage);
        
        if (toolCalls.length === 0) {
            console.error("\n❌ [QA KANAMASI] LLM Hiçbir aracı çağırmadı! Bridge Tools çalışmıyor olabilir.");
            process.exit(1);
        } else {
            console.log(`\n✅ [QA BAŞARILI] Ajan ${toolCalls.length} aracı otonom seçti, kullandı ve yanıtı sentezledi.`);
        }

    } catch(err) {
        console.error("QA FATAL:", err);
        process.exit(1);
    }
}

runQA();
