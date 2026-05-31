import logger from '../utils/logger.js';
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKER_PATH = path.join(__dirname, 'worker.js');

/**
 * AgentsHUB - Mutlak İzole Kum Havuzu (Sandbox Runner) - IP-5 KM-5.2
 *
 * LLM tarafından tetiklenen fonksiyonların izole olarak çalıştırıldığı modül.
 * Ana thread blokajını önlemek için gerçek OS Thread'leri (worker_threads) kullanır.
 *
 * M-07 NOT: Skill'ler Worker Thread içinde çalışır ve 10s zaman aşımıyla durdurulur.
 * Ancak Worker Thread'ler dış ağa (HTTP) erişebilir — tam ağ izolasyonu için
 * vm.runInNewContext + custom fetch override veya eBPF/seccomp gereklidir.
 * Şu anki koruma: 10s timeout + skill whitelist.
 */
export const SandboxRunner = {

    /**
     * @param {Object} skillObj 
     * @param {Object} args 
     * @param {string} agentId 
     * @param {Object} configOverrides
     * @returns {Promise<any>}
     */
    async executeIsolated(skillObj, args, agentId, configOverrides = {}) {
        const EXECUTION_TIMEOUT_MS = 45000; // Artirildi: Image Generation 12-18sn surebiliyor

        return new Promise((resolve) => {
            if (!skillObj.__filePath) {
                logger.warn(`[SANDBOX HATA] ${skillObj.name} icin dosya yolu (filePath) bulunamadi.`);
                return resolve(`[SKILL FATAL ERROR]: Skill is missing __filePath marker.`);
            }

            logger.info(`[SANDBOX] ${agentId} tarafindan '${skillObj.name}' yetenegi izole odada (Worker) baslatildi.`);
            
            const worker = new Worker(WORKER_PATH, {
                workerData: {
                    filePath: skillObj.__filePath,
                    args: args || {},
                    agentId: agentId,
                    configOverrides: configOverrides
                }
            });

            // Fiziksel Giyotin (Donanım Seviyesi Timeout)
            const timeoutId = setTimeout(() => {
                worker.terminate();
                logger.warn(`[SANDBOX HATA] Yetenek '${skillObj.name}' zamaninda donmedi veya sonsuz donguye girdi. ISCI YOK EDILDI (Air-Gap).`);
                resolve(`[ARAÇ HATASI - ${skillObj.name}]\nHata: Zaman aşımı (${EXECUTION_TIMEOUT_MS/1000} saniye)\nGirdi: ${JSON.stringify(args).slice(0, 200)}\nÖneri: İşlem çok uzun sürdü. Daha küçük bir girdi deneyin veya farklı bir araç kullanın.`);
            }, EXECUTION_TIMEOUT_MS);

            worker.on('message', (msg) => {
                clearTimeout(timeoutId);
                if (msg.success) {
                    resolve(msg.result);
                } else {
                    logger.warn(`[SANDBOX HATA] Yetenek '${skillObj.name}' kodlamasinda cokus (Crash): ${msg.error}`);
                    resolve(`[ARAÇ HATASI - ${skillObj.name}]\nHata: ${msg.error}\nGirdi: ${JSON.stringify(args).slice(0, 200)}\nÖneri: Bu aracı farklı parametrelerle deneyin veya internet bağlantısını kontrol edin.`);
                }
            });

            worker.on('error', (err) => {
                clearTimeout(timeoutId);
                logger.error(`[SANDBOX FATAL] Isci tabanli cokme: ${err.message}`);
                resolve(`[ARAÇ HATASI - ${skillObj.name}]\nHata: Kritik çökme - ${err.message}\nGirdi: ${JSON.stringify(args).slice(0, 200)}\nÖneri: Bu araç şu anda kullanılamıyor. Alternatif bir yol deneyin.`);
            });

            worker.on('exit', (code) => {
                clearTimeout(timeoutId);
                if (code !== 0) {
                     logger.warn(`[SANDBOX] Isci kapandi (Exit code: ${code}).`);
                }
            });
        });
    }
};
