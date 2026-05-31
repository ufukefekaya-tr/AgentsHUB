/**
 * SSRF Koruması — Ajanın iç ağ adreslerine erişmesini engeller
 * OpenClaw'un outbound SSRF korumasından esinlenildi.
 * @module security/ssrf-guard
 */

import { URL } from 'url';
import dns from 'dns/promises';

// Engellenen IP aralıkları (RFC 1918 + RFC 5737 + loopback + link-local)
const BLOCKED_IP_RANGES = [
    // Loopback
    { start: '127.0.0.0', end: '127.255.255.255' },
    // Private Class A
    { start: '10.0.0.0', end: '10.255.255.255' },
    // Private Class B
    { start: '172.16.0.0', end: '172.31.255.255' },
    // Private Class C
    { start: '192.168.0.0', end: '192.168.255.255' },
    // Link-local
    { start: '169.254.0.0', end: '169.254.255.255' },
    // Metadata services (cloud)
    { start: '169.254.169.254', end: '169.254.169.254' },
    // Documentation range
    { start: '192.0.2.0', end: '192.0.2.255' },
    { start: '198.51.100.0', end: '198.51.100.255' },
    { start: '203.0.113.0', end: '203.0.113.255' },
];

const BLOCKED_HOSTNAMES = [
    'localhost',
    '0.0.0.0',
    'metadata.google.internal',
    'metadata.google',
    'instance-data',
];

function ipToNum(ip) {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function isBlockedIP(ip) {
    if (!ip || typeof ip !== 'string') return true;
    
    // IPv6 loopback
    if (ip === '::1' || ip === '::') return true;
    
    const num = ipToNum(ip);
    return BLOCKED_IP_RANGES.some(range => {
        const start = ipToNum(range.start);
        const end = ipToNum(range.end);
        return num >= start && num <= end;
    });
}

/**
 * URL'in güvenli olup olmadığını doğrular (SSRF koruması)
 * @param {string} urlString - Kontrol edilecek URL
 * @returns {Promise<{ safe: boolean, reason?: string }>}
 */
export async function validateUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        
        // 1. Sadece HTTP/HTTPS protokolüne izin ver
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { safe: false, reason: `Güvenlik: '${parsed.protocol}' protokolüne izin yok. Sadece http/https.` };
        }
        
        // 2. Yasaklı hostname kontrolü
        const hostname = parsed.hostname.toLowerCase();
        if (BLOCKED_HOSTNAMES.includes(hostname)) {
            return { safe: false, reason: `Güvenlik: '${hostname}' erişimi engellendi (iç ağ).` };
        }
        
        // 3. IP bazlı hostname kontrolü (doğrudan IP girilmişse)
        const ipMatch = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
        if (ipMatch && isBlockedIP(hostname)) {
            return { safe: false, reason: `Güvenlik: '${hostname}' IP adresi engellendi (özel ağ).` };
        }
        
        // 4. DNS çözümleme ile gizli iç ağ adreslerini tespit et
        try {
            const addresses = await dns.resolve4(hostname);
            for (const addr of addresses) {
                if (isBlockedIP(addr)) {
                    return { 
                        safe: false, 
                        reason: `Güvenlik: '${hostname}' DNS çözümlemesi engellenmiş IP'ye (${addr}) yönlendiriyor.` 
                    };
                }
            }
        } catch (dnsErr) {
            // DNS çözülemezse devam et — fetch zaten hata verecek
        }
        
        return { safe: true };
    } catch (e) {
        return { safe: false, reason: `Geçersiz URL: ${e.message}` };
    }
}

/**
 * URL'in senkron hızlı kontrolü (DNS çözümleme olmadan)
 * Performans kritik yerlerde kullan.
 * @param {string} urlString
 * @returns {{ safe: boolean, reason?: string }}
 */
export function validateUrlSync(urlString) {
    try {
        const parsed = new URL(urlString);
        
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { safe: false, reason: `Protokol izinsiz: ${parsed.protocol}` };
        }
        
        const hostname = parsed.hostname.toLowerCase();
        if (BLOCKED_HOSTNAMES.includes(hostname)) {
            return { safe: false, reason: `Hostname engellendi: ${hostname}` };
        }
        
        const ipMatch = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
        if (ipMatch && isBlockedIP(hostname)) {
            return { safe: false, reason: `IP engellendi: ${hostname}` };
        }
        
        return { safe: true };
    } catch (e) {
        return { safe: false, reason: `Geçersiz URL` };
    }
}
