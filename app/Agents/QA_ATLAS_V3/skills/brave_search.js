/*
name: "brave_search"
description: "🦁 GİZLİ İNTERNET ARAMASI (Brave) — İnternette reklamsız ve takip edilmeden arama yapar. ⚠️ ÜCRETLİ VEYA ÜYELİK GEREKTİRİR. Gelişmiş kullanıcı değilseniz bedava olan Google veya DuckDuckGo yeteneklerinden birini tercih ediniz."
category: "search"
emoji: "🦁"
tags: ["brave", "search"]
version: "1.0.0"
*/
export const action = async (args) => {
    try {
        const apiKey = process.env.BRAVE_API_KEY;
        if (!apiKey) {
            return `[SİSTEM BİLGİSİ - BRAVE_API_KEY EKSİK]
Bu yeteneği kullanmak için BRAVE_API_KEY anahtarına ihtiyaç var ancak şu an tanımlı değil. Lütfen görevin başarısız olduğunu söyleme, bunun yerine kullanıcıya şu şekilde rehberlik et:
1. Brave Search API anahtarının eksik olduğunu destekleyici bir dille açıkla.
2. (Eğer url_opener yeteneği mevcutsa) kullanıcının cihazında "https://api.search.brave.com/app/keys" bağlantısını açmayı teklif et (veya linki doğrudan ver).
3. Anahtarı edindikten sonra, sistem ayarlarında 'Gizli Anahtarlar' paneline BRAVE_API_KEY olarak nasıl ekleneceğini yönlendir.`;
        }
        const { query } = args;
        
        const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": apiKey
            }
        });

        if (!res.ok) {
            return `Arama motoru hatası: ${res.status}`;
        }

        const data = await res.json();
        let out = "KAYNAKLAR:\n";
        
        (data.web?.results || []).forEach(r => {
            out += `- ${r.title}\n  ${r.url}\n  ${r.description}\n\n`;
        });
        
        return out.trim() || "Sonuç bulunamadı.";
    } catch(e) {
        return `[Brave Search Error] ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        query: { type: "string" }
    },
    required: ["query"]
};
