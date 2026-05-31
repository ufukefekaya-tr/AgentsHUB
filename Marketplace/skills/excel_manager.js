import fs from 'fs/promises';
import path from 'path';

/**
 * EXCEL MANAGER: Sovereign System & File Utility
 * Ajanın bilgisayardaki yapısal tablo (Excel, CSV) verileri üzerinde operasyon yapmasını (okuma/yazma) sağlar.
 */
export const skill = {
    name: "excel_manager",
    version: "1.0.0",
    category: "data",
    tags: ["excel", "xlsx", "csv", "tablo", "analiz"],
    emoji: "📊",
    requires: { "xlsx": "latest" },
    description: "📊 EXCEL YÖNETİCİSİ — .xlsx, .xls ve .csv dosyalarını okuyun, analiz edin veya yeni tablolar oluşturun. Dev dosyaları limitlerle çekmek için mükemmeldir.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["info", "read", "write", "append"],
                description: "Yapılacak işlem. 'info': Sekmeleri ve kolonları listeler. 'read': Sekmeyi JSON olarak çeker. 'write': Tümüyle sıfırdan bir dosya oluşturup veri basar. 'append': Var olan bir sekmeye alttan satırlar (veri dizisi) ekler."
            },
            filename: {
                type: "string",
                description: "İşlem yapılacak dosya adı veya yolu (örn: 'raporlar/satislar.xlsx')"
            },
            sheetName: {
                type: "string",
                description: "read, write ve append için işlem yapılacak spesifik sekme adı. Boş bırakılırsa dosyanın ilk sekmesi kullanılır."
            },
            limit: {
                type: "number",
                description: "SADECE 'read' aksiyonunda: En fazla kaç satır okunacağı. Varsayılan 500'dür. Sınırsız okumak için -1 gönderin."
            },
            content: {
                type: "string",
                description: "SADECE 'write' ve 'append' aksiyonlarında: Dosyaya yazılacak VEYA eklenecek veri JSON formatında ARRAY string'i olarak gönderilmelidir (örn: '[{\"Müşteri\":\"Ahmet\",\"Tutar\":100}]'). Sadece key-value yapısı kabul edilir."
            }
        },
        required: ["action", "filename"]
    },
    execute: async (args, context) => {
        try {
            if (!args.filename) return "[HATA] filename zorunludur.";
            const action = args.action;
            const agentId = context && context.agentId ? context.agentId : (typeof arguments[1] === 'string' ? arguments[1] : 'Global');
            let targetName = args.filename;
            if (targetName.startsWith('Workspace/') || targetName.startsWith('Workspace\\')) {
                targetName = targetName.substring(10);
            }
            const resolvedPath = path.resolve(process.cwd(), 'Agents', agentId, 'Workspace', targetName);
            
            let XLSX;
            try {
                // Node resolve bypass: Yüklü olduğu process.cwd()/node_modules/xlsx üzerinden zorla yükle
                const xlsxPath = path.resolve(process.cwd(), 'node_modules', 'xlsx', 'xlsx.mjs');
                XLSX = await import('file:///' + xlsxPath.replace(/\\/g, '/'));
            } catch (e) {
                return "[HATA] 'xlsx' kütüphanesi eksik. Lütfen 'npm install xlsx' çalıştırın.";
            }
            
            // PATH GUARD KORUMASI
            try {
                const sPath = path.join(process.cwd(), 'global_settings.json');
                const conf = JSON.parse(await fs.readFile(sPath, 'utf8'));
                if (conf.path_guard_enabled !== false) {
                    const pgPath = path.resolve(process.cwd(), 'src/security/path-guard.js');
                    const { validateAgentPath } = await import('file:///' + pgPath.replace(/\\/g, '/'));
                    const pAction = ['write', 'append'].includes(action) ? 'write' : 'read';
                    const result = validateAgentPath(agentId, resolvedPath, pAction);
                    if(!result.allowed) return `[GÜVENLİK HATASI] ${result.reason}`;
                }
            } catch(e) {}

            if (action === 'info') {
                let buffer;
                try { buffer = await fs.readFile(resolvedPath); } catch { return `[HATA] Dosya bulunamadı: ${args.filename}`; }
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const info = {};
                for (const targetSheet of workbook.SheetNames) {
                    const ws = workbook.Sheets[targetSheet];
                    const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    info[targetSheet] = {
                        rowCount: json.length,
                        columns: json[0] || []
                    };
                }
                return `[BİLGİ] Dosya Sekmeleri ve Kolon Yapıları:\n${JSON.stringify(info, null, 2)}`;
            }

            if (action === 'read') {
                let buffer;
                try { buffer = await fs.readFile(resolvedPath); } catch { return `[HATA] Dosya okunurken bulunamadı: ${args.filename}`; }
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const targetSheet = args.sheetName || workbook.SheetNames[0];
                if (!workbook.Sheets[targetSheet]) return `[HATA] Belirtilen sekme bulunamadı: ${targetSheet}`;
                
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheet]);
                const limit = args.limit !== undefined ? args.limit : 500;
                
                let outData = json;
                if (limit !== -1 && json.length > limit) {
                    outData = json.slice(0, limit);
                }
                return `[BAŞARILI] '${targetSheet}' sekmesinden ${outData.length} satır okundu (Toplam satır sayısı: ${json.length}). Limit: ${limit}. Json dizisi olarak veri:\n\n${JSON.stringify(outData)}`;
            }

            if (action === 'write') {
                if (!args.content) return "[HATA] 'content' parametresi zorunludur.";
                let jsonData;
                try { jsonData = JSON.parse(args.content); } catch { return "[HATA] 'content' geçerli bir JSON array formatında string olmalıdır."; }
                if (!Array.isArray(jsonData)) jsonData = [jsonData];
                
                const workbook = XLSX.utils.book_new();
                const targetSheet = args.sheetName || 'Sheet1';
                const worksheet = XLSX.utils.json_to_sheet(jsonData);
                XLSX.utils.book_append_sheet(workbook, worksheet, targetSheet);
                
                await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
                const outBuf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
                await fs.writeFile(resolvedPath, outBuf);
                return `[BAŞARILI] Dosya baştan SIFIRDAN OLUŞTURULDU. İçinden tablo silinip sadece belirtilen veriler '${targetSheet}' sekmesine yazıldı. (${jsonData.length} satır eklendi).`;
            }

            if (action === 'append') {
                if (!args.content) return "[HATA] 'content' parametresi zorunludur.";
                let jsonData;
                try { jsonData = JSON.parse(args.content); } catch { return "[HATA] 'content' geçerli bir JSON array stringi olmalıdır."; }
                if (!Array.isArray(jsonData)) jsonData = [jsonData];
                
                let buffer;
                try { buffer = await fs.readFile(resolvedPath); } catch { return "[HATA] Dosya bulunamadı. Lütfen önce yazmak için (sıfır dosya) action: 'write' kullanın."; }
                
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const targetSheet = args.sheetName || workbook.SheetNames[0];
                
                let worksheet = workbook.Sheets[targetSheet];
                if (!worksheet) {
                    worksheet = XLSX.utils.json_to_sheet(jsonData);
                    XLSX.utils.book_append_sheet(workbook, worksheet, targetSheet);
                } else {
                    XLSX.utils.sheet_add_json(worksheet, jsonData, { skipHeader: true, origin: -1 });
                }
                
                const outBuf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
                await fs.writeFile(resolvedPath, outBuf);
                return `[BAŞARILI] Veriler eski tablo bozulmadan '${targetSheet}' sekmesinin en alt satırlarına başarıyla eklendi. (${jsonData.length} satır append edildi).`;
            }

            return "[HATA] Bilinmeyen bir action seçeneği tetiklendi.";

        } catch (error) {
            return `[EXCEL MANAGER HATA]: ${error.message}`;
        }
    }
};
