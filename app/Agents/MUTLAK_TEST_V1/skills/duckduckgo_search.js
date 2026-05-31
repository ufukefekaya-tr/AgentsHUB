/*
name: "duckduckgo_search"
description: "DuckDuckGo HTML sürümü üzerinden ücretsiz ve API anahtarsız web araması yapar."
category: "search"
emoji: "🦆"
tags: ["search", "web", "free"]
version: "1.0.0"
*/
import * as cheerio from 'cheerio';

export const action = async (args) => {
    try {
        const { query } = args;
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (!res.ok) return `[HATA] DuckDuckGo arama yapılamadı, sunucu engellemesi veya hatası: HTTP ${res.status}. (Sorgu: ${query})`;
        
        const html = await res.text();
        const $ = cheerio.load(html);
        const results = [];
        
        $('.result').each((i, el) => {
            if (i > 4) return false; // İlk 5 sonuç yeterli
            const title = $(el).find('.result__title a').text();
            const url = $(el).find('.result__url').attr('href');
            const snippet = $(el).find('.result__snippet').text();
            if (title && url) {
                // url parametresini temizle (DDG redirect)
                let cleanUrl = url;
                if(url.includes('//duckduckgo.com/l/?uddg=')) {
                    cleanUrl = decodeURIComponent(url.split('uddg=')[1]);
                }
                results.push(`Başlık: ${title}\nURL: ${cleanUrl}\nÖzet: ${snippet}\n---\n`);
            }
        });
        
        return results.length ? results.join('\n') : "Sonuç bulunamadı.";
    } catch(e) {
        return `[DDG Search Error] ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        query: { type: "string", description: "Aranacak terimler (örn: 'AgentsHUB nedir')" }
    },
    required: ["query"]
};
