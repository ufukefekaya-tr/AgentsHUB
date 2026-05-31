import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { runGenesis } from '../memory/genesis.js';
import { Watcher } from '../memory/watcher.js';
import { ChatManager } from '../memory/chat_manager.js';
import { MindsetParser } from '../memory/parser.js';
import logger from '../utils/logger.js';

/**
 * AgentsHUB CLI - Session Manager
 * Ajan seçimi, cüzdan doğrulama ve oturum state yönetimi.
 */

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// --- Shared State (CLI Modülleri arası paylaşım) ---
export const state = {
    ACTIVE_AGENT_ID: null,
    ACTIVE_THREAD_ID: "default",
    THREAD_METADATA: { efficiency_mode: true },
    chatHistory: []
};

export const MAX_HISTORY = 20; // Sliding Window: Son 20 mesaj (10 user + 10 model)

export const COLORS = {
    RESET: "\x1b[0m",
    BRIGHT: "\x1b[1m",
    DIM: "\x1b[2m",
    RED: "\x1b[31m",
    GREEN: "\x1b[32m",
    YELLOW: "\x1b[33m",
    BLUE: "\x1b[34m",
    MAGENTA: "\x1b[35m",
    CYAN: "\x1b[36m",
    WHITE: "\x1b[37m",
    GRAY: "\x1b[90m"
};

export function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

export function promptUser() {
    const effStatus = state.THREAD_METADATA.efficiency_mode ? 'ON' : 'OFF';
    return new Promise(resolve => rl.question(`\n${COLORS.BRIGHT}${COLORS.WHITE}[USER] ${COLORS.GRAY}(Eff:${effStatus})${COLORS.WHITE}: ${COLORS.RESET}`, (answer) => {
        resolve(answer);
    }));
}

export function closeRL() {
    rl.close();
}

export async function selectAgent() {
    const workspaces = (await fs.readdir(path.join(process.cwd(), 'Agents'), { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory() && dirent.name !== 'Global')
        .map(dirent => dirent.name);

    console.log("\n--- MEVCUT AJANLAR ---");
    workspaces.forEach((w, i) => console.log(`${i + 1}. ${w}`));
    
    const choice = await askQuestion("\nSecin (No/Ad): ");
    const selected = workspaces[parseInt(choice) - 1] || workspaces.find(w => w === choice);
    if (!selected) return selectAgent();

    state.ACTIVE_AGENT_ID = selected;
    await runGenesis(state.ACTIVE_AGENT_ID);
    Watcher.observe(state.ACTIVE_AGENT_ID);
}

export async function validateWallet() {
    let config = await MindsetParser.loadConfig(state.ACTIVE_AGENT_ID);
    if (!config || !config.api_key) {
        const key = await askQuestion("Gemini API key girin: ");
        config = config || {};
        config.api_key = key;
        const confPath = path.join(process.cwd(), 'Agents', state.ACTIVE_AGENT_ID, 'Mind-Set_Core', 'config.json');
        await fs.writeFile(confPath, JSON.stringify(config, null, 4));
    }
}

export async function showIntro() {
    console.log(`\n[AgentsHUB]: Selam! Ben ${state.ACTIVE_AGENT_ID}. Atlas mimarisi V3.0 (Modüler) ile aktifim.`);
    console.log(`Sohbet '${state.ACTIVE_THREAD_ID}' yüklendi. Verimlilik Modu: ${state.THREAD_METADATA.efficiency_mode ? 'AÇIK' : 'KAPALI'}`);
    state.chatHistory = await ChatManager.loadThread(state.ACTIVE_AGENT_ID, state.ACTIVE_THREAD_ID);
}

/**
 * Sliding Window: Chat history'yi MAX_HISTORY kadar kırpar.
 */
export function trimHistory() {
    if (state.chatHistory.length > MAX_HISTORY) {
        state.chatHistory = state.chatHistory.slice(-MAX_HISTORY);
    }
}
