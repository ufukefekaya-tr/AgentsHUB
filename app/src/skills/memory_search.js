/*
 * SKILL: memory_search
 * Description: Ajanın kendi L2 vektör (Semantik) hafızasında belirlediği kavramları aramasını sağlar.
 * 
 * Bu yeteneğin çalışması için ana sistemdeki (UMI) L2 Vector Database'in (embeddings.sqlite) aktif olması gerekir.
 * Kullanıcı ajan ile ilgili geçmişteki olayları, dosyaları veya konuşmaları sorduğunda bu araç tetiklenir.
 */
import { UMI } from '../memory/umi.js';
import logger from '../utils/logger.js';

export const agent_skill = {
    name: "memory_search",
    description: "Geçmiş sohbetlerdeki, yüklenen metinlerdeki ve eski hafızanızdaki (L2 Semantik Bellek) bilgileri arayıp bulmanızı sağlar. Kullanıcı geçmiş bir olayı sorarsa bu aracı çağırın.",
    parameters: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Geçmiş hafızanızda aramak istediğiniz cümle parçası, kelime grubu veya konu özeti. Uzun ve spesifik cümleler daha iyi eşleşme sağlar."
            },
            limit: {
                type: "integer",
                description: "Kaç adet anı (geçmiş hafıza paragrafı) getirilmesini istiyorsunuz? Normal aramalar için 3, detaylı araştırmalar için 5 önerilir."
            }
        },
        required: ["query"]
    },
    
    // Araç çalıştırıldığında tetiklenecek ana fonksiyon
    execute: async (args, context) => {
        const { query, limit = 3 } = args;
        const agentId = context?.agentId;

        if (!query) {
            return "HATA: query (arama metni) boş bırakılamaz.";
        }
        if (!agentId) {
            return "HATA: Agent kimliği (agentId) tespit edilemedi. Hafıza izole edilemiyor.";
        }

        try {
            logger.info(`[SKILL: memory_search] ${agentId} hafızasında arama yapılıyor: "${query}" (Limit: ${limit})`);
            
            // UMI üzerinden L2 Semantic Search tetikle
            const searchResults = await UMI.semanticSearch(agentId, query);
            
            if (!searchResults || searchResults.length === 0) {
                return `ARAMA SONUCU:\n"${query}" sorgusuyla eşleşen herhangi bir geçmiş hafıza veya konuşma kaydı bulunamadı.`;
            }

            // Gelen sonuç sayısını sınırla (En yüksek eşleşmeler en başta gelir çünkü embeddings_adapter cosine similarity kullanır)
            const finalResults = searchResults.slice(0, limit);
            
            let formattedResponse = `=== L2 HAFIZA SORGULAMASI (MEMORY SEARCH) ===\nArama Sorgusu: "${query}"\nBulunan Anı Parçaları:\n\n`;
            
            finalResults.forEach((res, index) => {
                // Her sonucu belirginleştiriyoruz
                formattedResponse += `[Anı #${index + 1}]:\n"${res.content}"\n\n`;
            });

            return formattedResponse;
        } catch (error) {
            logger.error(`[SKILL: memory_search] Hata: ${error.message}`);
            return `HATA: L2 Hafıza motorunda bir sorun oluştu. Detay: ${error.message}`;
        }
    }
};
