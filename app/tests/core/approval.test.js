import { describe, it, expect, vi } from 'vitest';
import { ApprovalGate } from '../../src/core/approval_gate.js';

describe('ApprovalGate (Omni-Core Gen-25)', () => {

    it('should resolve request successfully when approved', async () => {
        const emit = vi.fn();
        
        // requestApproval is async but we don't await immediately, we need the promise
        const p = ApprovalGate.requestApproval('agent1', 'run_command', { cmd: 'ls' }, emit);

        // requestId should be in the map
        expect(ApprovalGate.pendingRequests.size).toBe(1);
        const reqId = Array.from(ApprovalGate.pendingRequests.keys())[0];

        // Ensure emit was called
        expect(emit).toHaveBeenCalledWith(expect.objectContaining({
            type: 'approval_required',
            requestId: reqId,
            tool: 'run_command'
        }));

        // Now resolve it manually
        const resolved = ApprovalGate.resolveRequest(reqId, true);
        expect(resolved).toBe(true);

        const result = await p;
        expect(result).toBe(true);
        expect(ApprovalGate.pendingRequests.size).toBe(0);
    });

    it('should resolve request successfully when denied', async () => {
        const emit = vi.fn();
        
        const p = ApprovalGate.requestApproval('agent2', 'write_file', { content: 'test' }, emit);
        const reqId = Array.from(ApprovalGate.pendingRequests.keys())[0];

        const resolved = ApprovalGate.resolveRequest(reqId, false);
        expect(resolved).toBe(true);

        const result = await p;
        expect(result).toBe(false); // Denied
    });

    it('should return false for invalid requestId', () => {
        const resolved = ApprovalGate.resolveRequest('invalid_id', true);
        expect(resolved).toBe(false);
    });

    it('should auto-deny after timeout (5 mins simulated)', async () => {
        vi.useFakeTimers();
        const emit = vi.fn();

        const p = ApprovalGate.requestApproval('agent3', 'run_command', {}, emit);
        const reqId = Array.from(ApprovalGate.pendingRequests.keys())[0];

        // Fast-forward 5 minutes (300000 ms)
        vi.advanceTimersByTime(300000);

        const result = await p;
        expect(result).toBe(false); // Should be denied
        expect(ApprovalGate.pendingRequests.has(reqId)).toBe(false);

        vi.useRealTimers();
    });
});
