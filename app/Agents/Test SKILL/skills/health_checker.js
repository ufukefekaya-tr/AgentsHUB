/*
name: "health_checker"
description: "Ajanın kendi veya dış sistem (API/Web) bağımlılıklarının sağlık durumlarını (Ayakta mı?) izler. Hataları ve HTTP kodlarını analiz eder."
category: "system"
emoji: "🛡️"
tags: ["health", "monitoring", "ping", "uptime"]
version: "1.0.0"
*/
export const action = async (args) => {
    try {
        const { urls, check_timeout_ms = 5000 } = args;
        
        if (!urls || !(urls instanceof Array)) {
            return "[HEALTH CHECKER HATASI]: Lütfen kontrol edilecek URL(leri) bir 'urls' dizisi (Listesi) olarak sağlayın.";
        }

        let report = `[SİSTEM SAĞLIK RAPORU]\nTarih: ${new Date().toISOString()}\n----------------------\n`;
        let fails = 0;

        for (const url of urls) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), check_timeout_ms);
                
                const res = await fetch(url, { signal: controller.signal, method: 'GET' }).catch(e => { throw e });
                clearTimeout(timeout);
                
                if (res.ok) {
                    report += `✅ [UP] ${url} (HTTP ${res.status})\n`;
                } else {
                    fails++;
                    report += `⚠️ [DEGRADED] ${url} (HTTP ${res.status})\n`;
                }
            } catch (err) {
                fails++;
                let reason = err.name === 'AbortError' ? 'TIME_OUT (Belirlenen sure icinde dönüs yapmadi)' : err.message;
                report += `❌ [DOWN] ${url} (Hata: ${reason})\n`;
            }
        }

        report += `\n[ÖZET] Toplam Taranan: ${urls.length} | Sağlıklı: ${urls.length - fails} | Başarısız: ${fails}`;
        return report;
    } catch(e) {
        return `[HEALTH CHECKER ERROR]: ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        urls: { type: "array", items: { type: "string" }, description: "Kontrol edilecek tam API veya Web adresleri (örn: ['https://google.com', 'http://127.0.0.1:3000/api/health'])" },
        check_timeout_ms: { type: "number", description: "Bir isteğin maksimum bekleme süresi (Milisaniye). Varsayılan 5000." }
    },
    required: ["urls"]
};
