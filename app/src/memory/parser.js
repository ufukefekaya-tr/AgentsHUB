import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import { SkillLoader } from '../skills/loader.js';

const WORKSPACE_DIR = path.resolve(process.cwd(), 'Agents');
const MODELS_CONFIG_PATH = path.resolve(process.cwd(), 'src', 'bridge', 'config', 'models.json');

/**
 * MİNDSET PARSER (V2.9 - Saf Modüler Mimari)
 * Ajanın zekasını 5 ana Markdown dosyasından sentezleyen orkestra şefi.
 */
export const MindsetParser = {
    
    /**
     * @param {string} agentId 
     * @param {object} threadMetadata Sohbet özelindeki meta veriler (efficiency_mode vb.)
     * @returns {Promise<string>} Sentezlenmiş System Instruction
     */
    async synthesize(agentId, threadMetadata = {}) {
        const coreDir = path.join(WORKSPACE_DIR, agentId, 'Mind-Set_Core');

        // Efficiency mode: önce config.json'dan oku, threadMetadata override edebilir
        let configEfficiency = true; // varsayılan: açık (güvenli taraf)
        try {
            const cfgRaw = await fs.readFile(path.join(coreDir, 'config.json'), 'utf8');
            const cfg = JSON.parse(cfgRaw);
            if (typeof cfg.efficiency_mode === 'boolean') configEfficiency = cfg.efficiency_mode;
        } catch(e) {}

        // threadMetadata ile açıkça false verilmişse kapat, yoksa config değerini kullan
        const isEfficiencyOn = threadMetadata.efficiency_mode !== undefined
            ? threadMetadata.efficiency_mode !== false
            : configEfficiency;

        try {
            // 1. Temel Dosyaları Oku
            const [dna, rules, user, evalLog, configRaw, modelsRaw, skillsAwareness] = await Promise.all([
                this._safeReadFile(path.join(coreDir, 'DNA.md')),
                this._safeReadFile(path.join(coreDir, 'RULES.md')),
                this._safeReadFile(path.join(coreDir, 'USER.md')),
                this._safeReadFile(path.join(coreDir, 'EVALUATION.md')),
                this._safeReadFile(path.join(coreDir, 'config.json')),
                this._safeReadFile(MODELS_CONFIG_PATH),
                this._safeReadFile(path.join(coreDir, 'SKILLS.md'))
            ]);

            // 2. Teknik Dosyaları Oku (Verimlilik Moduna Göre)
            let skillsContent = "";
            let manuel = "";
            
            if (!isEfficiencyOn) {
                // MUTLAK İZOLASYON: Sadece ajanın kendi skills klasöründeki yetenekler yüklenir.
                const isolatedSkills = await this._loadIsolatedSkills(agentId);
                skillsContent = isolatedSkills || "Bu ajan için özel bir yetenek (Skill) tanımlanmadı.";
                
                manuel = await this._safeReadFile(path.join(coreDir, 'AGENT_MANUEL.md'));
            } else {
                // Verimlilik modu açıksa: Kritik komutları hatırlat, geri kalanı minimize et.
                skillsContent = "### [EFFICIENCY MODE: ON]\nTechnical skills are minimized. Focus on: File Ops, Chat/Archive, Cost Reporting.";
                manuel = "### [EFFICIENCY MODE: ON]\nSystem Commands Recall: You natively know tags like [SYSTEM_COMMAND]: /chat list, /file write, /cost report, and [CONFIG_UPDATE]: {\"efficiency_mode\": false}. Use them proactively.";
            }

            logger.info(`[PARSER] ${agentId} zihni sentezleniyor. Efficiency: ${isEfficiencyOn ? 'ON' : 'OFF'}`);

            // 3. Konfigürasyon ve Model Farkındalığı
            let activeConfigData = "Bilinmiyor";
            try {
                if(configRaw) {
                    const parsedConfig = JSON.parse(configRaw);
                    const activeModel = threadMetadata.model || parsedConfig.model;
                    const activeTemp = threadMetadata.temperature ?? parsedConfig.temperature ?? 0.7;
                    const activeThinking = threadMetadata.thinkingEnabled !== undefined ? threadMetadata.thinkingEnabled : parsedConfig.thinking_mode;
                    activeConfigData = `[AKTİF MODEL]: ${activeModel}\n[SICAKLIK]: ${activeTemp}\n[THINKING]: ${activeThinking ? 'AKTİF' : 'KAPALI'}\n[EFFICIENCY]: ${isEfficiencyOn ? 'AKTİF' : 'KAPALI'}`;
                }
            } catch(e) {}

            // 4. Sistem Promptu Montajı (Sıfır Gömülü Prompt)
            const promptParts = [
                "# SYSTEM INTERFACE & REAL-TIME DATA",
                `## 1. RECENT LOGS\n${logger.getRecentLogs() || "No logs."}`,
                `## 2. ACTIVE CONFIGURATION\n${activeConfigData}`,
                `## 3. SUPPORTED MODELS\n${modelsRaw || "{}"}`,
                "---",
                "# AGENT IDENTITY & PROTOCOLS",
                `## 4. CORE DNA (IDENTITY)\n${this._sterilize(dna)}`,
                `## 5. STRICT RULES\n${this._sterilize(rules)}`,
                `## 6. CAPABILITIES (SKILLS)\n${this._sterilize(skillsAwareness)}\n\n### ACTIVE SYSTEM TOOLS\n${this._sterilize(skillsContent)}`,
                `## 7. TECHNICAL MANUEL\n${this._sterilize(manuel)}`,
                "---",
                "# USER CONTEXT & MEMORY",
                // Global USER.md'den profil adını oku ve ajan USER.md'sine birleştir
                `## 8. USER PROFILE (USER.md)\n${await this._getEnrichedUserProfile(user)}`,
                `## 9. EVOLUTION & KAIZEN\n${this._sterilize(evalLog)}`,
                `## 10. FİZİKSEL ÇIKTI LİMİTİ VE ARAÇ ZORUNLULUĞU (MUTLAK KURAL)\n- FİZİKSEL SINIR: Sen bir LLM'sin ve tek bir araç çağrısında veya döngüde EN FAZLA ~15.000 karakter üretebilirsin. Daha fazlası API tarafından Kesilir.\n- KODLARI DÜŞÜNCEYE/SOHBETE YAZMA: Yazman istenen 40.000 - 50.000 karakterlik kodları ASLA sohbet yanıtı olarak veya Düşünce (Thinking) balonun içinde metin olarak yazma! Kodu yazmış sayılmazsın!\n- ÇÖZÜM VE ARAÇ KULLANIMI: Kodu GEREÇEKTEN yazmak için Sistemi mantıksal modüllere böl (\`db.js\`, \`ui.js\` vb.) ve KESİNLİKLE \`write_file\` vb. sistem araçlarını (Function Calling) art arda çağırarak diske kaydet. ReAct döngüsünü kullan (örn: db'yi yaz, bekle, ui'yi yaz). Kodu metin olarak sohbete basmak veya özetlemek YASAKTIR.\n- SİSTEMİ KENDİ KENDİNE SİMÜLE ETME (ROL ÇALMA YASAĞI): Zihninden uydurarak \`[Araç Sonucu]\` veya \`[SİSTEM MESAJI]\` veya \`[SİSTEM BİLGİSİ]\` gibi etiketler yazarak "İşlem başarılı" rolü yapman ve sistemi simüle etmen KESİNLİKLE YASAK! Sadece Function Call komutunu fırlatarak (veya aracı çağırarak) SUSACAKSIN! Sistem sana aracın gerçek sonucunu verecektir. Rol yapmak sistemi sonsuz döngüye sokup kilitler!\n- EYLEMSİZLİK YASASI (ÇOK KRİTİK): "Yapıyorum, inceliyorum, indiriyorum" gibi niyet bildiren bir metin yazarsan, O MESAJIN İÇİNDE %100 BİR ARAÇ (TOOL) ÇAĞIRMIŞ OLMAK ZORUNDASIN! Arka planda tool çağırmadan sadece süslü sözler söyleyip "Sistemi yamaladım" demek ağır bir kural ihlali ve halüsinasyondur!\n- ÇOK ADIMLI GÖREVLER (KESİNTİSİZLİK): Eğer sana "Ara, Bul, İndir ve Kur" gibi çok adımlı bir görev (4-5 döngüden uzun sürecek bile olsa) verildiyse, Asla 4. adımda sıkılıp "Geri kalanını sonra yapalım" diyerek döngüyü (ReAct) KESME! Döngünün metinle sonlanıp kapanmasına izin verme. Tüm adımlar bitene kadar art arda araçları (tools) çağırmaya devam et.\n- THINKING MODE & FUNCTION CALL KORUMASI: Eger bir araci (Function Call/Tool) kullanacaksan, bunu KESİNLİKLE düz metin halinde \`call:arac_adi\` formatında veya \`<thinking>\` bloklarının içine yazarak ÇAĞIRAMAZSIN! Sistem düz metne yazılan araç isimlerini anlamaz. Mutlaka ve sadece API'nin yerleşik JSON tabanlı "Function Calling / Tool Call" arayüzünü donanımsal olarak tetikleyeceksin!`
            ];

            return promptParts.join('\n\n');

        } catch (error) {
            logger.error(`[PARSER ERROR] Sentez hatasi:`, error);
            throw error;
        }
    },

    async loadConfig(agentId) {
        const confPath = path.join(WORKSPACE_DIR, agentId, 'Mind-Set_Core', 'config.json');
        const envPath = path.join(WORKSPACE_DIR, agentId, '.env');
        try {
            const data = await fs.readFile(confPath, 'utf8');
            const config = JSON.parse(data);
            
            // Per-agent .env desteği: API key .env'den okunur (config.json'dan değil)
            try {
                const envContent = await fs.readFile(envPath, 'utf8');
                const envLines = envContent.split('\n');
                for (const line of envLines) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const eqIdx = trimmed.indexOf('=');
                        if (eqIdx > 0) {
                            const key = trimmed.slice(0, eqIdx).trim();
                            const val = trimmed.slice(eqIdx + 1).trim();
                            if (key === 'GEMINI_API_KEY' && val) {
                                if (!config.api_key) config.api_key = val;
                            }
                        }
                    }
                }
            } catch {
                // .env yoksa config.json'daki api_key kullanılır (geriye uyumluluk)
            }
            
            // M6: Basit config validation — sessiz hataları önle
            const VALID_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro', 
                                  'gemini-3-flash-preview', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-preview'];
            if (config.model && !VALID_MODELS.includes(config.model)) {
                logger.warn(`[PARSER] ⚠️ ${agentId}: Bilinmeyen model "${config.model}" — gemini-2.5-flash'a düşürüldü.`);
                config.model = 'gemini-2.5-flash';
            }
            if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
                logger.warn(`[PARSER] ⚠️ ${agentId}: Geçersiz temperature ${config.temperature} — 0.7'ye ayarlandı.`);
                config.temperature = 0.7;
            }

            return config;
        } catch(error) {
            throw new Error(`AGENT_NOT_FOUND: ${agentId}`);
        }
    },

    async saveConfig(agentId, newConfig) {
        const confPath = path.join(WORKSPACE_DIR, agentId, 'Mind-Set_Core', 'config.json');
        try {
            await fs.writeFile(confPath, JSON.stringify(newConfig, null, 4), 'utf8');
            logger.info(`[PARSER] ${agentId} config guncellendi.`);
        } catch (error) {
            logger.error(`[PARSER HATA] Config kaydedilemedi:`, error);
        }
    },

    async _loadIsolatedSkills(agentId) {
        try {
            const loadedSkills = await SkillLoader.loadSkills(agentId);
            if (!loadedSkills || loadedSkills.length === 0) return "";
            
            let combined = "Aşağıdaki yetenekler (Function Calling API üzerinden donanımsal olarak) şu an senin kullanımına AKTİF edilmiştir:\n";
            for (const skill of loadedSkills) {
                combined += `- **${skill.name}** (Tip: ${skill.type || 'Sistem Aracı'}): ${skill.description || 'Açıklama yok'}\n`;
            }
            return combined;
        } catch (error) {
            logger.error(`[PARSER ERROR] Yetenek şemaları yüklenemedi:`, error);
            return "";
        }
    },

    _safeReadFile: async (filePath) => {
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch {
            return "";
        }
    },

    _sterilize: (content) => {
        if (!content) return "Veri bulunmadi.";
        return content.replace(/\r\n/g, '\n').trim();
    },

    /**
     * Global USER.md'den kullanıcının gerçek adını okur ve ajan USER.md içeriğiyle birleştirir.
     * Dashboard profili tüm ajanlara otomatik yansır — ajan başına USERNAME hardcode etmeye gerek yok.
     */
    async _getEnrichedUserProfile(agentUserContent) {
        let enriched = this._sterilize(agentUserContent);
        try {
            const globalUserMd = await fs.readFile(path.join(process.cwd(), 'USER.md'), 'utf8').catch(() => '');
            const nameMatch = globalUserMd.match(/\*\*İsim:\*\*\s*([^\n]+)/);
            if (nameMatch && nameMatch[1].trim()) {
                const realName = nameMatch[1].trim();
                // Ajan USER.md'sindeki eski "Komutan" veya başka hardcoded ismi override et
                enriched = enriched.replace(/Kullanıcının adı:\s*\*\*[^*]+\*\*/i, `Kullanıcının adı: **${realName}**`);
                // Ayrıca en üste hatırlatma ekle
                enriched = `[KULLANICI ADI: ${realName}]\n\n${enriched}`;
            }
        } catch (e) { /* global USER.md yoksa olduğu gibi bırak */ }
        return enriched;
    }
};
