

async function chat(message) {
    const url = "http://localhost:3434/api/agents/QA_ATLAS_V3/chat";
    const body = {
        message: message,
        options: { "skipShield": true }
    };

    console.log(`[USER] ${message}`);
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        throw new Error(`[API HATA] HTTP ${res.status}`);
    }

    const reader = res.body; 
    let fullResponse = "";
    
    // Basit SSE parse (Eski test.mjs hatasini duzelttim)
    for await (const chunk of reader) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const dataStr = line.replace('data: ', '').trim();
                if (dataStr === '[DONE]') break;
                try {
                    const data = JSON.parse(dataStr);
                    if(data.type === 'token') {
                        process.stdout.write(data.content);
                        fullResponse += data.content;
                    }
                    if(data.type === 'tool_call' || data.type === 'tool_use') {
                        console.log(`\n\n[AJAN ARAÇ KULLANIMI]: ${data.tool_name || (data.tool && data.tool.name)}\nArgs: ${JSON.stringify(data.args || (data.tool && data.tool.args))}`);
                    }
                    if(data.type === 'tool_result') {
                        console.log(`\n[ARAÇ SONUCU]: ${data.result}`);
                    }
                } catch(e) {}
            }
        }
    }
    console.log("\n\n------------------- BİTİŞ -------------------\n");
    return fullResponse;
}

async function runTest() {
    try {
        console.log("== CANLI QA LOOP: EXCEL MANAGER TESTİ BAŞLIYOR ==");
        await chat("Lütfen 'QA_Test_Musteriler.xlsx' isminde yeni bir excel tablosu oluşturup, Müşteri='Ahmet', Bakiye=1500 ve Müşteri='Mehmet', Bakiye=3000 olan 2 kayıt ekle. Sonra bu tabloyu excel_manager ile okutup başarıyla yazıldığını kontrol eder misin?");
    } catch (e) {
        console.error("TEST ÇÖKTÜ:", e);
    }
}

runTest();
