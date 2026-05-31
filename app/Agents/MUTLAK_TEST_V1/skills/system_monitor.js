/**
 * SYSTEM_MONITOR Skill — CPU, RAM, Disk bilgisi
 * Windows komutları ile sistem metriklerini çeker.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const skill = {
    name: "system_monitor",
    version: "1.0.0",
    category: "system",
    tags: ["cpu", "ram", "disk", "islem", "performans"],
    emoji: "📊",
    requires: { os: ["windows"] },
    description: "Bilgisayarin sistem bilgilerini getirir: CPU kullanimi, RAM durumu, disk alani, calisan islemler. Windows WMIC ve PowerShell komutlari ile calisir. 'all' metrigi tumunu, 'cpu'/'ram'/'disk'/'processes' tekil metrik dondurur.",
    parameters: {
        type: "object",
        properties: {
            metric: {
                type: "string",
                enum: ["cpu", "ram", "disk", "processes", "all"],
                description: "Sorgulanacak sistem metrigi. 'all' tum metrikleri getirir."
            }
        },
        required: ["metric"]
    },
    execute: async (args) => {
        try {
            const metric = (args.metric || 'all').toLowerCase();
            const results = [];
            
            if (metric === 'cpu' || metric === 'all') {
                try {
                    const { stdout } = await execPromise('wmic cpu get loadpercentage,name /format:list', { timeout: 10000 });
                    const load = stdout.match(/LoadPercentage=(\d+)/)?.[1] || '?';
                    const name = stdout.match(/Name=(.+)/)?.[1]?.trim() || '?';
                    results.push(`🖥️ CPU: ${name}\n   Kullanım: %${load}`);
                } catch { results.push('🖥️ CPU: Bilgi alinamadi'); }
            }
            
            if (metric === 'ram' || metric === 'all') {
                try {
                    const { stdout } = await execPromise('wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /format:list', { timeout: 10000 });
                    const free = parseInt(stdout.match(/FreePhysicalMemory=(\d+)/)?.[1] || '0') / 1024;
                    const total = parseInt(stdout.match(/TotalVisibleMemorySize=(\d+)/)?.[1] || '0') / 1024;
                    const used = total - free;
                    const pct = total > 0 ? ((used / total) * 100).toFixed(1) : '?';
                    results.push(`🧠 RAM: ${used.toFixed(0)} MB / ${total.toFixed(0)} MB (${pct}% kullanımda)\n   Boş: ${free.toFixed(0)} MB`);
                } catch { results.push('🧠 RAM: Bilgi alinamadi'); }
            }
            
            if (metric === 'disk' || metric === 'all') {
                try {
                    const { stdout } = await execPromise('wmic logicaldisk get size,freespace,caption /format:list', { timeout: 10000 });
                    const disks = stdout.split('Caption=').slice(1);
                    for (const d of disks) {
                        const caption = d.split('\r')[0]?.trim();
                        const free = parseInt(d.match(/FreeSpace=(\d+)/)?.[1] || '0') / (1024**3);
                        const total = parseInt(d.match(/Size=(\d+)/)?.[1] || '0') / (1024**3);
                        if (total > 0) {
                            const pct = ((1 - free/total) * 100).toFixed(1);
                            results.push(`💾 ${caption} ${total.toFixed(1)} GB toplam, ${free.toFixed(1)} GB boş (${pct}% dolu)`);
                        }
                    }
                } catch { results.push('💾 Disk: Bilgi alinamadi'); }
            }
            
            if (metric === 'processes' || metric === 'all') {
                try {
                    const { stdout } = await execPromise('powershell "Get-Process | Sort-Object -Property WS -Descending | Select-Object -First 10 Name, @{N=\\"MB\\";E={[math]::Round($_.WS/1MB,1)}}, CPU | Format-Table -AutoSize | Out-String"', { timeout: 10000 });
                    results.push(`📋 En Çok RAM Kullanan 10 İşlem:\n${stdout.trim()}`);
                } catch { results.push('📋 İşlemler: Bilgi alinamadi'); }
            }
            
            return `[SİSTEM BİLGİSİ]\n${results.join('\n\n')}`;
        } catch (error) {
            return `[HATA] Sistem bilgisi alinamadi: ${error.message}`;
        }
    }
};
