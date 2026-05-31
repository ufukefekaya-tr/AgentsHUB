import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import 'dotenv/config';

// Gizlilik icin JWT secret .env'den alinir (Hardcoded fallback YASAK - ZAF-06 Fix)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    logger.error('[SHIELD] KRITIK: JWT_SECRET .env dosyasinda tanimli degil! Sunucu guvenli baslatilamaz.');
    process.exit(1);
}

/**
 * Zero-Trust Auth Middleware (IP-7 Kalkanı)
 * Dış ağdan gelen hiçbir yetkisiz isteğin içeri girmesine izin vermez.
 */
export const requireAuth = (req, res, next) => {
    // Health check, telemetry veya public endpoint'ler pasif gecer
    if (req.path.startsWith('/health') || req.path.startsWith('/telemetry') || req.path === '/system/login') {
        return next();
    }

    const authHeader = req.headers['authorization'];
    
    // Authorization başlığı yoksa kapıyı hiç açma (Void Protocol)
    if (!authHeader) {
        logger.warn(`[SHIELD] Yetkisiz erişim denemesi (No Header). IP: ${req.ip} | Route: ${req.path}`);
        return res.status(401).json({ error: 'Erişim engellendi. (Sıfır Güven Protokolü)' });
    }

    const token = authHeader.split(' ')[1]; // "Bearer <token>"
    if (!token) {
        return res.status(401).json({ error: 'Geçersiz yetki formatı.' });
    }

    try {
        // Token'ı doğrula
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Basarili ise veriyi requeste ekle
        next();
    } catch (err) {
        logger.warn(`[SHIELD] Kimlik doğrulama başarısız (Invalid Token). IP: ${req.ip} | Route: ${req.path}`);
        return res.status(403).json({ error: 'Kimlik doğrulama başarısız. Oturum süresi dolmuş olabilir.' });
    }
};

/**
 * Login Endpoint Mantigi
 * Arayuzden gelen sifre (UI_API_KEY veya Admin Pw) eslesirse JWT uretilir.
 */
export const generateToken = (payload) => {
    // Kisa omurlu token (24 saat) ile asimetrik koruma saglanir
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};
