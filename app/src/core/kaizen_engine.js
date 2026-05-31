import { LLMBridge } from '../bridge/llm_bridge.js';
import { Ledger } from '../memory/evaluation_manager.js';
import logger from '../utils/logger.js';

/**
 * AgentsHUB - Kaizen Engine (The Kognitif Vicdan) - IP-6
 * 
 * Etkileşim sonrası asenkron çalışan, ajanın kendi hatalarını
 * veya israflarını inceleyip "Öz-Eleştiri" yapan motordur.
 */
class AgentConscience {
    
    /**
     * Asenkron (Fire and Forget) Vicdan Muhasebesi.
     */
    async runReflection(agentId, contextHistory, telemetryData) {
        if (!agentId || !contextHistory || contextHistory.length === 0) return;

        const KAIZEN_SYSTEM_PROMPT = `
Sevgili Kaizen, sen AgentsHUB'ın Vicdanısın.
Gönderilen telemetri verisini ve sohbeti analiz ederek ajanın gelişimini sağla.

KRİTİK KURALLAR:
1. Eğer telemetride bir tool 'success: false' ise bu bir HATADIR. Asla 'Hata yok' deme.
2. Ajan gereksiz tool çağırdıysa veya token israfı yaptıysa belirt.

ÇIKTI FORMATI:
- **Teşhis:** (Kısa kök neden)
- **Yeni Kural:** (Ajanın bir daha bu hatayı yapmaması için net emir. Örn: 'X yeteneğini y parametresi olmadan çağırma.')
- **Skor:** (0-100)
`;
        
        // Son etkileşim paketini hazırla (Son 2-3 mesajı alıp özetle)
        const recentContext = contextHistory.slice(-4);
        const snapshot = JSON.stringify({
            recent_chat: recentContext,
            metrics: telemetryData
        }, null, 2);

        try {
            const hasToolError = telemetryData.tools && telemetryData.tools.some(t => t.success === false);
            // G.3 & D.3: Maliyet optimizasyonu — Hata yoksa sadece %10 ihtimalle çalış
            if (!hasToolError && Math.random() > 0.1) {
                logger.debug(`[KAIZEN ENGINE] Hata yok, optimizasyon nedeniyle bu etkilesim atlandi`);
                return;
            }
            logger.info(`[KAIZEN ENGINE] ${agentId} ajaninin otonom oz-elestiri sureci basladi (Arka Planda)...`);
            
            // Kendi LLM'imize özel bir Kaizen isteği atıyoruz. (Sonsuz döngüyü önlemek için Kaizen çağrıları telemetriden muaf tutulmalıdır)
            const reflectionResponse = await LLMBridge._executeRaw(
                agentId, 
                KAIZEN_SYSTEM_PROMPT, 
                [{ role: 'user', content: `Bu etkileşimi analiz et:\n${snapshot}` }]
            );

            const reflectionContent = reflectionResponse.content || "";
            
            const isCritical = hasToolError || (!reflectionContent.toLowerCase().includes("hata yok") && reflectionContent.length > 30);

            if (isCritical) {
                const diagObj = {
                    rootCause: hasToolError ? "Kritik Yetenek/Tool Hatasi (Exception)" : "Kognitif Analiz Sonucu",
                    rule: reflectionContent,
                    score: (m => m ? m[1] : "50")(reflectionContent.match(/Skor.*?(\d+)/i))
                };

                await Ledger.logEvaluation(agentId, diagObj);
            }
            // Kusursuz etkileşimlerde kayıt tutulmaz (Kaizen deftere sadece sorun olduğunda yazar)

        } catch(e) {
            logger.error(`[KAIZEN ENGINE] Oz-elestiri (Reflection) asamasinda hata: ${e.message}`);
        }
    }
}

export const Kaizen = new AgentConscience();
