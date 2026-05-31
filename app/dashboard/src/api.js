/**
 * OpenAGENT - Sovereign API Bridge (V7.1)
 * Air-Gap Proxy Katmanı — with error handling
 */

const BASE_URL = `${window.location.origin}/api`;

// Wrapper: throws on non-ok HTTP responses
async function apiFetch(url, options = {}) {
    options.headers = {
        ...options.headers,
        'x-api-key': localStorage.getItem('UI_API_KEY') || import.meta.env.VITE_UI_API_KEY || ''
    };
    const res = await fetch(url, options);
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`API ${res.status}: ${body || res.statusText}`);
    }
    return res.json();
}

export const UI_API = {
    // AGENTS
    fetchAgents: () => apiFetch(`${BASE_URL}/agents`),
    fetchAgentConfig: (id) => apiFetch(`${BASE_URL}/agents/${id}/config`),
    updateAgentConfig: (id, config) => apiFetch(`${BASE_URL}/agents/${id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    }),
    createAgent: (name) => apiFetch(`${BASE_URL}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    }),
    deleteAgent: (id) => apiFetch(`${BASE_URL}/agents/${id}`, { method: 'DELETE' }),

    // FOLDERS
    fetchFolders: (agentId) => apiFetch(`${BASE_URL}/agents/${agentId}/folders`),
    createFolder: (agentId, name) => apiFetch(`${BASE_URL}/agents/${agentId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    }),
    renameFolder: (agentId, folderId, name) => apiFetch(`${BASE_URL}/agents/${agentId}/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    }),
    deleteFolder: (agentId, folderId) => apiFetch(`${BASE_URL}/agents/${agentId}/folders/${folderId}`, { method: 'DELETE' }),

    // THREADS & FILES
    fetchThreads: (agentId, archived = false) => apiFetch(`${BASE_URL}/agents/${agentId}/threads?archived=${archived ? 1 : 0}`),
    uploadFile: (agentId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiFetch(`${BASE_URL}/agents/${agentId}/upload`, {
            method: 'POST',
            body: formData
        });
    },
    fetchThreadHistory: (agentId, threadId) => apiFetch(`${BASE_URL}/agents/${agentId}/threads/${threadId}`),
    renameThread: (agentId, threadId, title) => apiFetch(`${BASE_URL}/agents/${agentId}/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
    }),
    moveThread: (agentId, threadId, folderId) => apiFetch(`${BASE_URL}/agents/${agentId}/threads/${threadId}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId })
    }),
    archiveThread: (agentId, threadId) => apiFetch(`${BASE_URL}/agents/${agentId}/threads/${threadId}/archive`, { method: 'PATCH' }),
    unarchiveThread: (agentId, threadId) => apiFetch(`${BASE_URL}/agents/${agentId}/threads/${threadId}/unarchive`, { method: 'PATCH' }),
    deleteThread: (agentId, threadId) => apiFetch(`${BASE_URL}/agents/${agentId}/threads/${threadId}`, { method: 'DELETE' }),

    // MARKET
    fetchMarketSkills: () => apiFetch(`${BASE_URL}/market/skills`),

    // TELEMETRY
    fetchTelemetry: () => apiFetch(`${BASE_URL}/telemetry`),
    fetchTelemetryStats: () => apiFetch(`${BASE_URL}/telemetry/stats`),
    fetchEvaluation: (agentId) => apiFetch(`${BASE_URL}/agents/${agentId}/evaluation`),
    fetchLogs: () => apiFetch(`${BASE_URL}/system/logs`),
    fetchUserProfile: () => apiFetch(`${BASE_URL}/system/user-profile`),
    saveUserProfile: (content) => apiFetch(`${BASE_URL}/system/user-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    }),
    fetchGlobalSettings: () => apiFetch(`${BASE_URL}/system/global-settings`),
    updateGlobalSettings: (data) => apiFetch(`${BASE_URL}/system/global-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }),
    fetchSystemSecrets: () => apiFetch(`${BASE_URL}/system/secrets`),
    updateSystemSecrets: (data) => apiFetch(`${BASE_URL}/system/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }),
    installSkill: (agentId, skillName) => apiFetch(`${BASE_URL}/agents/${agentId}/skills/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName })
    }),
    approveRequest: (requestId, approved) => apiFetch(`${BASE_URL}/system/approve/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved })
    }),
    uninstallSkill: (agentId, skillName) => apiFetch(`${BASE_URL}/agents/${agentId}/skills/uninstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName })
    }),
    fetchAgentSkills: (agentId) => apiFetch(`${BASE_URL}/agents/${agentId}/skills`),

    // CHAT (SSE STREAMING) — returns a cancel() function
    shutdownSystem: () => apiFetch(`${BASE_URL}/system/shutdown`, { method: 'POST' }),
    restartSystem: () => apiFetch(`${BASE_URL}/system/restart`, { method: 'POST' }),
    streamChat: (agentId, payload, onMessage, onError, onComplete) => {
        const controller = new AbortController();
        let cancelled = false;

        (async () => {
        try {
            const response = await fetch(`${BASE_URL}/agents/${agentId}/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': localStorage.getItem('UI_API_KEY') || import.meta.env.VITE_UI_API_KEY || ''
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // keep incomplete last line

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.error) onError(data.error);
                            else onMessage(data);
                        } catch (e) {}
                    }
                }
            }
            // Flush remaining buffer
            if (buffer.startsWith('data: ')) {
                try {
                    const data = JSON.parse(buffer.slice(6));
                    if (data.error) onError(data.error);
                    else onMessage(data);
                } catch (e) {}
            }
            if (!cancelled) onComplete();
        } catch (err) {
            if (!cancelled) onError(err);
        }
        })();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }
};
