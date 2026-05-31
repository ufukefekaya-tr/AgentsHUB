import logger from '../utils/logger.js';

/**
 * AgentsHUB - Exponential Backoff with Full Jitter (IP-4 KM-4.1)
 * 
 * Formül: waitTime = random(0, min(cap, base * 2^retry))
 * Saf exponential yerine Full Jitter kullanır. Bu sayede:
 * 1. Birden fazla ajan aynı anda API'ye saldırmaz (Thundering Herd önleme)
 * 2. Her ajan farklı zamanlarda retry atar (Gerçek Stoacılık)
 */
export const withExponentialBackoff = async (asyncFunction, maxRetries = 3, baseDelayMs = 2000, capMs = 32000) => {
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            return await asyncFunction();
        } catch (error) {
            retries++;
            
            if (retries >= maxRetries) {
                logger.error(`[BACKOFF] Maksimum deneme (${maxRetries}) asildi. Hata firlatiyor.`, error.message);
                throw error;
            }
            
            // Full Jitter: random(0, min(cap, base * 2^retry))
            const exponential = baseDelayMs * Math.pow(2, retries - 1);
            const waitTime = Math.random() * Math.min(capMs, exponential);
            
            // Only retry on rate-limit or server errors (not auth failures)
            const isRetryable = !error.message?.includes('401') && !error.message?.includes('403') && !error.message?.includes('SOVEREIGN');
            if (!isRetryable) {
                throw error; // Yetki hatalarında direkt yoksay
            }
            
            logger.warn(`[BACKOFF] Istek basarisiz. ${Math.round(waitTime)}ms bekleniyor... (Deneme ${retries}/${maxRetries}) Jitter aktif. Hata: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
};
