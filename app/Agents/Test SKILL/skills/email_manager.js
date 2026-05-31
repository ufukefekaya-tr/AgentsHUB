/*
name: "email_manager"
description: "IMAP (okuma) ve SMTP (gönderme) protokolleri üzerinden e-posta hesaplarını (Outlook, Yandex vb.) otonom yönetir."
category: "communication"
emoji: "📧"
tags: ["email", "smtp", "imap", "mail"]
version: "1.0.0"
*/
import nodemailer from 'nodemailer';

export const action = async (args) => {
    try {
        const { operation, to, subject, body } = args;
        
        // Settings from ENV
        const SMTP_HOST = process.env.SMTP_HOST;
        const SMTP_USER = process.env.SMTP_USER;
        const SMTP_PASS = process.env.SMTP_PASS;

        if (!SMTP_HOST || !SMTP_USER) {
            return "[E-MAIL HATASI]: SMTP_HOST veya SMTP_USER ortam değişkenleri ayarlanmamış.";
        }

        if (operation === 'send') {
            if (!to || !subject || !body) return "[E-MAIL HATASI]: Gönderme işlemi için 'to', 'subject' ve 'body' gereklidir.";
            
            const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user: SMTP_USER, pass: SMTP_PASS }
            });

            const info = await transporter.sendMail({
                from: `"AgentsHUB" <${SMTP_USER}>`,
                to,
                subject,
                text: body
            });

            return `[E-MAIL GÖNDERİLDİ]: Mesaj başarıyla iletildi. (ID: ${info.messageId})`;
        } else if (operation === 'read') {
            // imapflow implementasyonu gelecekte eklenecek, asgari SMTP teslimi sağlandı
            return "[E-MAIL BİLGİ]: Okuma (IMAP) yeteneği yapılandırılmamış, şu anda sadece SMTP gönderimi destekleniyor.";
        }
        
    } catch(e) {
        return `[E-MAIL MANAGER ERROR]: ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        operation: { type: "string", enum: ["send", "read"], description: "İşlem türü" },
        to: { type: "string", description: "Alıcı e-posta adresi (send işlemi için)" },
        subject: { type: "string", description: "E-posta konusu (send işlemi için)" },
        body: { type: "string", description: "E-posta metni (send işlemi için)" }
    },
    required: ["operation"]
};
