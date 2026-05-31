import logger from '../utils/logger.js';
import { Registry } from './registry.js';

/**
 * SIGNAL BUS (H-03 Geliştirme) — Ajan-Arası Mesajlaşma
 *
 * In-memory mesaj kuyruğu ile asenkron inter-agent iletişim.
 * Faz 2: LLMBridge.execute entegrasyonu ile gerçek ajan yanıtları iletilecek.
 */

// H-03: In-memory mesaj kuyrukları — agentId → mesaj listesi
const _inboxes = new Map();

export const SignalBus = {

    /**
     * Bir ajanın gelen kutusuna mesaj bırakır.
     */
    _deliver(targetAgentId, message) {
        if (!_inboxes.has(targetAgentId)) _inboxes.set(targetAgentId, []);
        _inboxes.get(targetAgentId).push({ ...message, deliveredAt: Date.now() });
    },

    /**
     * Bir ajanın bekleyen mesajlarını döndürür ve kutusunu temizler.
     */
    drain(agentId) {
        const msgs = _inboxes.get(agentId) || [];
        _inboxes.delete(agentId);
        return msgs;
    },

    /**
     * @param {string} senderId - Gönderen Ajan
     * @param {string} targetSpecialty - Aranan Uzmanlık (Örn: hukuki_analiz)
     * @param {object} payload - {"type": "Query" | "Task", "data": "..."}
     */
    async transmit(senderId, targetSpecialty, payload) {
        logger.info(`[SIGNAL BUS] ${senderId} → [${targetSpecialty}] sinyali iletiliyor...`);

        const targetAgent = await Registry.discover(targetSpecialty);

        if (!targetAgent) {
            logger.warn(`[SIGNAL BUS] İletim başarısız: "${targetSpecialty}" uzmanlığında ajan bulunamadı.`);
            return { status: "error", message: `"${targetSpecialty}" uzmanlığında ajan bulunamadı.` };
        }

        // H-03: Mesajı hedef ajanın gelen kutusuna bırak
        this._deliver(targetAgent.id, {
            from: senderId,
            type: payload.type,
            data: payload.data
        });

        logger.info(`[SIGNAL BUS] ✓ Sinyal iletildi → [${targetAgent.id}] | Tür: ${payload.type}`);
        return { status: "transmitted", target: targetAgent.id };
    },

    /**
     * Bir ajandan diğerine doğrudan görev iletir.
     */
    async internalCall(callerId, requiredSpecialty, taskPayload) {
        logger.info(`[SIGNAL BUS] İç çağrı: [${callerId}] → [${requiredSpecialty}]`);
        return this.transmit(callerId, requiredSpecialty, { type: "Task", data: taskPayload });
    }
};
