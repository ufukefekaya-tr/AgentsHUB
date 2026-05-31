/**
 * API Key Maskeleme — Loglardan key sızmasını önler
 * OpenClaw'un mask-api-key.ts mantığından esinlenildi.
 * @module security/mask-api-key
 */

/**
 * API key'leri loglanabilir formata maskeler.
 * İlk 4 ve son 4 karakteri gösterir, arasını *** yapar.
 * @param {string} key
 * @returns {string} Maskelenmiş key
 */
export function maskApiKey(key) {
    if (!key || typeof key !== 'string') return '(undefined)';
    if (key.length <= 8) return '****';
    return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

/**
 * Bir string içindeki tüm API key benzeri desenleri maskeler.
 * Google AI: AIza..., Bearer token: clh_..., sk-..., vb.
 * @param {string} text 
 * @returns {string}
 */
export function maskSecretsInText(text) {
    if (!text || typeof text !== 'string') return text;
    return text
        // Google AI Studio keys: AIzaSy...
        .replace(/AIza[A-Za-z0-9_-]{30,}/g, (m) => maskApiKey(m))
        // OpenAI keys: sk-...
        .replace(/sk-[A-Za-z0-9]{20,}/g, (m) => maskApiKey(m))
        // Bearer tokens in headers
        .replace(/(Bearer\s+)[A-Za-z0-9._-]{20,}/gi, (_, prefix) => `${prefix}****`)
        // ClawHub tokens: clh_...
        .replace(/clh_[A-Za-z0-9]{10,}/g, (m) => maskApiKey(m))
        // Generic long alphanumeric secrets (40+ chars, likely keys)
        .replace(/"api_key"\s*:\s*"([^"]{20,})"/g, (_, k) => `"api_key": "${maskApiKey(k)}"`)
        // Telegram bot tokens
        .replace(/\d{8,}:[A-Za-z0-9_-]{30,}/g, (m) => maskApiKey(m));
}
