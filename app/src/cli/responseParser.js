import { state, COLORS } from './session.js';
import { MindsetParser } from '../memory/parser.js';
import logger from '../utils/logger.js';

/**
 * AgentsHUB CLI - Response Parser
 * LLM yanıtından [CONFIG_UPDATE] ve [SYSTEM_COMMAND] tag'lerini parse eder.
 */

/**
 * LLM yanıtından [CONFIG_UPDATE] tag'ini yakalar ve config'i günceller.
 * @param {string} replyText - LLM'den gelen ham yanıt
 * @returns {Promise<string>} Temizlenmiş yanıt metni
 */
export async function parseConfigUpdate(replyText) {
    const configMatch = replyText.match(/\[CONFIG_UPDATE\]:\s*(?:```json|```)?\\s*(\{[\s\S]*?\})\s*(?:```)?/);
    if (!configMatch) return replyText;

        try {
        const patch = JSON.parse(configMatch[1].trim());
        if (patch.efficiency_mode !== undefined) {
            state.THREAD_METADATA.efficiency_mode = (patch.efficiency_mode === true || patch.efficiency_mode === "true");
            console.log(`\n[OTONOM]: Verimlilik Modu degisti: ${state.THREAD_METADATA.efficiency_mode ? 'AÇIK' : 'KAPALI'}`);
        }
        
        // HOT-SWAP YAKALAYICI (Ajan belleğini değiştirdiğinde anında RAM'de uygula)
        if (patch.storage_type !== undefined) {
            const { UMI } = await import('../memory/umi.js');
            await UMI.self_update(state.ACTIVE_AGENT_ID, patch.storage_type);
        }

        const config = await MindsetParser.loadConfig(state.ACTIVE_AGENT_ID);
        const updated = { ...config, ...patch };
        await MindsetParser.saveConfig(state.ACTIVE_AGENT_ID, updated);
        console.log(`\n[OTONOM GÜNCELLEME]: Ajan ayarlarını güncelledi: ${JSON.stringify(patch)}`);
        return replyText.replace(/\[CONFIG_UPDATE\]:[\s\S]*?(\}\s*(?:```)?)/, '').trim();
    } catch (e) {
        logger.error("[BRIDGE] Otonom config parse hatası:", e.message);
        return replyText;
    }
}

/**
 * LLM yanıtından [SYSTEM_COMMAND] tag'ini yakalar.
 * @param {string} replyText - LLM'den gelen ham yanıt
 * @returns {{ cleanedText: string, command: string|null }}
 */
export function parseSystemCommand(replyText) {
    const sysCmdMatch = replyText.match(/\[SYSTEM_COMMAND\]:\s*([^\n]+)/);
    if (!sysCmdMatch) return { cleanedText: replyText, command: null };

    const cmdStr = sysCmdMatch[1].trim();
    const cleanedText = replyText.replace(/\[SYSTEM_COMMAND\]:\s*[^\n]+/, '').trim();
    console.log(`\n${COLORS.DIM}${COLORS.YELLOW}[OTONOM KOMUT]: ${cmdStr}${COLORS.RESET}`);

    return { cleanedText, command: cmdStr };
}

/**
 * Otonom komut hatası durumunda INTERLOCK tetikler.
 * @param {string} output - Komut çıktısı
 */
export function handleInterlock(output) {
    if (output && output.includes('[HATA]')) {
        state.chatHistory.push({ role: 'user', content: `[SYSTEM_FEEDBACK]: ${output}` });
        const interlockMsg = `[SYSTEM_INTERLOCK]: Son komutun başarısız oldu. Kaizen protokolü gereği bu durumu EVOLUTION_NOTES.md dosyasına otonom olarak (kullanıcıya sormadan) kaydetmeli ve nedenini analiz etmelisin.`;
        state.chatHistory.push({ role: 'user', content: interlockMsg });
        console.log(`${COLORS.BRIGHT}${COLORS.RED}[INTERLOCK TETİKLENDİ]: Ajan otonom loglamaya zorlanıyor.${COLORS.RESET}`);
    } else if (output) {
        state.chatHistory.push({ role: 'user', content: `[SYSTEM_FEEDBACK]: ${output}` });
    }
}
