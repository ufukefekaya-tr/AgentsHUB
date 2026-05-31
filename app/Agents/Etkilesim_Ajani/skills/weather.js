/**
 * WEATHER Skill — Hava durumu bilgisi (Open-Meteo ücretsiz API)
 * API key gerektirmez. Geocoding + Weather API.
 * @version 1.2.0
 * @category information
 */

export const skill = {
    name: "weather",
    version: "1.2.0",
    category: "information",
    tags: ["hava", "sicaklik", "tahmin", "meteoroloji"],
    emoji: "🌤️",
    requires: { network: true },
    description: "Belirtilen sehir icin guncel hava durumu ve 3 gunluk tahmin getirir. Sicaklik (gercek ve hissedilen), nem, ruzgar hizi, yagis miktari, basinc ve hava durumu kodu bilgilerini icerir. Open-Meteo ucretsiz API kullanir, API key GEREKMEZ. Sehir adiyla calisir (ornek: 'Istanbul', 'Ankara', 'London', 'New York'). Koordinat veya posta kodu KABUL ETMEZ.",
    parameters: {
        type: "object",
        properties: {
            city: {
                type: "string",
                description: "Hava durumu sorgulanacak sehir adi. Ornek: 'Istanbul', 'Ankara', 'London'"
            }
        },
        required: ["city"]
    },
    execute: async (args) => {
        try {
            if (!args.city) return "[HATA] Şehir adı belirtilmedi.";
            
            const city = encodeURIComponent(args.city.trim());
            
            // 1. Geocoding: Şehir adını koordinata çevir
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=tr`, { signal: AbortSignal.timeout(10000) });
            const geoData = await geoRes.json();
            
            if (!geoData.results || geoData.results.length === 0) {
                return `[HATA] "${args.city}" şehri bulunamadı. Lütfen doğru şehir adı girin.`;
            }
            
            const loc = geoData.results[0];
            const { latitude, longitude, name: locName, country } = loc;
            
            // 2. Weather: Koordinattan hava durumu çek
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=3`;
            const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(10000) });
            const data = await weatherRes.json();
            
            if (!data.current) {
                return `[HATA] Hava durumu verisi alınamadı.`;
            }
            
            const c = data.current;
            
            // WMO hava kodu → Türkçe açıklama
            const wmoDesc = {
                0: 'Açık', 1: 'Çoğunlukla açık', 2: 'Parçalı bulutlu', 3: 'Kapalı',
                45: 'Sisli', 48: 'Kırağılı sis',
                51: 'Hafif çisenti', 53: 'Orta çisenti', 55: 'Yoğun çisenti',
                61: 'Hafif yağmur', 63: 'Orta yağmur', 65: 'Şiddetli yağmur',
                71: 'Hafif kar', 73: 'Orta kar', 75: 'Yoğun kar',
                80: 'Hafif sağanak', 81: 'Orta sağanak', 82: 'Şiddetli sağanak',
                95: 'Gök gürültülü fırtına', 96: 'Dolu ile fırtına', 99: 'Şiddetli dolu'
            };
            
            const desc = wmoDesc[c.weather_code] || `Kod: ${c.weather_code}`;
            
            const report = [
                `📍 ${locName}, ${country}`,
                `🌡️ Sıcaklık: ${c.temperature_2m}°C (Hissedilen: ${c.apparent_temperature}°C)`,
                `☁️ Durum: ${desc}`,
                `💧 Nem: %${c.relative_humidity_2m}`,
                `💨 Rüzgar: ${c.wind_speed_10m} km/s`,
                `🌧️ Yağış: ${c.precipitation} mm`,
                `🔵 Basınç: ${c.surface_pressure} hPa`
            ].join('\n');
            
            // 3 günlük tahmin
            let forecast = '';
            if (data.daily) {
                forecast = '\n\n📅 3 Günlük Tahmin:';
                for (let i = 0; i < Math.min(3, data.daily.time.length); i++) {
                    const dayDesc = wmoDesc[data.daily.weather_code[i]] || '?';
                    forecast += `\n  ${data.daily.time[i]}: ${data.daily.temperature_2m_min[i]}°C / ${data.daily.temperature_2m_max[i]}°C — ${dayDesc}`;
                }
            }
            
            return `[HAVA DURUMU]\n${report}${forecast}`;
        } catch (error) {
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                return `[HATA] Hava durumu servisi zaman aşımına uğradı.`;
            }
            return `[HATA] Hava durumu alınamadı: ${error.message}`;
        }
    }
};
