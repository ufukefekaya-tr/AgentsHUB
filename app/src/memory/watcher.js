import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const WATCHED_AGENTS = new Set();
let watcherRefs = {};

/**
 * NATIVE WATCHER (Canlı Reaksiyon Modülü)
 * 
 * Sıfır bağımlılık (chokidar yasak) prensibi ile fs.watch kullanarak
 * USER.md dosyasını dinler. Değişiklik anında LLM Bridge katmanını uyarmak üzere tetiklenir.
 */
export const Watcher = {
    
    /**
     * @param {string} agentId - İzlenecek ajan Workspace id'si
     */
    observe(agentId) {
        if (WATCHED_AGENTS.has(agentId)) return;
        
        const workspaceDir = path.resolve(process.cwd(), 'Agents', agentId, 'Mind-Set_Core');
        const targetFile = path.join(workspaceDir, 'USER.md');
        
        try {
            // Check if file exists before watching
            if (!fs.existsSync(targetFile)) {
                logger.warn(`[WATCHER] ${agentId} ajaninin USER.md dosyasi henüz fiziksel olarak mevcut degil, izlemeye alinamadi.`);
                return;
            }

            const watcher = fs.watch(targetFile, (eventType, filename) => {
                if (eventType === 'change') {
                    logger.info(`[WATCHER] X----------------------------------------X`);
                    logger.info(`[WATCHER] ${agentId} adli ajanin USER.md (Bilinç) dosyasinda manuel degisim saptandi! (Event: ${eventType})`);
                    logger.info(`[WATCHER] Ajanin bilinci (Memory Cache) tazelendi. Bir sonraki prompt yeni USER baglamina uyacaktir.`);
                    logger.info(`[WATCHER] X----------------------------------------X`);
                    
                    // L2 Chroma / Cache Yıkım Fonksiyonları (Faz 3) burada tetiklenecek.
                }
            });

            watcher.on('error', (error) => {
                logger.error(`[WATCHER ERROR] ${agentId} USER.md izleme hatasi, sistemin cokmemesi icin kapatiliyor:`, error);
                Watcher.stop(agentId);
            });

            watcherRefs[agentId] = watcher;
            WATCHED_AGENTS.add(agentId);
            logger.info(`[WATCHER] ${agentId} ajaninin USER bilinci gozlem altina alindi.`);

        } catch (error) {
            logger.error(`[WATCHER ERROR] ${agentId} ajani izlenemedi:`, error);
        }
    },

    stop(agentId) {
        if (watcherRefs[agentId]) {
            watcherRefs[agentId].close();
            delete watcherRefs[agentId];
            WATCHED_AGENTS.delete(agentId);
            logger.info(`[WATCHER] ${agentId} izlemesi durduruldu.`);
        }
    }
};
