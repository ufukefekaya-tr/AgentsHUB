import fs from 'fs';
import path from 'path';

const DIR = 'C:/AgentsHUB/Marketplace/skills';

const paramDescriptions = {
    // web / internet
    url: "Ziyaret edilecek web sitesi adresi (örn: 'https://example.com/')",
    urls: "Kontrol edilecek veya izlenecek web adresleri listesi",
    query: "Arama motorunda aranacak kelime veya cümle (örn: 'Türkiye güncel haberler')",
    keyword: "Aramada kullanılacak anahtar kelime",
    slug: "Yeteneğin (skill) Clawhub mağazasındaki benzersiz id/adı",
    search_depth: "Tavily aramasının derinlik seviyesi ('basic' veya 'advanced')",
    include_answer: "Arama sonucuna yapay zeka tarafından hazırlanmış özetin dahil edilip edilmeyeceği",
    
    // tarayıcı
    max_length: "Sayfadan okunacak maksimum karakter sayısı",
    extract_text: "Sayfa yüklendiğinde metnin otomatik çekilip çekilmeyeceği (true/false)",
    run_script: "Açılan web sayfasında çalıştırılacak özel JavaScript kodu",
    wait_for_selector: "Tarayıcının yüklenmesini bekleyeceği CSS belirteci (selector)",

    // dosya / sistem
    action: "Yapılacak işlem türü (örn: 'read', 'write', 'execute', 'list', 'delete', 'capture', 'install', 'uninstall')",
    file_path: "Bilgisayardaki dosya veya klasörün tam yolu (örn: 'C:/Users/Belge.txt')",
    command: "Çalıştırılacak terminal veya PowerShell komutu",
    content: "Dosyaya yazılacak veya sisteme eklenecek metin içeriği",
    max_pages: "İşlenecek veya okunacak maksimum sayfa sayısı",
    custom_filename: "Kaydedilecek özel dosya adı",
    metric: "İzlenecek sistem kaynağı (örn: 'cpu', 'ram', 'disk', 'all')",

    // iletişim / hesaplar
    to: "E-posta gönderilecek alıcının e-posta adresi",
    subject: "Gönderilecek e-postanın konusu",
    body: "Gönderilecek e-postanın içerik metni",
    service: "Bağlanılacak Google servisi ('gmail', 'drive', 'calendar')",
    operation: "Servis üzerinde yapılacak işlem ('list', 'read', 'create')",
    parameters: "Yapılacak işlem için gereken JSON/Obje parametreleri",

    // genel / yetenekler
    expression: "Hesaplanacak matematiksel ifade (örn: '15*4+max(10,5)')",
    city: "Hava durumu gibi sorgular için hedef şehir adı (örn: 'Istanbul')",
    timezone: "İstenen zaman dilimi (örn: 'Europe/Istanbul')",
    skill_name: "Oluşturulacak eklenti/yeteneğin kısa adı",
    description: "Yeteneğin veya işin kısa bir açıklaması",
    code_content: "Çalıştırılacak veya eklentiye yazılacak JavaScript kodu özellikleri",
    src_code: "Sistemde çalıştırılacak Python kaynak kodu",
    key_idea: "Hafızaya (UMI) eklenecek bilginin kısa başlığı (örn: 'isim')",
    memory_content: "Hafızaya kaydedilecek bilgilerin tam metni",
    
    // ajanlar arası
    target_agent_id: "İletişim kurulacak, mesaj gönderilecek diğer ajanın ID numarası",
    message: "Diğer ajana gönderilecek mesaj veya görev detayı",
    priority: "Gönderilen mesajın öncelik seviyesi ('low', 'normal', 'high', 'critical')",

    // mcp
    mcp_server_url: "Bağlanılacak Model Context Protocol (MCP) sunucu adresi",
    method: "Çalıştırılacak MCP metodu",
    payload: "Metoda gönderilecek JSON taşıma yükü (payload)",
    
    // varsayilan
    check_timeout_ms: "Zaman aşımı süresi (milisaniye cinsinden)",
    summary_mode: "Detaylar yerine kısa özet isteniyorsa (true/false)"
};

async function fixSchemas() {
    let successCount = 0;
    
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js'));
    for (let f of files) {
        const filePath = path.join(DIR, f);
        let content = fs.readFileSync(filePath, 'utf8');
        
        let modified = false;

        // Regex that parses property descriptions. 
        // We look for: [param_name]: { ... description: "BROKEN EMOJI DESCRIPTION"  }
        // Since we messed up using a global replace of description: "...", let's fix ANY description under schema properties.
        // It's safer to just replace broken descriptions one line at a time if it matches a param name from our dict.
        
        const lines = content.split('\\n');
        for (let i = 0; i < lines.length; i++) {
            // Find lines that look like a property definition (e.g. " url: { type: 'string', description: '...' }")
            // Or look for lines with "description:" in a nested context. 
            // To be accurate, we'll check if the line contains a broken emoji starting description: 
            // 🧠|🦁|🌐|💻|🧮|📦|📋|🦆|📧|🕐|🐙|🔍|☁️|🛡️|🌉|📄|🐍|📸|📡|✨|📊|🌤️|🔗|💾
            
            if (lines[i].includes('description:') && lines[i].match(/(🧠|🦁|🌐|💻|🧮|📦|📋|🦆|📧|🕐|🐙|🔍|☁️|🛡️|🌉|📄|🐍|📸|📡|✨|📊|🌤️|🔗|💾)/)) {
                
                // Exclude the top level module description.
                // Usually the top level description is like "    description: " or "description:" right inside the top level object.
                // If it has "type:" in the same line, or is deeply indented, it's definitely a property description.
                if (lines[i].includes('type:') || lines[i].match(/^\\s{6,}/)) {
                    
                    // We need to figure out which parameter this belongs to.
                    // Usually the line looks like: url: { type: "string", description: "..." }
                    // OR the previous lines had the parameter name.
                    let paramName = null;
                    
                    // check the current line for param name
                    let match = lines[i].match(/^\\s*(\\w+):\\s*\\{/);
                    if (match) paramName = match[1];
                    
                    if (!paramName) {
                       // search up to 4 lines above for properties: 
                       for (let j = 1; j <= 4; j++) {
                           if (i-j >= 0) {
                               let upMatch = lines[i-j].match(/^\\s*(\\w+):\\s*\\{/);
                               if (upMatch && !lines[i-j].includes('properties:')) {
                                   paramName = upMatch[1];
                                   break;
                               }
                           }
                       }
                    }
                    
                    if (paramName && paramDescriptions[paramName]) {
                        // replace the description part with the correct parametric description!
                        lines[i] = lines[i].replace(/description:\s*(['"`]).*?\1/, \`description: "\${paramDescriptions[paramName]}"\`);
                        modified = true;
                    } else if (paramName) {
                        // Fallback description for unknown parameter
                        lines[i] = lines[i].replace(/description:\s*(['"`]).*?\1/, \`description: "\${paramName} için giriş parametresi."\`);
                        modified = true;
                    }
                }
            }
        }
        
        if (modified) {
            fs.writeFileSync(filePath, lines.join('\\n'), 'utf8');
            console.log("FIXED SCHEMA: " + f);
            successCount++;
        }
    }
    
    console.log("Total Fixed: " + successCount);
}

fixSchemas();
