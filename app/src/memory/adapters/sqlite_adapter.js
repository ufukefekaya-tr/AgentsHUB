import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../../utils/logger.js';
import { BaseMemoryAdapter } from './base_adapter.js';

/**
 * SQLite Bellek Adaptörü (KM-3.1)
 * better-sqlite3 tabanlı, atomik transaction destekli.
 */
export class SQLiteMemoryAdapter extends BaseMemoryAdapter {
    constructor(config) {
        super(config);
        
        // MUTLAK İZOLASYON: Her ajanın veritabanı kendi klasöründe fiziksel olarak ayrılır.
        const agentId = config.agentId; 
        const agentWorkDir = path.join(process.cwd(), 'Agents', agentId);
        
        if (!fs.existsSync(agentWorkDir)) {
            fs.mkdirSync(agentWorkDir, { recursive: true });
        }

        this.dbPath = path.join(agentWorkDir, 'memory.sqlite');
        this.db = new Database(this.dbPath);
        this._initDB();
    }

    _initDB() {
        // 1. Tablolar yoksa oluştur
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                ts DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS threads (
                id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                title TEXT,
                last_updated DATETIME
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                ts DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_agent_thread ON threads(agent_id, id);
            CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
            CREATE INDEX IF NOT EXISTS idx_folders_agent ON folders(agent_id);
        `);

        // 2. MİGRASYON: Mevcut threads tablosuna yeni kolonları ekle (Hata almamak için TRY/CATCH)
        try { this.db.exec(`ALTER TABLE threads ADD COLUMN folder_id TEXT;`); } catch(e) {}
        try { this.db.exec(`ALTER TABLE threads ADD COLUMN is_archived INTEGER DEFAULT 0;`); } catch(e) {}
    }

    async save(agentId, threadId, messages, title = null, folderId = null) {
        try {
            const now = new Date().toISOString();
            const threadTitle = title || `Sohbet - ${new Date().toLocaleTimeString()}`;

            // Atomik Transaction
            const transaction = this.db.transaction(() => {
                const threadInsert = this.db.prepare(
                    `INSERT INTO threads (id, agent_id, title, folder_id, last_updated) 
                     VALUES (?, ?, ?, ?, ?) 
                     ON CONFLICT(id) DO UPDATE SET last_updated=excluded.last_updated, title=excluded.title, folder_id=COALESCE(excluded.folder_id, threads.folder_id)`
                );
                threadInsert.run(threadId, agentId, threadTitle, folderId, now);

                // Mevcut mesajları sil ve yenilerini ekle (Simple override - JSON uyumlu)
                this.db.prepare(`DELETE FROM messages WHERE thread_id = ?`).run(threadId);
                
                const msgInsert = this.db.prepare(
                    `INSERT INTO messages (thread_id, role, content, ts) VALUES (?, ?, ?, ?)`
                );
                
                for (const msg of messages) {
                    msgInsert.run(threadId, msg.role, msg.content, now);
                }
            });

            transaction();
            logger.info(`[SQLITE ADAPTER] Sinyal gecmisi kaydedildi: ${agentId}/${threadId}`);
            return true;
        } catch (error) {
            logger.error(`[SQLITE ADAPTER HATA] Kayit basarisiz:`, error);
            return false;
        }
    }

    async load(agentId, threadId) {
        try {
            // Thread İzolasyonu T2: agentId ve threadId kontrolü
            const threadRow = this.db.prepare(`SELECT * FROM threads WHERE id = ? AND agent_id = ?`).get(threadId, agentId);
            if (!threadRow) {
                return { messages: [], title: "Yeni Sohbet", last_updated: null, folder_id: null, is_archived: 0 };
            }

            const rows = this.db.prepare(`SELECT role, content FROM messages WHERE thread_id = ? ORDER BY id ASC`).all(threadId);
            return {
                messages: rows.map(r => ({ role: r.role, content: r.content })),
                title: threadRow.title,
                last_updated: threadRow.last_updated,
                folder_id: threadRow.folder_id,
                is_archived: threadRow.is_archived
            };
        } catch (error) {
            return { messages: [], title: "Yeni Sohbet", last_updated: null };
        }
    }

    async listThreads(agentId, includeArchived = 0) {
        try {
            const rows = this.db.prepare(`SELECT id, title, folder_id, last_updated FROM threads WHERE agent_id = ? AND is_archived = ? ORDER BY last_updated DESC`).all(agentId, includeArchived);
            return rows;
        } catch (error) {
            return [];
        }
    }

    async listFolders(agentId) {
        try {
            return this.db.prepare(`SELECT id, name FROM folders WHERE agent_id = ? ORDER BY ts ASC`).all(agentId);
        } catch (e) {
            return [];
        }
    }

    async createFolder(agentId, folderId, name) {
        try {
            this.db.prepare(`INSERT INTO folders (id, name, agent_id) VALUES (?, ?, ?)`).run(folderId, name, agentId);
            return true;
        } catch (e) {
            return false;
        }
    }

    async moveThreadToFolder(agentId, threadId, folderId) {
        try {
            this.db.prepare(`UPDATE threads SET folder_id = ? WHERE id = ? AND agent_id = ?`).run(folderId, threadId, agentId);
            return true;
        } catch (e) {
            return false;
        }
    }

    async renameFolder(agentId, folderId, name) {
        try {
            const res = this.db.prepare(`UPDATE folders SET name = ? WHERE id = ? AND agent_id = ?`).run(name, folderId, agentId);
            return res.changes > 0;
        } catch (e) {
            return false;
        }
    }

    async deleteFolder(agentId, folderId) {
        try {
            this.db.prepare(`UPDATE threads SET folder_id = NULL WHERE folder_id = ? AND agent_id = ?`).run(folderId, agentId);
            this.db.prepare(`DELETE FROM folders WHERE id = ? AND agent_id = ?`).run(folderId, agentId);
            return true;
        } catch (e) {
            return false;
        }
    }

    async renameThread(agentId, threadId, newTitle) {
        try {
            const res = this.db.prepare(`UPDATE threads SET title = ? WHERE id = ? AND agent_id = ?`).run(newTitle, threadId, agentId);
            return res.changes > 0;
        } catch (error) {
            return false;
        }
    }

    async archiveThread(agentId, threadId, archiveStatus = 1) {
        try {
            this.db.prepare(`UPDATE threads SET is_archived = ? WHERE id = ? AND agent_id = ?`).run(archiveStatus, threadId, agentId);
            return true;
        } catch (error) {
            return false;
        }
    }

    async deleteThread(agentId, threadId) {
        try {
            // CASCADE delete sayesinde messages da uçar
            const res = this.db.prepare(`DELETE FROM threads WHERE id = ? AND agent_id = ?`).run(threadId, agentId);
            return res.changes > 0;
        } catch (error) {
            return false;
        }
    }

    async searchThreads(agentId, query) {
        const results = [];
        try {
            const threads = await this.listThreads(agentId);
            for (const t of threads) {
                const countRow = this.db.prepare(`SELECT count(*) as c FROM messages WHERE thread_id = ? AND content LIKE ?`).get(t.id, `%${query}%`);
                if (countRow && countRow.c > 0) {
                    results.push({ id: t.id, title: t.title, match_count: countRow.c });
                }
            }
            return results;
        } catch (error) {
            return [];
        }
    }

    async migrate(agentId, targetAdapter) {
        logger.info(`[SQLITE ADAPTER] Goc (Migration) Basliyor: ${agentId}`);
        const threads = await this.listThreads(agentId);
        
        for (const t of threads) {
            const data = await this.load(agentId, t.id);
            if (data.messages && data.messages.length > 0) {
                await targetAdapter.save(agentId, t.id, data.messages, data.title);
            }
        }
        logger.info(`[SQLITE ADAPTER] Goc tamamlandi.`);
        return true;
    }

    // M-15: deleteAll — agent purge sırasında UMI tarafından çağrılır
    async deleteAll(agentId) {
        try {
            this.db.prepare(`DELETE FROM messages WHERE thread_id IN (SELECT id FROM threads WHERE agent_id = ?)`).run(agentId);
            this.db.prepare(`DELETE FROM threads WHERE agent_id = ?`).run(agentId);
            this.db.prepare(`DELETE FROM folders WHERE agent_id = ?`).run(agentId);
            logger.info(`[SQLITE ADAPTER] ${agentId} tüm verileri silindi (deleteAll).`);
            return true;
        } catch (e) {
            logger.error(`[SQLITE ADAPTER] deleteAll hatası: ${e.message}`);
            return false;
        }
    }
}
