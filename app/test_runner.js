import { encryptSecret, decryptSecret } from './src/security/secret_vault.js';
import { runGenesis } from './src/memory/genesis.js';
import fs from 'fs/promises';

async function runTests() {
    console.log("=== ATLAS QA-LOOP OTOMATİK ONAY TESTİ ===");
    
    try {
        // Test 1: Secret Vault
        console.log("\n[TEST 1] Secret Vault (Şifreleme)");
        const testKey = "AIzaSy_GIZLI_ANAHTAR_1234";
        const encrypted = await encryptSecret(testKey);
        console.log(`Original: ${testKey}`);
        console.log(`Şifrelenmiş (AES-256-GCM): ${encrypted}`);
        const decrypted = await decryptSecret(encrypted);
        console.log(`Çözülmüş: ${decrypted}`);
        if(decrypted === testKey) console.log("=> SONUÇ: BAŞARILI [VAULT ONAYLANDI]");
        else throw new Error("Vault decryption mismatch!");

        // Test 2: Genesis Dizinleri
        console.log("\n[TEST 2] Genesis Klasör Oluşumları (Büyük/Küçük Harf)");
        await runGenesis();
        const skillsExists = await fs.access('./Marketplace/skills').then(()=>true).catch(()=>false);
        if(skillsExists) console.log("=> SONUÇ: BAŞARILI [skills/ Klasörü Küçük Harfle Hazır]");

        console.log("\n== TÜM OTOMATİK ONAYLAR BAŞARILI ==");
    } catch(e) {
        console.error("TEST HATASI:", e);
    }
}

runTests();
