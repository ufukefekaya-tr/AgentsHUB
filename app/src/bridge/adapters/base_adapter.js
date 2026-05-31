/**
 * Evrensel Adaptör Şablonu (Polimorfizm)
 * 
 * Sistemdeki tüm farklı LLM sağlayıcıları bu sözleşmeye uymak zorundadır.
 * Amaç: Sistem kodlarının (The Bridge), hangi modelle konuştuğunu bilmesine 
 * gerek kalmadan stabil bir `OpenAgentResponse` objesi almasını sağlamaktır.
 */

export class BaseAdapter {
    constructor(apiKey, config) {
        this.apiKey = apiKey;
        this.config = config; // { model, temperature, token_limit vb. }
    }

    /**
     * @param {string} systemPrompt - DNA Parser'dan gelen tek parça (DNA+RULES+USER) 
     * @param {Array<object>} chatHistory - Önceki mesajların listesi [{role, content}]
     * @param {string} currentMessage - Kullanıcının anlık sorusu/sinyali
     * @returns {Promise<OpenAgentResponse>}
     */
    async generateResponse(systemPrompt, chatHistory, currentMessage) {
        throw new Error("BaseAdapter.generateResponse implemente edilmek zorundadir!");
    }

    /**
     * @returns {OpenAgentResponse} Standartlastirilmis AgentsHUB yaniti
     */
    _normalizeResponse(content, rawTokens, modelName, reasoning = "", cachedTokens = 0) {
        return {
            content: content,
            reasoning: reasoning,       // Modele ozgu dusunce baloncugu varsa buraya
            metadata: {
                tokens_used: rawTokens, // Token ekonomisi icin
                cached_tokens: cachedTokens, // Tasarruf edilen token (L3)
                model_used: modelName,
                timestamp: new Date().toISOString()
            }
        };
    }
}
