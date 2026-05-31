export const skill = {
    name: "get_server_time",
    version: "1.0.0",
    category: "utility",
    tags: ["saat", "tarih", "zaman"],
    emoji: "🕐",
    requires: {},
    description: "Sunucunun anlik guncel saat ve tarih bilgisini ceker. ISO 8601 formatinda dondurur. Opsiyonel timezone parametresi ile farkli saat dilimlerinde gosterir (ornek: Europe/Istanbul, America/New_York).",
    parameters: {
        type: "object",
        properties: {
            timezone: { type: "string", description: "Opsiyonel. Örn: Europe/Istanbul" }
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