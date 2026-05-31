/**
 * SCREENSHOT Skill — Ekran görüntüsü al ve oku
 * PowerShell ile ekran yakalama, dosyaya kaydetme.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execPromise = promisify(exec);

export const skill = {
    name: "screenshot",
    version: "1.0.0",
    category: "system",
    tags: ["ekran", "goruntu", "yakalama"],
    emoji: "📸",
    requires: { os: ["windows"] },
    description: "Ekran goruntusu alir ve dosya olarak kaydeder. 'capture' ekranin PNG goruntusu alir, 'read' mevcut goruntulerini listeler veya dosya bilgisi dondurur. PowerShell System.Drawing kullanir.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["capture", "read"],
                description: "'capture' ekran goruntusu alir, 'read' mevcut bir goruntu dosyasinin yolunu dondurur."
            },
            filename: {
                type: "string",
                description: "Kaydedilecek dosya adi (uzantisiz). Varsayilan: 'screenshot_<timestamp>'"
            },
            filepath: {
                type: "string",
                description: "'read' islemi icin okunacak goruntu dosyasinin tam yolu."
            }
        },
        required: ["action"]
    },
    execute: async (args) => {
        try {
            const workDir = path.join(process.cwd(), 'Workspace', 'screenshots');
            await fs.mkdir(workDir, { recursive: true });

            switch (args.action) {
                case 'capture': {
                    const filename = (args.filename || `screenshot_${Date.now()}`) + '.png';
                    const filepath = path.join(workDir, filename);
                    
                    // PowerShell ile ekran görüntüsü al
                    const psScript = `
                        Add-Type -AssemblyName System.Windows.Forms
                        Add-Type -AssemblyName System.Drawing
                        $screen = [System.Windows.Forms.Screen]::PrimaryScreen
                        $bitmap = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
                        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
                        $graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
                        $bitmap.Save('${filepath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
                        $graphics.Dispose()
                        $bitmap.Dispose()
                        Write-Host 'OK'
                    `.replace(/\n\s+/g, '; ');
                    
                    await execPromise(`powershell -Command "${psScript}"`, { timeout: 15000 });
                    
                    // Dosya oluşturuldu mu kontrol et
                    try {
                        const stats = await fs.stat(filepath);
                        const sizeKB = Math.round(stats.size / 1024);
                        return `[BAŞARILI] Ekran görüntüsü kaydedildi.\n📁 Dosya: ${filepath}\n📐 Boyut: ${sizeKB} KB`;
                    } catch {
                        return `[HATA] Ekran görüntüsü dosyası oluşturulamadı.`;
                    }
                }
                
                case 'read': {
                    if (!args.filepath) {
                        // Son alınan screenshot'u listele
                        try {
                            const files = await fs.readdir(workDir);
                            const pngs = files.filter(f => f.endsWith('.png')).sort().reverse();
                            if (pngs.length === 0) return "[BILGI] Henüz ekran görüntüsü alınmamış.";
                            
                            const list = pngs.slice(0, 5).map(f => `  📸 ${path.join(workDir, f)}`).join('\n');
                            return `[EKRAN GÖRÜNTÜLERİ]\nSon ${Math.min(5, pngs.length)} dosya:\n${list}`;
                        } catch {
                            return "[BILGI] Screenshots dizini bulunamadı.";
                        }
                    }
                    
                    try {
                        const stats = await fs.stat(args.filepath);
                        return `[DOSYA BİLGİSİ]\n📁 Yol: ${args.filepath}\n📐 Boyut: ${Math.round(stats.size / 1024)} KB\n📅 Tarih: ${stats.mtime.toLocaleString()}`;
                    } catch {
                        return `[HATA] Dosya bulunamadı: ${args.filepath}`;
                    }
                }
                
                default:
                    return "[HATA] Geçersiz işlem. 'capture' veya 'read' kullanın.";
            }
        } catch (error) {
            return `[HATA] Ekran görüntüsü işlemi başarısız: ${error.message}`;
        }
    }
};
