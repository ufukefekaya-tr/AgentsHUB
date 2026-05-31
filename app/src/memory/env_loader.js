import fs from 'fs/promises';
import path from 'path';

export async function loadAgentEnv(agentId) {
    const envPath = path.join(process.cwd(), 'Agents', agentId, '.env');
    const envData = {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        TELEGRAM_BOT_TOKEN: ""
    };
    try {
        const content = await fs.readFile(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const match = line.match(/^\s*([^=]+)\s*=\s*(.*)\s*$/);
            if (match) {
                const key = match[1].trim();
                const val = match[2].trim().replace(/^['"]|['"]$/g, '');
                if (val) envData[key] = val;
            }
        });
    } catch (e) { /* .env doesn't exist, fallback to process.env */ }
    return envData;
}
