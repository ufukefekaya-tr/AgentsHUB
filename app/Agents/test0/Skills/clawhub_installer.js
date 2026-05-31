import fs from 'fs/promises';
import path from 'path';

/**
 * CLAWHUB INSTALLER: Marketplace Skill Kurulum Yeteneği
 * Ajan, sohbet sırasında bu aracı kullanarak Marketplace deposundan
 * yeni yetenekleri kendi workspace'ine kurabilir.
 * 
 * Kullanım: Ajan "calculator kurabilir misin?" dediğinde bu tool tetiklenir.
 */
export const skill = {
    name: "clawhub_install",
    description: "AgentsHUB Marketplace'den bir yetenek (skill) indirir ve ajanin workspace'ine kurar. Marketplace'deki mevcut yetenekleri listeler veya belirtilen yeteneği kurar.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["list", "install", "uninstall"],
                description: "'list' mevcut yetenekleri listeler, 'install' yetenek kurar, 'uninstall' yetenek kaldirir."
            },
            skill_name: {
                type: "string",
                description: "Kurulacak veya kaldirilacak yetenegin dosya adi (uzantisiz). Ornek: 'calculator', 'weather', 'web_scraper'"
            }
        },
        required: ["action"]
    },
    execute: async (args, context) => {
        try {
            const agentId = context?.agentId;
            if (!agentId) return "[HATA] Ajan kimliği belirlenemedi.";

            const marketDir = path.join(process.cwd(), '..', 'Marketplace', 'skills');
            const agentSkillsDir = path.join(process.cwd(), 'Agents', agentId, 'skills');

            switch (args.action) {
                case 'list': {
                    let files = [];
                    try { files = await fs.readdir(marketDir); } catch { return "[HATA] Marketplace dizini bulunamadi."; }
                    
                    const jsFiles = files.filter(f => f.endsWith('.js'));
                    if (jsFiles.length === 0) return "[BILGI] Marketplace'de henüz yetenek yok.";
                    
                    // Ajanın mevcut skill'lerini kontrol et
                    let installedFiles = [];
                    try { installedFiles = await fs.readdir(agentSkillsDir); } catch {}
                    
                    const list = [];
                    for (const file of jsFiles) {
                        const content = await fs.readFile(path.join(marketDir, file), 'utf8').catch(() => '');
                        const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
                        const descMatch = content.match(/description:\s*["']([^"']+)["']/);
                        const installed = installedFiles.includes(file);
                        list.push(`${installed ? '✅' : '⬜'} ${nameMatch ? nameMatch[1] : file.replace('.js', '')} — ${descMatch ? descMatch[1].slice(0, 80) : 'Açıklama yok'}`);
                    }
                    return `[MARKETPLACE YETENEKLERİ] (${jsFiles.length} adet)\n\n${list.join('\n')}\n\n✅ = Kurulu, ⬜ = Kurulmamış\nKurmak için: clawhub_install(action: "install", skill_name: "isim")`;
                }
                
                case 'install': {
                    if (!args.skill_name) return "[HATA] skill_name parametresi gerekli. Önce action:'list' ile mevcut yetenekleri listeleyin.";
                    
                    const fileName = args.skill_name.endsWith('.js') ? args.skill_name : `${args.skill_name}.js`;
                    const src = path.join(marketDir, fileName);
                    const dst = path.join(agentSkillsDir, fileName);
                    
                    // Marketplace'de var mı kontrol et
                    try { await fs.access(src); } catch {
                        return `[HATA] '${args.skill_name}' Marketplace'de bulunamadı. Mevcut yetenekleri görmek için action:'list' kullanın.`;
                    }
                    
                    // Zaten kurulu mu?
                    try { await fs.access(dst); return `[BILGI] '${args.skill_name}' zaten kurulu.`; } catch {}
                    
                    await fs.mkdir(agentSkillsDir, { recursive: true });
                    await fs.copyFile(src, dst);
                    
                    // Config güncelle
                    try {
                        const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
                        const conf = JSON.parse(await fs.readFile(confPath, 'utf8'));
                        if (!conf.skills) conf.skills = [];
                        if (!conf.skills.includes(fileName)) {
                            conf.skills.push(fileName);
                            await fs.writeFile(confPath, JSON.stringify(conf, null, 4));
                        }
                    } catch(e) {}
                    
                    return `[BAŞARILI] '${args.skill_name}' yeteneği kuruldu ve aktifleştirildi. Artık bu aracı kullanabilirsin.`;
                }
                
                case 'uninstall': {
                    if (!args.skill_name) return "[HATA] skill_name parametresi gerekli.";
                    
                    const fileName = args.skill_name.endsWith('.js') ? args.skill_name : `${args.skill_name}.js`;
                    const targetFile = path.join(agentSkillsDir, fileName);
                    
                    await fs.unlink(targetFile).catch(() => {});
                    
                    // Config güncelle
                    try {
                        const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
                        const conf = JSON.parse(await fs.readFile(confPath, 'utf8'));
                        if (conf.skills) {
                            conf.skills = conf.skills.filter(s => s !== fileName);
                            await fs.writeFile(confPath, JSON.stringify(conf, null, 4));
                        }
                    } catch(e) {}
                    
                    return `[BAŞARILI] '${args.skill_name}' yeteneği kaldırıldı.`;
                }
                
                default:
                    return "[HATA] Geçersiz aksiyon. Kullanılabilir: 'list', 'install', 'uninstall'";
            }
        } catch(e) {
            return "[CLAWHUB HATA]: " + e.message;
        }
    }
};