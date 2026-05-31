/*
name: "brave_search"
description: "AI ajanları için yüksek kaliteli Brave Search altyapısını kullanır."
category: "search"
emoji: "🦁"
tags: ["brave", "search"]
version: "1.0.0"
*/
export const action = async (args) => {
    try {
        const apiKey = process.env.BRAVE_API_KEY;
        if (!apiKey) return "SİSTEM HATASI: BRAVE_API_KEY bulunamadı.";
        
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
