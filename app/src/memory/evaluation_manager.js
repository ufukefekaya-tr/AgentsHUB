import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

/**
 * AgentsHUB - Evaluation Manager (The Ledger) - IP-6
 * 
 * Kaizen Engine'den gelen öz-eleştiri kurallarını ajanın kendi hücresel 
 * EVALUATION.md dosyasına ekleyen ve dosya şiştiğinde otonom özetleme (Pruning) 
 * yapan yöneticidir.
 */
class EvaluationManager {
    constructor() {
        this.MAX_RULES = 50; 
    }

    /**
     * Yeni teşhisi ajanın günlüğüne kaydeder.
     */
    async logEvaluation(agentId, diagnosisObj) {
        if (!agentId) return;
        
        const evaluationPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'EVALUATION.md');
        
        let existingContent = "";
        try {
            existingContent = await fs.readFile(evaluationPath, 'utf8');
        } catch(e) {
            // Dosya yoksa oluştur
            existingContent = "# KAIZEN VE GELİŞİM GÜNLÜĞÜ\nSürekli öğrenim ve otonom hata düzeltme kayıtları.\n\n";
        }

        // Yeni kuralı formatla
        const timestamp = new Date().toISOString();
        const ruleEntry = `\n- [${timestamp}] KAIZEN DIAGNOSIS:\n  Kök Neden: ${diagnosisObj.rootCause}\n  Alınan Ders: ${diagnosisObj.rule}\n  Skor: ${diagnosisObj.score}/100\n`;
        
        let newContent = existingContent.trim() + '\n' + ruleEntry;

        try {
            await fs.writeFile(evaluationPath, newContent, 'utf8');
            logger.info(`[KAIZEN] Ajan ${agentId} hucresel defterine yeni bir evrim yasasi yazdi.`);
            
            // Otonom Pruning: Kural sayısı limiti aşarsa eski kuralları özetle
            const ruleCount = (newContent.match(/\[(.*?)\] KAIZEN DIAGNOSIS:/g) || []).length;
            if (ruleCount > this.MAX_RULES) {
                logger.warn(`[KAIZEN] ${agentId} kural limiti asildi (${ruleCount}/${this.MAX_RULES}). Otonom pruning baslatiliyor...`);
                newContent = await this._pruneEvaluations(newContent, evaluationPath);
            }

        } catch(e) {
            logger.error(`[KAIZEN] Evaluation dosyası yazılamadı: ${e.message}`);
        }
    }
    /**
     * Eski kaizen girişlerini budayarak dosya boyutunu kontrol altında tutar.
     * En eski (MAX_RULES - 10) girişi siler, başlığı + son 10 girişi korur.
     */
    async _pruneEvaluations(content, filePath) {
        try {
            const lines = content.split('\n');
            // Find all entry start indices
            const entryIndices = [];
            for (let i = 0; i < lines.length; i++) {
                if (/\[.*?\] KAIZEN DIAGNOSIS:/.test(lines[i])) entryIndices.push(i);
            }

            if (entryIndices.length <= 10) return content; // Nothing to prune

            // Keep: header (everything before first entry) + last 10 entries
            const keepFrom = entryIndices[entryIndices.length - 10];
            const header = lines.slice(0, entryIndices[0]).join('\n');
            const kept = lines.slice(keepFrom).join('\n');
            const pruneCount = entryIndices.length - 10;
            const pruneNote = `\n- [${new Date().toISOString()}] [PRUNING] ${pruneCount} eski kayit budandi. Sadece son 10 kayit korundu.\n`;

            const pruned = header + pruneNote + kept;
            await fs.writeFile(filePath, pruned, 'utf8');
            logger.info(`[KAIZEN PRUNING] ${pruneCount} eski kural silindi. Dosya temizlendi.`);
            return pruned;
        } catch (e) {
            logger.error(`[KAIZEN PRUNING] Budama basarisiz: ${e.message}`);
            return content;
        }
    }
}

export const Ledger = new EvaluationManager();
