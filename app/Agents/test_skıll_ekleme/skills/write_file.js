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
    description: "Belirtilen icerigi bir dosyaya kaydeder. Ajanin web'den cektigi yetenek kodlarini diske kaydetmesi (orn: skills klasoru) veya kullanici icin kod/metin uretmesi icindir. Guvenlik: Ajan sadece kendi klasorune (/Agents/AgentID/...) yazabilir, sistem kokune ERISEMEZ.",
    parameters: {
        type: "object",
        properties: {
            filename: {
                type: "string",
                description: "Kaydedilecek dosyanin klasoruyle birlikte adi (orn: skills/yeni_yetenek.js veya quarantine/analiz.txt)"
            },
            content: {
                type: "string",
                description: "Dosyaya yazilacak icerik (Kod, Metin, JS fonksiyonu vb.)"
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
                    const result = validateAgentPath(agentId, args.filename, 'write');
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

            await fs.writeFile(resolvedPath, args.content, 'utf8');
            return `[BASARILI] Dosya basariyla '${args.filename}' yoluna kaydedildi. (${args.content.length} karakter)`;
        } catch (error) {
            return `[HATA] Dosya yazilamadi: ${error.message}`;
        }
    }
};
