const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'C:/Users/casper/Downloads/Muhtasar 02.2026.pdf';

if (!fs.existsSync(pdfPath)) {
    console.error('Hata: Dosya bulunamadı -> ' + pdfPath);
    process.exit(1);
}

let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    console.log('---METIN_BASLANGICI---');
    console.log(data.text);
    console.log('---METIN_BITISI---');
}).catch(err => {
    console.error('PDF İşleme Hatası:', err);
});