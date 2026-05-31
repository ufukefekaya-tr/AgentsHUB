/*
name: "github_manager"
description: "CTO Ajanı rolü için PR (Pull Request) okuma, issue (sorun) oluşturma ve commit analizleri yapar."
category: "developer"
emoji: "🐙"
tags: ["github", "pr", "issue", "repo"]
version: "1.0.0"
*/

export const action = async (args) => {
    try {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            return "[GITHUB ERROR]: GITHUB_TOKEN ortam değişkeni ayarlanmamış. API kısıtlamalarına tabi (Rate limit) anonim modda devam ediliyor (Bazı veri okumaları başarısız olabilir).";
        }
        
        const { operation, repo, target_id, title, body } = args;
        const headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AgentsHUB-CTO-Agent"
        };
        if (token) headers["Authorization"] = `token ${token}`;

        const BASE = `https://api.github.com/repos/${repo}`;

        if (operation === 'list_prs') {
            const res = await fetch(`${BASE}/pulls?state=open`, { headers });
            if (!res.ok) return `HTTP ${res.status}: PR'lar alınamadı.`;
            const prs = await res.json();
            return prs.length ? prs.map(p => `#${p.number}: ${p.title} (@${p.user.login})`).join('\n') : "Açık PR bulunmuyor.";
        }
        else if (operation === 'read_pr') {
             const res = await fetch(`${BASE}/pulls/${target_id}`, { headers });
             if (!res.ok) return `HTTP ${res.status}: PR detayları alınamadı.`;
             const pr = await res.json();
             return `PR #${pr.number}: ${pr.title}\nDurum: ${pr.state}\nMerge Edilebilir: ${pr.mergeable ? 'Evet' : 'Hayır'}\nAçıklama:\n${pr.body}\nEkler:\n+${pr.additions} | -${pr.deletions} satır.`;
        }
        else if (operation === 'create_issue') {
            if (!token) return "[HATA]: Anonim modda Issue (Sorun) oluşturulamaz!";
            if (!title) return "[HATA]: Issue oluşturmak için 'title' gerekli.";
            
            const payload = { title, body: body || '' };
            const res = await fetch(`${BASE}/issues`, {
                method: 'POST',
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) return `HTTP ${res.status}: Issue oluşturulamadı.`;
            const issue = await res.json();
            return `[GİTHUB BAŞARILI]: #${issue.number} numaralı issue açıldı.`;
        }
        
        return `[GITHUB MANAGER]: Tanımsız işlem: ${operation}`;
    } catch(e) {
         return `[GİTHUB MANAGER HATA]: ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        operation: { type: "string", enum: ["list_prs", "read_pr", "create_issue"], description: "Yapılacak GitHub işlemi" },
        repo: { type: "string", description: "Hedef depo 'KullanıcıAdı/RepoAdı' şeklinde (Örn: deepmind/alphafold)" },
        target_id: { type: "string", description: "PR numarası veya issue kimliği (read_pr için)" },
        title: { type: "string", description: "Yeni issue başlığı" },
        body: { type: "string", description: "Yeni issue veya yorum detayı" }
    },
    required: ["operation", "repo"]
};
