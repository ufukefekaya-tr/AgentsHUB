import { BaseAdapter } from './base_adapter.js';
import { GoogleGenAI } from '@google/genai';
import logger from '../../utils/logger.js';
import { MAX_OUTPUT_TOKENS } from '../../config/constants.js';

export class GeminiAdapter extends BaseAdapter {
    constructor(apiKey, config) {
        super(apiKey, config);
        
        const cleanKey = this.apiKey ? this.apiKey.trim() : '';
        const initParams = { apiKey: cleanKey };
        
        // M-05: Vertex AI Otonom Tespit
        // DİKKAT: AQ. prefix = Vertex AI Express API Key. JS SDK'sında bu anahtarlar
        // 'vertexai' konfigürüasyon objesi GEREKTİRİR ki 'generativelanguage.googleapis.com' 
        // yerine 'aiplatform.googleapis.com' endpoint'ine gitsin!
        const hasExplicitVertexProject = process.env.VERTEX_PROJECT || (this.config && this.config.vertex_project) || '';
        const isExpressKey = cleanKey.startsWith('AQ');
        
        if (hasExplicitVertexProject || isExpressKey) {
            // Eger AQ anahtari varsa ama ajan config icinde vertex_project tanimlanmamissa failsafe kullan:
            const safeProject = (this.config && this.config.vertex_project) 
                ? this.config.vertex_project 
                : (process.env.VERTEX_PROJECT || "873195891345");
                
            initParams.vertexai = {
                project: safeProject,
                location: (this.config && this.config.vertex_location) ? this.config.vertex_location : (process.env.VERTEX_LOCATION || "us-central1")
            };
        }
        
        this.ai = new GoogleGenAI(initParams);
    }

    // M-09: DRY — ortak param oluşturma mantığı tek yerde
    _buildParams(systemPrompt, chatHistory, currentMessage, threadMetadata) {
        const config = {
            temperature: this.config.temperature || 0.1,
            maxOutputTokens: this.config.max_output_tokens || MAX_OUTPUT_TOKENS || 8000
        };

        // Görüntü üretme modunu (image model) destekle
        if (this.config.model && typeof this.config.model === 'string' && this.config.model.includes('image')) {
            config.responseModalities = ['TEXT', 'IMAGE'];
        }

        // BUG #3 FIX: Gemini API'de thinking_mode + functionCalling aynı anda desteklenmez.
        // Tool listesi varsa thinking'i otomatik kapat; tool yoksa thinking'i aç.
        const hasTools = threadMetadata.tools && threadMetadata.tools.length > 0 && !threadMetadata.cachedContentName;
        if (this.config.thinking_mode === true && !hasTools) {
            config.thinkingConfig = { includeThoughts: true };
        }

        if (hasTools) {
            config.tools = threadMetadata.tools;
        }

        if (!threadMetadata.cachedContentName) {
            config.systemInstruction = systemPrompt;
        }

        const mappedHistory = chatHistory.map(msg => {
            if (msg.toolCall) return { role: 'model', parts: [{ text: `[Araç: ${msg.toolCall.name}]` }] };
            if (msg.toolResponse) return { role: 'user', parts: [{ text: `[Sonuç]: ${JSON.stringify(msg.toolResponse.response)}` }] };
            
            const parts = [];
            if (msg.images && Array.isArray(msg.images)) {
                for (const img of msg.images) {
                    if (img.base64) parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType || 'image/jpeg' } });
                }
            }
            parts.push({ text: msg.content || '' });
            return { role: msg.role === 'user' ? 'user' : 'model', parts };
        });

        const currentParts = [];
        if (typeof currentMessage === 'string') {
            currentParts.push({ text: currentMessage });
        } else if (currentMessage.toolResponse) {
            currentParts.push({ text: `[Araç Sonucu]: ${JSON.stringify(currentMessage.toolResponse?.response)}` });
        } else {
            // Multimodal mesaj objesi: { text, images: [{ base64, mimeType }] }
            if (currentMessage.images && Array.isArray(currentMessage.images)) {
                for (const img of currentMessage.images) {
                    if (img.base64) currentParts.push({ inlineData: { data: img.base64, mimeType: img.mimeType || 'image/jpeg' } });
                }
            }
            currentParts.push({ text: currentMessage.text || '' });
        }

        // Cache kullanılıyorsa, gönderilecek 'contents' sadece cache'e GİRMEMİŞ yeni mesajları içermelidir:
        // CacheLength değerini kırparak çift bağlamı engelliyoruz.
        let freshHistory = mappedHistory;
        if (threadMetadata.cachedContentName && threadMetadata.cacheLength !== undefined) {
            freshHistory = mappedHistory.slice(threadMetadata.cacheLength);
        }

        const params = {
            model: this.config.model,
            config,
            contents: [...freshHistory, { role: 'user', parts: currentParts }]
        };

        if (threadMetadata.cachedContentName) {
            params.cachedContent = threadMetadata.cachedContentName;
        }

        console.log('[GEMINI DEBUG] config.tools length:', config.tools ? config.tools.length : 0);
        if (config.tools) {
            console.log('[GEMINI DEBUG] config.tools structure keys:', config.tools.map(t => Object.keys(t)));
            // Optional: console.log(JSON.stringify(config.tools, null, 2)); // Too spammy?
        }

        return params;
    }

    async generateResponse(systemPrompt, chatHistory, currentMessage, threadMetadata = {}) {
        logger.info(`[GEMINI ADAPTER] İstek atiliyor (generateContent). Model: ${this.config.model}`);
        if (!this.config.model) throw new Error("Gemini Adapter: Model tanimi (config.model) bulunamadi.");

        try {
            const params = this._buildParams(systemPrompt, chatHistory, currentMessage, threadMetadata);
            const response = await this.ai.models.generateContent(params);

            let replyText = '';
            let reasoningText = '';
            let functionCall = null;

            // Fonksiyon çağrısı çıkarımı
            const functionCalls = response.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
                const fc = functionCalls[0];
                functionCall = { name: fc.name, args: fc.args || {} };
            }

            // Metin, düşünce ve görüntü parçalarını çıkar
            const responseImages = [];
            const parts = response.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                if (part.thought && part.text) {
                    reasoningText += part.text;
                } else if (part.inlineData) {
                    // M-10: Görüntü üretilmişse tut
                    responseImages.push({
                        base64: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'image/png'
                    });
                } else if (part.text && !part.functionCall) {
                    replyText += part.text;
                }
            }

            const promptTokens     = response.usageMetadata?.promptTokenCount         || 0;
            const completionTokens = response.usageMetadata?.candidatesTokenCount     || 0;
            const totalTokens      = response.usageMetadata?.totalTokenCount          || (promptTokens + completionTokens);
            const cachedTokens     = response.usageMetadata?.cachedContentTokenCount  || 0;

            const normalized = this._normalizeResponse(
                replyText,
                { promptTokens, completionTokens, totalTokens },
                this.config.model,
                reasoningText,
                cachedTokens
            );

            if (responseImages.length > 0) {
                normalized.images = responseImages;
            }

            if (functionCall) {
                normalized.isToolCall = true;
                normalized.toolCall = functionCall;
            }

            return normalized;
        } catch (error) {
            logger.error(`[GEMINI ADAPTER HATA] generateContent Reddedildi: ${error.message}`);
            throw error;
        }
    }

    async streamResponse(systemPrompt, chatHistory, currentMessage, threadMetadata = {}, onChunk) {
        let params = null;
        try {
            params = this._buildParams(systemPrompt, chatHistory, currentMessage, threadMetadata);
            const stream = await this.ai.models.generateContentStream(params);
            let fullText = '';
            let reasoningText = '';
            let functionCall = null;
            let responseImages = [];
            let usageMeta = { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

            for await (const chunk of stream) {
                // Araç çağrısı kontrolü
                if (chunk.functionCalls?.length > 0 && !functionCall) {
                    const fc = chunk.functionCalls[0];
                    functionCall = { name: fc.name, args: fc.args || {} };
                }
                
                // Metin, düşünce ve görüntü çıkarımı
                const parts = chunk.candidates?.[0]?.content?.parts || [];
                for (const part of parts) {
                    if (part.thought && part.text) {
                        reasoningText += part.text;
                        onChunk({ type: 'thought_chunk', text: part.text });
                    } else if (part.inlineData) {
                        responseImages.push({
                            base64: part.inlineData.data,
                            mimeType: part.inlineData.mimeType || 'image/png'
                        });
                        onChunk({ type: 'content_chunk', text: '\n[📸 Görüntü Üretildi]\n' });
                    } else if (part.text && !part.functionCall) {
                        fullText += part.text;
                        onChunk({ type: 'content_chunk', text: part.text });
                    }
                }

                if (chunk.usageMetadata) {
                    usageMeta = chunk.usageMetadata;
                }
            }

            const normalized = this._normalizeResponse(
                fullText,
                { 
                    promptTokens: usageMeta.promptTokenCount || 0, 
                    completionTokens: usageMeta.candidatesTokenCount || 0, 
                    totalTokens: usageMeta.totalTokenCount || 0 
                },
                this.config.model,
                reasoningText,
                usageMeta.cachedContentTokenCount || 0
            );

            if (responseImages.length > 0) {
                normalized.images = responseImages;
            }

            if (functionCall) {
                normalized.isToolCall = true;
                normalized.toolCall = functionCall;
            }

            return normalized;
        } catch (e) {
            logger.error(`[GEMINI ADAPTER] Stream başarısız! Model: ${this.config.model} | Hata: ${e.stack || e.message}`);
            throw e;
        }
    }
}
