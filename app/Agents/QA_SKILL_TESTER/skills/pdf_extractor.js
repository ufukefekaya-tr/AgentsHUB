/*
name: "pdf_extractor"
description: "PDF belgelerini okur, geliştirilmiş metin ayrıştırma (parse) işlemleri yapar ve sayfa limitleriyle çalışır."
category: "file"
emoji: "📄"
tags: ["pdf", "reader", "extractor", "document"]
version: "1.5.0"
*/
import fs from 'fs/promises';
import path from 'path';
import { PDFParse } from 'pdf-parse';

export const action = async (args) => {
    try {
        const { file_path, max_pages = 10, summary_mode = false } = args;
        
        try {
            await fs.access(file_path);
        } catch {
            return `[HATA] PDF dosyasi bulunamadi: ${file_path}`;
        }
        
        if (!file_path.toLowerCase().endsWith('.pdf')) {
            return `[HATA] Dosya bir PDF degil: ${file_path}`;
        }

        const dataBuffer = await fs.readFile(file_path);
        
        const parser = new PDFParse({ data: dataBuffer });
        
        let dataText, dataInfo;
        try {
            const txtRes = await parser.getText({ max: max_pages });
            dataText = txtRes.text;
            dataInfo = await parser.getInfo();
        } finally {
            await parser.destroy();
        }
        
        let content = dataText.trim();
        let notice = "";

        // Token limiti veya max character limit (8000 civarı genelde yeterlidir L1 cache için)
        if (content.length > 10000) {
            if (summary_mode) {
                content = content.slice(0, 10000) + "\n... [ÖZET MODU: Daha fazlası kesildi]";
                notice = "Belge çok uzun olduğu için özet modunda 10.000 karaktere kırpıldı.";
            } else {
                content = content.slice(0, 15000) + "\n... [UZUNLUK LİMİTİ KESİNTİSİ]";
                notice = "Maksimum karakter sınırına ulaşıldı (15K). Devamını okumak farklı bir sayfa aralığı veya harici bir yöntem denemeyi gerektirebilir.";
            }
        }

        return `[PDF OKUNDU] 
Dosya: ${path.basename(file_path)}
Toplam Sayfa: ${dataInfo?.numPages || '?'}
Okunan Sayfa: ${max_pages > (dataInfo?.numPages || 0) ? (dataInfo?.numPages || '?') : max_pages}
Yazar: ${dataInfo?.info?.Author || 'Bilinmiyor'}
Başlık: ${dataInfo?.info?.Title || 'Bilinmiyor'}
Düzeltme: ${notice}

--- METİN İÇERİĞİ ---
${content}
`;
    } catch(e) {
        return `[PDF EXTRACTOR HATASI] ${e.message}`;
    }
};

export const schema = {
    type: "object",
    properties: {
        file_path: { type: "string", description: "Okunacak PDF dosyasının tam yerel dosya yolu (örn: C:/Users/Docs/rapor.pdf)." },
        max_pages: { type: "number", description: "Okunacak maksimum sayfa sayısı. (Default 10, çok yüksek sayılar sistemi kilitler)." },
        summary_mode: { type: "boolean", description: "Sadece kısa bir giriş özeti için sayfayı küçük bir karakter limitine kırpar." }
    },
    required: ["file_path"]
};
