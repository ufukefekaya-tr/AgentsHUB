import express from 'express';
import fs from 'fs/promises';
import path from 'path';

import { SkillLoader } from '../../skills/loader.js';
import { SkillRegistry } from '../../skills/registry.js';
import logger from '../../utils/logger.js';

export const marketSkillsRouter = express.Router();

marketSkillsRouter.get('/', async (req, res) => {
    try {
        const marketDir = path.join(process.cwd(), '..', 'Marketplace', 'skills');
        let files = [];
        try { files = await fs.readdir(marketDir); } catch(e) { return res.json([]); }
        const out = [];
        for (const file of files) {
            if (!file.endsWith('.js') && !file.endsWith('.md')) continue;
            const p = path.join(marketDir, file);
            const content = await fs.readFile(p, 'utf8');
            let nameMatch = null, descMatch = null, catMatch = null, emojiMatch = null, tagsMatch = null, version = '1.0.0';
            if (file.endsWith('.js')) {
                nameMatch = content.match(/name:\s*["']([^"']+)["']/);
                descMatch = content.match(/description:\s*["']([^"']+)["']/);
                catMatch = content.match(/category:\s*["']([^"']+)["']/);
                emojiMatch = content.match(/emoji:\s*["']([^"']+)["']/);
                tagsMatch = content.match(/tags:\s*\[([^\]]+)\]/);
                version = (content.match(/version:\s*["']([^"']+)["']/) || [])[1] || '1.0.0';
            } else {
                nameMatch = content.match(/name:\s*(.+)/);
                descMatch = content.match(/description:\s*(.+)/);
            }
            if (nameMatch) {
                let tags = [];
                if (tagsMatch) {
                    tags = tagsMatch[1].replace(/["']/g, '').split(',').map(t => t.trim()).filter(Boolean);
                }
                out.push({
                    id: Buffer.from(file).toString('base64'),
                    file: file,
                    name: nameMatch[1].replace(/["']/g, '').trim(),
                    version: version,
                    category: catMatch ? catMatch[1] : 'general',
                    emoji: emojiMatch ? emojiMatch[1] : '⚙️',
                    tags,
                    author: file.endsWith('.md') ? 'ClawHub' : 'AgentsHUB',
                    type: file.endsWith('.md') ? 'Remote' : 'Verified',
                    desc: descMatch ? descMatch[1].replace(/["']/g, '').trim() : 'Otonom Ajan Yeteneği'
                });
            }
        }
        res.json(out);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export const agentSkillsRouter = express.Router({ mergeParams: true });

agentSkillsRouter.get('/', async (req, res) => {
    try {
        const agentId = req.params.id;
        const skillsDir = path.join(process.cwd(), 'Agents', agentId, 'skills');
        let files = [];
        try { files = await fs.readdir(skillsDir); } catch { return res.json([]); }
        
        let enabledSkills = null;
        try {
            const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
            const conf = JSON.parse(await fs.readFile(confPath, 'utf8'));
            if (conf.skills && Array.isArray(conf.skills)) enabledSkills = conf.skills;
        } catch(e) {}
        
        const out = [];
        for (const file of files) {
            if (!file.endsWith('.js') && !file.endsWith('.md')) continue;
            try {
                const content = await fs.readFile(path.join(skillsDir, file), 'utf8');
                let nameMatch = null, descMatch = null, emojiMatch = null, catMatch = null;
                if (file.endsWith('.js')) {
                    nameMatch = content.match(/name:\s*["']([^"']+)["']/);
                    descMatch = content.match(/description:\s*["']([^"']+)["']/);
                    emojiMatch = content.match(/emoji:\s*["']([^"']+)["']/);
                    catMatch = content.match(/category:\s*["']([^"']+)["']/);
                } else {
                    nameMatch = content.match(/name:\s*(.+)/);
                    descMatch = content.match(/description:\s*(.+)/);
                }
                
                out.push({
                    file,
                    name: nameMatch ? nameMatch[1].replace(/["']/g, '').trim() : file.replace(/\.(js|md)$/, ''),
                    desc: descMatch ? descMatch[1].replace(/["']/g, '').trim() : 'Otonom ajan yeteneği.',
                    emoji: emojiMatch ? emojiMatch[1] : (file.endsWith('.md') ? '🌐' : '⚙️'),
                    category: catMatch ? catMatch[1] : 'general',
                    enabled: enabledSkills === null ? true : enabledSkills.includes(file)
                });
            } catch(e) {
                out.push({ file, name: file.replace(/\.(js|md)$/, ''), desc: 'Açıklama okunamadı.', emoji: '⚙️', category: 'general', enabled: false });
            }
        }
        res.json(out);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

agentSkillsRouter.post('/install', async (req, res) => {
    try {
        const { skillName } = req.body;
        const agentId = req.params.id;
        const marketDir = path.join(process.cwd(), '..', 'Marketplace', 'skills');
        const targetDir = path.join(process.cwd(), 'Agents', agentId, 'skills');
        
        let possibleFiles = [
            skillName,
            `${skillName}.js`,
            `${skillName}_SKILL.md`,
            `${skillName}.md`
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
            return res.status(404).json({ error: `Marketplace'de '${skillName}' bulunamadı.` });
        }
        let fileName = foundFile;
        let src = path.join(marketDir, fileName);
        
        const dst = path.join(targetDir, fileName);
        
        try {
            const stat = await fs.stat(src);
            const globalSettings = JSON.parse(await fs.readFile(path.join(process.cwd(), 'global_settings.json'), 'utf8').catch(() => '{}'));
            if (globalSettings.skill_size_limit_enabled !== false) {
                const limit = globalSettings.skill_size_limit_bytes || 256000;
                if (stat.size > limit) {
                    return res.status(400).json({ error: `Güvenlik Hatası: Skill boyutu aşıldı (${stat.size} > ${limit}).`});
                }
            }
        } catch(e) {}
        
        await fs.mkdir(targetDir, { recursive: true });
        await fs.copyFile(src, dst);
        
        try {
            const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
            const conf = JSON.parse(await fs.readFile(confPath, 'utf8'));
            if (!conf.skills) conf.skills = [];
            if (!conf.skills.includes(fileName)) {
                conf.skills.push(fileName);
                await fs.writeFile(confPath, JSON.stringify(conf, null, 4));
            }
        } catch(e) { logger.warn(`[SKILL INSTALL] Config güncellenemedi: ${e.message}`); }
        
        SkillLoader.invalidateCache(agentId);
        SkillRegistry.sync(agentId);
        
        logger.info(`[SKILL MARKET] ${agentId} icin '${skillName}' kuruldu.`);
        res.json({ status: "ok", message: `${skillName} başarıyla kuruldu.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

agentSkillsRouter.post('/uninstall', async (req, res) => {
    try {
        const { skillName } = req.body;
        const agentId = req.params.id;
        let possibleFiles = [
            skillName,
            `${skillName}.js`,
            `${skillName}_SKILL.md`,
            `${skillName}.md`
        ];
        let foundFile = null;
        for (const pf of possibleFiles) {
            try {
                await fs.access(path.join(process.cwd(), 'Agents', agentId, 'skills', pf));
                foundFile = pf;
                break;
            } catch {}
        }
        if (!foundFile) return res.status(404).json({ error: `Yetenek '${skillName}' ajan klasöründe bulunamadı.` });
        
        const fileName = foundFile;
        const targetFile = path.join(process.cwd(), 'Agents', agentId, 'skills', fileName);
        
        await fs.unlink(targetFile).catch(() => {});
        
        try {
            const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
            const conf = JSON.parse(await fs.readFile(confPath, 'utf8'));
            if (conf.skills && Array.isArray(conf.skills)) {
                conf.skills = conf.skills.filter(s => s !== fileName);
                await fs.writeFile(confPath, JSON.stringify(conf, null, 4));
            }
        } catch(e) {}
        
        SkillLoader.invalidateCache(agentId);
        SkillRegistry.sync(agentId);
        logger.info(`[SKILL MARKET] ${agentId} icin '${skillName}' kaldirildi.`);
        res.json({ status: "ok", message: `${skillName} kaldırıldı.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
