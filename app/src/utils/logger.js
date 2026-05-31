import { maskSecretsInText } from '../security/mask-api-key.js';

const MAX_LOGS = 100;
const logBuffer = [];

/** Tüm log mesajlarını API key maskeleme filtresinden geçir */
function sanitize(msg) {
    return typeof msg === 'string' ? maskSecretsInText(msg) : msg;
}

const COLORS = {
    RESET: "\x1b[0m",
    RED: "\x1b[31m",
    GREEN: "\x1b[32m",
    YELLOW: "\x1b[33m",
    MAGENTA: "\x1b[35m",
    CYAN: "\x1b[36m",
    GRAY: "\x1b[90m"
};

const logger = {
    _pushToBuffer(logEntry) {
        logBuffer.push(logEntry);
        if (logBuffer.length > MAX_LOGS) {
            logBuffer.shift();
        }
    },

    getRecentLogs() {
        return logBuffer.join('\n');
    },

    info(message) {
        const timestamp = new Date().toISOString();
        const log = `[INFO] [${timestamp}] ${sanitize(message)}`;
        this._pushToBuffer(log);
        console.log(`${COLORS.GREEN}${log}${COLORS.RESET}`);
    },

    warn(message) {
        const timestamp = new Date().toISOString();
        const log = `[WARN] [${timestamp}] ${sanitize(message)}`;
        this._pushToBuffer(log);
        console.warn(`${COLORS.YELLOW}${log}${COLORS.RESET}`);
    },

    error(message, error = null) {
        const timestamp = new Date().toISOString();
        let log = `[ERROR] [${timestamp}] ${sanitize(message)}`;
        if (error) {
            log += `\n${error.stack || error}`;
        }
        this._pushToBuffer(log);
        console.error(`${COLORS.RED}${log}${COLORS.RESET}`);
    },

    telemetry(operation, ms) {
        const timestamp = new Date().toISOString();
        const log = `[TELEMETRY] [${timestamp}] [${operation}] took ${ms}ms`;
        this._pushToBuffer(log);
        console.log(`${COLORS.MAGENTA}${log}${COLORS.RESET}`);
    },

    debug(message) {
        const timestamp = new Date().toISOString();
        const log = `[DEBUG] [${timestamp}] ${sanitize(message)}`;
        this._pushToBuffer(log);
        console.log(`${COLORS.GRAY}${log}${COLORS.RESET}`);
    }
};

export default logger;
