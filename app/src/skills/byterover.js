import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execPromise = promisify(exec);

/**
 * BYTEROVER: Sovereign System & File Utility (IP-7)
 * Ajanın bilgisayarda bir insan gibi teknik işler yapmasını sağlar.
 */
export const skill = {
    name: "byterover",
    description: "Terminal komutu calistirir veya dosya sistemi operasyonlari (oku/yaz/listele/sil) yapar.",
    parameters: {
        type: "object",
        properties: {
            action: { 
                type: "string", 
                enum: ["execute", "read", "write", "list", "delete"],
                description: "Yapilacak islem tipi."
            },
            command: { 
                type: "string", 
                description: "execute islemi icin calistirilacak terminal komutu. (Not: Windows formatinda olmalidir)" 
            },
            path: { 
                type: "string", 
                description: "Dosya islemleri icin hedef dizin veya dosya yolu." 
            },
            content: { 
                type: "string", 
                description: "write islemi icin dosyaya yazilacak icerik." 
            }
        },
        required: ["action"]
    },
    execute: async (args) => {
        try {
            // G.2 / E.1 Permissions Check
            let bTier = 'restricted';
            let skillsEnabled = true;
            try {
                const sPath = path.join(process.cwd(), 'global_settings.json');
                const conf = JSON.parse(await fs.readFile(sPath, 'utf8'));
                bTier = conf.byterover_tier || 'restricted';
                if (conf.global_skills_enabled === false) skillsEnabled = false;
            } catch (e) {}

            if (!skillsEnabled) return "[HATA] GÜVENLİK KALKANI: Global yetenekler şu an devre dışı bırakılmış.";

            switch (args.action) {
                case 'execute':
                    if (bTier === 'safe') return "[HATA] GÜVENLİK KALKANI: Terminal komut işletimi GÜVENLİ (Safe) modda yasaktır.";
                    if (bTier === 'restricted') {
                        const cmdLower = (args.command || '').toLowerCase();
                        const riskWords = ['rm -rf', 'format', 'del /s', 'mkfs', 'diskpart', 'wget', 'curl'];
                        if (riskWords.some(w => cmdLower.includes(w))) {
                            return `[HATA] GÜVENLİK KALKANI: Zarar verici komut ('${cmdLower}') SINIRLI (Restricted) modda engellendi.`;
                        }
                    }
                    if (!args.command) return "[HATA] Komut belirtilmedi.";
                    const { stdout, stderr } = await execPromise(args.command, { timeout: 30000 });
                    return `[STDOUT]:\n${stdout}\n[STDERR]:\n${stderr}`;

                case 'read':
                    if (!args.path) return "[HATA] Dosya yolu belirtilmedi.";
                    return await fs.readFile(args.path, 'utf-8');

                case 'write':
                    if (bTier === 'safe') return "[HATA] GÜVENLİK KALKANI: Dosya yazma GÜVENLİ (Safe) modda yasaktır.";
                    if (!args.path || args.content === undefined) return "[HATA] Yol veya icerik eksik.";
                    await fs.mkdir(path.dirname(args.path), { recursive: true });
                    await fs.writeFile(args.path, args.content, 'utf-8');
                    return `[BASARILI] Dosya yazildi: ${args.path}`;

                case 'list':
                    const dirPath = args.path || process.cwd();
                    const files = await fs.readdir(dirPath);
                    return files.join('\n');

                case 'delete':
                    if (bTier === 'safe') return "[HATA] GÜVENLİK KALKANI: Dosya silme GÜVENLİ (Safe) modda yasaktır.";
                    if (!args.path) return "[HATA] Yol belirtilmedi.";
                    await fs.rm(args.path, { recursive: true, force: true });
                    return `[BASARILI] Silindi: ${args.path}`;

                default:
                    return "[HATA] Gecersiz aksiyon.";
            }
        } catch (error) {
            return `[BYTEROVER HATA]: ${error.message}`;
        }
    }
};
