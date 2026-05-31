import fs from 'fs';
import path from 'path';

/**
 * AgentsHUB — Merkezi Sabitler (Canlı Değişkenler / Live Bindings)
 * ES6 Modül ihracatı (export let) kullanılarak, global_settings.json
 * güncellendiğinde tüm Node.js process içinde bu değerler ARKA PLANDA
 * sunucu yeniden başlatılmadan (hot-reload) güncellenir.
 */

// --- ReAct Döngüsü ---
export let MAX_REACT_LOOPS = 200;

// --- Bağlam Optimizasyonu ---
export let CONTEXT_PRUNE_THRESHOLD_TOKENS = 40000;
export let CONTEXT_PRUNE_KEEP_MESSAGES = 14;

// --- L3 Önbellek Eşikleri (token) ---
// 8000: Sistem promptu (~9.440 tok) her istekte L3 cache'i tetikler.
// token sayımı artık systemInstruction'ı da içeriyor (cache_manager.js fix)
export let CACHE_THRESHOLD_DEFAULT = 8000;
export let CACHE_THRESHOLD_SHIELD = 1000;

// --- Token Tahmini ve Sınırlar ---
export let TOKEN_ESTIMATE_CHARS_PER_TOKEN = 3.5;
export let TOOL_OUTPUT_MAX_CHARS = 18000;
export let MAX_OUTPUT_TOKENS = 8000; // LLM'in tek seferde üretebileceği maksimum token

// --- Kaizen ---
export let KAIZEN_MAX_RULES = 50;

// --- Agent-Driven Motor ---
export let AGENT_DRIVEN_INTERVAL_MS = 30000;

// --- SSE Keep-Alive ---
export let SSE_KEEPALIVE_INTERVAL_MS = 20000;

// --- Varsayılan Ajan Config ---
export let DEFAULT_TOKEN_LIMIT = 20000;
export let DEFAULT_TEMPERATURE = 0.7;
export let DEFAULT_TIMEOUT_MS = 15000;

// --- Shield ---
export let SHIELD_TOKEN_LIMIT = 200;
export let SHIELD_MIN_MSG_LENGTH = 10;

// --- Turbo ReAct Güvenlik ---
export let REACT_TOKEN_BUDGET = 2000000;
export let REACT_TIME_LIMIT_MS = 600000;
export let SSRF_GUARD_ENABLED = true;
export let PATH_GUARD_ENABLED = true;
export let SHIELD_ENABLED = true;
export let API_KEY_MASKING_ENABLED = true;
export let EXEC_APPROVAL_ENABLED = false;
export let SKILL_SIZE_LIMIT_ENABLED = true;
export let SKILL_SIZE_LIMIT_BYTES = 256000;

// --- OC-19: Skill Prompt Budget ---
export let SKILL_PROMPT_BUDGET_CHARS = 30000;
export let MAX_SKILL_COUNT = 150;


// --- LIVE RELOAD LOGIC ---
const SETTINGS_FILE = path.join(process.cwd(), 'global_settings.json');

export function loadLiveConstants() {
    try {
        let settings = {};
        if (fs.existsSync(SETTINGS_FILE)) {
            const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
            settings = JSON.parse(raw);
        }

        MAX_REACT_LOOPS = parseInt(settings.react_max_loops || process.env.REACT_MAX_LOOPS || '200', 10);
        CONTEXT_PRUNE_THRESHOLD_TOKENS = parseInt(settings.context_prune_tokens || process.env.CONTEXT_PRUNE_TOKENS || '40000', 10);
        CONTEXT_PRUNE_KEEP_MESSAGES = parseInt(settings.context_prune_keep || process.env.CONTEXT_PRUNE_KEEP || '14', 10);
        CACHE_THRESHOLD_DEFAULT = parseInt(settings.cache_threshold || settings.cache_threshold_tokens || process.env.CACHE_THRESHOLD || '10000', 10);
        CACHE_THRESHOLD_SHIELD = parseInt(settings.cache_threshold_shield || process.env.CACHE_THRESHOLD_SHIELD || '1000', 10);
        TOKEN_ESTIMATE_CHARS_PER_TOKEN = parseFloat(settings.token_chars || process.env.TOKEN_CHARS || '3.5');
        TOOL_OUTPUT_MAX_CHARS = parseInt(settings.tool_output_max || process.env.TOOL_OUTPUT_MAX || '18000', 10);
        MAX_OUTPUT_TOKENS = parseInt(settings.max_output_tokens || process.env.MAX_OUTPUT_TOKENS || '8000', 10);
        REACT_TIME_LIMIT_MS = parseInt(settings.react_time_limit_ms || process.env.REACT_TIME_LIMIT_MS || '600000', 10);
        KAIZEN_MAX_RULES = parseInt(settings.kaizen_max_rules || process.env.KAIZEN_MAX_RULES || '50', 10);
        AGENT_DRIVEN_INTERVAL_MS = parseInt(settings.agent_driven_interval || process.env.AGENT_DRIVEN_INTERVAL || '30000', 10);
        SSE_KEEPALIVE_INTERVAL_MS = parseInt(settings.sse_keepalive || process.env.SSE_KEEPALIVE || '20000', 10);
        DEFAULT_TOKEN_LIMIT = parseInt(settings.default_token_limit || process.env.DEFAULT_TOKEN_LIMIT || '20000', 10);
        DEFAULT_TEMPERATURE = parseFloat(settings.default_temperature || process.env.DEFAULT_TEMPERATURE || '0.7');
        DEFAULT_TIMEOUT_MS = parseInt(settings.default_timeout_ms || process.env.DEFAULT_TIMEOUT_MS || '15000', 10);
        SHIELD_TOKEN_LIMIT = parseInt(settings.shield_token_limit || process.env.SHIELD_TOKEN_LIMIT || '200', 10);
        SHIELD_MIN_MSG_LENGTH = parseInt(settings.shield_min_msg || process.env.SHIELD_MIN_MSG || '10', 10);
        REACT_TOKEN_BUDGET = parseInt(settings.react_token_budget || process.env.REACT_TOKEN_BUDGET || '2000000', 10);
        REACT_TIME_LIMIT_MS = parseInt(settings.react_time_limit || process.env.REACT_TIME_LIMIT || '600000', 10);
        SSRF_GUARD_ENABLED = settings.ssrf_guard_enabled !== false;
        PATH_GUARD_ENABLED = settings.path_guard_enabled !== false;
        SHIELD_ENABLED = settings.shield_enabled !== false;
        API_KEY_MASKING_ENABLED = settings.api_key_masking_enabled !== false;
        EXEC_APPROVAL_ENABLED = !!settings.exec_approval_enabled;
        SKILL_SIZE_LIMIT_ENABLED = settings.skill_size_limit_enabled !== false;
        SKILL_SIZE_LIMIT_BYTES = parseInt(settings.skill_size_limit_bytes || '256000', 10);
        SKILL_PROMPT_BUDGET_CHARS = parseInt(settings.skill_prompt_budget_chars || '30000', 10);
        MAX_SKILL_COUNT = parseInt(settings.max_skill_count || '150', 10);

        
    } catch(e) {
        console.warn(`[CONSTANTS] Live binding reload failed: ${e.message}`);
    }
}

// Node.js process başladığında ilk değerleri yükle
loadLiveConstants();

// Dosya değiştiğinde yeniden yükle (Hot Reload)
try {
    if (fs.existsSync(SETTINGS_FILE)) {
        fs.watchFile(SETTINGS_FILE, { interval: 2000 }, (curr, prev) => {
            if (curr.mtime !== prev.mtime) {
                loadLiveConstants();
            }
        });
    }
} catch(e) {}
