const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'C:\\\\AgentsHUB\\\\app\\\\Workspace\\\\Muhtasar 02.2026.pdf';

if (!fs.existsSync(pdfPath)) {
    console.error('Dosya bulunamadi: ' + pdfPath);
    process.exit(1);
}

let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    console.log('--- PDF ICERIGI ---');
    console.log(data.text);
}).catch(function(error) {
    console.error('PDF Okuma Hatasi:', error);
});
