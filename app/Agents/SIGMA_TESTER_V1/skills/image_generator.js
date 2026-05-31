/**
 * IMAGE_GENERATOR Skill — Imagen 4 ile profesyonel görüntü üretme
 * Vertex AI üzerinden çalışır.
 */
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';

export const skill = {
    name: "image_generator",
    version: "1.0.0",
    category: "media",
    tags: ["görüntü", "resim", "logo", "tasarım", "illustrasyon", "fotoğraf"],
    emoji: "🎨",
    requires: { network: true },
    description: "Imagen 4 modeli ile profesyonel kalitede görüntü üretir. Logo tasarımı, illüstrasyon, fotorealistik görüntü, konsept sanat ve daha fazlası. Üretilen görüntüyü diske kaydeder ve yolunu döndürür. KESİN KURAL: Aracı kullandıktan sonra dönen TAM DOSYA YOLUNU kullanıcıya yazdığın mesaja MUTLAKA ekle. Aksi takdirde kullanıcı görseli bulamaz.",
    parameters: {
        type: "object",
        properties: {
            prompt: {
                type: "string",
                description: "Üretilecek görüntünün detaylı İngilizce açıklaması (Image prompt)"
            }
        },
        required: ["prompt"]
    },
    execute: async (args, context) => {
        try {
            if (!args.prompt) return "[HATA] Prompt belirtilmedi.";
            
            // API key'i context'ten veya env'den al
            const apiKey = context?.apiKey || process.env.GEMINI_API_KEY || '';
            if (!apiKey) return "[HATA] API key bulunamadı.";
            
            const initParams = { apiKey: apiKey.trim() };
            
            // Vertex AI kontrolü (Eğer apiKey AQ ile başlıyorsa Vertex AI kullan)
            let isVertex = false;
            const vertexProject = context?.vertexProject || process.env.VERTEX_PROJECT;
            const vertexLocation = context?.vertexLocation || process.env.VERTEX_LOCATION || 'us-central1';
            
            if (apiKey.startsWith('AQ') || vertexProject) {
                isVertex = true;
                initParams.vertexai = {
                    project: vertexProject,
                    location: vertexLocation
                };
            }
            
            const ai = new GoogleGenAI(initParams);
            
            // Aspect ratio ve Kalite artık UI'dan (context'ten) alınıyor. LLM'in sormasına gerek yok.
            const quality = context?.imageQuality || 'fast';
            const aspectRatio = context?.aspectRatio || '1:1';
            
            let model = '';
            if (isVertex) {
                // Vertex AI için Imagen 4 serisi
                const qualityMap = {
                    'fast': 'imagen-4.0-fast-generate-001',
                    'standard': 'imagen-4.0-generate-001',
                    'ultra': 'imagen-4.0-ultra-generate-001'
                };
                model = qualityMap[quality] || qualityMap.fast;
            } else {
                // Standart AI Studio için Imagen 3 serisi
                const qualityMap = {
                    'fast': 'imagen-3.0-fast-generate-001',
                    'standard': 'imagen-3.0-generate-001',
                    'ultra': 'imagen-3.0-generate-002'
                };
                model = qualityMap[quality] || qualityMap.standard;
            }
            
            const result = await ai.models.generateImages({
                model,
                prompt: args.prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: aspectRatio
                }
            });
            
            if (!result.generatedImages || result.generatedImages.length === 0) {
                return "[HATA] Görüntü üretilemedi. Güvenlik filtresine takılmış olabilir.";
            }
            
            const imageData = result.generatedImages[0].image;
            const filename = (args.filename || 'generated_image').replace(/[^a-zA-Z0-9_-]/g, '_');
            const ext = imageData.mimeType === 'image/png' ? 'png' : 'jpeg'; // Default to jpeg as flash preview outputs jpg too usually
            
            // Agent's dedicated media folder instead of global output
            const WORKSPACE_DIR = path.resolve(process.cwd(), 'Agents');
            const agentId = context?.agentId || 'UNKNOWN_AGENT';
            const mediaDir = path.join(WORKSPACE_DIR, agentId, 'media');
            
            await fs.mkdir(mediaDir, { recursive: true });
            const outputPath = path.join(mediaDir, `${filename}.${ext}`);
            await fs.writeFile(outputPath, Buffer.from(imageData.imageBytes, 'base64'));
            
            return `✅ Görüntü başarıyla üretildi ve diske kaydedildi.
📁 TAM DOSYA YOLU: ${outputPath}
📐 Oran: ${aspectRatio}
🎯 Zeka Modeli: ${model}

MUTLAK TALİMAT: Kullanıcıya vereceğin yanıtta yukarıdaki 'TAM DOSYA YOLU'nu (\`${outputPath}\`) kesinlikle olduğu gibi yaz ve kullanıcıya bildir. Aksi takdirde kullanıcı görseli nerede bulacağını bilemez!`;
        } catch (error) {
            return `[HATA] Görüntü üretme başarısız: ${error.message}`;
        }
    }
};
