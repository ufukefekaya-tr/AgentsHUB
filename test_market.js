import fs from 'fs/promises';
import path from 'path';

const skillsDir = path.join(process.cwd(), 'Marketplace', 'skills');

async function testSkills() {
    console.log("=== YETENEK EKO SISTEMI (MARKETPLACE) TESTI BASLIYOR ===");
    let errCount = 0;
    try {
        const files = await fs.readdir(skillsDir);
        for (const file of files) {
            if (!file.endsWith('.js')) continue;
            const fullPath = path.join(skillsDir, file);
            try {
                // Dinamik import ederek syntax error var mı, schema ve action var mı kontrol et
                const module = await import('file:///' + fullPath.replace(/\\/g, '/'));
                if (!module.action || typeof module.action !== 'function') {
                    console.error(`[X] ${file}: 'export const action = async(args, ctx)' eksik!`);
                    errCount++;
                } else if (!module.schema || typeof module.schema !== 'object') {
                    console.error(`[X] ${file}: 'export const schema = {}' eksik!`);
                    errCount++;
                } else {
                    console.log(`[OK] ${file} yüklendi. Syntax temiz.`);
                }
            } catch (err) {
                console.error(`[CRITICAL ERROR] ${file} derlenemedi (Syntax/Import Error):\n    ${err.message}`);
                errCount++;
            }
        }
    } catch(err) {
        console.error("Klasör okunamadı:", err.message);
        errCount++;
    }

    if (errCount === 0) {
        console.log("\n✅ TÜM EKLENTİLER BAŞARIYLA DERLENDİ VE ŞEMALARA UYGUNDUR.");
        process.exit(0);
    } else {
        console.log(`\n❌ TOPLAM BULUNAN HATA: ${errCount}`);
        process.exit(1);
    }
}

testSkills();
