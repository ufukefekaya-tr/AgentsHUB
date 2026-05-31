import { GoogleGenAI } from '@google/genai';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '../../utils/logger.js';
import { MindsetParser } from '../parser.js';

/**
 * L2 Bellek: Semantic Embeddings Adaptörü
 * Metinleri text-embedding-004 ile vektörlere çevirip SQLite'da saklar
 * ve kosinüs benzerliği (Cosine Similarity) ile anlamsal arama yapar.
 */
export class EmbeddingsAdapter {
    constructor({ agentId }) {
        this.agentId = agentId;
        // MUTLAK İZOLASYON: Vektör hafızası da fiziksel olarak hücre içine alınır.
        const agentWorkDir = path.join(process.cwd(), 'Agents', agentId);
        if (!fs.existsSync(agentWorkDir)) fs.mkdirSync(agentWorkDir, { recursive: true });
        
        this.dbPath = path.join(agentWorkDir, 'embeddings.sqlite');
        this.db = new Database(this.dbPath);
        this._initDB();
    }

    _initDB() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                content TEXT NOT NULL,
                vector TEXT NOT NULL,
                ts DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_embeddings_agent ON embeddings(agent_id);
        `);
    }

    async _getAiClient() {
        // MUTLAK İZOLASYON: Global .env fallback yasak. Sadece ajanın kendi anahtarı.
        const config = await MindsetParser.loadConfig(this.agentId);
        const apiKey = config?.api_key;
        if (!apiKey) throw new Error(`[SOVEREIGN ERROR] ${this.agentId} icin API Key bulunamadi. Hücre dışı anahtar kullanımı yasaktır.`);
        
        const cleanKey = apiKey ? apiKey.trim() : '';
        const initParams = { apiKey: cleanKey };
        
        // L2 Otonom Kanamayi Durdurma (Sadece Vertex projeleri ise)
        if (cleanKey.startsWith('AQ') || process.env.VERTEX_PROJECT || config.vertex_project) {
            initParams.vertexai = {
                project: config.vertex_project || process.env.VERTEX_PROJECT,
                location: config.vertex_location || process.env.VERTEX_LOCATION || "us-central1"
            };
        }
        
        return new GoogleGenAI(initParams);
    }

    /**
     * Metni vektöre çevirir.
     * Evrensel Fallback Zinciri (her ajan, her API key türü için):
     *   1. text-embedding-005  (v1 + Vertex Express AQ. anahtarları için önerilen yeni model)
     *   2. text-embedding-004  (standart AIzaSy. anahtarları için geriye uyumluluk)
     *   3. Sentetik Dummy Vektör (API kısıtlı ise — BLOCKED, NOT_FOUND, 404)
     */
    async embedText(text) {
        const ai = await this._getAiClient();
        const MODELS = ['text-embedding-005', 'text-embedding-004'];

        for (const model of MODELS) {
            try {
                const response = await ai.models.embedContent({
                    model,
                    contents: text,
                });
                return response.embeddings[0].values;
            } catch (error) {
                const errMsg = error?.message || String(error);
                const errCode = error?.status || error?.code || '';

                // Kurtarılamaz API kısıtlaması (Vertex Express AQ. anahtarı embedding desteklemiyor,
                // model bu endpoint sürümünde bulunamadı, veya erişim engellendi):
                const isFatal = errMsg.includes('BLOCKED')
                    || errMsg.includes('NOT_FOUND')
                    || errMsg.includes('not found')
                    || String(errCode).includes('404');

                if (isFatal) {
                    if (model === MODELS[MODELS.length - 1]) {
                        // Tüm modeller tüketildi → Sentetik vektör ile graceful bypass
                        logger.warn(`[L2] ${this.agentId}: Embedding API kısıtlı (${model} / ${String(errCode)}). Sentetik vektör aktif — L2 arama taraflı çalışır.`);
                        return new Array(768).fill(0.001);
                    }
                    // Bir sonraki modeli dene
                    logger.debug(`[L2] ${this.agentId}: ${model} bulunamadı, fallback deneniyor...`);
                    continue;
                }

                // Gerçekten beklenmeyen bir hata → üst katmana ilet
                logger.error(`[L2 EMBEDDINGS] ${this.agentId}: Beklenmeyen hata (${model}):`, error);
                throw error;
            }
        }

        // Bu satıra teorik olarak ulaşılmamalı
        return new Array(768).fill(0.001);
    }


    async saveContext(text) {
        try {
            const vector = await this.embedText(text);
            const insert = this.db.prepare(`INSERT INTO embeddings (agent_id, content, vector) VALUES (?, ?, ?)`);
            insert.run(this.agentId, text, JSON.stringify(vector));
            logger.info(`[L2 EMBEDDINGS] ${this.agentId} icin baglam vektorize edildi.`);
            return true;
        } catch (error) {
            logger.error(`[L2 EMBEDDINGS] Hata:`, error);
            return false;
        }
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0.0;
        let normA = 0.0;
        let normB = 0.0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async search(query, topK = 3) {
        try {
            const queryVector = await this.embedText(query);
            // Tüm vektörleri çekip Node stream/memory içinde cosine distance buluyoruz
            const rows = this.db.prepare(`SELECT content, vector FROM embeddings WHERE agent_id = ?`).all(this.agentId);
            
            const results = rows.map(row => {
                const vec = JSON.parse(row.vector);
                const score = this.cosineSimilarity(queryVector, vec);
                return { content: row.content, score };
            });

            results.sort((a, b) => b.score - a.score); // En yüksekten en düşüğe
            return results.slice(0, topK);
        } catch (error) {
            logger.error(`[L2 SEMANTIC SEARCH] Hata:`, error);
            return [];
        }
    }
}
