import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const VAULT_DIR = path.join(os.homedir(), '.agentshub_vault');
const MASTER_KEY_PATH = path.join(VAULT_DIR, 'master.key');
const SECRETS_FILE = path.join(process.cwd(), '.env.enc');

async function getMasterKey() {
    try {
        await fs.access(VAULT_DIR);
    } catch {
        await fs.mkdir(VAULT_DIR, { recursive: true, mode: 0o700 }); // Restrict to user
    }

    try {
        const keyBase64 = await fs.readFile(MASTER_KEY_PATH, 'utf8');
        return Buffer.from(keyBase64, 'base64');
    } catch {
        // Generate a new 256-bit key
        const newKey = crypto.randomBytes(32);
        await fs.writeFile(MASTER_KEY_PATH, newKey.toString('base64'), { mode: 0o600 });
        return newKey;
    }
}

export async function encryptSecret(text) {
    if (!text) return text;
    const key = await getMasterKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export async function decryptSecret(encryptedData) {
    if (!encryptedData || !encryptedData.includes(':')) return encryptedData;
    
    try {
        const key = await getMasterKey();
        const parts = encryptedData.split(':');
        if (parts.length !== 3) return encryptedData;
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = Buffer.from(parts[2], 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error("[VAULT] Şifre çözme hatası:", err.message);
        return null;
    }
}

export async function saveSecretsVault(secretsObj) {
    const encryptedObj = {};
    for (const [key, value] of Object.entries(secretsObj)) {
        if (value && typeof value === 'string') {
            encryptedObj[key] = await encryptSecret(value);
        } else {
            encryptedObj[key] = value;
        }
    }
    await fs.writeFile(SECRETS_FILE, JSON.stringify(encryptedObj, null, 2), 'utf8');
}

export async function loadSecretsVault() {
    try {
        const data = await fs.readFile(SECRETS_FILE, 'utf8');
        const encryptedObj = JSON.parse(data);
        const decryptedObj = {};
        for (const [key, value] of Object.entries(encryptedObj)) {
            if (value && typeof value === 'string' && value.includes(':')) {
                decryptedObj[key] = await decryptSecret(value);
            } else {
                decryptedObj[key] = value;
            }
        }
        return decryptedObj;
    } catch (err) {
        return {}; // Vault doesnt exist or empty
    }
}
