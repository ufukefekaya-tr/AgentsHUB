import logger from './logger.js';
import fs from 'fs/promises';
import path from 'path';

const TELEMETRY_FILE = path.resolve(process.cwd(), 'logs', 'telemetry.json');

/**
 * TELEMETRY (Maliyet ve Performans Takibi) - V3.0
 * Artık kalıcı: veriler diske yazılır, uygulama yeniden başlatıldığında korunur.
 */
export const Telemetry = {
    sessionTokens: 0,
    dailyTotal: 0,
    _lastDate: null,

    /**
     * Uygulama başlangıcında diskten mevcut veriyi yükler.
     */
    async loadFromDisk() {
        try {
            const data = JSON.parse(await fs.readFile(TELEMETRY_FILE, 'utf8'));
            const today = new Date().toISOString().split('T')[0];

            if (data.date === today) {
                this.dailyTotal = data.daily_total || 0;
            } else {
                // Yeni gün = sıfırla
                this.dailyTotal = 0;
            }
            this._lastDate = today;
            logger.info(`[TELEMETRY] Disk verisi yuklendi. Gunluk: ${this.dailyTotal} token`);
        } catch {
            // Dosya yoksa sıfırdan başla
            this._lastDate = new Date().toISOString().split('T')[0];
        }
    },

    /**
     * Token kullanımını kaydet ve diske yaz.
     */
    async recordUsage(tokens) {
        this.sessionTokens += tokens;
        this.dailyTotal += tokens;
        logger.telemetry('LLM_USAGE', tokens);

        // Diske kaydet
        try {
            const payload = {
                date: this._lastDate || new Date().toISOString().split('T')[0],
                daily_total: this.dailyTotal,
                last_updated: new Date().toISOString()
            };
            await fs.writeFile(TELEMETRY_FILE, JSON.stringify(payload, null, 2), 'utf8');
        } catch (e) {
            logger.warn(`[TELEMETRY] Diske yazilamadi: ${e.message}`);
        }
    },

    getSessionReport() {
        return {
            session_tokens: this.sessionTokens,
            daily_total: this.dailyTotal,
            estimated_cost_usd: (this.dailyTotal / 1000000) * 1.5 // Example rate
        };
    },

    resetSession() {
        this.sessionTokens = 0;
    }
};
