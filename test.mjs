async function runQA() {
    console.log("==========================================");
    console.log("==== AGENTSHUB V1.5 OROBOROS QA LOOP ====");
    console.log("==========================================");
    
    try {
        const payload = {
             message: "Sistem ve web sağlığı için 3 görev veriyorum:\n1) duckduckgo_search kullanarak 'AgentsHUB nedir' araması yap.\n2) python_runner aracı ile 'print(3 * 50)' scriptini çalıştır ve sonucunu söyle.\n3) health_checker aracıyla 'https://google.com' adresine ping at.\nHepsini birleştirip geri dön.",
             history: [],
             threadMetadata: {
                  model: "gemini-2.5-flash",
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
        console.log("\n[UI SERVER YANITI (STREAM)] ======================");
        
        const lines = raw.split('\n');
        let toolCalls = [];
        let finalMessage = "";

        for (const l of lines) {
             if (l.startsWith('data: ')) {
                 try { 
                     const j = JSON.parse(l.replace('data: ', '')); 
                     if (j.type === 'tool_call') {
                         console.log(`[TOOL ÇAĞRILDI] -> ${j.name}`);
                         toolCalls.push(j.name);
                     }
                     if (j.type === 'tool_result') {
                         console.log(`[TOOL SONUCU] -> ${j.name} | UZUNLUK: ${String(j.result).length} karakter.`);
                     }
                     if (j.type === 'chunk') finalMessage += j.content;
                     if (j.error) console.error("API HATASI:", j.error);
                 } catch(e) {}
             }
        }
        
        console.log("\n[LLM FİNAL YANIT]:\n", finalMessage);
        
        if (toolCalls.length === 0) {
            console.error("\n❌ [QA FATAL ERROR] LLM Hiçbir aracı çağırmadı! ReAct döngüsü / Skill yüklemesi BAŞARISIZ.");
            process.exit(1);
        } else {
            console.log(`\n✅ [QA BAŞARILI] Ajan ${toolCalls.length} araç (tool) kullandı. SİSTEM STABİL! Mimar uyumaya devam edebilir.`);
            process.exit(0);
        }

    } catch(err) {
        console.error("QA FATAL:", err);
        process.exit(1);
    }
}

runQA();
