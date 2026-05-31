const http = require('http');
const fs = require('fs');

const msg = 'write_file aracini kullan. filename: "sigma_pathguard_test.txt", content: "PATHGUARD_OK_2026"';
const b = JSON.stringify({message: msg});

console.log('Istek gonderiliyor...');
const req = http.request({hostname:'localhost',port:3434,path:'/api/agents/SIGMA_TESTER_V1/chat',method:'POST',
  headers:{'Content-Type':'application/json','X-API-Key':'agentshub_secure_key_2026','Content-Length':Buffer.byteLength(b)}}, res => {
  let all='', toolCalls=[], toolResults=[];
  let buf='';
  res.on('data', ch => {
    buf += ch.toString();
    const lines = buf.split('\n');
    buf = lines.pop();
    for(const l of lines){
      if(!l.startsWith('data: ')) continue;
      try {
        const j = JSON.parse(l.slice(6));
        if(j.type==='tool_call') { toolCalls.push(j.name); console.log('>>> TOOL_CALL:', j.name, JSON.stringify(j.args).slice(0,200)); }
        if(j.type==='tool_result') { toolResults.push(j.result); console.log('>>> TOOL_RESULT:', String(j.result).slice(0,200)); }
        if(j.content !== undefined && !j.partial) { all = j.content; }
      } catch{}
    }
  });
  res.on('end', () => {
    console.log('\n=== SONUC ===');
    console.log('Tool tetiklendi:', toolCalls.length > 0 ? toolCalls.join(', ') : 'HICBIRI');
    console.log('Tool sonuc sayisi:', toolResults.length);
    console.log('Content (ilk 300):', all.slice(0,300).replace(/\n/g,' '));

    // Dosya kontrolu
    const paths = [
      'C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1/sigma_pathguard_test.txt',
      'C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1/Workspace/sigma_pathguard_test.txt'
    ];
    let found = false;
    for(const p of paths) {
      if(fs.existsSync(p)) {
        console.log('DOSYA BULUNDU:', p);
        console.log('ICERIK:', fs.readFileSync(p,'utf8'));
        found = true;
        break;
      }
    }
    if(!found) console.log('DOSYA BULUNAMADI — her iki lokasyon kontrol edildi');
  });
});
req.on('error', e => console.log('ERR:', e.message));
req.write(b);
req.end();
