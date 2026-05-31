/*
name: "mcp_bridge"
description: "🌉 MCP BAĞLANTISI — İleri seviye bir yazılım teknolojisidir. Teknik bilgisi olmayan kullanıcılar BU YETENEĞİ KESİNLİKLE KURMAMALIDIR. Dikkate almayınız."
category: "system"
emoji: "🌉"
tags: ["mcp", "bridge", "protocol", "extension"]
version: "1.0.0"
*/
export const action = async (args) => {
    try {
        const { mcp_server_url, method, payload = {} } = args;
        
        // Örnek SSE / HTTP Bridge (Stilistik Model Context Protocol)
        // Gerçek implementasyonda "mcp-sdk-js" paketi gerekir. 
        // Ajanın sistem seviyesindeki JSON-RPC call'larını destekler.
        
        const response = await fetch(mcp_server_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                 jsonrpc: "2.0",
                 method: method,
                 params: payload,
                 id: Date.now()
            })
        }).catch(e => { throw e });

        if (!response.ok) {
            return `[MCP BRIDGE] HTTP Hatası: ${response.status} - Sunucu ulaşılamaz.`;
        }

        const data = await response.json();
        
        if (data.error) {
           return `[MCP SERVER HATA]: Kod ${data.error.code} | Mesaj: ${data.error.message}`;
        }
        
        return `[MCP SONUÇ (Başarılı)]:\n${JSON.stringify(data.result, null, 2)}`;
    } catch(e) {
        return `[MCP KÖPRÜ HATASI]: ${e.message} (Erişim URL'ini kontrol edin)`;
    }
};

export const schema = {
    type: "object",
    properties: {
        mcp_server_url: { type: "string", description: "Bağlanılacak Model Context Protocol (MCP) sunucu adresi" },
        method: { type: "string", description: "Çalıştırılacak MCP metodu" },
        payload: { type: "object", description: "Metoda gönderilecek JSON taşıma yükü (payload)" }
    },
    required: ["mcp_server_url", "method"]
};
