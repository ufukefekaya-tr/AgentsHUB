import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import { SKILL_SIZE_LIMIT_ENABLED, SKILL_SIZE_LIMIT_BYTES } from '../config/constants.js';

const WORKSPACE_DIR = path.resolve(process.cwd(), 'Agents');

// Per-agent skill cache: agentId -> { skills, loadedAt }
// TTL: 30s — allows hot-swap pickup without re-loading every message
const _skillCache = new Map();
const SKILL_CACHE_TTL_MS = 30000;

/**
 * AgentsHUB - Cellular Dynamic Loader (IP-5 KM-5.1)
 *
 * Her ajanın sadece kendi Workspace/{agent_id}/skills klasöründeki yetenekleri
 * tarayan ve okuyan hücresel yükleyicidir. Global yetenek havuzu KESİNLİKLE yasaktır.
 */
export const SkillLoader = {
    
    /**
     * İlgili ajanın yetenek klasörünü tarar ve Evrensel formattaki objeleri geri döner.
     * @param {string} agentId 
     * @returns {Promise<Array<Object>>} [{name, description, parameters, execute}]
     */
    async loadSkills(agentId) {
        // E.1 & F.2: Global Skill Toggle Check
        try {
            const sPath = path.join(process.cwd(), 'global_settings.json');
            const conf = JSON.parse(await fs.readFile(sPath, 'utf8'));
            if (conf.global_skills_enabled === false) return [];
        } catch(e) {}

        // DİKKAT: Cache sistemi aktif edildi (Faz 4: Lazy Loading & Memory Optimizasyon)
        // Eğer cache içinde ajanın verisi varsa (ve invalidate edilmemişse), anında dön.
        if (_skillCache.has(agentId)) {
            return _skillCache.get(agentId).skills;
        }

        const skillsDir = path.join(WORKSPACE_DIR, agentId, 'skills');
        const cacheDir = path.join(process.cwd(), '.skill_cache', agentId);
        const loadedSkills = [];

        try {
            await fs.mkdir(cacheDir, { recursive: true });
        } catch (e) {
            logger.warn(`[SKILL LOADER] Cache dizini oluşturulamadı: ${e.message}`);
        }

        try {
            await fs.access(skillsDir);
        } catch {
            return []; // Skill klasörü yoksa boş dön
        }

        try {
            const files = await fs.readdir(skillsDir);
            const targetFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.md'));

            let enabledSkills = null;
            try {
                const confPath = path.join(WORKSPACE_DIR, agentId, 'Mind-Set_Core', 'config.json');
                const confData = JSON.parse(await fs.readFile(confPath, 'utf8'));
                if (confData.skills && Array.isArray(confData.skills)) {
                    enabledSkills = confData.skills;
                }
            } catch(e) {}

            for (const file of targetFiles) {
                if (enabledSkills !== null) {
                    if (!enabledSkills.includes(file)) {
                        logger.info(`[SKILL LOADER] ${file} disabled in config.skills — skipping.`);
                        continue;
                    }
                }
                
                const fullPath = path.join(skillsDir, file);

                // OC-04: Skill Dosya Boyutu Limiti (Enforcement) ve MTime okuması (Cache için)
                let stat;
                try {
                    stat = await fs.stat(fullPath);
                    if (SKILL_SIZE_LIMIT_ENABLED && stat.size > SKILL_SIZE_LIMIT_BYTES) {
                        logger.warn(`[SKILL LOADER] ⛔ ${file} boyutu (${stat.size} byte) limiti aşıyor (${SKILL_SIZE_LIMIT_BYTES} byte). Reddedildi.`);
                        continue;
                    }
                } catch (statErr) {
                    logger.warn(`[SKILL LOADER] ${file} stat okunamadı: ${statErr.message}`);
                    continue;
                }

                let finalLoadPath = fullPath;

                // Gölge Önbellek (Shadow Cache): ESM Node_modules hiyerarşisi çözümü
                if (file.endsWith('.js')) {
                    const cachedFileName = `${file.replace('.js', '')}_${stat.mtimeMs}.js`;
                    let cachedFilePath = path.join(cacheDir, cachedFileName);
                    try {
                        await fs.access(cachedFilePath);
                    } catch {
                        try {
                            await fs.copyFile(fullPath, cachedFilePath);
                        } catch (copyErr) {
                            logger.warn(`[SKILL LOADER] Cache kopyalama hatası: ${copyErr.message}, orijinal konum kullanılıyor.`);
                            cachedFilePath = fullPath;
                        }
                    }
                    finalLoadPath = cachedFilePath;
                }

                const filePathURI = `file:///${finalLoadPath.replace(/\\/g, '/')}`;
                
                if (file.endsWith('.js')) {
                    try {
                        const module = await import(`${filePathURI}?t=${Date.now()}`);
                        
                        let skillObj = module.skill;
                        
                        // V1 Legacy Fallback (Eski yetenek formatı: action, schema)
                        if (!skillObj && typeof module.action === 'function' && module.schema) {
                            try {
                                const content = await fs.readFile(fullPath, 'utf8');
                                const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
                                const descMatch = content.match(/description:\s*["']([^"']+)["']/);
                                
                                if (nameMatch && descMatch) {
                                    skillObj = {
                                        name: nameMatch[1],
                                        description: descMatch[1],
                                        execute: module.action,
                                        parameters: module.schema
                                    };
                                }
                            } catch(e) {}
                        }

                        if (skillObj && this._validateSchema(skillObj)) {
                            if (!skillObj.version) skillObj.version = "1.0.0";
                            if (!skillObj.description) skillObj.description = "Sistem yeteneği (Otomatik Polyfill Açıklaması)";
                            
                            loadedSkills.push({
                                ...skillObj,
                                __filePath: filePathURI,
                                type: 'executable'
                            });
                        } else {
                            logger.warn(`[SKILL LOADER] ${agentId}/${file} gecersiz Evrensel Semaya sahip. Yoksayildi.`);
                        }
                    } catch (err) {
                        logger.error(`[SKILL LOADER] ${agentId}/${file} yuklenemedi: ${err.message}`);
                    }
                } else if (file.endsWith('.md')) { // SKILL.md Desteği (OC-18)
                    try {
                        const content = await fs.readFile(fullPath, 'utf8');
                        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
                        
                        if (match) {
                            const yamlBlock = match[1];
                            const markdown = match[2].trim();
                            
                            const nameMatch = yamlBlock.match(/name:\s*(.+)/);
                            const descMatch = yamlBlock.match(/description:\s*(.+)/);
                            
                            if (nameMatch && descMatch) {
                                const docSkill = {
                                    name: nameMatch[1].trim(),
                                    description: descMatch[1].trim(),
                                    type: 'document',
                                    documentContent: markdown,
                                    version: '1.0.0',
                                    __filePath: fullPath
                                };
                                loadedSkills.push(docSkill);
                            } else {
                                logger.warn(`[SKILL LOADER] ${file} geçerli yaml-frontmatter barındırmıyor.`);
                            }
                        }
                    } catch (e) {
                         logger.error(`[SKILL LOADER] ${file} MD parse hatası: ${e.message}`);
                    }
                }
            }

            // Bellek Optimizasyonu: Yüklenen yetenekleri RAM önbelleğine al 
            // (Sadece UI'dan config değiştiğinde uçurulacaktır, böylece ReAct içi O(1) hızlanır)
            _skillCache.set(agentId, { skills: loadedSkills, loadedAt: Date.now() });
            
            return loadedSkills;
        } catch (error) {
            logger.error(`[SKILL LOADER] Dizin okuma hatasi (${agentId}): ${error.message}`);
            return [];
        }
    },

    invalidateCache(agentId) {
        _skillCache.delete(agentId);
    },

    _validateSchema(skillObj) {
        if (skillObj.type === 'document') {
            return skillObj.name && skillObj.description;
        }
        return skillObj.name 
            && typeof skillObj.name === 'string'
            && skillObj.description
            && typeof skillObj.description === 'string'
            && typeof skillObj.execute === 'function';
    }
};
