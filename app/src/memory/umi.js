import fs from 'fs/promises';
import { watch } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { JSONMemoryAdapter } from './adapters/json_adapter.js';


const WORKSPACE_DIR = path.resolve(process.cwd(), 'Agents');

/**
 * UNIVERSAL MEMORY INTERFACE (UMI) - KM-3.2 & KM-3.3
 * Sistemin bellek katmanı ile çekirdek(Core) arasındaki soyutlama katmanı.
 */
class UniversalMemoryInterface {
    constructor() {
        this.activeAdapters = new Map(); // agentId -> adapter_instance
        this.watchers = new Map();       // agentId -> fs.Watcher
    }

    /**
     * Ajanın bellek sürücüsünü factory mantığıyla oluşturur.
     */
    async _createAdapter(agentId, storageType, config) {
        const adapterConfig = { ...config, agentId }; 
        let adapter;
        switch (storageType) {
            case 'sqlite':
                try {
                    const { SQLiteMemoryAdapter } = await import('./adapters/sqlite_adapter.js');
                    adapter = new SQLiteMemoryAdapter(adapterConfig);
                } catch (err) {
                    logger.error(`[UMI] SQLite adapter yuklenemedi (better-sqlite3 eksik olabilir). JSON fallback kullaniliyor. Hata: ${err.message}`);
                    adapter = new JSONMemoryAdapter(adapterConfig);
                    storageType = 'json_fallback';
                }
                break;
            case 'json':
            default:
                adapter = new JSONMemoryAdapter(adapterConfig);
                break;
        }
        logger.info(`[UMI] ${agentId} hafizasi [${storageType.toUpperCase()}] motoru ile calisiyor.`);
        return adapter;
    }

    /**
     * Ajanın aktif bellek adaptörünü döndürür (Lazy Loading).
     */
    async _getAdapter(agentId) {
        if (this.activeAdapters.has(agentId)) {
            return this.activeAdapters.get(agentId);
        }

        const confPath = path.join(WORKSPACE_DIR, agentId, 'Mind-Set_Core', 'config.json');
        let config = {};
        try {
            config = JSON.parse(await fs.readFile(confPath, 'utf8'));
        } catch (e) {
            config = { storage_type: 'json' };
        }

        const type = config.storage_type || 'json';
        const adapter = await this._createAdapter(agentId, type, config);
        this.activeAdapters.set(agentId, adapter);

        // HOT-SWAP (Canlı Kendi Kendini Güncelleme) Altyapısı
        // DISABLED FOR AUDIT STABILITY (EPERM FIX)
        // this._setupWatcher(agentId, confPath);

        return adapter;
    }

    /**
     * Config.json değişimini izleyerek bellek motorunu uçurur.
     */
    _setupWatcher(agentId, configPath) {
        if (this.watchers.has(agentId)) return;
        
        try {
            const w = watch(configPath, async (eventType) => {
                if (eventType === 'change') {
                    logger.warn(`[UMI HOT-SWAP] ${agentId} config degisikligi algilandi. Cache bosaltiliyor...`);
                    // Cache'i sil ki bir sonraki işlemde (load/save) config baştan okunsun
                    this.activeAdapters.delete(agentId);
                }
            });
            this.watchers.set(agentId, w);
        } catch (e) {
            logger.error(`[UMI] Watcher kurulamadi: ${e.message}`);
        }
    }

    /* ==========================================================
     * UMI KÖPRÜ (PROXY) FONKSİYONLARI 
     * Tüm sistem sadece aşağıdaki metodları çağırır!
     * ========================================================== */

    async save(agentId, threadId, messages, title = null, folderId = null) {
        const adapter = await this._getAdapter(agentId);
        
        // L2 AGRESİF VEKTÖR ENJEKSİYONU: Her yeni mesajı ayrı ayrı embed et
        if (messages && messages.length > 0) {
            // Son 2 mesajı (user + model yanıtı) ayrı ayrı embed et
            const newMessages = messages.slice(-2);
            for (const msg of newMessages) {
                if (msg.content && msg.content.trim().length > 20) {
                    const embedding = `${msg.role}: ${msg.content}`;
                    this.saveToVector(agentId, embedding).catch(e => {
                        logger.debug(`[UMI] L2 embed hata: ${e.message}`);
                    });
                }
            }
        }

        return adapter.save(agentId, threadId, messages, title, folderId);
    }

    /**
     * Sliding Window & Token Giyotini Entegreli Load
     */
    async load(agentId, threadId, maxMessages = 50, maxTokens = 20000) {
        const adapter = await this._getAdapter(agentId);
        const data = await adapter.load(agentId, threadId);

        if (!data.messages) return data;

        // 1. Sliding Window (Mesaj Sayısı Giyotini) — max 50 mesaj
        if (data.messages.length > maxMessages) {
            data.messages = data.messages.slice(-maxMessages);
        }

        // 2. Token Giyotini — VARSAYILAN 20K TOKEN (sabit maliyet tavanı)
        // Sondan başa doğru topla, 20K geçince kes
        let currentTokens = 0;
        const keepMessages = [];
        for (let i = data.messages.length - 1; i >= 0; i--) {
            const msg = data.messages[i];
            const estimatedTokens = Math.ceil((msg.content || "").length / 4);
            
            if (currentTokens + estimatedTokens > maxTokens) {
                break; // 20K sınır aşıldı
            }
            
            currentTokens += estimatedTokens;
            keepMessages.unshift(msg);
        }
        data.messages = keepMessages;
        
        logger.debug(`[UMI] ${agentId} history loaded: ${keepMessages.length} msgs, ~${currentTokens} tokens (cap: ${maxTokens})`);

        // L2 OTOMATİK ENJEKSİYON KALDIRILDI
        // Ajan /memory search ile ihtiyaç duyduğunda kendisi çeker.
        // Sohbet UI'sında artık [SİSTEM UYARISI: L2...] mesajı görünmeyecek.

        return data;
    }

    /**
     * UI İçin Tam Geçmiş (Token cap OLMADAN)
     * Bu metod sadece frontend thread görüntülemesi için kullanılır.
     * LLM API'ye giden history için load() kullanılır (20K token cap uygulanır).
     */
    async getHistory(agentId, threadId) {
        const adapter = await this._getAdapter(agentId);
        const data = await adapter.load(agentId, threadId);
        // Token cap YOK — UI tüm mesajları görsün
        return data.messages || [];
    }

    async listThreads(agentId, includeArchived = 0) {
        const adapter = await this._getAdapter(agentId);
        return adapter.listThreads(agentId, includeArchived);
    }

    async listFolders(agentId) {
        const adapter = await this._getAdapter(agentId);
        return adapter.listFolders(agentId);
    }

    async createFolder(agentId, folderId, name) {
        const adapter = await this._getAdapter(agentId);
        return adapter.createFolder(agentId, folderId, name);
    }

    async renameFolder(agentId, folderId, name) {
        const adapter = await this._getAdapter(agentId);
        return adapter.renameFolder(agentId, folderId, name);
    }

    async deleteFolder(agentId, folderId) {
        const adapter = await this._getAdapter(agentId);
        return adapter.deleteFolder(agentId, folderId);
    }

    async moveThreadToFolder(agentId, threadId, folderId) {
        const adapter = await this._getAdapter(agentId);
        return adapter.moveThreadToFolder(agentId, threadId, folderId);
    }

    async renameThread(agentId, threadId, newTitle) {
        const adapter = await this._getAdapter(agentId);
        return adapter.renameThread(agentId, threadId, newTitle);
    }

    async archiveThread(agentId, threadId, status = 1) {
        const adapter = await this._getAdapter(agentId);
        return adapter.archiveThread(agentId, threadId, status);
    }

    async deleteThread(agentId, threadId) {
        const adapter = await this._getAdapter(agentId);
        return adapter.deleteThread(agentId, threadId);
    }

    async searchThreads(agentId, query) {
        const adapter = await this._getAdapter(agentId);
        return adapter.searchThreads(agentId, query);
    }

    /**
     * Ajanın tüm bellek ve izleyici kaynaklarını temizler (Agent silindiğinde çağrılır).
     */
    async purge(agentId) {
        try {
            if (this.activeAdapters.has(agentId)) {
                const adapter = this.activeAdapters.get(agentId);
                if (adapter.deleteAll) await adapter.deleteAll(agentId);
                this.activeAdapters.delete(agentId);
            }
            if (this.watchers.has(agentId)) {
                this.watchers.get(agentId).close();
                this.watchers.delete(agentId);
            }
            logger.info(`[UMI] ${agentId} hafizasi temizlendi (purge).`);
        } catch (e) {
            logger.warn(`[UMI] Purge sirasinda hata: ${e.message}`);
        }
    }

    /**
     * L2 Bellek: Semantic Search Proxy
     */
    async semanticSearch(agentId, query) {
        // İleride EmbeddingsAdapter örneği cache'lenebilir. Şimdilik arayüz stub.
        const { EmbeddingsAdapter } = await import('./adapters/embeddings_adapter.js');
        const searcher = new EmbeddingsAdapter({ agentId });
        return searcher.search(query);
    }

    /**
     * L2 Bellek: Kalıcı Anı Kaydı (Arka Planda Vectorize Edilir)
     */
    async saveToVector(agentId, text) {
        try {
            const { EmbeddingsAdapter } = await import('./adapters/embeddings_adapter.js');
            const searcher = new EmbeddingsAdapter({ agentId });
            await searcher.saveContext(text);
        } catch (e) {
            logger.debug(`[UMI] L2 Vector yazma hatasi: ${e.message}`);
        }
    }

    /**
     * L3 Bellek: Context Caching Proxy
     */
    async cacheContext(agentId, threadId, systemInstruction, messages, tools = null, ttlMinutes = 60) {
        const { CacheManager } = await import('../bridge/cache_manager.js');
        return CacheManager.createCache(agentId, systemInstruction, messages, tools, ttlMinutes);
    }

    /**
     * Self-Update: Ajanın kendi bellek tipini json/sqlite olarak güncellemesi.
     */
    async self_update(agentId, newStorageType) {
        const confPath = path.join(WORKSPACE_DIR, agentId, 'Mind-Set_Core', 'config.json');
        try {
            const config = JSON.parse(await fs.readFile(confPath, 'utf8'));
            const oldType = config.storage_type || 'json';

            if (oldType === newStorageType) return true;

            // 1. Gelişmiş Migrate (Eski DB'den Yenisine)
            const sourceAdapter = await this._getAdapter(agentId);
            const targetAdapter = await this._createAdapter(agentId, newStorageType, config);
            await sourceAdapter.migrate(agentId, targetAdapter);

            // 2. Config Güncelleme
            config.storage_type = newStorageType;
            await fs.writeFile(confPath, JSON.stringify(config, null, 4), 'utf8');

            logger.info(`[UMI EVOLUTION] ${agentId} hafizasi '${oldType}' tipinden '${newStorageType}' tipine migrate edildi!`);
            
            // HOT-SWAP FIX: Anında Ram Güncellemesi (Race Condition'ı çözer)
            this.activeAdapters.set(agentId, targetAdapter); 
            
            return true;
        } catch (error) {
            logger.error(`[UMI SELF-UPDATE HATA]`, error);
            return false;
        }
    }
}

export const UMI = new UniversalMemoryInterface();
