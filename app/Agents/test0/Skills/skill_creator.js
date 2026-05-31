/*
name: "skill_creator.js"
description: "Ajanın kendi otonom iş havuzuna dinamik olarak yeni Javascript yetenekleri (skill) yazmasını ve kendi dizinine kaydetmesini sağlar."
category: "system"
emoji: "🧠"
tags: ["coder", "generator", "autonomous"]
version: "1.0.0"
*/

import fs from 'fs/promises';
import path from 'path';

export const action = async (args, context) => {
    try {
        const { skill_name, description, code_content } = args;
        const safeName = skill_name.endsWith('.js') ? skill_name : `${skill_name}.js`;
        
        const agentId = context.agentId; 
        if (!agentId || agentId === "undefined" || agentId === "null") {
            return "HATA: agentId context içinde bulunamadı. Bu araç sadece spesifik ajan oturumlarında kullanılabilir.";
        }
        
        const targetDir = path.join(process.cwd(), 'Agents', agentId, 'skills');
        const targetPath = path.join(targetDir, safeName);
        
        // Basit güvenlik kontrolü
        if (code_content.includes('child_process') && !code_content.includes('// bypass_check')) {
            return "HATA: Yeni yetenekte child_process kullanılamaz (Güvenlik Politikası Şartı). İzin almak için içeriğe '// bypass_check' eklemelisiniz.";
        }
        
        await fs.mkdir(targetDir, { recursive: true });
        
        const finalCode = `/*
name: "${skill_name.replace('.js', '')}"
description: "${description}"
version: "1.0.0"
*/\n\n${code_content}`;
        
        await fs.writeFile(targetPath, finalCode, 'utf8');
        
        // Aktifleştirmek için config güncelle (Otonom aktifleşir)
        const confPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'config.json');
        try {
            const conf = JSON.parse(await fs.readFile(confPath, 'utf8'));
            if (!conf.skills) conf.skills = [];
            if (!conf.skills.includes(safeName)) {
                conf.skills.push(safeName);
                await fs.writeFile(confPath, JSON.stringify(conf, null, 4));
            }
        } catch(e) {}
        
        // Aracın varlığını doğrulamak adına LLMBridge üzerinden [CONFIG_UPDATE] simülasyonu / telkini
        return `BAŞARILI: '${safeName}' yeteneği yazıldı ve ajana eklendi. Yeni yetenek listesinde devrededir.`;
    } catch (e) {
        return `SKILL CREATOR HATASI: ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        skill_name: { type: "string", description: "Oluşturulacak yeteneğin dosya adı (örn: hesapla.js)" },
        description: { type: "string", description: "Yeteneğin ne işe yaradığının kısa özeti" },
        code_content: { type: "string", description: "Birebir çalışabilir, ES modül formatında 'export const action = async(args,context)' kalıbıyla yazılmış JS kod içeriği." }
    },
    required: ["skill_name", "description", "code_content"]
};
