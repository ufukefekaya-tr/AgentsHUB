/**
 * UMI Base Adapter (Evrensel Sözleşme)
 * Tüm bellek motorları (SQLite, JSON, Vector) bu arayüzü uygulamak zorundadır.
 */
export class BaseMemoryAdapter {
    constructor(config = {}) {
        this.config = config;
    }

    /**
     * @param {string} agentId 
     * @param {string} threadId 
     * @param {Array} messages Guncel mesaj dizisi
     * @param {string} title Opsiyonel: sohbet başlığı
     * @returns {Promise<boolean>}
     */
    async save(agentId, threadId, messages, title = null) {
        throw new Error("Method 'save' must be implemented.");
    }

    /**
     * @param {string} agentId 
     * @param {string} threadId 
     * @returns {Promise<{messages: Array, title: string, last_updated: string}>}
     */
    async load(agentId, threadId) {
        throw new Error("Method 'load' must be implemented.");
    }

    /**
     * @param {string} agentId 
     * @returns {Promise<Array>} {id, title, last_updated} nesneleri listesi
     */
    async listThreads(agentId) {
        throw new Error("Method 'listThreads' must be implemented.");
    }

    async renameThread(agentId, threadId, newTitle) {
        throw new Error("Method 'renameThread' must be implemented.");
    }

    async archiveThread(agentId, threadId) {
        throw new Error("Method 'archiveThread' must be implemented.");
    }

    async deleteThread(agentId, threadId) {
        throw new Error("Method 'deleteThread' must be implemented.");
    }

    async searchThreads(agentId, query) {
        throw new Error("Method 'searchThreads' must be implemented.");
    }

    /**
     * @param {string} agentId 
     * @param {BaseMemoryAdapter} targetAdapter Verilerin aktarılacağı hedef adaptör örneği
     */
    async migrate(agentId, targetAdapter) {
        throw new Error("Method 'migrate' must be implemented.");
    }
}
