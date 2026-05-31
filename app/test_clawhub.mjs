async function chat(message) {
    console.log(`\n>>> [USER]: ${message}`);
    const res = await fetch("http://127.0.0.1:3434/api/agents/QA_ATLAS_V3/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "agentshub_secure_key_2026" },
        body: JSON.stringify({ message })
    });
    
    const text = await res.text();
    const lines = text.split('\n').filter(l => l.startsWith('data: '));
    let fullResponse = "";
    lines.forEach(l => {
        try {
            const data = JSON.parse(l.replace('data: ', ''));
            if(data.type === 'token') fullResponse += data.content;
            if(data.type === 'tool_use' || data.type === 'tool_call') console.log(`[TOOL CALL] ${data.tool_name || data?.tool?.name}(${JSON.stringify(data.args || data?.tool?.args)})`);
            if(data.type === 'tool_result') console.log(`\n[TOOL RESULT] ${data.result}`);
            if(data.error) console.error(`[ERROR] ${data.error}`);
        } catch(e) {}
    });
    console.log(`\n[AGENT]: ${fullResponse}`);
}

(async () => {
    console.log("--- STAGE 1: SEARCH YETENEK ---");
    await chat("Lütfen clawhub_remote yeteneğini kullanarak clawhub ekosisteminde 'pdf' kelimesiyle arama yapıp bulduğun ilk yeteneği indirir misin? Ajan formatında olanı test edelim.");
    
    console.log("\n--- STAGE 2: INSTALL YETENEK ---");
    await chat("Şimdi indirdiğin bu yeteneği clawhub_install ile sisteme (kendine) kurar mısın? Sonra da bu yeteneğin listene eklendiğini teyit etmek için ajanın yeteneklerini kontrol et.");
})();
