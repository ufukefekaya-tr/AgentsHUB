import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REGISTRY_FILE = path.join(__dirname, 'registry.json');

/**
 * THE REGISTRY (Sarı Sayfalar)
 * 
 * Sistemdeki tüm ajanların uzmanlıklarını ve webhook yetkilerini tutar.
 * Ajanlar, ihtiyacı olan diğer ajanları buradan (specialty) arayarak bulur.
 */
export const Registry = {
    async load() {
        try {
            const data = await fs.readFile(REGISTRY_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.error('[REGISTRY] Kayit dosyasi okunamadi:', error);
            return { agents: [] };
        }
    },

    async save(registryData) {
        await fs.writeFile(REGISTRY_FILE, JSON.stringify(registryData, null, 4));
    },

    /**
     * @param {string} agentId 
     * @param {object} metadata { alias, specialty, model_info, webhook_token, endpoint }
     */
    async register(agentId, metadata) {
        let registry = await this.load();
        const existingIndex = registry.agents.findIndex(a => a.id === agentId);
        
        const newRecord = { id: agentId, ...metadata };
        
        if (existingIndex > -1) {
            registry.agents[existingIndex] = newRecord;
        } else {
            registry.agents.push(newRecord);
        }
        
        await this.save(registry);
        logger.info(`[REGISTRY] ${agentId} ajaninin uzmanlik kaydi (${metadata.specialty}) yapildi.`);
    },

    /**
     * @param {string} specialty - Aranan uzmanlik
     * @returns {object|null} Ajan kaydi
     */
    // M-03: Ajan silindiğinde orphaned registry entry'sini temizle
    async deregister(agentId) {
        try {
            const registry = await this.load();
            const before = registry.agents.length;
            registry.agents = registry.agents.filter(a => a.id !== agentId);
            if (registry.agents.length < before) {
                await this.save(registry);
                logger.info(`[REGISTRY] ${agentId} kaydı silindi.`);
            }
        } catch (e) {
            logger.warn(`[REGISTRY] deregister hatası: ${e.message}`);
        }
    },

    async discover(specialty) {
        const registry = await this.load();
        const agent = registry.agents.find(a => a.specialty === specialty);
        if (agent) {
            logger.info(`[DISCOVER] '${specialty}' uzmanligi araniyor... Bulundu: ${agent.id}`);
            return agent;
        } else {
            logger.warn(`[DISCOVER] '${specialty}' uzmanligina sahip ajan sistemde bulunamadi.`);
            return null;
        }
    }
};
