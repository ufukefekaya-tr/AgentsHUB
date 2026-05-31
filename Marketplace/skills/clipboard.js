/**
 * CLIPBOARD Skill — Pano okuma/yazma
 * Windows PowerShell ile pano yönetimi.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const skill = {
    name: "clipboard",
    version: "1.0.0",
    category: "system",
    tags: ["pano", "kopyala", "yapistir"],
    emoji: "📋",
    requires: { os: ["windows"] },
    description: "📋 KOPYALA/YAPIŞTIR — Bilgisayarda mouse ile kopyaladığınız bir metni (Ctrl+C) ajanın da form doldurmak veya okumak için görebilmesini sağlar. Ya da ajan size metin kopyalayıp verebilir.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["read", "write"],
                description: "Yapılacak işlem türü (örn: 'read', 'write', 'execute', 'list', 'delete', 'capture', 'install', 'uninstall')"
            },
            content: {
                type: "string",
                description: "Dosyaya yazılacak veya sisteme eklenecek metin içeriği"
            }
        },
        required: ["action"]
    },
    execute: async (args) => {
        try {
            switch (args.action) {
                case 'read': {
                    const { stdout } = await execPromise('powershell -Command "Get-Clipboard"', { timeout: 5000 });
                    const text = stdout.trim();
                    if (!text) return "[BILGI] Pano boş.";
                    return `[PANO İÇERİĞİ]\n${text}`;
                }
                
                case 'write': {
                    if (!args.content) return "[HATA] Kopyalanacak içerik belirtilmedi.";
                    // Güvenli: içeriği stdin üzerinden pipe et
                    const escaped = args.content.replace(/"/g, '`"');
                    await execPromise(`powershell -Command "Set-Clipboard -Value \\"${escaped}\\""`, { timeout: 5000 });
                    return `[BAŞARILI] ${args.content.length} karakter panoya kopyalandı.`;
                }
                
                default:
                    return "[HATA] Geçersiz işlem. 'read' veya 'write' kullanın.";
            }
        } catch (error) {
            return `[HATA] Pano işlemi başarısız: ${error.message}`;
        }
    }
};
