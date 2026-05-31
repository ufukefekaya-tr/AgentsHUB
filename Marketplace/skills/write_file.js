import fs from 'fs/promises';
import path from 'path';

/**
 * WRITE_FILE Skill — Sisteme / Karantinaya Dosya Yazar
 * Ajanın kod yazmasını, clawhub'dan yetenek kurmasını veya döküman oluşturmasını sağlar.
 */
export const skill = {
    name: "write_file",
    version: "1.0.0",
    category: "system",
    tags: ["dosya", "yazma", "kaydetme", "kod"],
    emoji: "💾",
    requires: {},
    description: "💾 RAPOR KAYDEDİCİ — Ajanın çıkardığı özetleri veya raporları bilgisayarınızda bir Txt veya Word dosyası gibi yazıp kaydetmesini sağlar. Dosya işlemleri için gereklidir.",
    parameters: {
        type: "object",
        properties: {
            filename: {
                type: "string",
                description: "Dosya adı veya göreceli yolu."
            },
            content: {
                type: "string",
                description: "Dosyaya yazılacak VEYA dosyaya EKLENECEK metin içeriği."
            },
            append: {
                type: "boolean",
                description: "KRİTİK: Var olan bir dosyanın içeriğini bozmadan sadece sonuna yeni metin eklemek (update/edit) istiyorsan, bunu 'true' yap. Geçersiz bırakırsan (false) DOSYANIN İÇİNDEKİ HER ŞEY SİLİNİR ve sıfırdan yazılır!"
            }
        },
        required: ["filename", "content"]
    },
    execute: async (args, context) => {
        try {
            if (!args.filename || !args.content) {
                return "[HATA] filename ve content argumanlari zorunludur.";
            }

            // PATH GUARD KORUMASI
            try {
                const sPath = path.join(process.cwd(), 'global_settings.json');
                const conf = JSON.parse(await fs.readFile(sPath, 'utf8'));
                if (conf.path_guard_enabled !== false) {
                    const pgPath = path.resolve(process.cwd(), 'src/security/path-guard.js');
                    const { validateAgentPath } = await import('file:///' + pgPath.replace(/\\/g, '/'));
                    const agentId = context && context.agentId ? context.agentId : (typeof arguments[1] === 'string' ? arguments[1] : 'Global');
                    // FIX: Path guard'a GERÇEK hedef yolu gönder (Agents/{agentId}/ altında)
                    const actualTarget = path.resolve(process.cwd(), 'Agents', agentId, args.filename);
                    const result = validateAgentPath(agentId, actualTarget, 'write');
                    if(!result.allowed) {
                        return `[GÜVENLİK HATASI] ${result.reason}`;
                    }
                }
            } catch(e) {
                console.error("Path guard error in write_file:", e);
            }
            const resolvedPath = path.resolve(process.cwd(), 'Agents', (context&&context.agentId)||arguments[1]||'Global', args.filename);

            // Üst klasörleri yoksa oluştur
            const dir = path.dirname(resolvedPath);
            await fs.mkdir(dir, { recursive: true });

            if (args.append) {
                await fs.appendFile(resolvedPath, (args.content.startsWith('\n') ? '' : '\n') + args.content, 'utf8');
                return `[BASARILI] İçerik başarıyla '${args.filename}' içerisindeki metnin SONUNA EKLENDİ (Mevcut veriler korundu). (${args.content.length} karakter eklendi)`;
            } else {
                await fs.writeFile(resolvedPath, args.content, 'utf8');
                return `[BASARILI] Dosya baştan SIFIRDAN YAZILDI (Eğer eski bir dosyaysa içindekiler SİLİNDİ): '${args.filename}'. (${args.content.length} karakter)`;
            }
        } catch (error) {
            return `[HATA] Dosya yazilamadi: ${error.message}`;
        }
    }
};
