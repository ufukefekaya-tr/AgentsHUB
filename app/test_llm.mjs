import { LLMBridge } from './src/bridge/llm_bridge.js';
import dotenv from 'dotenv';
dotenv.config();

Object.assign(process.env, { EXEC_APPROVAL_ENABLED: "false" });

async function run() {
    try {
        const res = await LLMBridge.execute("TestAjani", "Hangi yeteneklere sahipsin?");
        console.log("Success:", res);
    } catch(e) {
        console.error("FATAL ERROR:", e);
    }
}
run();
