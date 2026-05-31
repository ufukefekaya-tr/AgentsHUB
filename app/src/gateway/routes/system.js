import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';
import { Telemetry } from '../../core/telemetry_tracker.js';
import { loadSecretsVault, saveSecretsVault } from '../../security/secret_vault.js';
import { ApprovalGate } from '../../core/approval_gate.js';
import logger from '../../utils/logger.js';

export const systemRouter = express.Router();

systemRouter.get('/logs', async (req, res) => {
    try {
        res.json({ status: "ok", logs: logger.getRecentLogs() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

systemRouter.get('/user-profile', async (req, res) => {
    try {
        const userMdPath = path.join(process.cwd(), 'USER.md');
        const content = await fs.readFile(userMdPath, 'utf8').catch(() => null);
        if (!content) return res.json({ name: '', surname: '', bio: '' });
        const nameMatch = content.match(/\*\*İsim:\*\*\s*([^\n]+)/);
        if (nameMatch) {
            const parts = nameMatch[1].trim().split(' ');
            res.json({ name: parts[0] || '', surname: parts.slice(1).join(' ') || '', bio: '' });
        } else {
            res.json({ name: '', surname: '', bio: '' });
        }
    } catch (e) {
        res.json({ name: '', surname: '', bio: '' });
    }
});

systemRouter.post('/user-profile', async (req, res) => {
    try {
        const userMdPath = path.join(process.cwd(), 'USER.md');
        await fs.writeFile(userMdPath, req.body.content);
        res.json({ status: "ok" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

systemRouter.get('/global-settings', async (req, res) => {
    try {
        const settingsPath = path.join(process.cwd(), 'global_settings.json');
        let settings = { byterover_tier: 'restricted', global_skills_enabled: true };
        try { const c = await fs.readFile(settingsPath, 'utf8'); settings = { ...settings, ...JSON.parse(c)}; } catch(e){}
        res.json(settings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

systemRouter.post('/global-settings', async (req, res) => {
    try {
        const settingsPath = path.join(process.cwd(), 'global_settings.json');
        let current = {};
        try { const c = await fs.readFile(settingsPath, 'utf8'); current = JSON.parse(c); } catch(e){}
        const newSettings = { ...current, ...req.body };
        await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

systemRouter.get('/secrets', async (req, res) => {
    try {
        const secrets = await loadSecretsVault();
        // Zero-Trust: API key'leri asla düz metin dönme. Maskelenerek döndür.
        const masked = {};
        for (const [key, value] of Object.entries(secrets)) {
            if (value && typeof value === 'string' && value.length > 8) {
                masked[key] = `${value.slice(0, 4)}${'*'.repeat(Math.min(value.length - 8, 20))}${value.slice(-4)}`;
            } else if (value && typeof value === 'string') {
                masked[key] = '****';
            } else {
                masked[key] = value;
            }
        }
        res.json(masked);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

systemRouter.post('/secrets', async (req, res) => {
    try {
        await saveSecretsVault(req.body);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

systemRouter.post('/approve/:requestId', (req, res) => {
    try {
        const { requestId } = req.params;
        const { approved } = req.body;
        const resolved = ApprovalGate.resolveRequest(requestId, !!approved);
        if (resolved) {
            res.json({ status: 'ok', approved: !!approved });
        } else {
            res.status(404).json({ error: 'Request ID bulunamadı veya zaman aşımına uğradı.' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

import { spawn } from 'child_process';

systemRouter.post('/shutdown', (req, res) => {
    logger.info('[UI-BACKEND] Dashboard uzerinden kapatma komutu alindi. Sistem kapaniyor...');
    res.json({ status: 'shutting_down' });
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

systemRouter.post('/restart', (req, res) => {
    logger.info('[UI-BACKEND] Dashboard uzerinden yeniden baslatma komutu alindi. Sistem yeniden baslatiliyor...');
    res.json({ status: 'restarting' });
    setTimeout(() => {
        const subprocess = spawn(process.argv[0], process.argv.slice(1), {
            detached: true,
            stdio: 'ignore'
        });
        subprocess.unref();
        process.exit(0);
    }, 1000);
});

export const healthRouter = express.Router();

healthRouter.get('/', async (req, res) => {
    try {
        const agentsDir = path.join(process.cwd(), 'Agents');
        let agentCount = 0;
        try {
            const dirs = await fs.readdir(agentsDir);
            agentCount = dirs.length;
        } catch(e) {}

        const mem = process.memoryUsage();
        res.json({
            status: 'ok',
            uptime: Math.floor(process.uptime()),
            uptimeHuman: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
            agents: agentCount,
            memory: {
                rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
                heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
                heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`
            },
            node: process.version,
            platform: process.platform,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

export const telemetryRouter = express.Router();

telemetryRouter.get('/', (req, res) => {
    res.json(Telemetry.getSummary());
});

telemetryRouter.get('/stats', async (req, res) => {
    try {
        const stats = await Telemetry.getTimeStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
