import logger from '../utils/logger.js';

/**
 * AgentsHUB - Zaman Aşımı Kalkanı (Timeout Shield) - IP-4 KM-4.1
 *
 * Promise.race() kullanarak herhangi bir async işlemin (LLM API, SQLite vb.)
 * belirli bir süre içinde yanıt vermemesi durumunda asenkron kilitlenmeyi önler.
 *
 * Her ajanın config.json'ındaki timeout_ms değerini kullanır.
 * Varsayılan: 15.000 ms (15 saniye)
 */
export const TimeoutShield = {

    /**
     * @param {Function} fn - Korunacak async fonksiyon
     * @param {number} timeoutMs - Maksimum bekleme süresi (ms)
     * @param {string} label - Log için işlem adı (örn: "GEMINI API")
     * @returns {Promise<any>}
     */
    async wrap(fn, timeoutMs = 15000, label = 'UNKNOWN') {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`[TIMEOUT_SHIELD] "${label}" isaret ${timeoutMs}ms sonra yanit vermedi. Baglanti kesildi.`));
            }, timeoutMs);
        });

        try {
            return await Promise.race([fn(), timeoutPromise]);
        } catch (error) {
            if (error.message.includes('TIMEOUT_SHIELD')) {
                logger.error(`[TIMEOUT SHIELD] ${label} zamanlayici tahrik edildi (${timeoutMs}ms). ${error.message}`);
            }
            throw error;
        }
    }
};
