/**
 * URL_OPENER Skill — Varsayılan tarayıcıda URL açar
 * YouTube şarkı, Google arama, web sitesi ziyareti vb.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const skill = {
    name: "url_opener",
    version: "1.0.0",
    category: "web",
    tags: ["tarayici", "link", "youtube", "google"],
    emoji: "🔗",
    requires: { os: ["windows"] },
    description: "Kullanıcının bilgisayarında varsayılan tarayıcıyı açar ve verilen URL'ye gider. YouTube videosu açmak, web sitesi ziyaret ettirmek veya Google'da arama başlatmak için kullanılır. ⚠️ Yalnızca Windows'ta çalışır. Tarayıcı ajan tarafından kontrol edilmez, sadece URL açılır.",
    parameters: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "Acilacak URL. Ornek: 'https://youtube.com/watch?v=...', 'https://google.com/search?q=test'"
            }
        },
        required: ["url"]
    },
    execute: async (args) => {
        try {
            if (!args.url) return "[HATA] URL belirtilmedi.";
            
            let url = args.url.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            
            // GÜVENLİK: URL doğrulaması
            try { new URL(url); } catch { return "[HATA] Geçersiz URL formatı."; }
            
            // Windows: varsayılan tarayıcıda aç
            await execPromise(`start "" "${url}"`, { timeout: 5000 });
            
            return `[BAŞARILI] Tarayıcıda açıldı: ${url}`;
        } catch (error) {
            return `[HATA] URL açılamadı: ${error.message}`;
        }
    }
};
