import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentQueue } from '../../src/core/async-queue.js';

describe('AgentQueue (Omni-Core Gen-23)', () => {
    beforeEach(() => {
        // Testler öncesi kuyruğu temizle (Private Map'leri manuel temizlemek zorsa modül seviyesi reset kullanırız, şimdilik ID'leri unik yapalım)
    });

    it('should process a task successfully', async () => {
        const agentId = `agent_test_${Date.now()}`;
        const mockTask = vi.fn().mockResolvedValue('success');
        
        const result = await AgentQueue.push(agentId, mockTask);
        
        expect(result).toBe('success');
        expect(mockTask).toHaveBeenCalledTimes(1);
    });

    it('should process tasks sequentially for the SAME agent', async () => {
        const agentId = `agent_seq_${Date.now()}`;
        let activeTasks = 0;
        let p1Started = false;

        const task1 = async () => {
            activeTasks++;
            p1Started = true;
            await new Promise(r => setTimeout(r, 100));
            activeTasks--;
            return 't1';
        };

        const task2 = async () => {
            expect(activeTasks).toBe(0); // Task1 bitmeden task2 çalışmamalı
            expect(p1Started).toBe(true);
            return 't2';
        };

        const p1 = AgentQueue.push(agentId, task1);
        const p2 = AgentQueue.push(agentId, task2);

        const results = await Promise.all([p1, p2]);
        expect(results).toEqual(['t1', 't2']);
    });

    it('should process tasks CONCURRENTLY for DIFFERENT agents', async () => {
        let maxActive = 0;
        let active = 0;

        const task = async () => {
            active++;
            maxActive = Math.max(maxActive, active);
            await new Promise(r => setTimeout(r, 100)); // bekle ki diğeri de başlasın
            active--;
            return true;
        };

        const p1 = AgentQueue.push('agent_A', task);
        const p2 = AgentQueue.push('agent_B', task);

        await Promise.all([p1, p2]);

        // Farklı ajanlar olduğu için aynı anda (concurrent) çalışmalı
        expect(maxActive).toBe(2); 
    });

    it('should handle task rejections properly', async () => {
        const agentId = `agent_err_${Date.now()}`;
        
        const failTask = async () => { throw new Error("Mock Error"); };
        const successTask = async () => { return "recovered"; };

        await expect(AgentQueue.push(agentId, failTask)).rejects.toThrow("Mock Error");
        
        // Hata sonrası aynı ajan kuyruğu kitlenmemeli
        const result = await AgentQueue.push(agentId, successTask);
        expect(result).toBe("recovered");
    });
});
