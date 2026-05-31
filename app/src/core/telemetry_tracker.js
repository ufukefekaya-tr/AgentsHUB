import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

/**
 * AgentsHUB - Telemetry Tracker (Observer) - IP-6
 * 
 * Her etkileşimde (Kullanıcı sorusu -> Ajan cevabı) LLM/API kullanımını,
 * işlem süresini (latency) ve arka planda çağrılan araçların başarılarını
 * sessizce günlüğe kaydeder.
 */
class TelemetryTracker {
    constructor() {
        // Bellekte geçici olarak tutulan son 10 etkileşim
        this.cache = [];
        this.logDir = path.join(process.cwd(), '.agent_telemetry');
        this.init();
    }

    async init() {
        try {
            await fs.mkdir(this.logDir, { recursive: true });
            
            // Rehydrate (Load) today's data to internal cache on startup to persist event logs across restarts
            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(this.logDir, `telemetry_${today}.jsonl`);
            
            try {
                const content = await fs.readFile(logFile, 'utf8');
                const last50 = content.trim().split('\n').filter(Boolean).map(l => {
                    try { return JSON.parse(l); } catch { return null; }
                }).filter(Boolean).slice(-50);
                this.cache = last50;
                logger.info(`[TELEMETRY] ${last50.length} kayit diskten onbellege alindi (Kalicilik SAGLANDI).`);
            } catch(e) {
                // Ignore if it doesn't exist yet
            }
        } catch(e) { /* ignore */ }
    }

    /**
     * Yeni bir telemetri kaydı oluşturur. LLM Bridge tarafından veya Gateway tarafından çağrılır.
     */
    async recordInteraction(agentId, metrics) {
        const {
            inputTokens = 0,
            outputTokens = 0,
            latencyMs = 0,
            model = "unknown",
            toolsInvoked = [],
            errorData = null
        } = metrics;

        const record = {
            timestamp: new Date().toISOString(),
            agentId,
            model,
            usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: inputTokens + outputTokens
            },
            performance: {
                latencyMs
            },
            tools: toolsInvoked, // [{ name, success, error }]
            error: errorData
        };

        this.cache.push(record);
        if (this.cache.length > 50) this.cache.shift(); // Sadece son 50'yi memory'de tut.

        // Opsiyonel: Diskte kalıcı JSONL loglaması (Dashboard için ileride kullanılabilir)
        try {
            const logFile = path.join(this.logDir, `telemetry_${new Date().toISOString().split('T')[0]}.jsonl`);
            await fs.appendFile(logFile, JSON.stringify(record) + '\n');
            
            // Terminalde sessizce bilgi ver (T1 Kanıtı için)
            logger.info(`[TELEMETRY] Input: ${inputTokens}, Output: ${outputTokens}, Latency: ${latencyMs}ms, Model: ${model}`);
        } catch (e) {
            logger.error(`[TELEMETRY] Yazma hatasi: ${e.message}`);
        }

        return record; // Döndür ki Kaizen engine bunu okuyabilsin.
    }

    /**
     * Son etkileşimlerin özetini döndürür (Dashboard için). Dolar hesabı ve Average istatistikleri sunar.
     */
    getSummary() {
        const records = this.cache;
        if (records.length === 0) return { 
            total_requests: 0, 
            total_tokens: 0, 
            avg_tokens: 0,
            total_cost_usd: 0,
            avg_usd: 0,
            avg_latency_ms: 0, 
            error_count: 0, 
            top_tools: [] 
        };

        let totalTokens = 0, totalLatency = 0, totalInput = 0, totalOutput = 0;
        const errorCount = records.filter(r => r.error).length;

        // Count tool invocations & sums
        const toolCounts = {};
        for (const r of records) {
            totalInput += r.usage?.promptTokens || 0;
            totalOutput += r.usage?.completionTokens || 0;
            totalTokens += r.usage?.totalTokens || 0;
            totalLatency += r.performance?.latencyMs || 0;
            for (const t of (r.tools || [])) {
                toolCounts[t.name] = (toolCounts[t.name] || 0) + 1;
            }
        }
        
        const topTools = Object.entries(toolCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        const avgTokens = Math.round(totalTokens / records.length);
        const totalCostUSD = (totalTokens / 1000000) * 0.50; // Milyon token başına 0.5 dolar Mimar sabiti
        const avgUSD = (avgTokens / 1000000) * 0.50;

        return {
            total_requests: records.length,
            total_tokens: totalTokens,
            total_input: totalInput,
            total_output: totalOutput,
            avg_tokens: avgTokens,
            total_cost_usd: parseFloat(totalCostUSD.toFixed(6)),
            avg_usd: parseFloat(avgUSD.toFixed(6)),
            avg_latency_ms: Math.round(totalLatency / records.length),
            error_count: errorCount,
            top_tools: topTools,
            last_updated: records[records.length - 1]?.timestamp || null,
            records: records.slice(-30)  // Last 30 records for event log display (Genişletildi)
        };
    }

    /**
     * Günlük/saatlik/dakikalık token istatistiklerini döndürür (JSONL dosyalarından okunur).
     */
    async getTimeStats() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        let todayRecords = [];
        try {
            const todayFile = path.join(this.logDir, `telemetry_${today}.jsonl`);
            const content = await fs.readFile(todayFile, 'utf8');
            todayRecords = content.trim().split('\n').filter(Boolean).map(l => {
                try { return JSON.parse(l); } catch { return null; }
            }).filter(Boolean);
        } catch (e) { /* dosya yoksa boş */ }

        // Saatlik istatistikler (bugün)
        const hourly = {};
        for (let h = 0; h < 24; h++) hourly[h] = { tokens: 0, requests: 0 };
        for (const r of todayRecords) {
            const h = new Date(r.timestamp).getHours();
            hourly[h].tokens += r.usage?.totalTokens || 0;
            hourly[h].requests += 1;
        }

        // Son 1 dakika
        const oneMinAgo = Date.now() - 60000;
        const lastMinuteRecords = todayRecords.filter(r => new Date(r.timestamp).getTime() > oneMinAgo);

        // Bugün toplamı
        const todayTokens = todayRecords.reduce((s, r) => s + (r.usage?.totalTokens || 0), 0);
        const todayRequests = todayRecords.length;

        // Son 7 gün
        const daily = [];
        for (let d = 6; d >= 0; d--) {
            const dayDate = new Date(now - d * 86400000).toISOString().split('T')[0];
            let dayTokens = 0, dayRequests = 0;
            try {
                const dayFile = path.join(this.logDir, `telemetry_${dayDate}.jsonl`);
                const content = await fs.readFile(dayFile, 'utf8');
                const records = content.trim().split('\n').filter(Boolean).map(l => {
                    try { return JSON.parse(l); } catch { return null; }
                }).filter(Boolean);
                dayTokens = records.reduce((s, r) => s + (r.usage?.totalTokens || 0), 0);
                dayRequests = records.length;
            } catch (e) { /* yoksa 0 */ }
            daily.push({ date: dayDate, tokens: dayTokens, requests: dayRequests });
        }

        const calcUSD = (tokens) => parseFloat(((tokens / 1000000) * 0.50).toFixed(6));

        return {
            today: { 
                 tokens: todayTokens, 
                 requests: todayRequests,
                 cost: calcUSD(todayTokens)
            },
            last_minute: {
                tokens: lastMinuteRecords.reduce((s, r) => s + (r.usage?.totalTokens || 0), 0),
                requests: lastMinuteRecords.length,
                cost: calcUSD(lastMinuteRecords.reduce((s, r) => s + (r.usage?.totalTokens || 0), 0))
            },
            hourly,
            daily
        };
    }

    /**
     * Gönderilen bir isteğin anlık bir snapshot'ını almak için yardımcı bir fonksiyon
     */
    startTrace() {
        return {
            startTime: Date.now(),
            tools: [],
            addToolCall: function(name, resultData, errorStr = null) {
                this.tools.push({
                    name,
                    success: !errorStr,
                    error: errorStr
                });
            },
            end: function() {
                return {
                    latencyMs: Date.now() - this.startTime,
                    toolsInvoked: this.tools
                };
            }
        };
    }
}

export const Telemetry = new TelemetryTracker();
