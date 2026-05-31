/*
name: "tavily_search"
description: "AI ajanları için optimize edilmiş gelişmiş arama motoru olan Tavily'yi kullanır."
category: "search"
emoji: "🔍"
tags: ["tavily", "ai", "search"]
version: "1.0.0"
*/
export const action = async (args) => {
    try {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) return "SİSTEM HATASI: TAVILY_API_KEY .env dosyasında bulunamadı.";
        
        const { query, search_depth = "basic", include_answer = true } = args;
        
        const payload = {
            api_key: apiKey,
            query,
            search_depth,
            include_answer,
            max_results: 5
        };

        const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errBody = await res.text();
            return `Arama motoru hatası: ${res.status} - ${errBody}`;
        }

        const data = await res.json();
        let out = "";
        
        if (data.answer) out += `🤖 Tavily AI Cevabı:\n${data.answer}\n\n`;
        out += "KAYNAKLAR:\n";
        (data.results || []).forEach(r => {
            out += `- ${r.title}\n  ${r.url}\n  ${r.content}\n\n`;
        });
        
        return out.trim() || "Sonuç bulunamadı.";
    } catch(e) {
        return `[Tavily Search Error] ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        query: { type: "string" },
        search_depth: { type: "string", enum: ["basic", "advanced"], description: "advanced daha yavaştır ama derin arar" },
        include_answer: { type: "boolean", description: "Tavily kendi LLM cevabını özetlesin mi?" }
    },
    required: ["query"]
};
