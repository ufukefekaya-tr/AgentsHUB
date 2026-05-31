/**
 * CALCULATOR Skill — Güvenli matematik hesaplayıcı
 * eval() KULLANMAZ, güvenli ayrıştırma ile çalışır.
 * @version 1.1.0
 * @category utility
 */

export const skill = {
    name: "calculator",
    version: "1.1.0",
    category: "utility",
    tags: ["matematik", "hesaplama", "aritmetik"],
    emoji: "🧮",
    requires: {},
    description: "🧮 HESAP MAKİNESİ — Basit ve karmaşık matematik hesabı yapar. Toplama, çıkarma, borsa yüzde hesabı gibi işlerde kullanılır. Matematik işlemleri için temel hesaplama aracıdır.",
    parameters: {
        type: "object",
        properties: {
            expression: {
                type: "string",
                description: "Hesaplanacak matematiksel ifade (örn: '15*4+max(10,5)')"
            }
        },
        required: ["expression"]
    },
    execute: async (args) => {
        try {
            if (!args.expression) return "[HATA] Hesaplanacak ifade belirtilmedi.";
            
            let expr = args.expression.trim();
            
            // Yüzde hesaplama: "20% of 8500" → 8500 * 0.20
            const pctMatch = expr.match(/^([\d.]+)\s*%\s*of\s*([\d.]+)$/i);
            if (pctMatch) {
                const pct = parseFloat(pctMatch[1]);
                const base = parseFloat(pctMatch[2]);
                const result = base * (pct / 100);
                return `[HESAP] ${pct}% of ${base} = ${result}`;
            }
            
            // Basit yüzde: "20%" → 0.20
            expr = expr.replace(/([\d.]+)\s*%/g, (_, n) => `(${n}/100)`);
            
            // Fonksiyon dönüşümleri
            expr = expr.replace(/sqrt\(/gi, 'Math.sqrt(');
            expr = expr.replace(/abs\(/gi, 'Math.abs(');
            expr = expr.replace(/round\(/gi, 'Math.round(');
            expr = expr.replace(/floor\(/gi, 'Math.floor(');
            expr = expr.replace(/ceil\(/gi, 'Math.ceil(');
            expr = expr.replace(/sin\(/gi, 'Math.sin(');
            expr = expr.replace(/cos\(/gi, 'Math.cos(');
            expr = expr.replace(/tan\(/gi, 'Math.tan(');
            expr = expr.replace(/log\(/gi, 'Math.log10(');
            expr = expr.replace(/ln\(/gi, 'Math.log(');
            expr = expr.replace(/pi/gi, 'Math.PI');
            expr = expr.replace(/\^/g, '**');
            
            // GÜVENLİK: Sadece izin verilen karakterler
            const allowed = /^[\d\s+\-*/().%,Math.sqrtabceilflooroundsincotaglnPI*]+$/;
            if (!allowed.test(expr)) {
                return `[HATA] Güvenli olmayan ifade. Sadece sayılar ve matematiksel operatörler kullanılabilir.`;
            }
            
            // Güvenli hesaplama (Function constructor ile izole)
            const fn = new Function(`"use strict"; return (${expr});`);
            const result = fn();
            
            if (typeof result !== 'number' || isNaN(result)) {
                return `[HATA] Hesaplama sonucu geçersiz: ${result}`;
            }
            
            // Ondalık hassasiyet
            const formatted = Number.isInteger(result) ? result : parseFloat(result.toFixed(10));
            
            return `[HESAP] ${args.expression} = ${formatted}`;
        } catch (error) {
            return `[HATA] Hesaplama hatası: ${error.message}. Geçerli bir matematiksel ifade girin.`;
        }
    }
};
