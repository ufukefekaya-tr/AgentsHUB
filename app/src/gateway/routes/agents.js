import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { MindsetParser } from '../../memory/parser.js';
import { UMI } from '../../memory/umi.js';
import { Registry } from '../../core/registry.js';
import { runGenesis } from '../../memory/genesis.js';
import { telegramManager } from '../../channels/telegram_bridge.js';
import { SkillLoader } from '../../skills/loader.js';
import { SkillRegistry } from '../../skills/registry.js';
import logger from '../../utils/logger.js';

const router = express.Router();

const ALLOWED_MODELS = [
    'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-3-pro-image-preview',
    'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-flash-image'
];

router.get('/', async (req, res) => {
    try {
        const agentsDir = path.join(process.cwd(), 'Agents');
        const items = await fs.readdir(agentsDir, { withFileTypes: true });
        const agents = items
            .filter(item => item.isDirectory() && item.name !== 'Global')
            .map(item => ({ id: item.name }));
        res.json(agents);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "İsim gerekli" });
    try {
        await runGenesis(name);
        res.status(201).json({ status: "created", id: name });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/:id/config', async (req, res) => {
    try {
        const config = await MindsetParser.loadConfig(req.params.id);
        if (config && config.api_key) config.api_key = '*************';
        res.json(config);
    } catch (e) {
        res.status(404).json({ error: "Ajan bulunamadı" });
    }
});

router.put('/:id/config', async (req, res) => {
    try {
        const updates = req.body;
        if (updates.model && !ALLOWED_MODELS.includes(updates.model)) {
            return res.status(400).json({ error: `Geçersiz model: "${updates.model}"` });
        }
        if (updates.token_limit !== undefined && (updates.token_limit < 1 || updates.token_limit > 200000)) {
            return res.status(400).json({ error: 'token_limit sınırı hatalı' });
        }
        if (updates.temperature !== undefined && (updates.temperature < 0 || updates.temperature > 2)) {
            return res.status(400).json({ error: 'temperature sınırı hatalı' });
        }
        const configPath = path.join(process.cwd(), 'Agents', req.params.id, 'Mind-Set_Core', 'config.json');
        
        let existing = {};
        try { existing = JSON.parse(await fs.readFile(configPath, 'utf8')); } catch(e) {}

        if (updates.api_key) updates.api_key = updates.api_key.trim();
        if (updates.telegram_bot_token) updates.telegram_bot_token = updates.telegram_bot_token.trim();

        const merged = { ...existing, ...updates };
        if (merged.api_key && merged.api_key.includes('*')) merged.api_key = existing.api_key || '';
        
        await fs.writeFile(configPath, JSON.stringify(merged, null, 4));

        SkillLoader.invalidateCache(req.params.id);
        SkillRegistry.sync(req.params.id);
        
        if (updates.telegram_bot_token !== undefined) {
            telegramManager.restartBot(req.params.id).catch(e => logger.warn(`[TELEGRAM] Restart hatası: ${e.message}`));
        }
        res.json({ status: "ok" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const agentId = req.params.id;
        const agentPath = path.join(process.cwd(), 'Agents', agentId);
        if (!agentId || agentId.includes('..') || agentId === 'Global') {
            return res.status(400).json({ error: "Gecersiz ajan id" });
        }
        try { await fs.access(agentPath); } catch { return res.status(404).json({ error: "Ajan bulunamadı" }); }
        
        await fs.rm(agentPath, { recursive: true, force: true });
        try { if (UMI.purge) await UMI.purge(agentId); } catch (e) {}
        try { await Registry.deregister(agentId); } catch (e) {}

        res.json({ status: "deleted", id: agentId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// EVALUATION LOG
router.get('/:id/evaluation', async (req, res) => {
    try {
        const evalPath = path.join(process.cwd(), 'Agents', req.params.id, 'Mind-Set_Core', 'EVALUATION.md');
        const content = await fs.readFile(evalPath, 'utf8').catch(() => 'Henüz kayıt yok.');
        res.json({ content });
    } catch (e) {
        res.status(404).json({ content: '' });
    }
});

export default router;
