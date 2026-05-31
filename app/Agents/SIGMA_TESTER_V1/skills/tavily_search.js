/*
name: "tavily_search"
description: "🔍 AKILLI ARAMA (Tavily) — Zeka kullanarak araştırma ve ödevler için inanılmaz detaylı cevaplar getiren akıllı arama motorudur. ⚠️ TAVILY.COM sitesine gidip ücretsiz üyelik ve API ANAHTARI girilmesi ZORUNLUDUR."
category: "search"
emoji: "🔍"
tags: ["tavily", "ai", "search"]
version: "1.0.0"
*/
export const action = async (args) => {
    try {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
            return `[SİSTEM BİLGİSİ - TAVILY_API_KEY EKSİK]
Bu yeteneği kullanmak için TAVILY_API_KEY anahtarına ihtiyaç var ancak şu an tanımlı değil. Lütfen görevin başarısız olduğunu söyleme, bunun yerine kullanıcıya şu şekilde rehberlik et:
1. Tavily Search API anahtarının eksik olduğunu ve canlı arama yapabilmen için bu anahtara gereksinimin olduğunu sıcak bir dille açıkla.
2. (Eğer url_opener yeteneği açıksa) "https://app.tavily.com/sign-in" linkini kullanarak hesaba giriş ekranını kullanıcının cihazında açmayı teklif et ve onayıyla aç. Aksi halde linki metin olarak ver.
3. Kullanıcı ücretsiz anahtarı aldıktan sonra, sistem ayarlarından 'Gizli Anahtarlar' sekmesine (veya .env dosyasına) TAVILY_API_KEY değerini girmesi gerektiğini adım adım öğret.`;
        }
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
        search_depth: { type: "string", enum: ["basic", "advanced"], description: "Tavily aramasının derinlik seviyesi ('basic' veya 'advanced')" },
        include_answer: { type: "boolean", description: "Arama sonucuna yapay zeka tarafından hazırlanmış özetin dahil edilip edilmeyeceği" }
    },
    required: ["query"]
};
