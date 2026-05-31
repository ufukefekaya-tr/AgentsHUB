import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import { SkillLoader } from './loader.js';

const WORKSPACE_DIR = path.resolve(process.cwd(), 'Agents');

/**
 * AgentsHUB - Otonom SKILL.md Kayıt Defteri
 * Ajanların yetenek listelerindeki ve ayarlarındaki değişimleri 
 * anında statik bir Markdown dosyasına kazıyarak ajanın fiziksel öğrenmesini sağlar.
 */
export const SkillRegistry = {
    
    /**
     * İlgili ajanın mevcut aktif ve pasif yeteneklerini SKILL.md dosyasına sentezler.
     * @param {string} agentId 
     */
    async sync(agentId) {
        try {
            const skillsDir = path.join(WORKSPACE_DIR, agentId, 'skills');
            const mdPath = path.join(WORKSPACE_DIR, agentId, 'Mind-Set_Core', 'SKILLS.md');
            
            let files = [];
            try { files = await fs.readdir(skillsDir); } catch(e) { return false; }
            
            // Konfigürasyondan aktifleri al
            let enabledSkills = [];
            try {
                const confPath = path.join(WORKSPACE_DIR, agentId, 'Mind-Set_Core', 'config.json');
                const confData = JSON.parse(await fs.readFile(confPath, 'utf8'));
                if (confData.skills && Array.isArray(confData.skills)) {
                    enabledSkills = confData.skills;
                }
            } catch(e) {}

            let activeText = "## ✅ AKTİF YETENEKLER (Açık olanlar)\n\n";
            let activeCount = 0;
            let inactiveText = "## ⏸️ PASİF YETENEKLER (Kurulu ama kapalı olanlar - Açılması istenebilir)\n\n";
            let inactiveCount = 0;

            for (const file of files) {
                if (!file.endsWith('.js')) continue;
                
                try {
                    const content = await fs.readFile(path.join(skillsDir, file), 'utf8');
                    const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
                    const descMatch = content.match(/description:\s*["']([^"']+)["']/);
                    const emojiMatch = content.match(/emoji:\s*["']([^"']+)["']/);
                    
                    const pName = nameMatch ? nameMatch[1] : file.replace('.js', '');
                    const pDesc = descMatch ? descMatch[1] : 'Otonom ajan yeteneği.';
                    const pEmoji = emojiMatch ? emojiMatch[1] : '⚙️';
                    
                    const isEnabled = enabledSkills.includes(file);
                    
                    const entry = `- **${pEmoji} ${pName}** (\`${file}\`): ${pDesc}\n`;
                    
                    if (isEnabled) {
                         activeText += entry;
                         activeCount++;
                    } else {
                         inactiveText += entry;
                         inactiveCount++;
                    }
                } catch(e) {}
            }

            if (activeCount === 0) activeText += "- Şu an aktif yetenek bulunmamaktadır.\n\n";
            if (inactiveCount === 0) inactiveText += "- Tüm yetenekler aktif durumdadır.\n\n";

            const mdContent = `# KABİLİYETLER VE YETENEKLER (SKILLS)

> [!INFO]
> Bu dosya senin sahip olduğun yeteneklerin (Function Calling / Tool) güncel listesidir. 
> Sadece "AKTİF" listesindekileri şu anda kullanabilirsin. Eğer ihtiyacın olan yetenek pasif ise kullanıcıdan (Mimardan) açmasını talep edebilirsin.

${activeText}

${inactiveText}
`;

            await fs.writeFile(mdPath, mdContent, 'utf8');
            logger.info(`[SKILL REGISTRY] ${agentId} ajaninin SKILL.md dosyasi senkronize edildi (${activeCount} aktif, ${inactiveCount} pasif).`);
            return true;
        } catch (error) {
            logger.error(`[SKILL REGISTRY HATA] ${agentId} senkronizasyonunda sorun: ${error.message}`);
            return false;
        }
    }
};
