import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * AgentsHUB - Error Gateway (Zarif Bozunma Filtresi) - IP-4 KM-4.3
 *
 * 1. Ham teknik hataları (stack trace) kullanıcıya yansıtmaz.
 * 2. Hataları Atlas bilincine yakışır, insan dostu mesajlara çevirir.
 * 3. Kritik hatalar ajanın EVALUATION.md'sine Kaizen günlüğü olarak düşer.
 */

/** Teknik hata kodunu insanca bir mesaja çevirir */
export function humanizeError(err) {
    const code = err?.status || err?.code || 0;
    const msg = err?.message || '';

    if (msg.includes('SECURITY_SHIELD_BLOCK'))
        return "Bu mesaj güvenlik kontrolünden geçemedi. Lütfen farklı bir ifadeyle tekrar deneyin. Sistem koruma altında çalışmaya devam ediyor.";
    if (code === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED'))
        return "Şu an yoğun bir kognitif yük altındayım. Kısa bir süre bekleyin, birazdan devam edeceğim.";
    if (code === 503 || msg.includes('503') || msg.includes('overloaded'))
        return "Bağlı olduğum sistemler geçici olarak bakımda. Otomatik yeniden deneme protokolüm aktif.";
    if (msg.includes('TIMEOUT_SHIELD') || msg.includes('timeout'))
        return "İstek bekleme süresi aşıldı. Bağlantıyı kestim, lütfen tekrar gönderin.";
    if (msg.includes('CIRCUIT_BREAKER') || msg.includes('Circuit Breaker'))
        return "Devre koruması devreye girdi. Temel sistemler yedek moda geçti, bir süre sonra otomatik onarılacağım.";
    if (msg.includes('SOVEREIGN'))
        return "Bu ajan için geçerli bir API anahtarı bulunamadı. Lütfen hücre yapılandırmanızı kontrol edin.";

    return "Beklenmeyen bir anomali oluştu. Standby moduna geçiyorum, birazdan kaldığımız yerden devam edelim.";
}

/** Kaizen günlüğünü ajan EVALUATION.md'sine yazar */
export async function logKaizenError(agentId, error) {
    if (!agentId) return;
    try {
        const evalPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'EVALUATION.md');
        const entry = `\n- [${new Date().toISOString()}] [KAIZEN] HATA: ${error?.message?.slice(0, 200) || 'Bilinmeyen hata'}`;
        await fs.appendFile(evalPath, entry, 'utf8');
    } catch (e) { /* Sessizce geç */ }
}

/** Express HTTP Global Error Handler */
export const globalErrorHandler = (err, req, res, next) => {
    logger.error(`[ERROR GATEWAY] ${req?.path || 'N/A'}: ${err?.message}`);

    const message = humanizeError(err);
    const agentId = req?.body?.agentId || req?.params?.agentId;
    if (agentId) logKaizenError(agentId, err);

    // M-11: Dil tutarlılığı — hata yanıtları Türkçe
    res.status(err.status || 500).json({
        success: false,
        error: "Sistem Bekleme Modunda",
        message
    });
};
