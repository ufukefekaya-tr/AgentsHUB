import logger from '../utils/logger.js';
import { AGENT_DRIVEN_INTERVAL_MS } from '../config/constants.js';

/**
 * AgentsHUB - Agent-Driven Motor (H-02 Geliştirme)
 *
 * OODA (Observe → Orient → Decide → Act) döngüsü.
 * Her heartbeat'te kayıtlı task queue işlenir.
 * Şu an: task queue in-memory. Faz 2'de: persistent cron kayıtları.
 */

let isRunning = false;
let loopInterval = null;

// H-02: Basit in-memory görev kuyruğu — Faz 2'de SQLite/JSONL'ye taşınacak
const _taskQueue = [];

export const scheduleTask = (agentId, taskFn, label = 'anonymous') => {
    _taskQueue.push({ agentId, taskFn, label, scheduledAt: Date.now() });
    logger.info(`[Agent-Driven] Görev kuyruğa eklendi: [${agentId}] "${label}" (Kuyruk: ${_taskQueue.length})`);
};

export const startAgentDrivenLoop = (intervalMs = AGENT_DRIVEN_INTERVAL_MS) => {
    if (isRunning) return;
    isRunning = true;

    logger.info(`[Agent-Driven Motor] OODA Döngüsü Başlatıldı. Her ${intervalMs / 1000}s heartbeat.`);

    if (_taskQueue.length === 0) {
        scheduleTask("Global", async () => logger.debug("[OODA] Yürek atışı (Heartbeat) sistem kontrolü OK"), "System Diagnostic Pulse");
    }

    loopInterval = setInterval(async () => {
        try {
            // OBSERVE: Sistemin durumunu gözlemle
            const pending = _taskQueue.length;
            if (pending === 0) {
                logger.debug?.(`[Agent-Driven] Heartbeat — Kuyruk boş, bekleniyor.`);
                return;
            }

            // ORIENT + DECIDE + ACT: Kuyruktaki görevleri sırayla çalıştır
            logger.info(`[Agent-Driven] Heartbeat — ${pending} görev işleniyor...`);
            const batch = _taskQueue.splice(0, 5); // Bir seferde max 5 görev
            for (const task of batch) {
                try {
                    await task.taskFn();
                    logger.info(`[Agent-Driven] Görev tamamlandı: [${task.agentId}] "${task.label}"`);
                } catch (taskErr) {
                    logger.error(`[Agent-Driven] Görev hatası: [${task.agentId}] "${task.label}": ${taskErr.message}`);
                }
            }
        } catch (error) {
            logger.error(`[Agent-Driven] Döngü hatası:`, error);
        }
    }, intervalMs);
};

export const stopAgentDrivenLoop = () => {
    if (loopInterval) {
        clearInterval(loopInterval);
        isRunning = false;
        logger.info(`[Agent-Driven Motor] Otonom Sürüş Durduruldu, Event-Driven moda düşüldü.`);
    }
}
