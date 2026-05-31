/*
name: "email_manager"
description: "📧 E-POSTA GÖNDERİCİ — Ajanın sizin mail adresinizden (Örn: yandex, outlook, gmail) müşterinize otomatik teklif veya bilgi maili atmasını sağlar. ⚠️ Ayarlar sekmesinde STMP (Şifre vb.) kurulumu gerektirir."
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

        if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
            return `[SİSTEM BİLGİSİ - SMTP AYARLARI EKSİK]
E-posta gönderme/okuma işlemi yapabilmem için SMTP kimlik bilgileri ortamda tanımlı değil. Lütfen kullanıcıya "E-posta gönderemedim" gibi basit bir hata vermek yerine şu uzman rehberliği sun:
1. Hangi mail sağlayıcısını kullandığını sor (Gmail, Yandex, Outlook vb.).
2. Gmail kullanıyorsa (veya 2FA açık hesaplarda) "Uygulama Şifresi" (App Password) oluşturulması gerektiğini açıkla.
3. Gmail için "https://myaccount.google.com/apppasswords" sayfasını url_opener ile açmayı teklif et (ya da linki ver). Müşteriye şifrenin nasıl ekleneceği adım adım göster.
4. Elde edilen Uygulama Şifresi ve E-posta adresinin, sistem ayarlarında (SMTP_USER, SMTP_PASS, SMTP_HOST) güncellenmesi gerektiğini vurgula.`;
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
        operation: { type: "string", enum: ["send", "read"], description: "Servis üzerinde yapılacak işlem ('list', 'read', 'create')" },
        to: { type: "string", description: "E-posta gönderilecek alıcının e-posta adresi" },
        subject: { type: "string", description: "Gönderilecek e-postanın konusu" },
        body: { type: "string", description: "Gönderilecek e-postanın içerik metni" }
    },
    required: ["operation"]
};
