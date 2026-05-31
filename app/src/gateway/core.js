import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import router from './router.js';
import logger from '../utils/logger.js';
import { globalErrorHandler } from '../core/errorHandler.js';
import { startAgentDrivenLoop } from '../core/agentDriver.js';

// .env yüklemesi
dotenv.config();

/**
 * AgentsHUB - Unified Gateway Engine
 * 
 * Express tabanlı, "Sıfır Sunucu İsrafı" kuralına dayanan,
 * hantal "polling" yerine "Event-Driven" webhook yapısını sunan ana motor.
 */

const app = express();
const PORT = process.env.PORT || 3000;
const MODE = process.env.AGENTSHUB_MODE || 'event_driven'; // Varsayılan: event_driven

// Security & Parsing Middlewares
app.use(express.json({ limit: 50 * 1024 * 1024 }));
app.use(express.urlencoded({ limit: 50 * 1024 * 1024, extended: true }));

// Healthcheck / Canlılık (Heartbeat T1 Testi için)
app.get('/health', (req, res) => {
    res.status(200).json({ status: "alive", system: "AgentsHUB Gateway", mode: MODE });
});

// Dynamic Router Modülü Enjeksiyonu
app.use('/webhook', router);

// Global Error Handler Enjeksiyonu (En Sonda)
app.use(globalErrorHandler);

// Sunucuyu Başlatma
app.listen(PORT, () => {
    logger.info(`AgentsHUB Sovereign Gateway is running on port ${PORT}`);
    logger.info(`Operation Mode: [${MODE.toUpperCase()}]`);
    
    // Eğer Agent-Driven moda alındıysa, otonomi motorunu başlat
    if (MODE === 'agent_driven') {
        startAgentDrivenLoop();
    }
});

// === GLOBAL ÇÖKME ZIRHI (IP-4 KM-4.2) ===
// Node.js sürecinin her koşulda ayakta kalmasını garantiler.
process.on('uncaughtException', (err) => {
    logger.error(`[GLOBAL CRASH GUARD] uncaughtException: ${err.message}`, err.stack);
    // Çökmüyoruz, loglayıp devam ediyoruz
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`[GLOBAL CRASH GUARD] unhandledRejection: ${reason}`);
    // Çökmüyoruz, loglayıp devam ediyoruz
});

