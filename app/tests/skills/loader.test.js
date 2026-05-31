import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { SkillLoader } from '../../src/skills/loader.js';

describe('SkillLoader (Omni-Core Gen-24)', () => {

    const testAgentId = `test_agent_${Date.now()}`;
    const skillsDir = path.resolve(process.cwd(), 'Agents', testAgentId, 'skills');
    const confDir = path.resolve(process.cwd(), 'Agents', testAgentId, 'Mind-Set_Core');

    beforeEach(async () => {
        await fs.mkdir(skillsDir, { recursive: true });
        await fs.mkdir(confDir, { recursive: true });
    });

    afterEach(async () => {
        try {
            await fs.rm(path.resolve(process.cwd(), 'Agents', testAgentId), { recursive: true, force: true });
        } catch(e) {}
        SkillLoader.invalidateCache(testAgentId);
    });

    it('should load executable JS skills', async () => {
        const jsSkillPath = path.join(skillsDir, 'test_skill.js');
        const jsContent = `export const skill = { name: 'test_js', description: 'desc', execute: async () => {} };`;
        await fs.writeFile(jsSkillPath, jsContent, 'utf8');

        // Boş conf file
        await fs.writeFile(path.join(confDir, 'config.json'), JSON.stringify({}), 'utf8');

        const skills = await SkillLoader.loadSkills(testAgentId);
        expect(skills.length).toBe(1);
        expect(skills[0].name).toBe('test_js');
        expect(skills[0].type).toBe('executable');
    });

    it('should parse and load Document SKILL.md skills (yaml-frontmatter)', async () => {
        const mdSkillPath = path.join(skillsDir, 'test_doc.md');
        const mdContent = `---
name: doc_skill
description: A static document skill
---
# Knowledge
This is some static info.`;
        await fs.writeFile(mdSkillPath, mdContent, 'utf8');
        await fs.writeFile(path.join(confDir, 'config.json'), JSON.stringify({}), 'utf8');

        const skills = await SkillLoader.loadSkills(testAgentId);
        expect(skills.length).toBe(1);
        expect(skills[0].name).toBe('doc_skill');
        expect(skills[0].type).toBe('document');
        expect(skills[0].documentContent.includes('This is some static info.')).toBe(true);
    });

    it('should filter out disabled skills via config.json', async () => {
        // İki skill ekle
        await fs.writeFile(path.join(skillsDir, 'enabled_skill.js'), `export const skill = { name: 'e', description: 'e', execute: async () => {} };`, 'utf8');
        await fs.writeFile(path.join(skillsDir, 'disabled_skill.js'), `export const skill = { name: 'd', description: 'd', execute: async () => {} };`, 'utf8');
        
        // config.json'da sadece 'enabled_skill.js' izinli
        await fs.writeFile(path.join(confDir, 'config.json'), JSON.stringify({ skills: ['enabled_skill.js'] }), 'utf8');

        const skills = await SkillLoader.loadSkills(testAgentId);
        expect(skills.length).toBe(1);
        expect(skills[0].__filePath.endsWith('enabled_skill.js')).toBe(true);
    });
});
