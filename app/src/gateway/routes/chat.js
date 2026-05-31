import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';
import path from 'path';
import { LLMBridge } from '../../bridge/llm_bridge.js';
import { UMI } from '../../memory/umi.js';
import { MindsetParser } from '../../memory/parser.js';
import { CyberShield } from '../../core/shield.js';
import { AgentQueue } from '../../core/async-queue.js';
import { cronManager } from '../../scheduler/cron_manager.js';
import logger from '../../utils/logger.js';

const router = express.Router({ mergeParams: true });

function translateError(rawMsg) {
    const m = String(rawMsg || '');
    if (m.includes('google_search') || m.includes('Built-in tools'))
        return '❌ Google API Kısıtlaması: Web Arama (WEB_SEARCH) yeteneği ile diğer özel yetenekler (Tools) aynı ajanda aktif olamaz. Lütfen birini pasife alıp sohbeti yenileyin.';
    if (m.includes('503') || m.includes('UNAVAILABLE') || m.includes('high demand'))
        return '⚠️ Yapay zeka modeli şu an çok yoğun. Birkaç saniye bekleyip tekrar deneyin.';
    if (m.includes('TIMEOUT_SHIELD') || m.includes('zamanlayici') || m.includes('timeout'))
        return '⏱️ Model yanıt vermedi (zaman aşımı). Çok uzun süren bir görev istendi — daha kısa adımlara bölerek tekrar deneyin.';
    if (m.includes('thought_signature') || m.includes('missing a thought_signature'))
        return '🔄 Bağlam geçmişinde araç imzası doğrulama hatası. Yeni bir konuşma başlatın veya sayfayı yenileyin.';
    if (m.includes('CachedContent') || m.includes('system_instruction'))
        return '🗄️ Önbellek model uyuşmazlığı. Bağlam otomatik yenileniyor — mesajı tekrar gönderin.';
    if (m.includes('fetch failed') || m.includes('ECONNREFUSED') || m.includes('network'))
        return '🌐 Ağ bağlantısı kesildi. Sunucu erişilebilir mi kontrol edin.';
    if (m.includes('INVALID_ARGUMENT') || m.includes('400'))
        return '❌ Geçersiz istek parametresi. Model bu bağlam yapısını işleyemedi — konuşmayı yenileyin.';
    if (m.includes('403') || m.includes('PERMISSION_DENIED'))
        return '🔐 API anahtarınızın yetkisi yok veya kotanız dolmuş olabilir. Google AI Studio\'dan kontrol edin: https://aistudio.google.com/apikey';
    if (m.includes('SKILL RUNTIME ERROR') || m.includes('Islem') && m.includes('bitmediginden'))
        return '🔧 Araç çalışma süresi aşıldı (10s). Araç çok uzun sürdü ve durduruldu.';
    if (m.includes('SKILL ERROR') || m.includes('bulunamadi'))
        return '🔧 Araç bulunamadı. Ajan bu yeteneğe sahip değil.';
    if (m.includes('rate limit') || m.includes('429'))
        return '🚦 Çok fazla istek gönderildi. Biraz bekleyin ve tekrar deneyin.';
    const short = m.replace(/\{[\s\S]{0,200}\}/g, '').replace(/\n+/g, ' ').trim().slice(0, 120);
    return `⚠️ Beklenmedik hata: ${short || 'Bilinmeyen sistem hatası.'}`;
}

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_CHAT || '60'),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla istek. Bir dakika bekleyin.' }
});

router.post('/', chatLimiter, async (req, res) => {
    const { message, images, history = [], threadId, configOverrides = {}, folderId } = req.body;
    const agentId = req.params.id;

    let processedMessage;
    if (images && Array.isArray(images) && images.length > 0) {
        // Boyut kontrolü: her görüntü max 5MB
        const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB base64
        const validImages = images.filter(img => {
            if (!img.base64 || !img.mimeType) return false;
            // if (Buffer.from(img.base64, 'base64').length > MAX_IMAGE_SIZE) return false; // (Optimized verification below)
            if (img.base64.length > (MAX_IMAGE_SIZE * 1.34)) return false; // Base64 encoding overhead limit
            if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'].includes(img.mimeType)) return false;
            return true;
        }).slice(0, 5); // Max 5 görüntü
        
        processedMessage = {
            text: message || 'Lütfen bu görüntüyü analiz et.',
            images: validImages
        };
    } else {
        processedMessage = message; 
    }

    if (!agentId || agentId === 'undefined' || agentId === 'null') {
        return res.status(400).json({ error: { message: 'Lütfen önce bir ajan seçin.' } });
    }

    let agentConfig;
    try {
        agentConfig = await MindsetParser.loadConfig(agentId);
    } catch (e) {
        return res.status(404).json({ error: { message: "Agent not found" } });
    }

    try {
        const textToSanitize = typeof processedMessage === 'object' ? processedMessage.text : (processedMessage || '');
        await CyberShield.sanitize(textToSanitize, agentId, agentConfig);
    } catch (shieldErr) {
        if (shieldErr.message && shieldErr.message.includes('SECURITY_SHIELD_BLOCK')) {
            logger.warn(`[UI SERVER] Shield blogu — 403 dönülüyor (${agentId})`);
            return res.status(403).json({ error: { message: 'İstek güvenlik kalkanı tarafından engellendi.' } });
        }
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    req.setTimeout(600000); 

    const keepAlive = setInterval(() => {
        if (!res.writableEnded) res.write(': keepalive\n\n');
    }, 20000);

    const progressCallback = (event) => {
        if (!res.writableEnded) {
            try { res.write(`data: ${JSON.stringify({ ...event, partial: true })}\n\n`); } catch(e) {}
        }
    };

    try {
        const TOKEN_CAP = 20000;
        let tokenCount = 0;
        const trimmedHistory = [];
        for (let i = history.length - 1; i >= 0; i--) {
            const msg = history[i];
            const est = Math.ceil((msg.content || '').length / 4);
            if (tokenCount + est > TOKEN_CAP) break;
            tokenCount += est;
            trimmedHistory.unshift(msg);
        }

        let enrichedMessage = processedMessage;
        try {
            const userMd = await fs.readFile(path.join(process.cwd(), 'USER.md'), 'utf8').catch(() => '');
            const nameMatch = userMd.match(/\*\*İsim:\*\*\s*([^\n]+)/);
            if (nameMatch && nameMatch[1].trim()) {
                if (typeof enrichedMessage === 'object') {
                    enrichedMessage.text = `[Konuşan kişi: ${nameMatch[1].trim()}]\n${enrichedMessage.text}`;
                } else {
                    enrichedMessage = `[Konuşan kişi: ${nameMatch[1].trim()}]\n${enrichedMessage}`;
                }
            }
        } catch (e) {}

        let hotswitchRetry = false;
        let response;
        let cleanContent = '';

        await AgentQueue.push(agentId, async () => {
            response = await LLMBridge.execute(agentId, enrichedMessage, trimmedHistory, { ...configOverrides, skipShield: true }, progressCallback);
            clearInterval(keepAlive);

            cleanContent = response.content || '';
            const configUpdateMatch = cleanContent.match(/\[CONFIG_UPDATE\]:\s*(\{[\s\S]*?\})/);
            if (configUpdateMatch) {
                try {
                    const patch = JSON.parse(configUpdateMatch[1].trim());
                    const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
                    const existing = JSON.parse(await fs.readFile(confPath, 'utf8'));
                    
                    if (patch.skills && typeof patch.skills === 'object' && !Array.isArray(patch.skills)) {
                        const newSkills = [];
                        for (const [name, enabled] of Object.entries(patch.skills)) {
                            if (enabled) {
                                const fileName = name.endsWith('.js') ? name : `${name}.js`;
                                newSkills.push(fileName);
                            }
                        }
                        patch.skills = newSkills;
                    }
                    
                    const merged = { ...existing, ...patch };
                    if (merged.api_key && merged.api_key.includes('*')) merged.api_key = existing.api_key;
                    await fs.writeFile(confPath, JSON.stringify(merged, null, 4));
                    logger.info(`[UI SERVER] [HOT-SWITCH] ${agentId} config otonom güncellendi: ${JSON.stringify(patch)}`);
                    
                    if (!res.writableEnded) {
                        res.write(`data: ${JSON.stringify({ type: 'config_updated', patch, partial: true })}\n\n`);
                    }

                    if (!hotswitchRetry && patch.skills) {
                        hotswitchRetry = true;
                        logger.info(`[UI SERVER] [HOT-SWITCH AUTO-RETRY] Skill değişimi algılandı, minimal bağlamla tekrar okutuluyor...`);
                        
                        const switchExplanation = cleanContent.replace(/\[CONFIG_UPDATE\]:\s*\{[\s\S]*?\}/, '').trim();
                        if (switchExplanation && !res.writableEnded) {
                            res.write(`data: ${JSON.stringify({ type: 'stream', content: switchExplanation + '\n\n---\n\n', partial: true })}\n\n`);
                        }
                        
                        if (!res.writableEnded) {
                            res.write(`data: ${JSON.stringify({ type: 'status', text: '🔄 Yetenekler değiştirildi, görev yeniden çalıştırılıyor...', partial: true })}\n\n`);
                        }
                        
                        const minimalHistory = trimmedHistory.slice(-4);
                        minimalHistory.push(
                            { role: 'user', content: enrichedMessage },
                            { role: 'model', content: switchExplanation || 'Yetenek değişimi tamamlandı.' }
                        );
                        
                        const retryMsg = `[SİSTEM: Yetenek değişimi tamamlandı. Önceki kullanıcı mesajını ŞİMDİ yeni yeteneklerinle yerine getir. Açıklama yapma, doğrudan işlemi yap.]\n\nKullanıcının orijinal isteği: ${message}`;
                        
                        try {
                            const retryResponse = await LLMBridge.execute(agentId, retryMsg, minimalHistory, { ...configOverrides, skipShield: true }, progressCallback);
                            cleanContent = retryResponse.content || '';
                            cleanContent = cleanContent.replace(/\[CONFIG_UPDATE\]:\s*\{[\s\S]*?\}/, '').trim();
                            if (retryResponse.metadata) response.metadata = retryResponse.metadata;
                            if (retryResponse.reasoning) response.reasoning = (response.reasoning || '') + '\n---\n' + retryResponse.reasoning;
                        } catch (retryErr) {
                            logger.error(`[HOT-SWITCH AUTO-RETRY] İkinci tur hatası: ${retryErr.message}`);
                            cleanContent = switchExplanation;
                        }
                    } else {
                        cleanContent = cleanContent.replace(/\[CONFIG_UPDATE\]:\s*\{[\s\S]*?\}/, '').trim();
                    }
                } catch (parseErr) {
                    logger.warn(`[UI SERVER] CONFIG_UPDATE parse hatası: ${parseErr.message}`);
                }
            }
        });

        const cronMatch = cleanContent.match(/\[CRON_SCHEDULE\]:\s*(\{[\s\S]*?\})/);
        if (cronMatch) {
            try {
                const cronData = JSON.parse(cronMatch[1].trim());
                const jobId = await cronManager.schedule(agentId, cronData.cron, cronData.task);
                logger.info(`[CRON] Ajan ${agentId} yeni görev kurdu: ${cronData.cron} (${jobId})`);
                if (!res.writableEnded) {
                    res.write(`data: ${JSON.stringify({ type: 'cron_scheduled', jobId, partial: true })}\n\n`);
                }
            } catch (cronErr) {
                logger.warn(`[CRON] Parse hatası: ${cronErr.message}`);
            }
            cleanContent = cleanContent.replace(/\[CRON_SCHEDULE\]:\s*\{[\s\S]*?\}/, '').trim();
        }

        const newThreadId = (threadId && threadId !== 'folders') ? threadId : `thread_${Date.now()}`;

        const data = JSON.stringify({
            content: cleanContent,
            thinking: response.reasoning || '',
            metadata: response.metadata,
            threadId: newThreadId
        });

        res.write(`data: ${data}\n\n`);
        res.end();

        const newHistory = [...history, { role: 'user', content: message }, { role: 'model', content: cleanContent }];
        await UMI.save(agentId, newThreadId, newHistory, null, folderId);

    } catch (e) {
        clearInterval(keepAlive);
        const friendly = translateError(e.stack || e.message);
        logger.error(`[UI SERVER] Chat hatasi (${agentId}): ${e.message}`);
        res.write(`data: ${JSON.stringify({ type: 'error', content: friendly, error: friendly })}\n\n`);
        res.end();
    }
});

export default router;
