import fs from 'fs/promises';
import path from 'path';

async function executeSprint2() {
    console.log("Starting Sprint 2 updates...");

    // 1. G-07: web_scraper.js SSRF
    const wsPath = 'C:/AgentsHUB/Marketplace/skills/web_scraper.js';
    let ws = await fs.readFile(wsPath, 'utf8');
    ws = ws.replace(
        /\/\/ SSRF Koruması[^]*?\} catch \{ \/\* Guard yüklenemezse devam et \*\/ \}/,
        `// SSRF Koruması (Toggle aware)
            try {
                const sPath = path.join(process.cwd(), 'global_settings.json');
                const conf = JSON.parse(await fs.readFile(sPath, 'utf8'));
                if (conf.ssrf_guard_enabled !== false) {
                    const ssrfGuardPath = path.resolve(process.cwd(), 'src/security/ssrf-guard.js');
                    const { validateUrlSync } = await import('file:///' + ssrfGuardPath.replace(/\\\\/g, '/'));
                    const check = validateUrlSync(url);
                    if (!check.safe) return \`[GÜVENLİK HATASI] \${check.reason}\`;
                }
            } catch (e) {
                // Ignore if security config cannot be read, fail open or log
                 return \`[GÜVENLİK SİSTEMİ HATASI] SSRF Koruması kontrol edilemedi: \${e.message}\`;
            }`
    );
    await fs.writeFile(wsPath, ws, 'utf8');

    // 2. G-08: byterover.js Path Guard
    const brPath = 'C:/AgentsHUB/Marketplace/skills/byterover.js';
    let br = await fs.readFile(brPath, 'utf8');
    if(!br.includes('validateAgentPath')) {
        const insertion = `
            // Path Guard Check (Toggle aware)
            if (args.path && ['read', 'write', 'execute', 'delete'].includes(args.action)) {
                try {
                    const sPath = path.join(process.cwd(), 'global_settings.json');
                    const conf = JSON.parse(await fs.readFile(sPath, 'utf8'));
                    if (conf.path_guard_enabled !== false) {
                        const pathGuardPath = path.resolve(process.cwd(), 'src/security/path-guard.js');
                        const { validateAgentPath } = await import('file:///' + pathGuardPath.replace(/\\\\/g, '/'));
                        // Get agentId somehow? The context is not given to execute in byterover by default.
                        // Wait, execute: async (args, context) => ...
                        // If context is omitted, let's get it from cwd.
                        const currentAgentId = process.cwd().split(path.sep).pop(); // rough fallback
                        // Actually, LLMBridge SandboxRunner provides agentId as 3rd param: SandboxRunner.executeIsolated(skill, args, agentId)
                        // Note: skill.execute is called with (args, context) where context could be agentId
                    }
                } catch(e) {}
            }
`;
        br = br.replace('switch (args.action) {', `
            // PATH GUARD KORUMASI
            if (args.path && ['write', 'delete'].includes(args.action)) {
                try {
                    const sPath = path.join(process.cwd(), 'global_settings.json');
                    const conf = JSON.parse(await fs.readFile(sPath, 'utf8'));
                    if (conf.path_guard_enabled !== false) {
                        const pgPath = path.resolve(process.cwd(), 'src/security/path-guard.js');
                        const { validateAgentPath } = await import('file:///' + pgPath.replace(/\\\\/g, '/'));
                        // SandboxRunner passes agentId as second arg: execute(args, agentId)
                        const agentId = arguments[1] || 'Global'; 
                        const result = validateAgentPath(agentId, args.path, args.action);
                        if(!result.allowed) {
                            return \`[GÜVENLİK HATASI] \${result.reason}\`;
                        }
                    }
                } catch(e) {
                    console.error("Path guard error:", e);
                }
            }
            switch (args.action) {`);
        await fs.writeFile(brPath, br, 'utf8');
    }

    // 3. G-08: write_file.js Path Guard
    const wfPath = 'C:/AgentsHUB/Marketplace/skills/write_file.js';
    let wf = await fs.readFile(wfPath, 'utf8');
    wf = wf.replace(
        /\/\/ Path Path Traversal Saldırılarını Önleme[^]*?return "\[GUVENLIK HATASI\] Dosya yolu sistem köküne çıkmaya çalıştı.*";\s*\}/,
        `// PATH GUARD KORUMASI
            try {
                const sPath = path.join(process.cwd(), 'global_settings.json');
                const conf = JSON.parse(await fs.readFile(sPath, 'utf8'));
                if (conf.path_guard_enabled !== false) {
                    const pgPath = path.resolve(process.cwd(), 'src/security/path-guard.js');
                    const { validateAgentPath } = await import('file:///' + pgPath.replace(/\\\\/g, '/'));
                    const agentId = context && context.agentId ? context.agentId : (typeof arguments[1] === 'string' ? arguments[1] : 'Global');
                    const result = validateAgentPath(agentId, args.filename, 'write');
                    if(!result.allowed) {
                        return \`[GÜVENLİK HATASI] \${result.reason}\`;
                    }
                }
            } catch(e) {
                console.error("Path guard error in write_file:", e);
            }
            const resolvedPath = path.resolve(process.cwd(), 'Agents', (context&&context.agentId)||arguments[1]||'Global', args.filename);`
    );
    await fs.writeFile(wfPath, wf, 'utf8');

    // 4. G-09: Skill Dosya Boyutu Limiti
    // src/gateway/ui_server.js
    const uiPath = 'C:/AgentsHUB/app/src/gateway/ui_server.js';
    let ui = await fs.readFile(uiPath, 'utf8');
    if (!ui.includes('skill_size_limit_enabled')) {
        ui = ui.replace(
            `const dst = path.join(targetDir, fileName);`,
            `const dst = path.join(targetDir, fileName);
        
        // G-09: Skill Limit Check
        try {
            const stat = await fs.stat(src);
            const globalSettings = JSON.parse(await fs.readFile(path.join(process.cwd(), 'global_settings.json'), 'utf8').catch(() => '{}'));
            if (globalSettings.skill_size_limit_enabled !== false) {
                const limit = globalSettings.skill_size_limit_bytes || 256000;
                if (stat.size > limit) {
                    return res.status(400).json({ error: \`Güvenlik Hatası: Skill dosya boyutu limitini aşıyor (\${stat.size} > \${limit} byte).\`});
                }
            }
        } catch(e) {}`
        );
        
        // G-10: Healthcheck Endpoint
        ui = ui.replace(
            `app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), ts: new Date().toISOString() });
});`,
            `// G-10: Healthcheck Endpoint
app.get('/api/health', async (req, res) => {
    try {
        const os = await import('os');
        const agentsDir = path.join(process.cwd(), 'Agents');
        const items = await fs.readdir(agentsDir, { withFileTypes: true });
        const agentCount = items.filter(i => i.isDirectory() && i.name !== 'Global' && !i.name.startsWith('test')).length;
        
        const memoryUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        
        res.json({ 
            status: 'ok', 
            uptime: Math.round(process.uptime()), 
            ts: new Date().toISOString(),
            agents: agentCount,
            memory: {
                rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
                heapTotal_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                heapUsed_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                system_total_mb: Math.round(totalMem / 1024 / 1024),
                system_free_mb: Math.round(freeMem / 1024 / 1024)
            }
        });
    } catch(e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});`
        );
        await fs.writeFile(uiPath, ui, 'utf8');
    }

    // 5. G-11/12: global_settings.json + src/config/constants.js
    const constantsPath = 'C:/AgentsHUB/app/src/config/constants.js';
    let constants = await fs.readFile(constantsPath, 'utf8');
    if (!constants.includes('SSRF_GUARD_ENABLED')) {
        const toggleExports = `
export let SSRF_GUARD_ENABLED = true;
export let PATH_GUARD_ENABLED = true;
export let SHIELD_ENABLED = true;
export let API_KEY_MASKING_ENABLED = true;
export let EXEC_APPROVAL_ENABLED = false;
export let SKILL_SIZE_LIMIT_ENABLED = true;
export let SKILL_SIZE_LIMIT_BYTES = 256000;
`;
        constants = constants.replace('export let REACT_TIME_LIMIT_MS = 600000;', `export let REACT_TIME_LIMIT_MS = 600000;${toggleExports}`);
        
        const toggleLoads = `
        SSRF_GUARD_ENABLED = settings.ssrf_guard_enabled !== false;
        PATH_GUARD_ENABLED = settings.path_guard_enabled !== false;
        SHIELD_ENABLED = settings.shield_enabled !== false;
        API_KEY_MASKING_ENABLED = settings.api_key_masking_enabled !== false;
        EXEC_APPROVAL_ENABLED = !!settings.exec_approval_enabled;
        SKILL_SIZE_LIMIT_ENABLED = settings.skill_size_limit_enabled !== false;
        SKILL_SIZE_LIMIT_BYTES = parseInt(settings.skill_size_limit_bytes || '256000', 10);
`;
        constants = constants.replace("REACT_TIME_LIMIT_MS = parseInt(settings.react_time_limit || process.env.REACT_TIME_LIMIT || '600000', 10);", 
            `REACT_TIME_LIMIT_MS = parseInt(settings.react_time_limit || process.env.REACT_TIME_LIMIT || '600000', 10);${toggleLoads}`);
        await fs.writeFile(constantsPath, constants, 'utf8');
    }

    // Default global_settings.json
    const gsPath = 'C:/AgentsHUB/app/global_settings.json';
    try {
        let gs = JSON.parse(await fs.readFile(gsPath, 'utf8').catch(()=>'{}'));
        gs.ssrf_guard_enabled = true;
        gs.path_guard_enabled = true;
        gs.shield_enabled = true;
        gs.api_key_masking_enabled = true;
        gs.exec_approval_enabled = false;
        gs.skill_size_limit_enabled = true;
        gs.skill_size_limit_bytes = 256000;
        await fs.writeFile(gsPath, JSON.stringify(gs, null, 2), 'utf8');
    } catch(e) {}

    console.log("Sprint 2 updates complete.");
}

executeSprint2().catch(console.error);
