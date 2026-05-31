import { GoogleGenAI } from '@google/genai';
import logger from '../utils/logger.js';
import { MindsetParser } from '../memory/parser.js';

/**
 * L3 Bellek: Devasa Context Caching Orkestratörü 
 * (Gemini CachedContent API kullanarak %90 token tasarrufu sağlar)
 */
export const CacheManager = {

    async _getClient(agentId) {
        const config = await MindsetParser.loadConfig(agentId);
        const apiKey = config?.api_key;
        if (!apiKey) throw new Error(`[SOVEREIGN ERROR] ${agentId} L3 Cache icin API Key eksik!`);
        const cleanKey = apiKey.trim();
        const initParams = { apiKey: cleanKey };

        if (cleanKey.startsWith('AQ') || process.env.VERTEX_PROJECT || config.vertex_project) {
            initParams.vertexai = {
                project: config.vertex_project || process.env.VERTEX_PROJECT,
                location: config.vertex_location || process.env.VERTEX_LOCATION || "us-central1"
            };
        }
        return new GoogleGenAI(initParams);
    },

    /**
     * @param {string} agentId 
     * @param {string} systemInstruction 
     * @param {Array} messages 
     * @param {Array} tools
     * @param {number} ttlMinutes 
     * @returns {Promise<string>} Cached Content Name referansı
     */
    async createCache(agentId, systemInstruction, messages, tools = null, ttlMinutes = 60) {
        // Modeli config'den oku — sadece context caching destekleyen modellerde çalış
        const config = await MindsetParser.loadConfig(agentId);
        const agentModel = config?.model || '';
        
        // Caching uyumluluğu: base model adını çıkar (preview/latest suffix'leri dahil)
        const CACHE_COMPATIBLE_BASES = ['gemini-3.1-pro', 'gemini-3.1-flash', 'gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'];
        const isCompatible = CACHE_COMPATIBLE_BASES.some(m => agentModel.toLowerCase().includes(m));
        if (!isCompatible) {
            logger.warn(`[L3 CACHE MANAGER] ${agentModel} modeli context caching desteklemiyor. Bypass.`);
            return "BYPASS_MODEL_INCOMPATIBLE";
        }

        // Formatlama: Sadece dolu text içerikli mesajları al (toolCall/toolResponse atla)
        const rawContents = messages
            .filter(m => m.content && typeof m.content === 'string' && m.content.trim().length > 10)
            .map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

        // Google Context Caching API gereksinimleri:
        // 1. Ardışık aynı-rol mesajları birleştir (user→user veya model→model yasak)
        // 2. İlk mesaj 'user' olmalı
        // 3. Son mesaj 'model' olmalı (cached content model turn ile bitmeli)
        const sanitized = [];
        for (const msg of rawContents) {
            if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === msg.role) {
                // Ardışık aynı rol: önceki mesaja birleştir
                sanitized[sanitized.length - 1].parts[0].text += '\n\n' + msg.parts[0].text;
            } else {
                sanitized.push({ role: msg.role, parts: [{ text: msg.parts[0].text }] });
            }
        }
        // İlk mesaj 'user' olmalı
        while (sanitized.length > 0 && sanitized[0].role !== 'user') sanitized.shift();
        // Son mesaj 'model' olmalı (Google şartı)
        // Önceden: while loop ile pop yapıyorduk ve bu ilk istekte tüm listeyi siliyordu.
        // Yeni Fix: Eğer son mesaj 'model' değilse, ufak bir onay mesajı ekle geç.
        if (sanitized.length > 0 && sanitized[sanitized.length - 1].role !== 'model') {
            sanitized.push({ role: 'model', parts: [{ text: 'Understood.' }] });
        }
        if (sanitized.length === 0) {
            sanitized.push({ role: 'user', parts: [{ text: 'System Init' }] });
            sanitized.push({ role: 'model', parts: [{ text: 'Understood.' }] });
        }
        // Token tahmini: ~4 karakter = 1 token
        // KRİTİK FIX: systemInstruction da Google'ın minimum token hesabına dahildir.
        // Önceden sadece contents sayılıyordu → system prompt (9K+ tok) görmezden geliniyordu
        // → BYPASS_TOO_SMALL sürekli tetikleniyordu. Artık her ajan için doğru hesap yapılıyor.
        const sysInstrChars = (systemInstruction || '').length;
        const contentChars = sanitized.reduce((acc, m) => acc + (m.parts[0]?.text?.length || 0), 0);
        const estimatedTokens = Math.ceil((sysInstrChars + contentChars) / 4);

        // Minimum: Gemini 2.5 Flash için 1024, Pro için 2048 token (system + contents toplamı)
        const minTokens = agentModel.includes('pro') ? 2048 : 1024;
        if (estimatedTokens < minTokens) {
            logger.warn(`[L3 CACHE MANAGER] ${agentId}: Toplam içerik (${estimatedTokens} tok = ${sysInstrChars} sys + ${contentChars} msgs chars) minimum ${minTokens} token altında. L3 Bypass.`);
            return "BYPASS_TOO_SMALL";
        }
        if (sanitized.length < 2) {
            logger.warn(`[L3 CACHE MANAGER] ${agentId}: En az 2 mesaj (user+model) gerekli. Mevcut: ${sanitized.length}. L3 Bypass.`);
            return "BYPASS_TOO_SMALL";
        }

        try {
            const ai = await this._getClient(agentId);

            // Google API formatı: model prefix'siz verilir, SDK ekler
            // Config objesi: tools boş ise GÖNDERİLMEZ (INVALID_ARGUMENT tetikler)
            const cacheConfig = {
                systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
                contents: sanitized,
                ttl: `${ttlMinutes * 60}s`
            };

            // Tools sadece gerçekten varsa ekle (boş array INVALID_ARGUMENT verir)
            if (tools && Array.isArray(tools) && tools.length > 0) {
                cacheConfig.tools = tools;
            }

            const cachedContent = await ai.caches.create({
                model: agentModel,
                config: cacheConfig
            });

            logger.info(`[L3 CACHE MANAGER] ✅ ${agentId} baglami Google sunucularinda onbellege alindi: ${cachedContent.name}`);
            return cachedContent.name;
        } catch (error) {
            if (error?.status === 404 || error?.status === 401 || error?.name === 'ApiError') {
                logger.info(`[L3 CACHE MANAGER] Vertex AI Express (AQ.) anahtari Otonom Caching modunu destelemiyor. Caching atlandi (BYPASS_CACHE), sistem stabil izinde devam ediyor.`);
            } else {
                logger.error(`[L3 CACHE MANAGER] Cache olusturma basarisiz (${agentModel || 'Belirsiz Model'}): ${JSON.stringify(error)}`);
            }
            // YEDEK/B-PLANI: Cache bypass edilir, sistem standart çalisir.
            return "BYPASS_CACHE_ERROR";
        }
    }
};
