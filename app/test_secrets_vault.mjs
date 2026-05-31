import { loadSecretsVault } from './src/security/secret_vault.js';

async function main() {
    try {
        const secrets = await loadSecretsVault();
        console.log("SECRETS VAULT CONTENTS:");
        console.log(JSON.stringify(secrets, null, 2));
    } catch (e) {
        console.error("Hata:", e.message);
    }
}

main();
