import { Bot } from 'grammy';
import fs from 'fs/promises';
import path from 'path';
import { LLMBridge } from '../bridge/llm_bridge.js';
import { UMI } from '../memory/umi.js';
import { MindsetParser } from '../memory/parser.js';
import logger from '../utils/logger.js';

/**
 * AgentsHUB — Telegram Per-Agent Bot Bridge (V3.1)
 * 
 * Her ajanın config.json'ında telegram_bot_token varsa,
 * o ajan için izole bir Telegram bot instance'ı oluşturur.
 * 
 * Eşleme: Bot Token = Ajan Kimliği (1:1 mapping, routing yok)
 * Sohbetler: "Telegram" adlı özel klasöre otomatik kaydedilir.
 */
class TelegramBotManager {
    constructor() {
        this.bots = new Map(); // agentId -> { bot, botInfo }
    }

    /**
     * Tüm ajanları tarar. Config'inde telegram_bot_token olanlar için bot başlatır.
     * Sunucu başlangıcında çağrılır.
     */
    async startAll() {
        const agentsDir = path.resolve(process.cwd(), 'Agents');
        let started = 0;
        try {
            const agents = await fs.readdir(agentsDir);
            for (const agentId of agents) {
                try {
                    await this.startBot(agentId);
                    if (this.bots.has(agentId)) started++;
                } catch (e) {
                    // Sessiz: token yoksa veya geçersizse atla
                }
            }
            if (started > 0) {
                logger.info(`[TELEGRAM] ✅ Toplam ${started} bot aktif.`);
            }
        } catch (e) {
            logger.error(`[TELEGRAM] Toplu başlatma hatası: ${e.message}`);
        }
    }

    /**
     * Tek bir ajan için Telegram botu başlatır.
     * Token yoksa veya boşsa sessizce geçer.
     */
    async startBot(agentId) {
        try {
            // Zaten aktifse tekrar başlatma
            if (this.bots.has(agentId)) return;

            const config = await MindsetParser.loadConfig(agentId);
            const token = config?.telegram_bot_token;
            if (!token || token.trim() === '') return;

            const bot = new Bot(token);

            // Mesaj handler'ı
            bot.on('message:text', async (ctx) => {
                const telegramUserId = ctx.from.id;
                const telegramUsername = ctx.from.username || ctx.from.first_name || 'user';
                const message = ctx.message.text;
                const threadId = `telegram_${telegramUserId}`;

                logger.info(`[TELEGRAM] ${agentId} ← @${telegramUsername}: "${message.slice(0, 60)}..."`);

                try {
                    // "Telegram" klasörünü garantile
                    await this._ensureTelegramFolder(agentId);

                    // Mevcut sohbet geçmişini yükle
                    let history = [];
                    try {
                        const data = await UMI.load(agentId, threadId);
                        history = data.messages || [];
                    } catch (e) { /* yeni thread - boş history */ }

                    // "Yazıyor..." göster
                    await ctx.replyWithChatAction('typing');

                    // İsim enjeksiyonu: Telegram'daki ismi LLM'ye ilet
                    const senderName = ctx.from.first_name || ctx.from.username || '';
                    const enrichedMsg = senderName ? `[Konuşan kişi: ${senderName}]\n${message}` : message;

                    // ═══════ TELEGRAM TOKEN CAP: Geçmişi 8K'ya kes (dashboard'daki 20K yerine) ═══════
                    const TG_TOKEN_CAP = 8000;
                    let tgTokenCount = 0;
                    const trimmedHistory = [];
                    for (let i = history.length - 1; i >= 0; i--) {
                        const msg = history[i];
                        const est = Math.ceil((msg.content || '').length / 4);
                        if (tgTokenCount + est > TG_TOKEN_CAP) break;
                        tgTokenCount += est;
                        trimmedHistory.unshift(msg);
                    }
                    if (trimmedHistory.length < history.length) {
                        logger.info(`[TELEGRAM] Token cap: ${history.length} msg → ${trimmedHistory.length} msg (~${tgTokenCount} tokens)`);
                    }
                    // ═══════ /TELEGRAM TOKEN CAP ═══════

                    // ═══════ STREAMING PATH: Telegram'da da streaming kullan (timeout 5dk) ═══════
                    // Dashboard streaming path = 5 dk timeout. Non-streaming = 15s → HER ZAMAN TIMEOUT.
                    // Çözüm: Telegram'dan da progressCallback gönder → streaming path'e gir.
                    let lastTypingTime = Date.now();
                    const telegramProgress = async (chunk) => {
                        // Her 4 saniyede "yazıyor..." göster (Telegram 5s sonra kaybeder)
                        if (Date.now() - lastTypingTime > 4000) {
                            try { await ctx.replyWithChatAction('typing'); } catch(e) {}
                            lastTypingTime = Date.now();
                        }
                    };

                    let response = await LLMBridge.execute(
                        agentId, enrichedMsg, trimmedHistory, { skipShield: true }, telegramProgress
                    );

                    let reply = response.content || 'Yanıt üretilemedi.';

                    // ═══════ CONFIG_UPDATE: Otonom config değişikliğini KAYDET (model geçişi vb.) ═══════
                    const SYSTEM_SKILLS = ["byterover.js","get_time.js","calculator.js","weather.js","web_scraper.js","url_opener.js","system_monitor.js","clipboard.js","screenshot.js","clawhub_installer.js"];
                    const configUpdateMatch = reply.match(/\[CONFIG_UPDATE\]:\s*(\{[\s\S]*?\})/);
                    if (configUpdateMatch) {
                        try {
                            const patch = JSON.parse(configUpdateMatch[1].trim());
                            const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
                            const existing = JSON.parse(await fs.readFile(confPath, 'utf8'));

                            // Skills hot-switch desteği
                            if (patch.skills && typeof patch.skills === 'object' && !Array.isArray(patch.skills)) {
                                const newSkills = [];
                                for (const [name, enabled] of Object.entries(patch.skills)) {
                                    if (enabled) newSkills.push(name.endsWith('.js') ? name : `${name}.js`);
                                }
                                patch.skills = newSkills;
                            }

                            const merged = { ...existing, ...patch };
                            if (merged.api_key && merged.api_key.includes('*')) merged.api_key = existing.api_key;
                            await fs.writeFile(confPath, JSON.stringify(merged, null, 4));
                            logger.info(`[TELEGRAM] [HOT-SWITCH] ${agentId} config güncellendi: ${JSON.stringify(patch)}`);

                            // ═══════ AUTO-RETRY: Skill değişiminden sonra otomatik tekrar çalıştır ═══════
                            if (patch.skills) {
                                logger.info(`[TELEGRAM] [HOT-SWITCH AUTO-RETRY] Skill değişimi algılandı, mesaj yeni skill'lerle tekrar çalıştırılıyor...`);
                                await ctx.replyWithChatAction('typing');
                                const retryMsg = `[SİSTEM: Yetenek değişimi tamamlandı. Şimdi orijinal isteği yerine getir.]\n\nKullanıcının isteği: ${message}`;
                                const retryHistory = [...history, { role: 'user', content: enrichedMsg }, { role: 'model', content: 'Yeteneklerimi değiştirdim.' }];
                                try {
                                    const retryResponse = await LLMBridge.execute(agentId, retryMsg, retryHistory, { skipShield: true }, telegramProgress);
                                    if (retryResponse.content) {
                                        response = retryResponse;
                                    }
                                } catch (retryErr) {
                                    logger.error(`[TELEGRAM] [HOT-SWITCH AUTO-RETRY] Hata: ${retryErr.message}`);
                                }

                                // ═══════ SKILL RESET: Arama bittikten sonra MUTLAKA system mode'a dön ═══════
                                const resetConf = JSON.parse(await fs.readFile(confPath, 'utf8'));
                                resetConf.skills = SYSTEM_SKILLS;
                                await fs.writeFile(confPath, JSON.stringify(resetConf, null, 4));
                                logger.info(`[TELEGRAM] [SKILL RESET] Skills otomatik olarak SYSTEM MODE'a döndürüldü.`);
                                // ═══════ /SKILL RESET ═══════
                            }
                            // ═══════ /AUTO-RETRY ═══════
                        } catch (parseErr) {
                            logger.warn(`[TELEGRAM] CONFIG_UPDATE parse hatası: ${parseErr.message}`);
                        }
                    }
                    // ═══════ /CONFIG_UPDATE ═══════

                    // Auto-retry response'u güncellemiş olabilir — reply'ı yeniden oku
                    reply = response.content || 'Yanıt üretilemedi.';

                    // ═══════ CRON_SCHEDULE: Otonom görev zamanlama ═══════
                    const cronMatch = reply.match(/\[CRON_SCHEDULE\]:\s*(\{[\s\S]*?\})/);
                    if (cronMatch) {
                        try {
                            const { cronManager } = await import('../scheduler/cron_manager.js');
                            const cronData = JSON.parse(cronMatch[1].trim());
                            await cronManager.schedule(agentId, cronData.cron, cronData.task);
                            logger.info(`[TELEGRAM] [CRON] ${agentId} yeni görev kurdu: ${cronData.cron}`);
                        } catch (cronErr) {
                            logger.warn(`[TELEGRAM] CRON parse hatası: ${cronErr.message}`);
                        }
                    }
                    // ═══════ /CRON_SCHEDULE ═══════

                    // Cevabı temizle (thinking, config_update, cron, system_command tag'leri kaldır)
                    reply = reply
                        .replace(/<think>[\s\S]*?<\/think>/g, '')
                        .replace(/\[CONFIG_UPDATE\]:[\s\S]*?\}/g, '')
                        .replace(/\[CRON_SCHEDULE\]:[\s\S]*?\}/g, '')
                        .replace(/\[SYSTEM_COMMAND\]:[\s\S]*$/gm, '')
                        .trim();

                    // Boş cevap kontrolü
                    if (!reply || reply.length === 0) {
                        reply = 'İşlem tamamlandı.';
                    }

                    // Telegram 4096 karakter limiti — uzun mesajlar bölünür
                    const chunks = reply.match(/.{1,4000}/gs) || [reply];
                    for (const chunk of chunks) {
                        await ctx.reply(chunk, { parse_mode: undefined });
                    }

                    // Sohbeti UMI'ye kaydet (Telegram klasörüne)
                    const updatedHistory = [
                        ...history,
                        { role: 'user', content: message },
                        { role: 'model', content: reply }
                    ];
                    const threadTitle = `Telegram @${telegramUsername}: ${message.slice(0, 30)}`;
                    await UMI.save(agentId, threadId, updatedHistory, threadTitle, 'folder_telegram');

                    logger.info(`[TELEGRAM] ${agentId} → @${telegramUsername}: Yanıt gönderildi (${reply.length} char).`);

                } catch (e) {
                    logger.error(`[TELEGRAM] ${agentId} yanıt hatası: ${e.message}`);
                    try {
                        await ctx.reply('⚠️ Bir hata oluştu. Lütfen tekrar deneyin.');
                    } catch (replyErr) {
                        logger.error(`[TELEGRAM] Hata yanıtı gönderilemedi: ${replyErr.message}`);
                    }
                }
            });

            // Hata yakalayıcı (bot çökmesini engeller)
            bot.catch((err) => {
                logger.error(`[TELEGRAM] ${agentId} bot hatası: ${err.message}`);
            });

            // Bot'u başlat (long polling — webhook gerektirmez, NAT/firewall arkasında çalışır)
            bot.start({
                onStart: (botInfo) => {
                    logger.info(`[TELEGRAM] ✅ @${botInfo.username} (${agentId}) aktif.`);
                }
            });

            this.bots.set(agentId, bot);

        } catch (e) {
            logger.error(`[TELEGRAM] ${agentId} bot başlatma hatası: ${e.message}`);
        }
    }

    /**
     * "Telegram" klasörünü garanti eder. Yoksa oluşturur.
     * Bu klasör, Telegram üzerinden gelen tüm sohbetleri gruplar.
     */
    async _ensureTelegramFolder(agentId) {
        try {
            const fPath = path.join(process.cwd(), 'Agents', agentId, 'Chats', 'folders.json');
            let folderList = [];
            try {
                folderList = JSON.parse(await fs.readFile(fPath, 'utf8'));
                if (!Array.isArray(folderList)) folderList = [];
            } catch (e) { /* dosya yoksa boş liste */ }

            // "folder_telegram" zaten varsa atla
            if (folderList.some(f => f.id === 'folder_telegram')) return;

            folderList.push({ id: 'folder_telegram', name: '📱 Telegram' });
            await fs.mkdir(path.dirname(fPath), { recursive: true });
            await fs.writeFile(fPath, JSON.stringify(folderList, null, 2));
            logger.info(`[TELEGRAM] ${agentId} için "Telegram" klasörü oluşturuldu.`);
        } catch (e) {
            logger.warn(`[TELEGRAM] Klasör oluşturma hatası: ${e.message}`);
        }
    }

    /**
     * Tek bir ajan botunu durdurur (ajan silindiğinde veya token kaldırıldığında).
     */
    async stopBot(agentId) {
        const bot = this.bots.get(agentId);
        if (bot) {
            try {
                await bot.stop();
            } catch (e) {
                logger.warn(`[TELEGRAM] ${agentId} bot durdurma hatası: ${e.message}`);
            }
            this.bots.delete(agentId);
            logger.info(`[TELEGRAM] ${agentId} botu durduruldu.`);
        }
    }

    /**
     * Bir ajanın botunu yeniden başlatır (token değiştiğinde).
     */
    async restartBot(agentId) {
        await this.stopBot(agentId);
        // Kısa bekleme (Telegram API rate limit koruması)
        await new Promise(r => setTimeout(r, 1000));
        await this.startBot(agentId);
    }

    /**
     * Belirli bir ajanın Telegram botunun aktif olup olmadığını döner.
     */
    isActive(agentId) {
        return this.bots.has(agentId);
    }
}

export const telegramManager = new TelegramBotManager();
