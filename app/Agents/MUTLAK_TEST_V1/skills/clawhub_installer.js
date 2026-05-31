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
                    
                    const targetFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.md'));
                    if (targetFiles.length === 0) return "[BILGI] Marketplace'de henüz yetenek yok.";
                    
                    // Ajanın mevcut skill'lerini kontrol et
                    let installedFiles = [];
                    try { installedFiles = await fs.readdir(agentSkillsDir); } catch {}
                    
                    const list = [];
                    for (const file of targetFiles) {
                        const content = await fs.readFile(path.join(marketDir, file), 'utf8').catch(() => '');
                        let nameMatch = null, descMatch = null;
                        if (file.endsWith('.js')) {
                            nameMatch = content.match(/name:\s*["']([^"']+)["']/);
                            descMatch = content.match(/description:\s*["']([^"']+)["']/);
                        } else if (file.endsWith('.md')) {
                            nameMatch = content.match(/name:\s*(.+)/);
                            descMatch = content.match(/description:\s*(.+)/);
                        }
                        const installed = installedFiles.includes(file);
                        list.push(`${installed ? '✅' : '⬜'} ${nameMatch ? nameMatch[1].trim() : file.replace(/\.(js|md)$/, '')} — ${descMatch ? descMatch[1].trim().slice(0, 80) : 'Açıklama yok'}`);
                    }
                    return `[MARKETPLACE YETENEKLERİ] (${targetFiles.length} adet)\n\n${list.join('\n')}\n\n✅ = Kurulu, ⬜ = Kurulmamış\nKurmak için: clawhub_install(action: "install", skill_name: "isim")`;
                }
                
                case 'install': {
                    if (!args.skill_name) return "[HATA] skill_name parametresi gerekli. Önce action:'list' ile mevcut yetenekleri listeleyin.";
                    
                    let fileName = args.skill_name;
                    let possibleFiles = [
                        fileName,
                        `${fileName}.js`,
                        `${fileName}_SKILL.md`,
                        `${fileName}.md`
                    ];
                    
                    let foundFile = null;
                    for (const pf of possibleFiles) {
                        try {
                            await fs.access(path.join(marketDir, pf));
                            foundFile = pf;
                            break;
                        } catch {}
                    }
                    
                    if (!foundFile) {
                         return `[HATA] '${args.skill_name}' Marketplace'de bulunamadı. Mevcut yetenekleri görmek için action:'list' kullanın.`;
                    }
                    
                    const src = path.join(marketDir, foundFile);
                    const dst = path.join(agentSkillsDir, foundFile);
                    
                    // Zaten kurulu mu?
                    try { await fs.access(dst); return `[BILGI] '${foundFile}' zaten kurulu.`; } catch {}
                    
                    await fs.mkdir(agentSkillsDir, { recursive: true });
                    await fs.copyFile(src, dst);
                    
                    // Config güncelle
                    try {
                        const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
                        const conf = JSON.parse(await fs.readFile(confPath, 'utf8'));
                        if (!conf.skills) conf.skills = [];
                        if (!conf.skills.includes(foundFile)) {
                            conf.skills.push(foundFile);
                            await fs.writeFile(confPath, JSON.stringify(conf, null, 4));
                        }
                    } catch(e) {}
                    
                    return `[BAŞARILI] '${foundFile}' yeteneği kuruldu ve aktifleştirildi. Artık bu aracı kullanabilirsin.`;
                }
                
                case 'uninstall': {
                    if (!args.skill_name) return "[HATA] skill_name parametresi gerekli.";
                    
                    let fileName = args.skill_name;
                    let possibleFiles = [
                        fileName,
                        `${fileName}.js`,
                        `${fileName}_SKILL.md`,
                        `${fileName}.md`
                    ];

                    let foundFile = null;
                    for (const pf of possibleFiles) {
                        try {
                            await fs.access(path.join(agentSkillsDir, pf));
                            foundFile = pf;
                            break;
                        } catch {}
                    }
                    
                    if (!foundFile) {
                        return `[HATA] '${args.skill_name}' kurulu değil.`;
                    }
                    
                    const targetFile = path.join(agentSkillsDir, foundFile);
                    
                    await fs.unlink(targetFile).catch(() => {});
                    
                    // Config güncelle
                    try {
                        const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
                        const conf = JSON.parse(await fs.readFile(confPath, 'utf8'));
                        if (conf.skills) {
                            conf.skills = conf.skills.filter(s => s !== foundFile);
                            await fs.writeFile(confPath, JSON.stringify(conf, null, 4));
                        }
                    } catch(e) {}
                    
                    return `[BAŞARILI] '${foundFile}' yeteneği kaldırıldı.`;
                }
                
                default:
                    return "[HATA] Geçersiz aksiyon. Kullanılabilir: 'list', 'install', 'uninstall'";
            }
        } catch(e) {
            return "[CLAWHUB HATA]: " + e.message;
        }
    }
};