const fs = require('fs');
const pdfParse = require('pdf-parse');
const buffer = fs.readFileSync('C:\\\\AgentsHUB\\\\app\\\\Workspace\\\\Muhtasar 02.2026.pdf');
pdfParse(buffer).then(data => {
    console.log("--- TEXT START ---");
    console.log(data.text);
    console.log("--- TEXT END ---");
}).catch(e => console.error("PARSE ERROR:", e));