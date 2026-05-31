import { UMI } from './umi.js';

/**
 * Chat Manager (Sohbet Oturumu Yöneticisi)
 * DEPRECATED: V3.0 itibariyle bu modül yerini Universal Memory Interface'e (UMI) bırakmıştır.
 * Bu dosya geriye dönük uyumluluk için UMI'ye proxy (wrapper) olarak görev yapar.
 * Gelecek güncellemelerde kaldırılacaktır. Lütfen src/memory/umi.js kullanın.
 */
export const ChatManager = {
    
    // Geriye dönük uyum (zaten adaptöre giden bir path ise boş)
    async getThreadPath(agentId, threadId) {
        return null;
    },

    async listThreads(agentId) {
        return UMI.listThreads(agentId);
    },

    async loadThread(agentId, threadId) {
        return UMI.getHistory(agentId, threadId, 20); // 20 sliding window standardı
    },

    async saveThread(agentId, threadId, chatHistory, title = null) {
        return UMI.save(agentId, threadId, chatHistory, title);
    },

    async renameThread(agentId, threadId, newTitle) {
        return UMI.renameThread(agentId, threadId, newTitle);
    },

    async archiveThread(agentId, threadId) {
        return UMI.archiveThread(agentId, threadId);
    },

    async deleteThread(agentId, threadId) {
        return UMI.deleteThread(agentId, threadId);
    },

    async searchThreads(agentId, query) {
        return UMI.searchThreads(agentId, query);
    }
};
