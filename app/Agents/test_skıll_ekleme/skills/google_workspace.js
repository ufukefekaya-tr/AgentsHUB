/*
name: "google_workspace"
description: "Otomatik OAuth aracılığıyla Google Drive, Gmail ve Calendar servislerine read/write erişimi sağlar."
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
            return `[GOOGLE WORKSPACE HATASI]: OAuth token bulunamadı. Lütfen Mimar tarafından Dashboard üzerinden Google Hesabı Bağla (OAuth) işlemi yapılmasını isteyin. (Dosya: ${tokenPath} eksik)`;
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
        service: { type: "string", enum: ["drive", "gmail", "calendar"], description: "Kullanılacak Google servisi" },
        operation: { type: "string", enum: ["list", "read", "create"], description: "Yapılacak işlem türü" },
        parameters: { type: "string", description: "JSON formatında işlem spesifik parametreler (örn: dosya id)" }
    },
    required: ["service", "operation"]
};
