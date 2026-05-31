/**
 * WEB_SCRAPER Skill — URL'den sayfa içeriğini çeker
 * Ajan web sayfalarını okuyabilir (arama sonuçlarına girebilir)
 */

export const skill = {
    name: "web_scraper",
    version: "1.1.0",
    category: "web",
    tags: ["internet", "sayfa", "icerik", "html", "makale"],
    emoji: "🌐",
    requires: { network: true },
    description: "Verilen URL'deki web sayfasinin icerigini cekermetne donusturur. Web arama sonuclarina girmek, makale okumak veya sayfa icerigini analiz etmek icin kullanilir. HTML'i temiz metne cevirir, script/style bloklarini kaldirir. Maksimum 8000 karakter dondurur. JavaScript ile render edilen SPA sayfalarini OKUYAMAZ.",
    parameters: {
        type: "object",
        properties: {
            url: {
                type: "string",
                description: "Icerik cekilecek web sayfasinin tam URL'si (https://... ile baslamali)"
            },
            max_length: {
                type: "number",
                description: "Dondurulecek maksimum karakter sayisi (varsayilan: 8000)"
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
            
            // SSRF Koruması (Toggle aware)
            try {
                const sPath = path.join(process.cwd(), 'global_settings.json');
                const conf = JSON.parse(await fs.readFile(sPath, 'utf8'));
                if (conf.ssrf_guard_enabled !== false) {
                    const ssrfGuardPath = path.resolve(process.cwd(), 'src/security/ssrf-guard.js');
                    const { validateUrlSync } = await import('file:///' + ssrfGuardPath.replace(/\\/g, '/'));
                    const check = validateUrlSync(url);
                    if (!check.safe) return `[GÜVENLİK HATASI] ${check.reason}`;
                }
            } catch (e) {
                // Ignore if security config cannot be read, fail open or log
                 return `[GÜVENLİK SİSTEMİ HATASI] SSRF Koruması kontrol edilemedi: ${e.message}`;
            }
            
            const maxLen = args.max_length || 8000;
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
                }
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                return `[HATA] HTTP ${response.status}: ${response.statusText}`;
            }
            
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/json')) {
                return `[BILGI] Bu URL metin icerigi donmuyor (Content-Type: ${contentType}). Sadece HTML/text/JSON sayfalar okunabilir.`;
            }
            
            let html = await response.text();
            
            // HTML → temiz metin dönüşümü
            let text = html
                // Script ve style bloklarını kaldır
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
                // HTML comment'leri kaldır
                .replace(/<!--[\s\S]*?-->/g, '')
                // Blok elementleri yeni satıra çevir
                .replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n')
                .replace(/<br\s*\/?>/gi, '\n')
                // Linkleri [text](url) formatına çevir
                .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
                // Kalan tüm HTML tag'lerini kaldır
                .replace(/<[^>]+>/g, '')
                // HTML entities
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ')
                .replace(/&#\d+;/g, '')
                // Fazla boşlukları temizle
                .replace(/[ \t]+/g, ' ')
                .replace(/\n\s*\n/g, '\n\n')
                .trim();
            
            if (text.length > maxLen) {
                text = text.slice(0, maxLen) + '\n\n[...icerik kesildi, toplam ' + text.length + ' karakter]';
            }
            
            if (!text || text.length < 10) {
                return `[BILGI] Sayfa icerigi bos veya cok kisa. JavaScript ile render edilen sayfalar okunamayabilir.`;
            }
            
            return `[WEB ICERIK - ${url}]\n\n${text}`;
        } catch (error) {
            if (error.name === 'AbortError') {
                return `[HATA] Zaman asimi: Sayfa 15 saniye icinde yanit vermedi.`;
            }
            return `[HATA] Web sayfasi okunamadi: ${error.message}`;
        }
    }
};
