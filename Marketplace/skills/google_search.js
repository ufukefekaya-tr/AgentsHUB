/**
 * GOOGLE SEARCH: Native Grounding Bridge
 * Bu skill'in bir execute fonksiyonu yoktur cunku Gemini bunu Native olarak halleder.
 * SchemaTranslator bu skill adini gorunce payload'u otomatik gunceller.
 */
export const skill = {
    version: "1.0.0",
    name: "google_search",
    category: "search",
    emoji: "🔍",
    tags: ["google", "search", "web", "news"],
    description: "🔍 GOOGLE ARAMASI — (EN İYİ VE ÜCRETSİZ ARAMA) Yapay zekanın yerleşik arama özelliğini açar. Anlık haber, yağmur durumu, hisse senedi fiyatı gibi sorguları hemen ve ücretsiz özetleyerek cevaplar.",
    execute: async () => "[NATIVE_SEARCH_GROUNDING_ACTIVE]"
};
