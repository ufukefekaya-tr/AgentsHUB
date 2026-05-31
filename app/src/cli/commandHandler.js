import fs from 'fs/promises';
import path from 'path';
import { state, COLORS } from './session.js';
import { ChatManager } from '../memory/chat_manager.js';
import { MindsetParser } from '../memory/parser.js';
import { FileManager } from '../utils/file_manager.js';
import { Telemetry } from '../utils/telemetry.js';
import { runGenesis } from '../memory/genesis.js';

/**
 * AgentsHUB CLI - Command Handler
 * Tüm /slash komutlarını işleyen modül.
 */

export async function handleSystemCommand(input) {
    if (!input) return null;
    const parts = input.split(' ');
    const cmd = parts[0];

    try {
        if (cmd === '/chat') {
            const sub = parts[1];
            if (sub === 'list') {
                const threads = await ChatManager.listThreads(state.ACTIVE_AGENT_ID);
                let output = `\n--- SOHBETLER ---\n`;
                threads.forEach(t => output += `- [${t.id}] ${t.title}\n`);
                console.log(output);
                return output;
            } else if (sub === 'new') {
                state.ACTIVE_THREAD_ID = `thread_${Date.now()}`;
                state.chatHistory = [];
                console.log(`[+] Yeni sohbet: ${state.ACTIVE_THREAD_ID}`);
                return 'STOP';
            } else if (sub === 'select' || sub === 'switch') {
                const tidInput = parts.slice(2).join(' ');
                if (!tidInput) throw new Error("Sohbet adı veya ID belirtilmedi.");
                
                const threads = await ChatManager.listThreads(state.ACTIVE_AGENT_ID);
                const found = threads.find(t => t.id === tidInput || t.title === tidInput);
                
                const targetId = found ? found.id : tidInput;
                state.ACTIVE_THREAD_ID = targetId;
                state.chatHistory = await ChatManager.loadThread(state.ACTIVE_AGENT_ID, targetId);
                console.log(`[+] Sohbet '${targetId}' yüklendi.`);
                return 'STOP';
            } else if (sub === 'rename') {
                const newTitle = parts.slice(2).join(' ');
                if (!newTitle) throw new Error("Yeni başlık belirtilmedi.");
                await ChatManager.renameThread(state.ACTIVE_AGENT_ID, state.ACTIVE_THREAD_ID, newTitle);
                return `[+] Sohbet yeniden adlandırıldı: ${newTitle}`;
            } else if (sub === 'archive') {
                const targetTid = parts[2] || state.ACTIVE_THREAD_ID;
                await ChatManager.archiveThread(state.ACTIVE_AGENT_ID, targetTid);
                if (targetTid === state.ACTIVE_THREAD_ID) {
                    state.ACTIVE_THREAD_ID = "default";
                    state.chatHistory = await ChatManager.loadThread(state.ACTIVE_AGENT_ID, state.ACTIVE_THREAD_ID);
                }
                return `[+] Sohbet arşivlendi: ${targetTid}`;
            }
            return `[HATA] Geçersiz sohbet komutu: ${sub}. Kullanılabilir: list, new, switch, rename, archive`;
        } else if (cmd === '/agent') {
            const agentName = parts[1];
            if (!agentName || agentName === 'list') {
                const agents = await fs.readdir(path.join(process.cwd(), 'Agents'));
                const activeAgents = agents.filter(a => a !== 'Global' && !a.startsWith('.'));
                const out = `\n--- MEVCUT AJANLAR ---\n${activeAgents.join('\n')}`;
                console.log(out);
                return out;
            }
            
            // HOT-SWAP (Ajan Geçişi)
            const targetPath = path.join(process.cwd(), 'Agents', agentName);
            try {
                await fs.access(targetPath);
                state.ACTIVE_AGENT_ID = agentName;
                state.ACTIVE_THREAD_ID = "default";
                await runGenesis(state.ACTIVE_AGENT_ID);
                state.chatHistory = await ChatManager.loadThread(state.ACTIVE_AGENT_ID, state.ACTIVE_THREAD_ID);
                const msg = `[+] Başarıyla ${agentName} bilincine geçiş yapıldı.`;
                console.log(msg);
                return msg;
            } catch (e) {
                return `[HATA] Ajan bulunamadı: ${agentName}`;
            }
        } else if (cmd === '/file') {
            const sub = parts[1];
            const name = parts[2];
            try {
                if (sub === 'write') {
                    await FileManager.write(state.ACTIVE_AGENT_ID, name, parts.slice(3).join(' '));
                    return `[+] Dosya yazildi: ${name}`;
                } else if (sub === 'list') {
                    const names = await FileManager.list(state.ACTIVE_AGENT_ID, parts[2] || '');
                    const out = `\n--- DOSYA LİSTESİ ---\n${names}`;
                    console.log(out);
                    return out;
                } else if (sub === 'read') {
                    const content = await FileManager.read(state.ACTIVE_AGENT_ID, name);
                    const out = `\n--- ${name} ---\n${content}`;
                    console.log(out);
                    return out;
                }
            } catch (e) {
                const err = `[HATA] Dosya işlemi başarısız: ${e.message}`;
                console.log(err);
                return err;
            }
            return 'STOP';
        } else if (cmd === '/cost') {
            const report = Telemetry.getSessionReport();
            let output = `\n--- MALİYET RAPORU ---\n`;
            output += `Seans Token: ${report.session_tokens}\n`;
            output += `Günlük Toplam: ${report.daily_total}\n`;
            output += `Tahmini Maliyet: $${report.estimated_cost_usd.toFixed(4)}`;
            console.log(output);
            return output;
        } else if (cmd === '/model') {
            const newModel = parts[1];
            const config = await MindsetParser.loadConfig(state.ACTIVE_AGENT_ID);
            config.model = newModel;
            await MindsetParser.saveConfig(state.ACTIVE_AGENT_ID, config);
            const msg = `[+] Model degisti: ${newModel}`;
            console.log(msg);
            return msg;
        } else if (cmd === '/efficiency') {
             state.THREAD_METADATA.efficiency_mode = (parts[1] === 'on');
             console.log(`[+] Efficiency Mode: ${state.THREAD_METADATA.efficiency_mode ? 'AÇIK' : 'KAPALI'}`);
             return 'STOP';
        } else if (cmd === '/memory') {
            const sub = parts[1];
            if (sub === 'search') {
                const query = parts.slice(2).join(' ');
                if (!query) return '[HATA] Aranacak kelimeyi girmediniz.';
                const { UMI } = await import('../memory/umi.js');
                const results = await UMI.semanticSearch(state.ACTIVE_AGENT_ID, query);
                let out = `\n--- L2 SEMANTİK ARAMA SONUÇLARI ---\n`;
                if (!results || results.length === 0) out += "Eşleşme bulunamadı.\n";
                else results.forEach(r => out += `[Skor: ${(r.score * 100).toFixed(1)}%] ${r.content}\n`);
                console.log(out);
                return out;
            } else if (sub === 'cache') {
                const { UMI } = await import('../memory/umi.js');
                const loaded = await UMI.load(state.ACTIVE_AGENT_ID, state.ACTIVE_THREAD_ID, 100); 
                const msgs = loaded.messages || [];
                if (msgs.length === 0) return '[HATA] Önbelleğe alınacak mesaj yok.';
                const cacheId = await UMI.cacheContext(state.ACTIVE_AGENT_ID, state.ACTIVE_THREAD_ID, "Sen çok zeki bir Atlas bilincisin.", msgs, 60);
                if (cacheId === "BYPASS_TOO_SMALL") {
                     return `[HATA] Sohbet çok kısa. Google Context Caching (L3) en az 2048 token gerektirir. Lütfen daha uzun bir veri yığınıyla gelin.`;
                } else if (cacheId) {
                    state.THREAD_METADATA.cachedContentName = cacheId;
                    const msg = `[+] L3 Context Caching BAŞARILI! (Cache ID: ${cacheId})\n[!] Sonraki sohbetleriniz bu cache üzerinden devam edecek (Minimum veri israfı).`;
                    console.log(msg);
                    return msg;
                } else {
                    return `[HATA] L3 Caching API hatası.`;
                }
            }
            return `[HATA] Geçersiz memory komutu: ${sub}. Kullanılabilir: search, cache`;
        } else if (cmd === '/user' || cmd === '/evolution') {
            const sub = parts[1];
            const filename = cmd === '/user' ? 'USER.md' : 'EVOLUTION_NOTES.md';
            const userPath = path.join(process.cwd(), 'Agents', state.ACTIVE_AGENT_ID, 'Mind-Set_Core', filename);
            if (sub === 'save' || sub === 'log') {
                const content = parts.slice(2).join(' ');
                const timestamp = new Date().toISOString();
                const entry = `\n- [${timestamp}] ${content}`;
                await fs.appendFile(userPath, entry);
                const msg = `[+] Veri mühürlendi: ${filename}`;
                console.log(msg);
                return msg;
            }
            return 'STOP';
        }
    } catch (e) {
        console.log(`[HATA] Komut hatası: ${e.message}`);
        return 'STOP';
    }

    // Eğer manuel bir / komutu ama handle edilmediyse:
    if (input.startsWith('/')) return 'STOP';

    return input;
}
