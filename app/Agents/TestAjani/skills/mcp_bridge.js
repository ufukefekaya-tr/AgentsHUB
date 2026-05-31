/*
name: "mcp_bridge"
description: "Model Context Protocol uyumlu harici sunucularla (stdio/http) konuşup JSON yetenek setlerini içeri aktararak ajanlara standart dışı (yabancı) bir aracı kullandırır."
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
        mcp_server_url: { type: "string", description: "Hedef MCP Sunucusunun JSON-RPC uç noktası (Örn: http://localhost:8080/mcp)" },
        method: { type: "string", description: "Çağrılacak MCP metodu (örn: tools/list, resources/read)" },
        payload: { type: "object", description: "İsteğe bağlı metod argümanları (Parametreler json)" }
    },
    required: ["mcp_server_url", "method"]
};
