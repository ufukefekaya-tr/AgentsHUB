/*
name: "signal_agent"
description: "📡 AJANLAR ARASI MESAJLAŞMA — Ajanın yapamadığı spesifik bir işi, şirketteki diğer uzman ajana devretmesini sağlar. Sadece 1 ajan kullanıyorsanız faydasızdır."
category: "system"
emoji: "📡"
tags: ["multi-agent", "communication", "signal", "swarm"]
version: "1.0.0"
*/
export const action = async (args, context) => {
    try {
        const { target_agent_id, message, priority = "normal" } = args;
        const myId = context.agentId || "Global";

        if (target_agent_id === myId) {
            return `[SİNYAL HATASI]: Kendinize mesaj atamazsınız! Lütfen başka bir ajanın Workspace ID'sini (örn: CTO_Agent) hedefleyin.`;
        }

        // AgentsHUB Local API üzerinden hedef ajanın /chat route'sine webhook/POST atar
        const BASE_URL = `http://127.0.0.1:${process.env.PORT || 3434}/api`;
        
        const payload = {
            threadId: `SIGNAL_FROM_${myId}_${Date.now()}`,
            message: `[ÖNCELİK: ${priority}] (${myId} Sinyal Gönderiyor): ${message}`,
            metadata: { 
                 sourceAgent: myId,
                 signalMode: true,
                 priority 
            }
        };

        const res = await fetch(`${BASE_URL}/agents/${target_agent_id}/chat`, {
            method: 'POST',
            headers: { 
               "Content-Type": "application/json",
               "x-api-key": process.env.UI_API_KEY || "agentshub_secure_key_2026" 
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.text();
            return `[SİNYAL HATASI]: Hedef ajanla (${target_agent_id}) bağlantı kurulamadı. Hata: ${res.status} ${err}`;
        }
        
        // Asynchronous (Fire-and-forget) ise sadece başarı döneriz
        // Eğer stream ya da sync ise parse edip json dönebiliriz. Bura genelde async'dir.
        return `[SİNYAL İLETİLDİ] Hedef: ${target_agent_id}. Priority: ${priority}. İşlem devredildi. Cevap doğrudan sistemde veya size atanacak bir iş olarak gelebilir.`;
    } catch(e) {
        return `[SIGNAL AGENT ERROR]: ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        target_agent_id: { type: "string", description: "İletişim kurulacak, mesaj gönderilecek diğer ajanın ID numarası" },
        message: { type: "string", description: "Diğer ajana gönderilecek mesaj veya görev detayı" },
        priority: { type: "string", enum: ["low", "normal", "high", "critical"], description: "Gönderilen mesajın öncelik seviyesi ('low', 'normal', 'high', 'critical')" }
    },
    required: ["target_agent_id", "message"]
};
