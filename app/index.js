/**
 * AgentsHUB — CLI Entry Point (C-01 Fix)
 *
 * Bu dosya uygulamayı başlatır:
 *   node index.js         → UI Server + Agent-Driven Loop
 *   npm start             → aynısı (package.json'da "start": "node index.js")
 */

import './src/gateway/ui_server.js';
import { startAgentDrivenLoop } from './src/core/agentDriver.js';
import logger from './src/utils/logger.js';

// Agent-Driven otonom döngüyü başlat
try {
    startAgentDrivenLoop();
} catch (err) {
    logger.warn(`[INDEX] Agent-Driven loop başlatılamadı: ${err.message}`);
}
