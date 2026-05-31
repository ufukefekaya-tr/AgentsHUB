/*
name: "google_workspace"
description: "☁️ GOOGLE ASİSTANI — Google hesabınıza erişerek (Google Drive, Gmail, Google Takvim) ajanın sizin adınıza doküman okumasını, mail atmasını sağlar. ⚠️ Google Cloud API gerektirir. Çok tecrübeli değilseniz önermeyiz."
category: "productivity"
emoji: "☁️"
tags: ["google", "drive", "email", "calendar"]
version: "1.0.0"
*/
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

export const action = async (args, context) => {
    try {
        const agentId = context.agentId || "Global";
        const tokenPath = path.join(process.cwd(), 'Agents', agentId, 'Mind-Set_Core', 'google_token.json');
        
        // Basit yetki denetimi
        let tokens;
        try {
            tokens = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
        } catch {
            return `[SİSTEM BİLGİSİ - GOOGLE OAUTH EKSİK]
Google Workspace (Drive/Gmail/Calendar) erişimi için gerekli OAuth token yapılandırması ortamda bulunamadı. Lütfen kullanıcıya bunu "hata" olarak değil, bir öğrenme fırsatı olarak sun ve şu rehberliği sağla:
1. Google API entegrasyonu sunucu tarafında henüz yapılandırılmadığı için yeteneğin kapalı olduğunu söyle.
2. Google Cloud Console (https://console.cloud.google.com/) üzerinden bir proje oluşturulup ilgili API'lerin (Drive, Gmail vb.) aktifleştirilmesi gerektiğini basit dille anlat.
3. Ardından OAuth 2.0 İstemci Kimliği (Client ID) alınması gerektiğini vurgula. (url_opener ile Cloud Console'u açabileceğini teklif et).`;
        }

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oAuth2Client.setCredentials(tokens);

        const { service, operation, parameters } = args;

        if (service === 'drive') {
            const drive = google.drive({ version: 'v3', auth: oAuth2Client });
            if (operation === 'list') {
                const res = await drive.files.list({ pageSize: 10, fields: 'nextPageToken, files(id, name)' });
                return res.data.files.length ? res.data.files.map(f => `${f.name} (${f.id})`).join('\n') : 'Dosya yok.';
            }
        } else if (service === 'gmail') {
            const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
            if (operation === 'read') {
                const res = await gmail.users.messages.list({ userId: 'me', maxResults: 5 });
                return res.data.messages ? `Son 5 mesaj ID'leri: ${res.data.messages.map(m => m.id).join(', ')}` : 'Mesaj yok.';
            }
        } else if (service === 'calendar') {
             const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
             if (operation === 'list') {
                 const res = await calendar.events.list({ calendarId: 'primary', timeMin: new Date().toISOString(), maxResults: 10, singleEvents: true, orderBy: 'startTime' });
                 return res.data.items.length ? res.data.items.map(e => `${e.summary} (${e.start.dateTime || e.start.date})`).join('\n') : 'Yaklaşan etkinlik yok.';
             }
        }
        
        return `[GOOGLE WORKSPACE]: İstek desteklenmiyor (Servis: ${service}, İşlem: ${operation})`;
    } catch(e) {
        return `[Google Yetki Hatası]: Token geçersiz veya işlem yapılamadı. Detay: ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        service: { type: "string", enum: ["drive", "gmail", "calendar"], description: "Bağlanılacak Google servisi ('gmail', 'drive', 'calendar')" },
        operation: { type: "string", enum: ["list", "read", "create"], description: "Servis üzerinde yapılacak işlem ('list', 'read', 'create')" },
        parameters: { type: "string", description: "Yapılacak işlem için gereken JSON/Obje parametreleri" }
    },
    required: ["service", "operation"]
};
