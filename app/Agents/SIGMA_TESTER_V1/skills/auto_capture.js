/*
name: "auto_capture"
description: "🧠 HAFIZA KAYIT — Birlikte çalıştığı insan ile olan deneyimlerini (ilgi alanları, tercihi vb.) kayıt eder. Müşteriyi tanır ve bir daha ne sevdiğini veya ne istemediğini sormaz. Hiç kurulum gerektirmez."
category: "system"
emoji: "🧠"
tags: ["memory", "umi", "context", "save"]
version: "1.0.0"
*/

import fs from 'fs/promises';
import path from 'path';

export const action = async (args, context) => {
    try {
        const { key_idea, memory_content, tags } = args;
        const agentId = context.agentId || "Global";
        
        // Bu veriyi local bir json veya RAG tabanına yazacağız. Şimdilik local file base
        const memDir = path.join(process.cwd(), 'Agents', agentId, 'umi_memory');
        await fs.mkdir(memDir, { recursive: true });
        
        const safeKey = key_idea.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        const memFile = path.join(memDir, `${safeKey}_${Date.now()}.json`);
        
        const payload = {
            id: Date.now(),
            topic: key_idea,
            content: memory_content,
            tags: tags || [],
            saved_at: new Date().toISOString()
        };
        
        await fs.writeFile(memFile, JSON.stringify(payload, null, 2), 'utf8');
        
        return `[MEMORY KULLANIMI]: (Konu: ${key_idea}) UMI Kalıcı hafıza birimine Başarıyla Kaydedildi! (ID: ${payload.id}). Gelecekte sistem bu bilgiyi size otomatik hatırlatacaktır.`;
    } catch(e) {
         return `[AUTO-CAPTURE ERROR]: ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        key_idea: { type: "string", description: "Hafızaya (UMI) eklenecek bilginin kısa başlığı (örn: 'isim')" },
        memory_content: { type: "string", description: "Hafızaya kaydedilecek bilgilerin tam metni" },
        tags: { type: "array", items: { type: "string" }, description: "tags için giriş parametresi." }
    },
    required: ["key_idea", "memory_content"]
};
