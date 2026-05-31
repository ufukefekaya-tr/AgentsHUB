/*
name: "python_runner"
description: "Sistemde yerel olarak Python kod blokları çalıştırır, test eder ve console çıktılarını/hataları geri döndürür."
category: "system"
emoji: "🐍"
tags: ["python", "code", "runner"]
version: "1.0.0"
*/
import fs from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';

export const action = async (args, context) => {
    const { src_code, custom_filename } = args;
    const agentId = context.agentId || "Global";
    const workDir = path.join(process.cwd(), 'Agents', agentId, 'sandbox_temp');

    try {
        await fs.mkdir(workDir, { recursive: true });
        const fileName = custom_filename && custom_filename.endsWith('.py') 
            ? custom_filename 
            : `script_${Date.now()}.py`;
        
        const pyPath = path.join(workDir, fileName);
        
        // Kodu dosyaya yaz
        await fs.writeFile(pyPath, src_code, 'utf8');

        // Çalıştır (Güvenlik Kalkanı nedeniyle genelde timeout gerekir)
        return new Promise((resolve) => {
            const child = exec(`python "${pyPath}"`, { cwd: workDir, timeout: 15000 }, async (error, stdout, stderr) => {
                let out = `======== PYTHON OUTPUT ========\n`;
                if (stdout) out += stdout + "\n";
                if (stderr) out += `[STDERR]:\n` + stderr + "\n";
                if (error) {
                    if (error.killed) out += `\n[SİSTEM]: İşlem 15 saniye sürdüğü için (Zaman Aşımı) sonlandırıldı.\n`;
                    else {
                        const errMsg = error.message || '';
                        if (errMsg.includes('not recognized') || errMsg.includes('bulunamadı') || errMsg.includes('ENOENT')) {
                            out += `[SİSTEM HATASI]: Sistemde (Sunucuda) Python derleyicisi (python.exe) kurulu değil veya PATH'e eklenmemiş. Lütfen kullanıcıya 'Python arka planda kurulu olmadığı için bu kodu koşturamıyorum' şeklinde bilgi ver. \n`;
                        } else {
                            out += `[HATA KODU ${error.code}]:\n` + error.message;
                        }
                    }
                }
                out += `===============================\n`;
                
                // Temizlik yap (isteğe bağlı, şimdilik dursun diye commentliyorum)
                // await fs.unlink(pyPath).catch(()=>console.log("temp file could not be deleted"));
                
                resolve(out);
            });
        });

    } catch(e) {
        return `[Python Error] Çalıştırılamadı: ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        src_code: { type: "string", description: "Çalıştırılacak Python kodu (Blok halinde)." },
        custom_filename: { type: "string", description: "İsteğe bağlı python dosyası adı." }
    },
    required: ["src_code"]
};
