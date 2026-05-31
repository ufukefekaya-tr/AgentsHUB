import logger from '../utils/logger.js';

/**
 * AgentsHUB - Schema Translator (Rosetta Taşı) - IP-5 KM-5.1
 * 
 * Geliştiricilerin evrensel JSON formatında yazdığı yetenek parametrelerini,
 * hedeflenen LLM sağlayıcısının (örn: Google Gemini) anladığı Native koda tercüme eder.
 */
export const SchemaTranslator = {
    
    /**
     * Evrensel becerileri Gemini Tool objesine (FunctionDeclarations) dönüştürür.
     * @param {Array<Object>} skills - Evrensel beceri array'i
     * @returns {Array<Object>|null} Gemini SDK'ya verilecek tools objesi
     */
    toGeminiTools(skills) {
        if (!skills || skills.length === 0) return null;

        const hasGoogleSearch = skills.some(s => s.name === 'google_search');
        const otherSkills = skills.filter(s => s.name !== 'google_search');

        const toolArr = [];

        if (otherSkills.length > 0) {
            const functionDeclarations = otherSkills.map(skill => ({
                name: skill.name,
                description: skill.description,
                parameters: skill.parameters
            }));
            toolArr.push({ functionDeclarations });
        }

        if (hasGoogleSearch) {
            // Gemini API kuralı: googleSearch ve functionDeclarations AYNI request içinde kullanılamaz!
            // ("Multiple tools are supported only when they are all search tools.")
            // Eğer fonksiyon becerileri varsa googleSearch yoksayılır, aksi halde sadece googleSearch eklenir.
            if (otherSkills.length === 0) {
                toolArr.push({ googleSearch: {} });
            } else {
                logger.warn('[BRIDGE] ⚠️ Sistem Hem google_search hem de ozel LLM araclari iceriyor. Gemini API sinirlamasi nedeniyle google_search devre disi birakildi. Eger kullanmak istiyorsaniz diger yetenekleri (skills) kapatiniz.');
            }
        }

        return toolArr.length > 0 ? toolArr : null;
    }
};
