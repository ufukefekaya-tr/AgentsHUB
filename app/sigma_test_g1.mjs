import { LLMBridge } from './src/bridge/llm_bridge.js';

async function runTest() {
    console.log("=== SIGMA_TESTER_V1 TESTI ===");
    try {
        const res1 = await LLMBridge.execute("SIGMA_TESTER_V1", "Merhaba, sistemin aktif mi?", [], { imageQuality: "fast", aspectRatio: "1:1" });
        console.log("SIGMA_TESTER_V1 SONUCU:\n", res1.content.substring(0, 150) + "...");
    } catch(e) {
        console.error("SIGMA_TESTER_V1 HATA:", e.message);
    }
    
    console.log("\n=== MASTER_TESTER TESTI ===");
    try {
        const res2 = await LLMBridge.execute("MASTER_TESTER", "Nasılsın, sistemin aktif mi?", [], { imageQuality: "fast", aspectRatio: "1:1" });
        console.log("MASTER_TESTER SONUCU:\n", res2.content.substring(0, 150) + "...");
    } catch(e) {
        console.error("MASTER_TESTER HATA:", e.message);
    }
}

runTest();
