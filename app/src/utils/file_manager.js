import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

const AGENTS_DIR = path.resolve(process.cwd(), 'Agents');

/**
 * FILE MANAGER (Otonom Dosya Operasyonları)
 * Ajanların kendi Workspace alanlarında güvenli işlem yapmasını sağlar.
 */
export const FileManager = {
    
    _getAgentPath(agentId, filename) {
        const systemFiles = ['USER.md', 'EVOLUTION_NOTES.md', 'DNA.md', 'RULES.md', 'SKILL.md', 'AGENT_MANUEL.md', 'SHIELD_CONFIG.md', 'config.json'];
        if (systemFiles.includes(filename)) {
            return path.join(AGENTS_DIR, agentId, 'Mind-Set_Core', filename);
        }
        return path.join(AGENTS_DIR, agentId, 'Workspace', filename);
    },

    async ensureDir(agentId) {
        const workspacePath = path.join(AGENTS_DIR, agentId, 'Workspace');
        try {
            await fs.mkdir(workspacePath, { recursive: true });
        } catch (e) {}
    },

    async list(agentId, subPath = '') {
        const agentDir = path.join(AGENTS_DIR, agentId, 'Workspace');
        const targetPath = path.join(agentDir, subPath);
        
        // Güvenlik: Ajan kendi klasörünün dışına çıkamaz.
        if (!targetPath.startsWith(agentDir)) {
             throw new Error("GUVENLIK_IHLALI: Kendi Workspace disina cikamazsin.");
        }

        try {
            await this.ensureDir(agentId);
            const files = await fs.readdir(targetPath);
            return files.length > 0 ? files.join('\n') : "Klasör boş.";
        } catch (e) {
            throw new Error(`Dizin listelenemedi: ${e.message}`);
        }
    },

    async read(agentId, filename) {
        const filePath = this._getAgentPath(agentId, filename);
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch (error) {
            throw new Error(`Dosya okunamadi: ${filename}`);
        }
    },

    async write(agentId, filename, content) {
        const filePath = this._getAgentPath(agentId, filename);
        try {
            await this.ensureDir(agentId);
            await fs.writeFile(filePath, content, 'utf8');
            logger.info(`[FILE MANAGER] Dosya yazildi: ${agentId}/${filename}`);
            return true;
        } catch (error) {
            throw new Error(`Dosya yazılamadı: ${error.message}`);
        }
    },

    /**
     * Hassas Düzenleme (Edit/Patch)
     * Tüm dosyayı silmek yerine belirli bir bloğu değiştirir.
     */
    async edit(agentId, filename, target, replacement) {
        const filePath = this._getAgentPath(agentId, filename);
        try {
            const content = await fs.readFile(filePath, 'utf8');
            if (!content.includes(target)) {
                throw new Error("Hedef metin dosyada bulunamadi.");
            }
            const newContent = content.replace(target, replacement);
            await fs.writeFile(filePath, newContent, 'utf8');
            logger.info(`[FILE MANAGER] Dosya duzenlendi: ${agentId}/${filename}`);
            return true;
        } catch (error) {
            throw new Error(`Düzenleme hatası: ${error.message}`);
        }
    },

    async delete(agentId, filename) {
        const filePath = this._getAgentPath(agentId, filename);
        try {
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            throw new Error(`Dosya silinemedi: ${error.message}`);
        }
    }
};
