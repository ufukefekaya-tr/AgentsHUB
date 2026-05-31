import fs from 'fs/promises';
import path from 'path';

const DIR = 'C:/AgentsHUB/Marketplace/skills';

const updates = [
    { file: 'auto_capture.js', newStr: '🧠 HAFIZA KAYIT — Birlikte çalıştığı insan ile olan deneyimlerini (ilgi alanları, tercihi vb.) kayıt eder. Müşteriyi tanır ve bir daha ne sevdiğini veya ne istemediğini sormaz. Hiç kurulum gerektirmez.' },
    { file: 'brave_search.js', newStr: '🦁 GİZLİ İNTERNET ARAMASI (Brave) — İnternette reklamsız ve takip edilmeden arama yapar. ⚠️ ÜCRETLİ VEYA ÜYELİK GEREKTİRİR. Gelişmiş kullanıcı değilseniz bedava olan Google veya DuckDuckGo yeteneklerinden birini tercih ediniz.' },
    { file: 'browser_agent.js', newStr: '🌐 TARAYICI BOTU — Gerçek bir kullanıcı gibi siteye girer, düğmelere tıklar, gizli sayfaları okur. İleri düzey sayfa analiz aracıdır. ⚠️ Sistemde Playwright yüklü değilse çöker. Normal okuma için Web Okuyucu kullanın.' },
    { file: 'byterover.js', newStr: '💻 BİLGİSAYAR ASİSTANI — Ajana bilgisayarınıza dokunma hakkı verirsiniz. İstediğiniz klasörü açar, belge kaydeder veya siler. Sizin yerinize işlemler yapar. BU YETENEK KESİNLİKLE KURULMALIDIR.' },
    { file: 'calculator.js', newStr: '🧮 HESAP MAKİNESİ — Basit ve karmaşık matematik hesabı yapar. Toplama, çıkarma, borsa yüzde hesabı gibi işlerde kullanılır. Matematik işlemleri için temel hesaplama aracıdır.' },
    { file: 'clawhub_installer.js', newStr: '📦 YETENEK YÜKLEYİCİ — 28 yeteneğin bulunduğu mağazada ajanın yetenek yüklemesini veya kaldırmasını sağlar. Normal bir çalışmada BU YETENEK KESİNLİKLE KURULU OLMALIDIR.' },
    { file: 'clawhub_remote.js', newStr: '🌐 UZAK YETENEK MAĞAZASI — Bulut üzerindeki uzak mağazada ajanın yeni özellik bulup bilgisayarınıza indirmesini sağlar. Her gün yeni yetenekler eklendiği için tavsiye edilir.' },
    { file: 'clipboard.js', newStr: '📋 KOPYALA/YAPIŞTIR — Bilgisayarda mouse ile kopyaladığınız bir metni (Ctrl+C) ajanın da form doldurmak veya okumak için görebilmesini sağlar. Ya da ajan size metin kopyalayıp verebilir.' },
    { file: 'duckduckgo_search.js', newStr: '🦆 ÜCRETSİZ İNTERNET ARAMA (DuckDuckGo) — Hiç bir üyelik işlemi yapmadan BEDAVAYA internette güncel bilgi araması yapar. Kurması en kolay arama eklentisidir.' },
    { file: 'email_manager.js', newStr: '📧 E-POSTA GÖNDERİCİ — Ajanın sizin mail adresinizden (Örn: yandex, outlook, gmail) müşterinize otomatik teklif veya bilgi maili atmasını sağlar. ⚠️ Ayarlar sekmesinde STMP (Şifre vb.) kurulumu gerektirir.' },
    { file: 'get_time.js', newStr: '🕐 SAAT SORGULAYICI — \\"Şu an saat kaç\\" veya \\"Bugün günlerden ne\\" dediğinizde ajanı uyarır ve güncel zamanı söyler. Kurulması önerilen çok hafif ve gerekli bir araçtır.' },
    { file: 'github_manager.js', newStr: '🐙 GİTHUB YARDIMCISI — Sadece bilgisayar programcıları (Yazılımcılar) içindir. Yazılımcı değilseniz DİKKATE ALMAYINIZ. Github üzerinde kod okur, hata bildirir veya düzeltme isteği yollar.' },
    { file: 'google_search.js', newStr: '🔍 GOOGLE ARAMASI — (EN İYİ VE ÜCRETSİZ ARAMA) Yapay zekanın yerleşik arama özelliğini açar. Anlık haber, yağmur durumu, hisse senedi fiyatı gibi sorguları hemen ve ücretsiz özetleyerek cevaplar.' },
    { file: 'google_workspace.js', newStr: '☁️ GOOGLE ASİSTANI — Google hesabınıza erişerek (Google Drive, Gmail, Google Takvim) ajanın sizin adınıza doküman okumasını, mail atmasını sağlar. ⚠️ Google Cloud API gerektirir. Çok tecrübeli değilseniz önermeyiz.' },
    { file: 'health_checker.js', newStr: '🛡️ SİTE/SERVİS İZLEYİCİ — Web sitenizin çökerse size haber vermesini sağlayan bir kontroldür. \\"Benim uygulama çalışıyor mu\\" gibi sorular için sunucu yöneticileri tarafından kullanılır.' },
    { file: 'mcp_bridge.js', newStr: '🌉 MCP BAĞLANTISI — İleri seviye bir yazılım teknolojisidir. Teknik bilgisi olmayan kullanıcılar BU YETENEĞİ KESİNLİKLE KURMAMALIDIR. Dikkate almayınız.' },
    { file: 'pdf_extractor.js', newStr: '📄 PDF OKUYUCU (GELİŞMİŞ) — Bilgisayardaki PDF dosyalarından hatasız okuma yapar. Uzun sayfaları bile anlar. ⚠️ Çalışması için ek eklentilerine ihtiyacı vardır (Teknik Bilgi İster).' },
    { file: 'pdf_reader.js', newStr: '📄 PDF OKUYUCU (BASİT) — Bilgisayarda hiç eklenti kurmadan doğrudan PDF belgelerini okuyan yetenektir. 10 saniyede çalışır. Ancak karmaşık resimli dosyaları düzgün okuyamayabilir.' },
    { file: 'python_runner.js', newStr: '🐍 PYTHON ÇALIŞTIRICI — Ajanın veri analizi veya özel işler için Python kodları yazıp oynatmasını sağlar. ⚠️ Bilgisayarınızda Python programı yüklü değilse BU EKLENTİ ÇALIŞMAZ.' },
    { file: 'screenshot.js', newStr: '📸 EKRAN FOTOĞRAFÇISI — Sadece mesaj yazmak yerine ajana \\"Ekranın resmini çeksene hatayı gör\\" diye komut verdiğinizde ekranınızın fotoğrafını okur inceler. Sadece Windows İşletim Sisteminde Çalışır.' },
    { file: 'signal_agent.js', newStr: '📡 AJANLAR ARASI MESAJLAŞMA — Ajanın yapamadığı spesifik bir işi, şirketteki diğer uzman ajana devretmesini sağlar. Sadece 1 ajan kullanıyorsanız faydasızdır.' },
    { file: 'skill_creator.js', newStr: '✨ YETENEK ÜRETİCİ — Ajana istediğiniz bir iş programını söylerseniz anında o programın yeteneğini yazar ve kendine kaydeder. Örneğin: \\"Bana döviz fiyatlarını okuyacak ufak program yaz\\" vb...' },
    { file: 'system_monitor.js', newStr: '📊 BİLGİSAYAR DOKTORU — RAM kaç GB dolu, Harddisk dolmuş mu, Cihaz yavaşlamış mı gibi teknik durumları size söyler. Sadece Windows bilgisayarlarda çalışır.' },
    { file: 'tavily_search.js', newStr: '🔍 AKILLI ARAMA (Tavily) — Zeka kullanarak araştırma ve ödevler için inanılmaz detaylı cevaplar getiren akıllı arama motorudur. ⚠️ TAVILY.COM sitesine gidip ücretsiz üyelik ve API ANAHTARI girilmesi ZORUNLUDUR.' },
    { file: 'url_opener.js', newStr: '🔗 İNTERNET SAYFASI AÇICI — Bilgisayarda Google, Youtube, Wikipedia vs ajanın kendi kendine tıklayıp ekranınızda açmasını sağlar. Siz ekranda izlersiniz. Ama ajan içeriği OKUYAMAZ.' },
    { file: 'weather.js', newStr: '🌤️ HAVA TAHMİNİ — Günlük 3 veya 5 günlük hava durumu tahminini şehir söylemenizle birlikte söyler. Hiç bir üyelik ya da ücret istemez. Ücretsiz temel özelliktir.' },
    { file: 'web_scraper.js', newStr: '🌐 WEB SAYFASI İNCELEYİCİ (Basit) — İnternetteki basit siteleri veya bir haberi, makaleyi saniyeler içinde okuyup ajana yansıtır. Banka, Devlet Sitesi gibi girmesi şifreli veya korumalı yerleri OKUYAMAZ.' },
    { file: 'write_file.js', newStr: '💾 RAPOR KAYDEDİCİ — Ajanın çıkardığı özetleri veya raporları bilgisayarınızda bir Txt veya Word dosyası gibi yazıp kaydetmesini sağlar. Dosya işlemleri için gereklidir.' }
];

async function updateDescriptions() {
    let success = 0;
    let fail = 0;

    for (let item of updates) {
        let fPath = path.join(DIR, item.file);
        try {
            let content = await fs.readFile(fPath, 'utf8');
            
            // Regex to match description field, being careful with newlines or mixed quotes
            // Match `description: "..."` or `description: '...'` or `description: ...`
            const replaced = content.replace(/description:\s*(['"`]).*?\1/gs, `description: "${item.newStr}"`);
            
            if (content === replaced) {
                console.log('Skipped/NoMatch: ' + item.file);
                fail++;
            } else {
                await fs.writeFile(fPath, replaced, 'utf8');
                console.log('UPDATED: ' + item.file);
                success++;
            }
        } catch(e) {
            console.log('ERROR (' + item.file + '): ' + e.message);
            fail++;
        }
    }
    
    console.log('\\nTotal Updated: ' + success + ' Failed: ' + fail);
}

updateDescriptions();
