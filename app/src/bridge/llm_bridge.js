import logger from '../utils/logger.js';
import { UMI } from '../memory/umi.js';
import { MockAdapter } from './adapters/mock_adapter.js';
import { MindsetParser } from '../memory/parser.js';
import { CyberShield } from '../core/shield.js';
import { Telemetry } from '../core/telemetry_tracker.js';
import { Kaizen } from '../core/kaizen_engine.js';
import { withExponentialBackoff } from '../core/backoff.js';
import { GeminiAdapter } from './adapters/gemini_adapter.js';
import { CircuitBreaker } from '../core/circuit_breaker.js';
import { TimeoutShield } from '../core/timeout_shield.js';
import { SkillLoader } from '../skills/loader.js';
import { SchemaTranslator } from '../skills/schema_translator.js';
import { SandboxRunner } from '../skills/sandbox_runner.js';
import { ApprovalGate } from '../core/approval_gate.js';
import {
    MAX_REACT_LOOPS,
    CONTEXT_PRUNE_THRESHOLD_TOKENS,
    CONTEXT_PRUNE_KEEP_MESSAGES,
    CACHE_THRESHOLD_DEFAULT,
    CACHE_THRESHOLD_SHIELD,
    TOKEN_ESTIMATE_CHARS_PER_TOKEN,
    TOOL_OUTPUT_MAX_CHARS,
    REACT_TOKEN_BUDGET,
    REACT_TIME_LIMIT_MS,
    EXEC_APPROVAL_ENABLED,
    SKILL_PROMPT_BUDGET_CHARS,
    MAX_SKILL_COUNT
} from '../config/constants.js';

/**
 * THE TRANSLATOR & BALANCER (Omni-Model Bridge) - V3.0
 * 
 * Modüler hiyerarşiyi (DNA, RULES, SKILL vb.) sentezler, Shield'i tetikler,
 * isteği LLM'e iletir ve maliyeti Telemetry'ye işler.
 * V3.0: Inline retry kaldırıldı → backoff.js ile DRY entegrasyon.
 */
export const LLMBridge = {
    
    /**
     * Dış dünyadan (Kaizen, Shield vb.) gelen ham istekleri otonom kurallar olmadan doğrudan LLM'e iletir.
     * Bu metod Kaizen döngüsünü tetiklemez (Sonsuz döngü koruması).
     */
    async _executeRaw(agentId, systemPrompt, chatHistory = []) {
        const config = await MindsetParser.loadConfig(agentId);
        // Kaizen/Shield gibi arka plan çağrıları için ucuz model kullan — pahalı modelin kotasını yakma
        const rawModel = 'gemini-2.5-flash';
        const providerParams = this._resolveProvider(rawModel);
        const adapter = this._getAdapter(providerParams.provider, config.api_key, { ...config, model: rawModel });
        
        // Son mesajı ayıklayıp adapter'a uygun hale getir
        const userMsg = chatHistory.pop();
        return adapter.generateResponse(systemPrompt, chatHistory, userMsg.content, {});
    },

    _getAdapter(provider, apiKey, configOverrides) {
        // Fallback to global env var if agent config has no key (supports multi-agent with shared key)
        const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
        if (!effectiveKey) {
             throw new Error(`[SOVEREIGN ERROR] API key tanimlanmamis. Ajan hucresi (config.json) gecerli bir anahtar içermelidir.`);
        }
        if (provider === 'google') {
            return new GeminiAdapter(effectiveKey, configOverrides);
        } else if (provider === 'mock') {
            return new MockAdapter('fake-key', configOverrides);
        }
        throw new Error(`[BRIDGE] Desteklenmeyen saglayici: ${provider}`);
    },

    /**
     * @param {string} agentId 
     * @param {string} userMessage 
     * @param {Array} chatHistory 
     * @param {object} threadMetadata (Efficiency mode vb.)
     */
    async execute(agentId, userMessage, chatHistory = [], threadMetadata = {}, progressCallback = null) {
        logger.info(`[BRIDGE] ${agentId} ajaninin motoru tetiklendi. Thread Meta: ${JSON.stringify(threadMetadata)}`);
        const emit = (event) => { if (progressCallback) try { progressCallback(event); } catch(e) {} };
        
        // 0. Telemetri Başlat (The Observer)
        const trace = Telemetry.startTrace();
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        
        // 1. Konfigürasyon Yükleme
        const config = await MindsetParser.loadConfig(agentId);
        if (!config || !config.model) {
             throw new Error("Bridge: Agent config was empty or invalid.");
        }

        // Canlı override'lar (model/sıcaklık/thinking modu) uygula
        if (threadMetadata.model && typeof threadMetadata.model === 'string') config.model = threadMetadata.model;
        if (typeof threadMetadata.temperature === 'number') config.temperature = threadMetadata.temperature;
        if (typeof threadMetadata.thinkingEnabled === 'boolean') config.thinking_mode = threadMetadata.thinkingEnabled;
        // Efficiency mode: config.json değerini varsayılan olarak threadMetadata'ya aktar
        if (threadMetadata.efficiency_mode === undefined && typeof config.efficiency_mode === 'boolean') {
            threadMetadata.efficiency_mode = config.efficiency_mode;
        }

        // 2. Zırh (Shield) Kontrolü (skipShield=true ise ui_server.js zaten kontrol etti)
        const isMultimodal = typeof userMessage === 'object' && userMessage !== null && Array.isArray(userMessage.images);
        const rawText = isMultimodal ? (userMessage.text || '') : String(userMessage || '');
        
        const safeTextMessage = threadMetadata.skipShield === true
            ? rawText.trim().replace(/<[^>]*>?/gm, '')
            : await CyberShield.sanitize(rawText, agentId, config);
            
        const safeMessage = isMultimodal 
            ? { text: safeTextMessage, images: userMessage.images } 
            : safeTextMessage;

        // 3. DNA & Mindset Sentezi (Thread-specific Meta aktarımı)
        let systemPrompt = await MindsetParser.synthesize(agentId, threadMetadata);
        
        // 3.0 DİNAMİK SİSTEM FARKINDALIĞI (Amelelik Budaması)
        // Ajanın saati öğrenmek için gereksiz araç çağırmasını engeller ve halüsinasyonu bloke eder.
        const now = new Date();
        systemPrompt += `\n\n[DİNAMİK SİSTEM FARKINDALIĞI]\nŞu anki Aktüel Sistem Zamanı (UTC): ${now.toISOString()} | Yerel: ${now.toString()}.\nSunucu İşletim Sistemi: ${process.platform} (${process.arch}).\nMUTLAK KURAL: Sana saat, tarih, gün veya yıl sorulduğunda ASLA bir araç veya fonksiyon (tool) kullanmaya çalışma. Otonom olarak yukarıdaki anlık zamana bakarak doğrudan cevap ver.`;

        // 3.1 ÇEKİRDEK L2 HAFIZA (SUBCONSCIOUS INJECTION)
        // Kullanıcı girişini Semantic Search ile tarayıp System Prompt'a gizlice enjekte ediyoruz
        if (safeTextMessage.length > 10) {
            try {
                const memoryResults = await UMI.semanticSearch(agentId, safeTextMessage);
                if (memoryResults && memoryResults.length > 0) {
                    let memContext = "\n\n[SİSTEM BİLGİSİ - L2 BİLİNÇALTI HAFIZA]\nAşağıda kullanıcının şu anki girdisiyle anlamsal (semantic) olarak en çok eşleşen geçmiş konuşmalarınız/verileriniz listelenmiştir. Bunları hatırlayarak cevap ver:\n";
                    memoryResults.forEach(r => {
                        memContext += `\n- (Geçmiş Veri): "${r.content}"`;
                    });
                    systemPrompt += memContext;
                    logger.info(`[BRIDGE] L2 Subconscious hafıza enjekte edildi (${memoryResults.length} anı).`);
                }
            } catch (l2err) {
                logger.warn(`[BRIDGE] L2 Enjeksiyonu atlandi: ${l2err.message}`);
            }
        }
        
        // 3.4 Yetenekleri (Skills) Yükle ve Native formata çevir (Önbelleğe dahil edilebilmesi için erkene çekildi)
        const rawSkills = await SkillLoader.loadSkills(agentId);
        if (rawSkills && rawSkills.length > 0) {
            // OC-19: Hard skill count limit
            let activeSkills = rawSkills;
            if (activeSkills.length > MAX_SKILL_COUNT) {
                logger.warn(`[BRIDGE] ⚠️ Skill sayısı limiti aşıldı (${activeSkills.length}/${MAX_SKILL_COUNT}). Fazlası budanıyor.`);
                activeSkills = activeSkills.slice(0, MAX_SKILL_COUNT);
            }

            // Çalıştırılabilir (executable) JS skill'ler araca dönüştürülür
            let executables = activeSkills.filter(s => s.type !== 'document');
            if (executables.length > 0) {
                // OC-19: Skill Prompt Budget — Toplam skill açıklama metni karakter bütçesini aşarsa compact mode
                const totalDescChars = executables.reduce((sum, s) => sum + (s.description || '').length, 0);
                
                if (totalDescChars > SKILL_PROMPT_BUDGET_CHARS) {
                    logger.info(`[BRIDGE] 💰 Skill prompt bütçesi aşıldı (${totalDescChars}/${SKILL_PROMPT_BUDGET_CHARS} char). Compact mode aktif.`);
                    
                    // Önceliklendirme: _lastUsed varsa ona göre sırala (en son kullanılan ilk)
                    executables.sort((a, b) => (b._lastUsed || 0) - (a._lastUsed || 0));

                    let usedChars = 0;
                    const fullDescSkills = [];
                    const compactSkills = [];
                    
                    for (const skill of executables) {
                        const descLen = (skill.description || '').length;
                        if (usedChars + descLen <= SKILL_PROMPT_BUDGET_CHARS) {
                            usedChars += descLen;
                            fullDescSkills.push(skill);
                        } else {
                            // Compact mode: Açıklama minimum 50 karaktere kısaltılır
                            compactSkills.push({
                                ...skill,
                                description: (skill.description || '').slice(0, 50) + '...'
                            });
                        }
                    }
                    executables = [...fullDescSkills, ...compactSkills];
                }
                
                threadMetadata.tools = SchemaTranslator.toGeminiTools(executables);
            }
            
            // Bilgi odaklı (document) MD skill'ler statik olarak zihne (prompt) enjekte edilir
            const documents = activeSkills.filter(s => s.type === 'document');
            if (documents.length > 0) {
                let docPrompt = "\n\n[SİSTEM YETENEKLERİ (ÖĞRETİLMİŞ BİLGİ DİZİNİ)]\nAşağıdaki veri blokları size harici bir yetenek (SKILL.md) modülü olarak yüklenmiştir. Bu veriler/talimatlar sizin doğal yeteneğinizdir, doğrudan kullanın:\n";
                
                let docBudget = Math.floor(SKILL_PROMPT_BUDGET_CHARS * 0.3); // Document'lar bütçenin %30'unu alabilir
                for (const doc of documents) {
                    const content = doc.documentContent || '';
                    if (docBudget <= 0) {
                        logger.info(`[BRIDGE] 💰 Document skill bütçesi doldu, '${doc.name}' atlandı.`);
                        continue;
                    }
                    const truncated = content.length > docBudget ? content.slice(0, docBudget) + '\n[...KESİLDİ - Bütçe Limiti...]' : content;
                    docPrompt += `\n--- MODÜL BİLGİSİ: ${doc.name} ---\n${truncated}\n`;
                    docBudget -= content.length;
                }
                systemPrompt += docPrompt;
            }
        }

        // 3.5 OTONOM L3 CACHE TETİKLEYİCİSİ (10.000 Token Üzeri, SHIELD için 1000)
        let payloadLength = JSON.stringify(chatHistory).length + safeTextMessage.length + systemPrompt.length;
        if (isMultimodal) {
            // Her görüntü Gemini'de ~258 tokendir (yaklaşık 1032 karakter ek yük sayılır)
            payloadLength += (userMessage.images.length * 1032);
        }
        
        const estimatedTokens = Math.ceil(payloadLength / TOKEN_ESTIMATE_CHARS_PER_TOKEN);

        const cacheThreshold = (agentId === 'SHIELD_Agent') ? CACHE_THRESHOLD_SHIELD : CACHE_THRESHOLD_DEFAULT;

        if (estimatedTokens > cacheThreshold && !threadMetadata.cachedContentName) {
            logger.info(`[BRIDGE] Context degeri yüksek (${estimatedTokens} token). Otonom L3 Cache baslatiliyor...`);
            try {
                const safeHistory = chatHistory.length > 0 ? chatHistory : [{ role: 'user', content: 'INITIAL_CACHE_SYNC' }];
                const cacheId = await UMI.cacheContext(agentId, "auto", systemPrompt, safeHistory, threadMetadata.tools, 60);
                if (cacheId && cacheId !== "BYPASS_TOO_SMALL" && cacheId !== "BYPASS_MODEL_INCOMPATIBLE" && cacheId !== "BYPASS_CACHE_ERROR") {
                    threadMetadata.cachedContentName = cacheId;
                    threadMetadata.cacheLength = safeHistory.length; // Save slice point to prevent double-context
                }
            } catch (cacheErr) {
                logger.warn(`[BRIDGE] L3 Cache olusturulamadi, devam ediliyor: ${cacheErr.message}`);
            }
        }
        
        let timeoutMs = threadMetadata.circuit_breaker_timeout_ms || config.timeout_ms || 60000;

        // 4. DRY Retry: backoff.js + Circuit Breaker + Timeout Shield
        
        // --- OTONOM ReAct DÖNGÜSÜ (IP-5 KM-5.3) ---
        // (Not: Yetenekler 3.4 adımında erkene çekildi)

        let loopCount = 0;
        let currentMessageObj = safeMessage;
        let currentHistory = [...chatHistory];
        let finalResponse = null;
        const reactStartTime = Date.now();
        let reactTotalTokens = 0;

        while (loopCount < MAX_REACT_LOOPS) {
            // RE-INITIALIZE ADAPTER INSIDE LOOP SO HOT-SWAPS ACTUALLY WORK
            const providerParams = this._resolveProvider(config.model);
            const primaryAdapter = this._getAdapter(providerParams.provider, config.api_key, { ...config });

            // ═══════ TURBO REACT GÜVENLİK KONTROLLERİ ═══════
            if (reactTotalTokens > REACT_TOKEN_BUDGET) {
                logger.warn(`[BRIDGE] ⚠️ Token bütçesi aşıldı (${reactTotalTokens}/${REACT_TOKEN_BUDGET}). Döngü durduruluyor.`);
                break;
            }
            if (Date.now() - reactStartTime > REACT_TIME_LIMIT_MS) {
                logger.warn(`[BRIDGE] ⚠️ Zaman limiti aşıldı (${REACT_TIME_LIMIT_MS/1000}s). Döngü durduruluyor.`);
                break;
            }
            // ═══════ /TURBO REACT ═══════
            // Context pruning: >40k token bağlamda eski mesajları buda → kognitif döngü önlenir
            if (currentHistory.length > 10) {
                const histEst = Math.ceil(JSON.stringify(currentHistory).length / TOKEN_ESTIMATE_CHARS_PER_TOKEN);
                if (histEst > CONTEXT_PRUNE_THRESHOLD_TOKENS) {
                    const keepCount = Math.min(currentHistory.length - 1, CONTEXT_PRUNE_KEEP_MESSAGES);
                    const removedCount = currentHistory.length - keepCount;
                    currentHistory = [
                        { role: 'user', content: `[SİSTEM: Bağlam penceresi optimize edildi. ${removedCount} eski mesaj kaldırıldı. Görev devam ediyor, son durumdan sürdür.]` },
                        { role: 'model', content: 'Anlaşıldı, kaldığım yerden devam ediyorum.' },
                        ...currentHistory.slice(-keepCount)
                    ];
                    logger.warn(`[BRIDGE] Bağlam budandı: ~${histEst} token → son ${keepCount} mesaj tutuldu.`);
                    emit({ type: 'status', text: '🗜️ Bağlam penceresi optimize edildi...' });
                }
            }

            try {
                if (loopCount === 0) {
                    logger.info(`[BRIDGE] Birincil modele gonderiliyor: ${config.model}`);
                    emit({ type: 'status', text: '🤔 Düşünüyor...' });
                } else {
                    logger.info(`[BRIDGE] ReAct Döngüsü #${loopCount + 1} tetikleniyor...`);
                    emit({ type: 'react_loop', loop: loopCount + 1 });
                }

                // Fallback zinciri
                const fallback = async () => {
                    const [fallbackModel] = this._getFallbackChain(config.model);
                    logger.warn(`[BRIDGE] Circuit Breaker devreye girdi, Fallback: ${fallbackModel}`);
                    const fbAdapter = this._getAdapter('google', config.api_key, { ...config, model: fallbackModel });
                    
                    const fallbackPrompt = systemPrompt + "\n\n[SİSTEM BİLGİSİ]: Ana model yanıt vermediği için yedek modele geçildi. Tüm araçların (skills) aktif, normal şekilde çalışmaya devam et. Kullanıcıya model değişiminden bahsetme, doğal devam et.";
                    
                    return TimeoutShield.wrap(
                        () => fbAdapter.generateResponse(fallbackPrompt, currentHistory, currentMessageObj, threadMetadata),
                        timeoutMs, `FALLBACK_${fallbackModel}`
                    );
                };

                let response;
                // Use streaming adapter when progressCallback present (live thinking tokens)
                if (progressCallback && primaryAdapter.streamResponse) {
                    response = await TimeoutShield.wrap(
                        () => primaryAdapter.streamResponse(systemPrompt, currentHistory, currentMessageObj, threadMetadata, (chunk) => {
                            emit(chunk);
                        }),
                        Math.min(Math.max(timeoutMs * 2, 60000), 900000), // Stream: config x2, min 60s, max 15 mins (900000ms)
                        `GEMINI_STREAM_${config.model}`
                    );
                } else {
                response = await CircuitBreaker.call(
                    agentId,
                    () => withExponentialBackoff(
                        () => TimeoutShield.wrap(
                            () => primaryAdapter.generateResponse(systemPrompt, currentHistory, currentMessageObj, threadMetadata),
                            timeoutMs,
                            `GEMINI_${config.model}`
                        ),
                        config.retry_limit || 1,
                        1500
                    ),
                    config,
                    fallback
                );
                }

                // Maliyetleri topla (tokens_used is a plain number from _normalizeResponse)
                if (response?.metadata?.tokens_used) {
                    const t = response.metadata.tokens_used;
                    if (typeof t === 'number') {
                        totalInputTokens += t;
                    } else {
                        totalInputTokens += t.promptTokens || 0;
                        totalOutputTokens += t.completionTokens || 0;
                    }
                }

                // Tool Call Geldi mi?
                if (response.isToolCall) {
                    const toolName = response.toolCall.name;
                    const toolArgs = response.toolCall.args;

                    emit({ type: 'tool_call', name: toolName, args: toolArgs });

                    // İzole Kum Havuzunda Çalıştır (KM-5.2)
                    const targetSkill = rawSkills.find(s => s.name === toolName);
                    let toolResult;

                    if (targetSkill) {
                        try {
                            const dangerousSkills = ['byterover', 'run_command', 'write_file', 'mcporter', 'file_remover'];
                            const dangerousActions = ['execute', 'write', 'delete'];
                            const isDangerous = dangerousSkills.includes(toolName) && 
                                (!toolArgs?.action || dangerousActions.includes(toolArgs.action));
                            if (EXEC_APPROVAL_ENABLED && isDangerous) {
                                logger.info(`[EXEC APPROVAL] '${toolName}' aracı için Mimar onayı bekleniyor...`);
                                const isApproved = await ApprovalGate.requestApproval(agentId, toolName, toolArgs, emit);
                                if (!isApproved) {
                                    throw new Error("[GÜVENLİK UYARISI] İşlem Sistem Operatörü (Mimar) tarafından REDDEDİLDİ veya zaman aşımına uğradı.");
                                }
                            }

                            const enhancedContext = { 
                                ...threadMetadata,
                                apiKey: threadMetadata.api_key || config.api_key || process.env.GEMINI_API_KEY,
                                vertexProject: threadMetadata.vertex_project || config.vertex_project || process.env.VERTEX_PROJECT,
                                vertexLocation: threadMetadata.vertex_location || config.vertex_location || process.env.VERTEX_LOCATION
                            };
                            toolResult = await SandboxRunner.executeIsolated(targetSkill, toolArgs, agentId, enhancedContext);
                            
                            // FAZ 10: Telemetry Sync (Ajan 3.1 tespiti) - String dönen hataları hata olarak işaretle
                            const resultStr = String(toolResult);
                            if (resultStr.startsWith('[ERROR]') || resultStr.startsWith('[HATA]') || resultStr.startsWith('[SKILL ERROR]')) {
                                trace.addToolCall(toolName, null, resultStr);
                            } else {
                                trace.addToolCall(toolName, toolResult);
                            }
                        } catch (err) {
                            toolResult = `[RUNTIME ERROR]: ${err.message}`;
                            trace.addToolCall(toolName, null, err.message);
                        }
                    } else {
                        toolResult = `[SKILL ERROR]: Yetenek '${toolName}' ajan hucresinde (Workspace) bulunamadi. Otonomi reddedildi.`;
                        logger.warn(toolResult);
                        trace.addToolCall(toolName, null, "Not Found");
                    }
                    emit({ type: 'tool_result', name: toolName, result: String(toolResult).slice(0, TOOL_OUTPUT_MAX_CHARS) });

                    // Tarihçeye önceki mesajı ekle
                    if (currentMessageObj) {
                        if (typeof currentMessageObj === 'string') {
                            currentHistory.push({ role: 'user', content: currentMessageObj });
                        } else if (currentMessageObj.toolResponse) {
                            // Eski toolResponse nesnelerini text olarak depola
                            currentHistory.push({ role: 'user', content: `[Araç Sonucu - ${currentMessageObj.toolResponse.name}]: ${JSON.stringify(currentMessageObj.toolResponse.response || {})}` });
                        }
                    }

                    // thoughtSignature'sız sakla — adapter text formatına çevirir, API hatası olmaz
                    currentHistory.push({ role: 'model', toolCall: { name: toolName, args: toolArgs } });

                    // Sonucu text string olarak gönder (functionResponse → orphan sorunu önlenir)
                    currentMessageObj = `[ARAÇ SONUCU - ${toolName}]\nGirdi: ${JSON.stringify(toolArgs)}\nÇıktı: ${String(toolResult)}`;
                    
                    reactTotalTokens += Math.ceil((String(toolResult).length + JSON.stringify(toolArgs).length) / TOKEN_ESTIMATE_CHARS_PER_TOKEN);
                    loopCount++;
                    continue; // ReAct döngüsünü başa sar ve LLM'ye sonucu ilet
                }

                // [SYSTEM_COMMAND] tespiti: Ajan bir sistem komutu tetikledi → sonucu geri besle
                if (response.content) {
                    const cmdMatch = response.content.match(/\[SYSTEM_COMMAND\]\s*(.+?)(?:\n|$)/);
                    if (cmdMatch && loopCount < MAX_REACT_LOOPS - 1) {
                        const rawCmd = cmdMatch[1].trim();
                        logger.info(`[BRIDGE] [SYSTEM_COMMAND] tespit edildi: ${rawCmd}`);
                        const cmdResult = await this._executeBridgeCmd(rawCmd, agentId);
                        emit({ type: 'status', text: `⚙️ Komut: ${rawCmd}` });
                        currentHistory.push({ role: 'model', content: response.content });
                        currentMessageObj = `[SYSTEM_COMMAND_RESULT]\nKomut: ${rawCmd}\nSonuç:\n${cmdResult}`;
                        loopCount++;
                        continue;
                    }
                }

                // Düz metin cevap geldiyse döngüyü kır
                finalResponse = response;
                break;

            } catch (error) {
                logger.error(`[BRIDGE FALLBACK] Birincil Model (${config.model}) coktu: ${error.message}`);
                
                const fallbackChain = this._getFallbackChain(config.model);
                let lastError = error;
                let switched = false;

                // FAZ 10 - Model-Agnostik Katman ve 10K Token Acil Sıkıştırma (Semantic Compression)
                for (const fallbackModelName of fallbackChain) {
                    if (fallbackModelName === config.model) continue;
                    
                    logger.warn(`[BRIDGE FALLBACK] Otonom Kriz Modu: Model Hot-Swap gerceklesiyor -> ${fallbackModelName}`);
                    
                    // 10K Acil Durum Sıkıştırması (Brute-Force Token Yamyamlığı Önlemi)
                    if (currentHistory.length > 5) {
                        const histEst = Math.ceil(JSON.stringify(currentHistory).length / 4);
                        if (histEst > 10000) {
                            currentHistory = [
                                { role: 'user', content: `[SİSTEM KRİTİK: Ağır API Hatası (${error.message}). Ana model çöktü. Yedek modele geçildiği için geçmiş konuşma tarihi çok sınırlı olan (10.000) token güvenli limitine sıkıştırıldı. Sadece son iletişimleri göreceksin.]` },
                                { role: 'model', content: 'Anlaşıldı, yedek kapasite ile araçları kullanmaya devam ediyorum.' },
                                ...currentHistory.slice(-5)
                            ];
                            logger.warn(`[BRIDGE FALLBACK] Tarihce 10K tokene basariyla sikistirildi.`);
                        }
                    }

                    // Konfigürasyonu kalıcı olarak değiştir ve döngüyü başa sarıp kaldığı yerden "yeni modelle" otonom çalışmasını sağla
                    config.model = fallbackModelName;
                    switched = true;
                    break;
                }
                
                if (switched) {
                    emit({ type: 'status', text: `🔄 Yedek Sisteme Geçildi: ${config.model}` });
                    continue; 
                }
                
                throw lastError; // Yedek kalmadıysa hatayı dışarı fırlat
            }
        } // while sonu

        if (!finalResponse) {
            logger.warn(`[BRIDGE] ReAct döngüsü limiti aşıldı (${MAX_REACT_LOOPS}).`);
            finalResponse = {
                content: `⚠️ **İşlem Döngüsü Sınırına Ulaşıldı**\n\n${MAX_REACT_LOOPS} araç çağrısı döngüsü tamamlandı, işlem otomatik sonlandırıldı. Bu genellikle çok karmaşık görevlerde veya araç zinciri döngüsünde yaşanır.\n\nDevam etmemi ister misiniz? Varsa farklı bir yaklaşım önerebilirim.`,
                reasoning: '',
                metadata: { tokens_used: totalInputTokens, model_used: config.model }
            };
        }

        // Boş içerik güvencesi: model yalnızca düşünce ürettiyse kullanıcıya bilgi ver
        if (!finalResponse.content || !finalResponse.content.trim()) {
            finalResponse.content = finalResponse.reasoning
                ? '_(Düşünce süreci tamamlandı ancak metin yanıtı üretilmedi. Düşünme adımlarını yukarıdan görebilirsiniz. Devam etmemi ister misiniz?)_'
                : '_(Yanıt üretilmedi. Lütfen tekrar deneyin veya daha basit bir soru sorun.)_';
        }
        
        // 5. Telemetriyi Tamamla ve Kaizen'i Tetikle (Asenkron)
        const metrics = {
            ...trace.end(),
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            model: config.model
        };

        // Telemetriyi kaydet
        Telemetry.recordInteraction(agentId, metrics).then(record => {
            // Kaizen Vicdan Motorunu Tetikle (Fire and Forget)
            Kaizen.runReflection(agentId, [...chatHistory, { role: 'user', content: userMessage }, { role: 'model', content: finalResponse.content }], record);
        });
        
        return finalResponse;
    },

    /**
     * Bridge bağlamında çalışan sistem komutu yürütücüsü.
     * CLI state'i yoktur — sadece context-free komutları destekler.
     */
    async _executeBridgeCmd(rawCmd, agentId) {
        const parts = rawCmd.trim().split(/\s+/);
        const cmd = parts[0];
        try {
            if (cmd === '/cost') {
                const summary = Telemetry.getSummary();
                return `Maliyet Raporu:\n- Toplam Token: ${summary.total_tokens || 0}\n- Toplam İstek: ${summary.total_requests || 0}\n- Son Ort. Gecikme: ${summary.avg_latency_ms || 0}ms`;
            }
            if (cmd === '/memory' && parts[1] === 'search') {
                const query = parts.slice(2).join(' ');
                if (!query) return '[HATA] Arama sorgusu belirtilmedi.';
                const results = await UMI.semanticSearch(agentId, query);
                if (!results?.length) return 'Sonuç bulunamadı.';
                return results.slice(0, 5).map(r => `[${(r.score * 100).toFixed(0)}%] ${r.content?.slice(0, 200)}`).join('\n');
            }
            if (cmd === '/chat' && parts[1] === 'rename') {
                const newTitle = parts.slice(2).join(' ');
                return `[UI-BILGI] Thread yeniden adlandırma UI panelinden yapılabilir. Önerilen başlık: "${newTitle}"`;
            }
            if (cmd === '/memory' && parts[1] === 'cache') {
                // L3: Context Caching — mevcut sohbeti Google Cache'e at
                const { MindsetParser } = await import('../memory/parser.js');
                const systemPrompt = await MindsetParser.synthesize(agentId, {});
                const threadData = await UMI.load(agentId, parts[2] || 'current');
                const messages = threadData?.messages || [];
                const result = await UMI.cacheContext(agentId, 'current', systemPrompt, messages, null, 60);
                if (!result || result.startsWith('BYPASS')) return `[L3 CACHE] Bypass: ${result}`;
                return `[L3 CACHE] Başarılı! Cached Content: ${result}`;
            }
            if (cmd === '/skills' && parts[1] === 'switch') {
                // Hot-switch: /skills switch google_search.js,byterover.js
                const skillList = parts.slice(2).join('').split(',').map(s => s.trim()).filter(Boolean);
                const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
                const existing = JSON.parse(await fs.readFile(confPath, 'utf8'));
                existing.skills = skillList;
                await fs.writeFile(confPath, JSON.stringify(existing, null, 4));
                return `[SKILLS HOT-SWITCH] Aktif yetenekler güncellendi: ${skillList.join(', ')}`;
            }
            return `[Komut bu bağlamda desteklenmiyor: ${cmd}. Desteklenenler: /cost, /memory search <sorgu>, /memory cache, /skills switch <skill1>,<skill2>]`;
        } catch (e) {
            return `[Komut Hatası]: ${e.message}`;
        }
    },

    _getFallbackChain(currentModel) {
        if (currentModel.includes('3.1-pro')) return ['gemini-3-flash-preview', 'gemini-2.5-flash'];
        if (currentModel.includes('3-pro') || currentModel.includes('3-flash')) return ['gemini-2.5-flash'];
        if (currentModel.includes('2.5-pro')) return ['gemini-2.5-flash'];
        if (currentModel.includes('2.5-flash')) return ['gemini-2.5-pro'];
        return ['gemini-2.5-flash'];
    },

    _resolveProvider(modelName) {
        const m = String(modelName || '').toLowerCase();
        if (m.includes('gemini')) return { provider: 'google' };
        if (m.includes('mock')) return { provider: 'mock' };
        return { provider: 'google' };
    }
};
