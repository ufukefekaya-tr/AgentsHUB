import fs from 'fs/promises';
import path from 'path';
import logger from '../../utils/logger.js';
import { BaseMemoryAdapter } from './base_adapter.js';

const WORKSPACE_DIR = path.resolve(process.cwd(), 'Agents');

/**
 * JSON Bellek Adaptörü (Backwards Compatibility)
 * Mevcut `ChatManager` yapısının UMI formatına sarılmış halidir.
 */
export class JSONMemoryAdapter extends BaseMemoryAdapter {

    constructor() {
        super();
        this._writeQueue = new Map(); // threadPath tabanlı Mutex kilidi
    }

    async getThreadPath(agentId, threadId) {
        return path.join(WORKSPACE_DIR, agentId, 'Chats', `${threadId}.json`);
    }

    async save(agentId, threadId, messages, title = null, folderId = null) {
        const threadPath = await this.getThreadPath(agentId, threadId);
        
        // Mutex Queue mechanism: Her threadPath için işlemleri sıraya sok
        if (!this._writeQueue.has(threadPath)) {
            this._writeQueue.set(threadPath, Promise.resolve());
        }

        const task = this._writeQueue.get(threadPath).then(async () => {
        try {
            let existingData = {};
            try {
                existingData = JSON.parse(await fs.readFile(threadPath, 'utf8'));
            } catch (e) {}

            // M-10: Görüntüleri Base64'ten fiziksel diske aktar (Dosya şişmesini önle)
            const processedMessages = await Promise.all((messages || []).map(async (msg) => {
                const clonedMsg = { ...msg };
                if (clonedMsg.images && clonedMsg.images.length > 0) {
                    const savedPaths = [];
                    for (const img of clonedMsg.images) {
                        if (img.path && !img.base64) {
                            savedPaths.push(img); // Zaten kaydedilmiş
                        } else if (img.base64) {
                            const ext = (img.mimeType || 'image/jpeg').split('/')[1] || 'jpeg';
                            const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
                            const mediaDir = path.join(WORKSPACE_DIR, agentId, 'media');
                            const imgPath = path.join(mediaDir, filename);
                            await fs.mkdir(mediaDir, { recursive: true });
                            await fs.writeFile(imgPath, Buffer.from(img.base64, 'base64'));
                            savedPaths.push({ path: filename, mimeType: img.mimeType });
                        } else if (img.path) { // Has base64 but also had path, clean it up
                             savedPaths.push({ path: img.path, mimeType: img.mimeType });
                        }
                    }
                    clonedMsg.images = savedPaths;
                }
                return clonedMsg;
            }));

            const threadData = {
                title: title || existingData.title || `Sohbet - ${new Date().toLocaleTimeString()}`,
                last_updated: new Date().toISOString(),
                folder_id: folderId !== null ? folderId : (existingData.folder_id || null),
                is_archived: existingData.is_archived || 0,
                messages: processedMessages
            };

            await fs.mkdir(path.dirname(threadPath), { recursive: true });
            // M-04: Atomik yazma — önce .tmp dosyaya yaz, sonra rename (corruption önler)
            const tmpPath = threadPath + '.tmp';
            await fs.writeFile(tmpPath, JSON.stringify(threadData, null, 2), 'utf8');
            try {
                await fs.rename(tmpPath, threadPath);
            } catch (err) {
                if (err.code === 'EPERM') {
                    await fs.copyFile(tmpPath, threadPath);
                    await fs.unlink(tmpPath).catch(() => {});
                } else {
                    throw err;
                }
            }
            logger.info(`[JSON ADAPTER] Sinyal gecmisi kaydedildi: ${agentId}/${threadId}`);
            return true;
        } catch (error) {
            logger.error(`[JSON ADAPTER HATA] Kayit basarisiz:`, error);
            return false;
        }
        });

        this._writeQueue.set(threadPath, task.catch(() => {}));
        return task;
    }

    async load(agentId, threadId) {
        const threadPath = await this.getThreadPath(agentId, threadId);
        try {
            const data = JSON.parse(await fs.readFile(threadPath, 'utf8'));
            
            // Görüntüleri diskten okuyup anlık olarak Base64 formuna çevir
            const populatedMessages = await Promise.all((data.messages || []).map(async msg => {
                if (msg.images && msg.images.length > 0) {
                    const mediaDir = path.join(WORKSPACE_DIR, agentId, 'media');
                    for (const img of msg.images) {
                        if (img.path && !img.base64) {
                            try {
                                const fileData = await fs.readFile(path.join(mediaDir, img.path));
                                img.base64 = fileData.toString('base64');
                            } catch (e) {
                                logger.warn(`[JSON ADAPTER] Kayip resim dosyasi basarisiz: ${img.path}`);
                            }
                        }
                    }
                }
                return msg;
            }));

            return {
                messages: populatedMessages,
                title: data.title || "Adsız Sohbet",
                last_updated: data.last_updated
            };
        } catch (error) {
            return { messages: [], title: "Yeni Sohbet", last_updated: null };
        }
    }

    async listThreads(agentId, includeArchived = 0) {
        const chatsDir = path.join(WORKSPACE_DIR, agentId, 'Chats');
        try {
            const files = await fs.readdir(chatsDir);
            const threadFiles = files.filter(f => f.endsWith('.json') && f !== 'folders.json');
            // M-01: Paralel okuma (Promise.all) — N+1 seri okuma yerine eşzamanlı
            const results = await Promise.all(
                threadFiles.map(async (file) => {
                    try {
                        const data = JSON.parse(await fs.readFile(path.join(chatsDir, file), 'utf8'));
                        return { file, data };
                    } catch (e) {
                        return null;
                    }
                })
            );
            const threads = [];
            for (const item of results) {
                if (!item) continue;
                const { file, data } = item;
                if (includeArchived === 1) {
                    if (!data.is_archived) continue;
                } else {
                    if (data.is_archived) continue;
                }
                threads.push({
                    id: path.basename(file, '.json'),
                    title: data.title || "Adsız Sohbet",
                    folder_id: data.folder_id || null,
                    is_archived: data.is_archived || 0,
                    last_updated: data.last_updated || "Bilinmiyor"
                });
            }
            return threads.sort((a, b) => (b.last_updated > a.last_updated ? 1 : -1));
        } catch (error) {
            return [];
        }
    }

    async renameThread(agentId, threadId, newTitle) {
        const threadPath = await this.getThreadPath(agentId, threadId);
        try {
            const data = JSON.parse(await fs.readFile(threadPath, 'utf8'));
            data.title = newTitle;
            await fs.writeFile(threadPath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            return false;
        }
    }

    async archiveThread(agentId, threadId, archiveStatus = 1) {
        const threadPath = await this.getThreadPath(agentId, threadId);
        try {
            const data = JSON.parse(await fs.readFile(threadPath, 'utf8'));
            data.is_archived = archiveStatus;
            await fs.writeFile(threadPath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            return false;
        }
    }

    async deleteThread(agentId, threadId) {
        const threadPath = await this.getThreadPath(agentId, threadId);
        try {
            await fs.unlink(threadPath);
            return true;
        } catch (error) {
            return false;
        }
    }

    async searchThreads(agentId, query) {
        const threads = await this.listThreads(agentId);
        const results = [];
        for (const t of threads) {
            const threadData = await this.load(agentId, t.id);
            const matches = threadData.messages.filter(m => m.content.toLowerCase().includes(query.toLowerCase()));
            if (matches.length > 0) {
                results.push({ id: t.id, title: threadData.title, match_count: matches.length });
            }
        }
        return results;
    }

    async _getFoldersPath(agentId) {
        return path.join(WORKSPACE_DIR, agentId, 'Chats', 'folders.json');
    }

    async _loadFolders(agentId) {
        try {
            return JSON.parse(await fs.readFile(await this._getFoldersPath(agentId), 'utf8'));
        } catch (e) {
            return [];
        }
    }

    async _saveFolders(agentId, folders) {
        const p = await this._getFoldersPath(agentId);
        await fs.mkdir(path.dirname(p), { recursive: true });
        await fs.writeFile(p, JSON.stringify(folders, null, 2), 'utf8');
    }

    async listFolders(agentId) {
        return this._loadFolders(agentId);
    }

    async createFolder(agentId, folderId, name) {
        const folders = await this._loadFolders(agentId);
        folders.push({ id: folderId, name });
        await this._saveFolders(agentId, folders);
        return true;
    }

    async renameFolder(agentId, folderId, name) {
        const folders = await this._loadFolders(agentId);
        const f = folders.find(f => f.id === folderId);
        if (f) { f.name = name; await this._saveFolders(agentId, folders); }
        return !!f;
    }

    async deleteFolder(agentId, folderId) {
        const folders = await this._loadFolders(agentId);
        await this._saveFolders(agentId, folders.filter(f => f.id !== folderId));
        return true;
    }

    async moveThreadToFolder(agentId, threadId, folderId) {
        const threadPath = await this.getThreadPath(agentId, threadId);
        try {
            const data = JSON.parse(await fs.readFile(threadPath, 'utf8'));
            data.folder_id = folderId || null;
            await fs.writeFile(threadPath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            return false;
        }
    }

    async migrate(agentId, targetAdapter) {
        logger.info(`[JSON ADAPTER] Aracili Goc (Migration) Basliyor: ${agentId}`);
        const threads = await this.listThreads(agentId);
        
        for (const t of threads) {
            const data = await this.load(agentId, t.id);
            if (data.messages && data.messages.length > 0) {
                await targetAdapter.save(agentId, t.id, data.messages, data.title);
            }
        }
        logger.info(`[JSON ADAPTER] Goc tamamlandi.`);
        return true;
    }
}
