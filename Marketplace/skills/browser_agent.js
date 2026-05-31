/*
name: "browser_agent"
description: "🌐 TARAYICI BOTU — Gerçek bir kullanıcı gibi siteye girer, düğmelere tıklar, gizli sayfaları okur. İleri düzey sayfa analiz aracıdır. ⚠️ Sistemde Playwright yüklü değilse çöker. Normal okuma için Web Okuyucu kullanın."
category: "search"
emoji: "🌐"
tags: ["browser", "web", "playwright"]
version: "1.0.0"
*/
import { chromium } from 'playwright';

export const action = async (args) => {
    const { url, extract_text = true, run_script, wait_for_selector } = args;
    let browser, context;
    try {
        browser = await chromium.launch({ headless: true });
        context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();
        
        await page.goto(url, { waitUntil: 'load', timeout: 20000 }).catch(e => { throw new Error(`Sayfa yüklenemedi: ${e.message}`) });
        
        if (wait_for_selector) {
            await page.waitForSelector(wait_for_selector, { timeout: 10000 }).catch(() => {});
        }
        
        if (run_script) {
            await page.evaluate(run_script).catch(() => {});
        }
        
        // Anti-bot vs gibi hafif timeoutlar
        await page.waitForTimeout(2000); 
        
        let out = `[BROWSER AGENT]: '${url}' sayfasına girildi.\n`;
        
        if (extract_text) {
            // Sadece okunabilir sayfayı ayıkla (gereksiz boşluk ve scriptleri sil)
            const textContent = await page.evaluate(() => {
                const s = document.querySelectorAll('script, style, noscript, nav, footer, iframe');
                s.forEach(el => el.remove());
                return document.body.innerText.replace(/\n\s*\n/g, '\n').trim();
            });
            out += `\n[--- SAYFA İÇERİĞİ ---]\n${textContent.slice(0, 15000)}... (Maximum karakter kısıtlaması nedeniyle kırpıldı)`;
        } else {
             out += " (Sayfa başarıyla ziyaret edildi, ancak metin çekilmedi.)";
        }
        
        return out;
    } catch(e) {
        return `[Browser Error] ${e.message}`;
    } finally {
        if (context) await context.close();
        if (browser) await browser.close();
    }
};

export const schema = {
    type: "object",
    properties: {
        url: { type: "string", description: "Ziyaret edilecek veya kontrol edilecek web sitesi adresi (örn: 'https://example.com/')" },
        extract_text: { type: "boolean", description: "Sayfa yüklendiğinde metnin çekilip çekilmeyeceği (true/false) - Genelde true gönderilmelidir" },
        wait_for_selector: { type: "string", description: "Tarayıcının yüklenmesini bekleyeceği CSS belirteci (selector)" },
        run_script: { type: "string", description: "Açılan web sayfasında çalıştırılacak özel JavaScript kodu" }
    },
    required: ["url"]
};
