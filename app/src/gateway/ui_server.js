import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { cronManager } from '../scheduler/cron_manager.js';
import { telegramManager } from '../channels/telegram_bridge.js';

// --- ROUTERS ---
import agentsRouter from './routes/agents.js';
import foldersRouter from './routes/folders.js';
import threadsRouter from './routes/threads.js';
import chatRouter from './routes/chat.js';
import uploadRouter from './routes/upload.js';
import { agentSkillsRouter, marketSkillsRouter } from './routes/skills.js';
import cronRouter from './routes/cron.js';
import { systemRouter, healthRouter, telemetryRouter } from './routes/system.js';
import { requireAuth, generateToken } from './auth_middleware.js';

/**
 * AgentsHUB - Sovereign UI Backend (Air-Gap Katmanı) - IP-7 V7.0
 * Port: 3004 (Migrated from 3001)
 */

const app = express();
const PORT = process.env.UI_PORT || 3004;

// --- STATIC DASHBOARD ---
const __dirname_ui = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname_ui, '..', '..', 'dashboard', 'dist');
app.use(express.static(distPath));

// --- CORS RESTRICTION (Zero-Trust: Sadece bilinen origin'ler) ---
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3434')
    .split(',')
    .map(o => o.trim());
app.use(cors({
    origin: (origin, callback) => {
        // Aynı origin (tarayıcı istekleri origin göndermez) veya izinli listede ise geç
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// --- API AUTHENTICATION SHIELD (Zero-Trust) ---
const UI_API_KEY = process.env.UI_API_KEY || 'agentshub_secure_key_2026'; // Fallback if not in .env

// --- LOGIN BRUTE-FORCE PROTECTION ---
const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 dakika pencere
    max: 5,                   // Max 5 deneme / 5 dakika
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla giriş denemesi. 5 dakika bekleyin.' }
});

// Login Endpoint (Giris Yapip JWT Token Almak Icin Bilet Gisesi)
app.post('/api/system/login', loginLimiter, (req, res) => {
    const { password } = req.body;
    if (password === UI_API_KEY) {
        // Dogru sifre = 24 saatlik asimetrik Token (Ticket) uret.
        const token = generateToken({ role: 'admin', timestamp: Date.now() });
        logger.info(`[SHIELD] Yetkili giris basarili. IP: ${req.ip}`);
        return res.json({ status: 'ok', token });
    }
    logger.warn(`[SHIELD] Hatali giris denemesi. IP: ${req.ip}`);
    return res.status(401).json({ error: 'Geçersiz şifre.' });
});

// Middleware Entagrasyonu - Butun /api istekleri 'requireAuth' sirkulesinden gecmek zorunda.
app.use('/api/', requireAuth);
logger.info('[UI-BACKEND] Zero-Trust JWT Kalkanı devrede.');

// --- RATE LIMITING ---
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_API || '300'),
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', apiLimiter);

// --- ROUTE BINDINGS ---
app.use('/api/agents', agentsRouter);
app.use('/api/agents/:id/folders', foldersRouter);
app.use('/api/agents/:id/threads', threadsRouter);
app.use('/api/agents/:id/chat', chatRouter);
app.use('/api/agents/:id/upload', uploadRouter);
app.use('/api/agents/:id/skills', agentSkillsRouter);
app.use('/api/agents/:id/cron', cronRouter);
app.use('/api/market/skills', marketSkillsRouter);
app.use('/api/system', systemRouter);
app.use('/api/health', healthRouter);
app.use('/api/telemetry', telemetryRouter);

// --- UNKNOWN API ROUTE GUARD (Path Traversal / Enumeration koruması) ---
app.use('/api/', (req, res) => {
    res.status(404).json({ error: 'Bilinmeyen API rotası.' });
});

// --- SPA FALLBACK ---
app.use((req, res) => {
    const indexHtml = path.join(distPath, 'index.html');
    res.sendFile(indexHtml, (err) => {
        if (err) {
            logger.error(`[STATIC] sendFile error: ${err.message} | path: ${indexHtml}`);
            res.status(500).send('Dashboard yüklenemedi: ' + err.message);
        }
    });
});

const server = app.listen(PORT, async () => {
    logger.info(`[UI-BACKEND] Sovereign Dashboard API running on http://localhost:${PORT}`);
    await cronManager.restoreAll().catch(e => logger.warn(`[CRON] Restore hatası: ${e.message}`));
    await telegramManager.startAll().catch(e => logger.warn(`[TELEGRAM] Start hatası: ${e.message}`));
    cronManager.setTelegramBridge(telegramManager);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        const nextPort = PORT + 1;
        logger.warn(`[UI-BACKEND] Port ${PORT} meşgul, ${nextPort} deneniyor...`);
        app.listen(nextPort, async () => {
            logger.info(`[UI-BACKEND] Sovereign Dashboard API running on http://localhost:${nextPort}`);
            await cronManager.restoreAll().catch(e => logger.warn(`[CRON] Restore hatası: ${e.message}`));
            await telegramManager.startAll().catch(e => logger.warn(`[TELEGRAM] Start hatası: ${e.message}`));
        });
    }
});
