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
    description: "Güncel bilgilere (haberler, hava durumu, hisse senetleri vb.) ulasmak icin Google'da arama yapar. Her zaman en guncel veri icin bunu kullan.",
    execute: async () => "[NATIVE_SEARCH_GROUNDING_ACTIVE]"
};
