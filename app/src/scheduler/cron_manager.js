import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { LLMBridge } from '../bridge/llm_bridge.js';
import { UMI } from '../memory/umi.js';
import logger from '../utils/logger.js';

/**
 * AgentsHUB — Cron Zamanlayıcı (V3.1)
 * 
 * Ajanların zamanlanmış otonom görevlerini yönetir.
 * Her görev persis diskine yazılır → sunucu restart'ında geri yüklenir.
 * Minimum aralık: 1 dakika (saniye bazlı ifadeler engellenir).
 */
class CronManager {
    constructor() {
        this.activeJobs = new Map(); // jobId -> { job, agentId, cronExpr, taskPrompt }
    }

    /**
     * Yeni zamanlanmış görev ekler.
     * @param {string} agentId 
     * @param {string} cronExpr - Cron ifadesi (ör: "0 9 * * 1-5")
     * @param {string} taskPrompt - Tetiklendiğinde LLM'ye gönderilecek prompt
     * @returns {string} jobId
     */
    async schedule(agentId, cronExpr, taskPrompt) {
        // Validasyon
        if (!cron.validate(cronExpr)) {
            throw new Error(`Geçersiz cron ifadesi: "${cronExpr}". Örnek: "0 9 * * *" (her gün 09:00)`);
        }

        // Güvenlik: Minimum 1 dakika aralık (saniye bazlı cron ifadelerini engelle)
        // node-cron saniye desteği olan 6-parçalı ifadeleri de kabul eder, onları engelle
        const parts = cronExpr.trim().split(/\s+/);
        if (parts.length > 5) {
            throw new Error('Güvenlik: Saniye bazlı cron ifadeleri desteklenmiyor. Minimum aralık 1 dakikadır.');
        }

        const jobId = `cron_${agentId}_${Date.now()}`;
        
        // Her cron job'un son sonucunu hafızada tut — sonraki çalışmada history olarak geç
        const cronMemory = { lastResult: null };
        
        const job = cron.schedule(cronExpr, async () => {
            logger.info(`[CRON] ⏰ ${agentId} için görev tetiklendi: "${taskPrompt.slice(0, 80)}..."`);
            try {
                const cwd = process.cwd().replace(/\\/g, '/');
                const agentWorkDir = `${cwd}/Agents/${agentId}/cron_output`;
                
                // Cron prompt'u: kesin yollar + önceki sonuç + doğrulama talimatı
                let enrichedPrompt = [
                    `[SİSTEM: Bu bir zamanlanmış CRON görevidir. MUTLAKA araç çağrıları ile tamamla.]`,
                    `[MUTLAK YOL KURALI: Dosya yazarken MUTLAKA tam yol kullan. Çalışma dizinin: ${cwd}]`,
                    `[DOSYA KAYIT DİZİNİ: ${agentWorkDir} — tüm cron çıktılarını BURAYA yaz]`,
                    `[DOĞRULAMA: Bir dosya yazdıktan sonra aynı dosyayı byterover(action=read) ile oku ve içeriğini doğrula. Okuyamıyorsan HATA bildir, dosya var gibi davranma.]`,
                ].join('\n');
                
                if (cronMemory.lastResult) {
                    enrichedPrompt += `\n\n[ÖNCEKİ CRON ÇALIŞMASININ SONUCU]:\n${cronMemory.lastResult.slice(0, 500)}`;
                }
                
                enrichedPrompt += `\n\nGörev: ${taskPrompt}`;
                
                // skipShield + dummy progressCallback ile streaming path'e gir (55s timeout)
                const dummyProgress = () => {};
                const response = await LLMBridge.execute(
                    agentId, enrichedPrompt, [], { skipShield: true }, dummyProgress
                );
                
                const result = response?.content || '';
                cronMemory.lastResult = result;
                logger.info(`[CRON] ✅ ${agentId} görevi tamamlandı. Yanıt: ${result.slice(0, 120)}...`);

                // Sonucu dosyaya kaydet (backup)
                if (result.length > 10) {
                    try {
                        const logDir = path.join(process.cwd(), 'Agents', agentId, 'cron_logs');
                        await fs.mkdir(logDir, { recursive: true });
                        const logFile = path.join(logDir, `cron_${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
                        await fs.writeFile(logFile, `# Cron Sonucu\n**Zaman:** ${new Date().toLocaleString('tr-TR')}\n**Görev:** ${taskPrompt}\n\n${result}`, 'utf8');
                    } catch (fileErr) {
                        logger.warn(`[CRON] Dosya kaydetme hatası: ${fileErr.message}`);
                    }
                }

                // Telegram'a gönder (bot aktifse ve son chat_id varsa)
                if (result.length > 10) {
                    try {
                        await this._sendToTelegram(agentId, result);
                    } catch (tgErr) {
                        logger.warn(`[CRON] Telegram gönderim hatası: ${tgErr.message}`);
                    }
                }
            } catch (e) {
                logger.error(`[CRON] ❌ ${agentId} görev hatası: ${e.message}`);
            }
        });

        this.activeJobs.set(jobId, { job, agentId, cronExpr, taskPrompt });
        await this._persist(agentId);
        logger.info(`[CRON] 📋 ${agentId} için yeni görev eklendi: ${cronExpr} → "${taskPrompt.slice(0, 50)}"`);
        return jobId;
    }

    /**
     * Bir ajanın tüm aktif cron görevlerini listeler.
     */
    list(agentId) {
        const jobs = [];
        for (const [id, data] of this.activeJobs) {
            if (data.agentId === agentId) {
                jobs.push({ id, cronExpr: data.cronExpr, task: data.taskPrompt });
            }
        }
        return jobs;
    }

    /**
     * Bir cron görevini iptal eder.
     */
    async cancel(jobId) {
        const data = this.activeJobs.get(jobId);
        if (data) {
            data.job.stop();
            this.activeJobs.delete(jobId);
            await this._persist(data.agentId);
            logger.info(`[CRON] 🗑️ Görev iptal edildi: ${jobId}`);
            return true;
        }
        return false;
    }

    /**
     * Sunucu başlangıcında tüm persist edilmiş görevleri geri yükler.
     */
    async restoreAll() {
        const agentsDir = path.resolve(process.cwd(), 'Agents');
        let totalRestored = 0;
        try {
            const agents = await fs.readdir(agentsDir);
            for (const agentId of agents) {
                const cronPath = path.join(agentsDir, agentId, 'cron_jobs.json');
                try {
                    const data = JSON.parse(await fs.readFile(cronPath, 'utf8'));
                    for (const item of data) {
                        try {
                            await this.schedule(agentId, item.cronExpr, item.task);
                            totalRestored++;
                        } catch (e) {
                            logger.warn(`[CRON] Görev geri yüklenemedi (${agentId}): ${e.message}`);
                        }
                    }
                } catch (e) { /* cron_jobs.json yoksa sessizce geç */ }
            }
            if (totalRestored > 0) {
                logger.info(`[CRON] 🔄 Toplam ${totalRestored} görev geri yüklendi.`);
            }
        } catch (e) {
            logger.warn(`[CRON] Geri yükleme hatası: ${e.message}`);
        }
    }

    /**
     * Ajanın cron görevlerini diske persist eder (restart dayanıklılığı).
     */
    async _persist(agentId) {
        try {
            const cronPath = path.join(process.cwd(), 'Agents', agentId, 'cron_jobs.json');
            const jobs = this.list(agentId);
            await fs.mkdir(path.dirname(cronPath), { recursive: true });
            await fs.writeFile(cronPath, JSON.stringify(jobs, null, 2));
        } catch (e) {
            logger.warn(`[CRON] Persist hatası (${agentId}): ${e.message}`);
        }
    }

    /**
     * Telegram bridge referansını bağla (sunucu başlangıcında çağrılır).
     */
    setTelegramBridge(bridge) {
        this._telegramBridge = bridge;
    }

    /**
     * Cron sonucunu Telegram'a gönderir (son bilinen chat_id üzerinden).
     */
    async _sendToTelegram(agentId, text) {
        if (!this._telegramBridge?.bots?.has(agentId)) return;
        
        const bot = this._telegramBridge.bots.get(agentId);
        
        // Son chat_id'yi bul — ajan Chats klasöründeki en son telegram thread'i
        const chatsDir = path.join(process.cwd(), 'Agents', agentId, 'Chats');
        const files = await fs.readdir(chatsDir);
        const telegramChats = files.filter(f => f.startsWith('telegram_') && f.endsWith('.json'));
        
        if (telegramChats.length === 0) return;
        
        // En son güncellenen chat dosyasını bul
        let latestFile = telegramChats[0];
        let latestTime = 0;
        for (const f of telegramChats) {
            const stat = await fs.stat(path.join(chatsDir, f));
            if (stat.mtimeMs > latestTime) {
                latestTime = stat.mtimeMs;
                latestFile = f;
            }
        }
        
        // chat_id: dosya adından çıkar (telegram_<chat_id>.json)
        const chatId = latestFile.replace('telegram_', '').replace('.json', '');
        
        if (!chatId) return;

        // Mesajı 4096 karaktere böl (Telegram limiti)
        const chunks = [];
        const cleanText = text.replace(/\[CONFIG_UPDATE\].*$/gm, '').replace(/\[CRON_SCHEDULE\].*$/gm, '').trim();
        for (let i = 0; i < cleanText.length; i += 4000) {
            chunks.push(cleanText.slice(i, i + 4000));
        }

        for (const chunk of chunks) {
            try {
                await bot.api.sendMessage(chatId, `⏰ **[CRON RAPORU]**\n\n${chunk}`, { parse_mode: 'Markdown' });
            } catch (e) {
                // Markdown hata verirse düz metin gönder
                await bot.api.sendMessage(chatId, `⏰ [CRON RAPORU]\n\n${chunk}`);
            }
        }
        logger.info(`[CRON] 📤 ${agentId} cron sonucu Telegram'a gönderildi (chat: ${chatId}).`);
    }
}

export const cronManager = new CronManager();
