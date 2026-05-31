import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_ENTRY = path.join(__dirname, 'index.js');
const MAX_RESTARTS = 5;
const RESTART_INTERVAL_MS = 60000; // 1 min

let restartCount = 0;
let lastRestartTime = Date.now();
let childProcess = null;

function startApp() {
    console.log(`[WATCHDOG] AgentsHUB Ana İşlemi Başlatılıyor... (${new Date().toLocaleString()})`);
    
    // Spawn the node process
    childProcess = spawn('node', [APP_ENTRY], {
        stdio: 'inherit',
        env: { ...process.env, WATCHDOG_MONITOR: 'true' }
    });

    childProcess.on('exit', (code, signal) => {
        console.log(`[WATCHDOG] Ana işlem kapandı. Exit Code: ${code}, Signal: ${signal}`);
        
        const now = Date.now();
        if (now - lastRestartTime > RESTART_INTERVAL_MS) {
            restartCount = 0; // Reset count if stable for a while
        }
        
        lastRestartTime = now;
        restartCount++;

        if (restartCount > MAX_RESTARTS) {
            console.error(`[WATCHDOG] CRITICAL: Çok hızlı (${restartCount} kez) kapanma tespit edildi. Yeniden başlatma durduruldu.`);
            process.exit(1);
        }

        console.log(`[WATCHDOG] Yeniden başlatılıyor... Deneme: ${restartCount}/${MAX_RESTARTS}`);
        setTimeout(startApp, 2000); // 2 saniye bekle
    });

    childProcess.on('error', (err) => {
        console.error('[WATCHDOG] Hata oluştu:', err);
    });
}

function handleKillSignal(sig) {
    if (childProcess) {
        console.log(`[WATCHDOG] ${sig} alındı, alt süreçlere iletiliyor...`);
        childProcess.kill(sig);
    }
    process.exit(0);
}

process.on('SIGTERM', () => handleKillSignal('SIGTERM'));
process.on('SIGINT', () => handleKillSignal('SIGINT'));

startApp();
