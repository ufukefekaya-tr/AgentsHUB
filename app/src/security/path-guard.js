/**
 * Path Guard — Dosya yolu güvenlik doğrulaması
 * OpenClaw'un path-guards.ts + isPathInside() mantığından esinlenildi.
 * Ajanın kendi workspace'i dışına dosya yazmasını/okumasını engeller.
 * @module security/path-guard
 */

import path from 'path';
import fs from 'fs';

const WORKSPACE_ROOT = path.resolve(process.cwd(), 'Agents');

// Mutlak erişim yasak dizinler
const BLOCKED_PATHS = [
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
    'C:\\Users\\All Users',
    '/etc',
    '/usr',
    '/bin',
    '/sbin',
    '/var',
    '/root'
];

/**
 * Verilen yolun belirtilen kök dizinin içinde olup olmadığını kontrol eder.
 * Symlink çözümleme ve ".." traversal koruması dahil.
 * @param {string} rootDir - İzin verilen kök dizin
 * @param {string} targetPath - Kontrol edilecek hedef yol
 * @returns {boolean}
 */
export function isPathInside(rootDir, targetPath) {
    try {
        const resolvedRoot = path.resolve(rootDir);
        const resolvedTarget = path.resolve(targetPath);
        
        // Symlink'leri çöz
        let realRoot, realTarget;
        try {
            realRoot = fs.realpathSync(resolvedRoot);
        } catch {
            realRoot = resolvedRoot;
        }
        try {
            realTarget = fs.realpathSync(resolvedTarget);
        } catch {
            // Dosya henüz yoksa parent'ı kontrol et
            const parentDir = path.dirname(resolvedTarget);
            try {
                realTarget = path.join(fs.realpathSync(parentDir), path.basename(resolvedTarget));
            } catch {
                realTarget = resolvedTarget;
            }
        }
        
        // Normalize ederek karşılaştır (Windows case-insensitive)
        const normalizedRoot = realRoot.toLowerCase() + path.sep;
        const normalizedTarget = realTarget.toLowerCase();
        
        return normalizedTarget.startsWith(normalizedRoot) || normalizedTarget === realRoot.toLowerCase();
    } catch {
        return false;
    }
}

/**
 * Bir ajanın erişmek istediği dosya yolunu doğrular.
 * @param {string} agentId - Ajan kimliği
 * @param {string} targetPath - Hedef dosya yolu
 * @param {string} operation - İşlem türü ("read" | "write" | "delete" | "execute")
 * @returns {{ allowed: boolean, reason?: string, resolvedPath?: string }}
 */
export function validateAgentPath(agentId, targetPath, operation = 'read') {
    if (!targetPath || typeof targetPath !== 'string') {
        return { allowed: false, reason: 'Geçersiz dosya yolu.' };
    }
    
    const resolvedPath = path.resolve(targetPath);
    
    // 1. Mutlak yasaklı dizinler
    for (const blocked of BLOCKED_PATHS) {
        if (resolvedPath.toLowerCase().startsWith(blocked.toLowerCase())) {
            return { 
                allowed: false, 
                reason: `Güvenlik: '${blocked}' dizinine erişim yasak.` 
            };
        }
    }
    
    // 2. ".." traversal kontrolü
    if (targetPath.includes('..')) {
        const agentWorkspace = path.join(WORKSPACE_ROOT, agentId);
        if (!isPathInside(agentWorkspace, resolvedPath)) {
            return { 
                allowed: false, 
                reason: 'Güvenlik: Path traversal (..) ile workspace dışına çıkılamaz.' 
            };
        }
    }
    
    // 3. Yazma/silme işlemleri için ek kısıtlama
    if (operation === 'write' || operation === 'delete') {
        const agentWorkspace = path.join(WORKSPACE_ROOT, agentId);
        const appDir = path.resolve(process.cwd());
        
        // Ajan sadece kendi workspace'ine veya app kökündeki belirli dizinlere yazabilir
        const allowedWriteDirs = [
            agentWorkspace,
            path.join(appDir, 'temp'),
            path.join(appDir, 'output'),
            path.join(appDir, 'Workspace'),
        ];
        
        const isAllowed = allowedWriteDirs.some(dir => isPathInside(dir, resolvedPath));
        
        if (!isAllowed) {
            return { 
                allowed: false, 
                reason: `Güvenlik: ${operation} işlemi sadece ajan workspace'inde izinlidir.` 
            };
        }
    }
    
    return { allowed: true, resolvedPath };
}

/**
 * Express middleware: API isteklerinde dosya yolu doğrulaması
 */
export function pathGuardMiddleware(req, res, next) {
    const filePath = req.body?.path || req.query?.path;
    const agentId = req.params?.id || req.body?.agentId;
    
    if (filePath && agentId) {
        const result = validateAgentPath(agentId, filePath, req.method === 'DELETE' ? 'delete' : 'write');
        if (!result.allowed) {
            return res.status(403).json({ error: result.reason });
        }
    }
    
    next();
}
