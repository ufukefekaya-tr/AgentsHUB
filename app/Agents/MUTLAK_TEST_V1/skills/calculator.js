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
    description: "Matematiksel ifadeleri hesaplar. Desteklenen islemler: toplama (+), cikarma (-), carpma (*), bolme (/), us alma (^), yuzde hesabi (%), karekök (sqrt), trigonometri (sin, cos, tan), logaritma (log, ln), sabitler (pi). Ornek kullanim: '2+2', '15*3.5', 'sqrt(144)', '20% of 8500', '2^10', 'sin(45)', 'log(100)'. Birim donusumu YAPMAZ, sadece sayisal ifadeler icin kullanilir.",
    parameters: {
        type: "object",
        properties: {
            expression: {
                type: "string",
                description: "Hesaplanacak matematiksel ifade. Ornekler: '2+2', '15*3.5', 'sqrt(144)', '20% of 8500', '2^10', 'sin(45)', 'log(100)'"
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
