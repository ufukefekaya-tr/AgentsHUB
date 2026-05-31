export class TaskQueue {
    constructor() {
        this.queues = new Map();
        this.running = new Set();
    }

    /**
     * Kuyruğa görev ekler (Ajan spesifik)
     */
    async push(agentId, taskFn) {
        if (!this.queues.has(agentId)) {
            this.queues.set(agentId, []);
        }

        return new Promise((resolve, reject) => {
            this.queues.get(agentId).push(async () => {
                try {
                    const result = await taskFn();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });

            this._processNext(agentId);
        });
    }

    async _processNext(agentId) {
        if (this.running.has(agentId)) return; // Aynı ajan zaten işlem yapıyor.

        const queue = this.queues.get(agentId);
        if (!queue || queue.length === 0) return; // Kuyruk boş.

        this.running.add(agentId); // Ajanı kilitliyoruz.

        try {
            const task = queue.shift();
            await task(); // Sıradaki görevi bekletiyoruz.
        } finally {
            this.running.delete(agentId); // Ajan kilidini kaldırıyoruz.
            // Olası sıradaki görevleri işle:
            this._processNext(agentId);
        }
    }
}

// Global Agent Queue Singleton
export const AgentQueue = new TaskQueue();
