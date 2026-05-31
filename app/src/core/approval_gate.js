import crypto from 'crypto';

/**
 * AgentsHUB - GERÇEK ZAMANLI EXEC APPROVAL (OC-05/OC-03)
 * Kritik fonksiyonlardan önce yürütmeyi dondurup Mimar'dan onay bekler.
 */
export const ApprovalGate = {
    pendingRequests: new Map(),

    /**
     * LLM Bridge akışını onay gelene kadar dondurur.
     */
    async requestApproval(agentId, toolName, toolArgs, emit) {
        return new Promise((resolve) => {
            const reqId = crypto.randomUUID();
            
            this.pendingRequests.set(reqId, {
                resolve,
                agentId,
                toolName,
                toolArgs,
                createdAt: Date.now()
            });

            // Frontend SSE için sinyal yolla
            emit({
                type: 'approval_required',
                requestId: reqId,
                tool: toolName,
                args: toolArgs,
                message: `Güvenlik Onayı Bekleniyor: Görev donduruldu. Aracın çalışmasına onay verin: '${toolName}'`
            });
            
            // 5 dakika içerisinde onay gelmezse otomatik reddet ve akışı çöz
            setTimeout(() => {
                if (this.pendingRequests.has(reqId)) {
                    this.resolveRequest(reqId, false);
                }
            }, 300000);
        });
    },

    /**
     * Bekleyen görevi çözer (Kabul/Red).
     */
    resolveRequest(reqId, isApproved) {
        if (this.pendingRequests.has(reqId)) {
            const { resolve } = this.pendingRequests.get(reqId);
            this.pendingRequests.delete(reqId);
            resolve(isApproved);
            return true;
        }
        return false;
    }
};
