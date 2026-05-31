import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const inflateRaw = promisify(zlib.inflateRaw);

// Minimal ZIP parser — SKILL.md dosyasını ZIP içinden çıkarır (dış bağımlılık yok)
async function extractSkillMdFromZip(buffer) {
    try {
        // ZIP Local File Header: PK\x03\x04
        let offset = 0;
        while (offset < buffer.length - 30) {
            if (buffer[offset] !== 0x50 || buffer[offset+1] !== 0x4B ||
                buffer[offset+2] !== 0x03 || buffer[offset+3] !== 0x04) {
                offset++;
                continue;
            }
            const compressionMethod = buffer.readUInt16LE(offset + 8);
            const compressedSize   = buffer.readUInt32LE(offset + 18);
            const fileNameLength   = buffer.readUInt16LE(offset + 26);
            const extraFieldLength = buffer.readUInt16LE(offset + 28);
            const fileName = buffer.slice(offset + 30, offset + 30 + fileNameLength).toString('utf8');
            const dataStart = offset + 30 + fileNameLength + extraFieldLength;
            const compressedData = buffer.slice(dataStart, dataStart + compressedSize);

            if (fileName.endsWith('SKILL.md') || fileName === 'SKILL.md') {
                if (compressionMethod === 0) {
                    // Stored (no compression)
                    return compressedData.toString('utf8');
                } else if (compressionMethod === 8) {
                    // Deflate
                    const decompressed = await inflateRaw(compressedData);
                    return decompressed.toString('utf8');
                }
            }
            offset = dataStart + compressedSize;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * CLAWHUB REMOTE v3.0: ClawHub.ai Uzak Ekosistem Entegrasyonu
 * https://clawhub.ai API'sine bağlanarak skill arama, inceleme ve
 * yerel Marketplace'e indirme yeteneği.
 * 
 * API Endpoints (Public, auth gerektirmez):
 *   GET /api/v1/search?q=<query>   → Vector arama
 *   GET /api/v1/skills              → Tüm skill listesi
 *   GET /api/v1/skills/<slug>       → Skill detayı
 *   GET /api/v1/download?slug=<slug>&version=latest → ZIP indirme
 */

const CLAWHUB_BASE = 'https://clawhub.ai';

export const skill = {
    name: "clawhub_remote",
    version: "3.0.0",
    category: "marketplace",
    emoji: "🌐",
    tags: ["clawhub", "marketplace", "search", "explore", "remote", "download", "install"],
    description: "🌐 UZAK YETENEK MAĞAZASI — Bulut üzerindeki uzak mağazada ajanın yeni özellik bulup bilgisayarınıza indirmesini sağlar. Her gün yeni yetenekler eklendiği için tavsiye edilir.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["search", "inspect", "download"],
                description: "Yapılacak işlem türü (örn: 'read', 'write', 'execute', 'list', 'delete', 'capture', 'install', 'uninstall')"
            },
            query: {
                type: "string",
                description: "Arama motorunda aranacak kelime veya cümle (örn: 'Türkiye güncel haberler')"
            }
        },
        required: ["action", "query"]
    },
    execute: async (args, context) => {
        try {
            const action = args.action;
            const query = (args.query || '').trim();

            if (!query) return "[HATA] query parametresi gerekli.";

            // === SEARCH: ClawHub.ai vektör araması ===
            if (action === "search") {
                const url = `${CLAWHUB_BASE}/api/v1/search?q=${encodeURIComponent(query)}`;
                const resp = await fetch(url, { 
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(15000)
                });
                
                if (!resp.ok) {
                    return `[CLAWHUB HATA] API yanıt vermedi (HTTP ${resp.status}). Sunucu geçici olarak erişilemez olabilir.`;
                }

                const data = await resp.json();
                const results = data.results || [];

                if (results.length === 0) {
                    return `[CLAWHUB] '${query}' ile eşleşen skill bulunamadı. Farklı anahtar kelime deneyin.`;
                }

                const list = results.slice(0, 10).map((r, i) => {
                    const name = r.displayName || r.slug;
                    const desc = (r.summary || '').slice(0, 100);
                    const score = r.score ? ` (skor: ${r.score.toFixed(1)})` : '';
                    return `${i + 1}. **${name}** [slug: ${r.slug}]${score}\n   ${desc}`;
                });

                return `[CLAWHUB.AI ARAMA] '${query}' → ${results.length} sonuç\n\n${list.join('\n\n')}\n\nDetay görmek için: clawhub_remote(action: "inspect", query: "slug-ismi")\nİndirmek için: clawhub_remote(action: "download", query: "slug-ismi")`;
            }

            // === INSPECT: Skill detayı ===
            if (action === "inspect") {
                const slug = query.toLowerCase().replace(/\s+/g, '-');
                const url = `${CLAWHUB_BASE}/api/v1/skills/${slug}`;
                const resp = await fetch(url, { 
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(15000)
                });

                if (!resp.ok) {
                    return `[CLAWHUB HATA] '${slug}' bulunamadı (HTTP ${resp.status}). Slug'ı kontrol edin.`;
                }

                const data = await resp.json();
                const skill = data.skill || data;
                
                return `[CLAWHUB SKILL DETAYI]
İsim: ${skill.displayName || skill.slug || slug}
Slug: ${skill.slug || slug}
Açıklama: ${skill.summary || 'Açıklama yok'}
Sahip: ${skill.ownerHandle || skill.ownerUserId || 'Bilinmiyor'}
Versiyon: ${skill.latestVersion || 'latest'}
İndirme: ${skill.stats?.downloads || 0}
Yıldız: ${skill.stats?.stars || 0}
Güncelleme: ${skill.updatedAt ? new Date(skill.updatedAt).toISOString().split('T')[0] : '-'}

İndirmek için: clawhub_remote(action: "download", query: "${slug}")
Kurmak için indirdikten sonra: clawhub_install(action: "install", skill_name: "${slug}")`;
            }

            // === DOWNLOAD: SKILL.md'yi yerel Marketplace'e indir ===
            if (action === "download") {
                const slug = query.toLowerCase().replace(/\s+/g, '-');
                const marketDir = path.join(process.cwd(), '..', 'Marketplace', 'skills');
                
                // Önce skill detayını al
                const detailUrl = `${CLAWHUB_BASE}/api/v1/skills/${slug}`;
                let skillData;
                let targetVersion = 'latest';
                try {
                    const detailResp = await fetch(detailUrl, { 
                        headers: { 'Accept': 'application/json' },
                        signal: AbortSignal.timeout(15000)
                    });
                    if (detailResp.ok) {
                        skillData = await detailResp.json();
                        // BUG FIX: Doğru field — response.latestVersion.version
                        targetVersion = skillData?.latestVersion?.version || 'latest';
                    }
                } catch {}

                // ZIP olarak indirmeyi dene
                const downloadUrl = `${CLAWHUB_BASE}/api/v1/download?slug=${encodeURIComponent(slug)}&version=${targetVersion}`;
                let downloadSuccess = false;
                let skillMdContent = null;

                try {
                    const dlResp = await fetch(downloadUrl, { 
                        signal: AbortSignal.timeout(30000)
                    });
                    
                    if (dlResp.ok) {
                        const contentType = dlResp.headers.get('content-type') || '';
                        
                        if (contentType.includes('zip') || contentType.includes('octet-stream')) {
                            // ZIP dosyası — SKILL.md'yi çıkar
                            const buffer = Buffer.from(await dlResp.arrayBuffer());
                            await fs.mkdir(marketDir, { recursive: true });
                            
                            const skillMdFromZip = await extractSkillMdFromZip(buffer);
                            if (skillMdFromZip) {
                                // ZIP içinden SKILL.md çıkarıldı → Marketplace'e yaz
                                const mdPath = path.join(marketDir, `${slug}_SKILL.md`);
                                await fs.writeFile(mdPath, skillMdFromZip, 'utf8');
                                downloadSuccess = true;
                                skillMdContent = skillMdFromZip;
                                
                                return `[CLAWHUB İNDİRME BAŞARILI] '${slug}' Marketplace'e eklendi.
Konum: ${mdPath}
Boyut: ${(Buffer.byteLength(skillMdFromZip) / 1024).toFixed(1)} KB

Kurmak için: clawhub_install kullanarak action:'install', skill_name:'${slug}' gönder.`;
                            } else {
                                // ZIP açılamadı — Ham ZIP'i kaydet
                                const zipPath = path.join(marketDir, `${slug}.zip`);
                                await fs.writeFile(zipPath, buffer);
                                downloadSuccess = true;
                                return `[CLAWHUB İNDİRME] '${slug}' ZIP olarak kaydedildi (${(buffer.length/1024).toFixed(1)} KB).
Konum: ${zipPath}

SKILL.md ZIP içinden çıkarılamadı. byterover ile manuel inceleyebilirsin.`;
                            }
                        } else {
                            // Text/JSON olabilir
                            skillMdContent = await dlResp.text();
                        }
                    }
                } catch (dlErr) {
                    // Download başarısız — detay bilgisi ile dön
                }

                if (skillMdContent) {
                    // SKILL.md içeriğini kaydet
                    const mdPath = path.join(marketDir, `${slug}_SKILL.md`);
                    await fs.mkdir(marketDir, { recursive: true });
                    await fs.writeFile(mdPath, skillMdContent);
                    
                    return `[CLAWHUB İNDİRME BAŞARILI] '${slug}' SKILL.md olarak kaydedildi.
Konum: ${mdPath}
Boyut: ${(Buffer.byteLength(skillMdContent) / 1024).toFixed(1)} KB

İçeriği okumak için byterover kullanabilirsin.`;
                }

                // Hiçbir yöntem çalışmadıysa metadata döndür
                const summary = skillData?.skill?.summary || skillData?.summary || '';
                return `[CLAWHUB] '${slug}' skill bilgileri alındı ancak doğrudan dosya indirme başarısız oldu.
Skill Açıklaması: ${summary.slice(0, 200)}

Bu skill ClawHub.ai'de mevcut. Manuel erişim: ${CLAWHUB_BASE}/skills/${slug}
Alternatif: byterover ile web_scraper kullanarak içeriği çekebilirsin.`;
            }

            return "[HATA] Geçersiz aksiyon. Kullanılabilir: 'search', 'inspect', 'download'";
        } catch (error) {
            if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
                return "[CLAWHUB TIMEOUT] ClawHub.ai sunucusu yanıt vermedi. İnternet bağlantısını kontrol edin veya daha sonra tekrar deneyin.";
            }
            return `[CLAWHUB REMOTE HATA]: ${error.message}`;
        }
    }
};
