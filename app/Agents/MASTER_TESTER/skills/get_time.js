export const skill = {
    name: "get_server_time",
    version: "1.0.0",
    category: "utility",
    tags: ["saat", "tarih", "zaman"],
    emoji: "🕐",
    requires: {},
    description: "🕐 SAAT SORGULAYICI — \"Şu an saat kaç\" veya \"Bugün günlerden ne\" dediğinizde ajanı uyarır ve güncel zamanı söyler. Kurulması önerilen çok hafif ve gerekli bir araçtır.",
    parameters: {
        type: "object",
        properties: {
            timezone: { type: "string", description: "İstenen zaman dilimi (örn: 'Europe/Istanbul')" }
        }
    },
    execute: async (args) => {
        try {
            if (args && args.timezone) {
                return new Date().toLocaleString("tr-TR", { timeZone: args.timezone });
            }
            return new Date().toISOString();
        } catch(e) { return "Zaman alinamadi: " + e.message; }
    }
};