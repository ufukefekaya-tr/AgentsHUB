import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * AgentsHUB - Hücresel Devre Kesici (Cellular Circuit Breaker) - IP-4 KM-4.1
 *
 * State Machine:
 *   CLOSED  (Normal çalışma)
 *   OPEN    (Devre kesik - Tüm istekler reddedilir)
 *   HALF-OPEN (Tek test isteği gönderilir)
 *
 * MUTLAK İZOLASYON: Her ajan kendi agentId ile ayrı bir devre durumu tutar.
 */
class CircuitBreakerManager {
    constructor() {
        this.circuits = new Map(); // agentId -> { state, failures, lastFailureTime, successesInHalfOpen }
    }

    _getCircuit(agentId) {
        if (!this.circuits.has(agentId)) {
            this.circuits.set(agentId, {
                state: 'CLOSED',
                failures: 0,
                lastFailureTime: null,
                successesInHalfOpen: 0
            });
        }
        return this.circuits.get(agentId);
    }

    _setState(agentId, newState) {
        const c = this._getCircuit(agentId);
        if (c.state !== newState) {
            logger.warn(`[CIRCUIT BREAKER] ${agentId}: ${c.state} → ${newState}`);
            c.state = newState;
            if (newState === 'CLOSED') {
                c.failures = 0;
                c.successesInHalfOpen = 0;
            }
            // Kaizen günlüğüne yaz
            this._logKaizen(agentId, newState);
        }
    }

    async _logKaizen(agentId, state) {
        try {
            const evalPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'EVALUATION.md');
            const entry = `\n- [${new Date().toISOString()}] [KAIZEN] Circuit Breaker → ${state} (Ajan: ${agentId})`;
            await fs.appendFile(evalPath, entry, 'utf8');
        } catch (e) {
            // Ajan dizini yoksa sessizce geç
        }
    }

    /**
     * Bir işlevi Circuit Breaker koruması altında çalıştırır.
     * @param {string} agentId
     * @param {Function} fn - Korunacak async işlev
     * @param {object} config - { circuit_breaker_threshold: 5, circuit_breaker_timeout_ms: 30000 }
     * @param {Function} fallbackFn - Devre açık olduğunda çağrılacak fallback
     */
    async call(agentId, fn, config = {}, fallbackFn = null) {
        const threshold = config.circuit_breaker_threshold || 5;
        const resetTimeoutMs = config.circuit_breaker_timeout_ms || 30000;
        const c = this._getCircuit(agentId);

        // OPEN durum kontrolü
        if (c.state === 'OPEN') {
            const elapsed = Date.now() - c.lastFailureTime;
            if (elapsed >= resetTimeoutMs) {
                // Zaman doldu: HALF-OPEN'a geç ve tek test isteği ver
                this._setState(agentId, 'HALF-OPEN');
            } else {
                // Hala OPEN: fallback veya hata
                logger.warn(`[CIRCUIT BREAKER] ${agentId} devre ACIK! ${Math.round((resetTimeoutMs - elapsed) / 1000)}s sonra test edilecek.`);
                if (fallbackFn) return fallbackFn();
                throw new Error(`[CIRCUIT BREAKER] ${agentId} hatta yok. Bekleniyor...`);
            }
        }

        try {
            const result = await fn();

            // Başarı
            if (c.state === 'HALF-OPEN') {
                this._setState(agentId, 'CLOSED');
                logger.info(`[CIRCUIT BREAKER] ${agentId} kendini onardu (HALF-OPEN → CLOSED). Self-Healing tam!`);
            } else {
                // CLOSED durumda başarıda sayacı sıfırla
                c.failures = 0;
            }
            return result;

        } catch (error) {
            c.failures++;
            c.lastFailureTime = Date.now();

            logger.error(`[CIRCUIT BREAKER] ${agentId} hata. Sayac: ${c.failures}/${threshold}. Hata: ${error.message}`);

            if (c.state === 'HALF-OPEN' || c.failures >= threshold) {
                this._setState(agentId, 'OPEN');
                await this._logKaizen(agentId, `OPEN - Neden: ${error.message.slice(0, 100)}`);
                if (fallbackFn) return fallbackFn();
            }

            throw error;
        }
    }

    /** Belirli bir ajanın devre durumunu döndürür */
    getStatus(agentId) {
        const c = this._getCircuit(agentId);
        return {
            agentId,
            state: c.state,
            failures: c.failures,
            lastFailureTime: c.lastFailureTime
        };
    }

    /** Test amaçlı: Manuel reset */
    reset(agentId) {
        this.circuits.delete(agentId);
        logger.info(`[CIRCUIT BREAKER] ${agentId} devresi manuel olarak sifirlandi.`);
    }
}

export const CircuitBreaker = new CircuitBreakerManager();
