import { BaseAdapter } from './base_adapter.js';
import logger from '../../utils/logger.js';

/**
 * MOCK ADAPTER (Testler ve LLM kapalı durumlar için)
 * Gerçek API anahtarı olmadan veya internet yokken sistemi test edebilmek
 * için sahte ama gerçeğe uygun şemada JSON yanıtları üretir.
 */
export class MockAdapter extends BaseAdapter {
    constructor(apiKey, config) {
        super(apiKey, config);
    }

    async generateResponse(systemPrompt, chatHistory, currentMessage) {
        logger.info(`[MOCK ADAPTER] Sinyal alindi. Model: ${this.config.model}`);
        
        // Simüle edilmiş ağ gecikmesi (Agentic hissiyatı)
        await new Promise(resolve => setTimeout(resolve, 800));

        const replyContent = `[MOCK YANIT]: Kullanıcı "${currentMessage}" dedi. ` + 
                             `Sistem Talimatı Uzunluğu: ${systemPrompt.length} karakter. ` +
                             `Ben ${this.config.model} olarak bunu anladim ve otonom tepki verdim.`;
        
        logger.info(`[MOCK ADAPTER] Sahte yanit uretildi.`);
        return this._normalizeResponse(replyContent, 125, this.config.model, "Bu bir simulasyon dusuncesidir.");
    }
}
