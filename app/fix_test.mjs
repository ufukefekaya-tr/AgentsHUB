import fs from 'fs';

const API = 'http://localhost:3434/api/agents/QA_ATLAS_V3/chat';
const H = {'x-api-key':'agentshub_secure_key_2026','Content-Type':'application/json'};

async function ask(msg) {
  console.log('\n[USER]:', msg);
  const r = await fetch(API, {method:'POST', headers:H, body:JSON.stringify({message: msg})});
  const t = await r.text();
  
  const lines = t.split('\n');
  let finalRes = '';
  for(const l of lines) {
     if(l.startsWith('data: ')) {
        try {
           const p = JSON.parse(l.replace('data: ',''));
           if(p.type === 'stream' && p.content) finalRes += p.content;
           if(p.content && !p.type) finalRes = p.content; // fallback
        } catch(e) {}
     }
  }
  
  if(!finalRes) {
    // maybe it sent it in the first 'data' packet
    for(const l of lines) {
       if(l.startsWith('data: ')) {
          try {
             const p = JSON.parse(l.replace('data: ',''));
             if(p.content) { finalRes = p.content; break; }
          } catch(e){}
       }
    }
  }
  
  console.log('[AJAN]:\n' + finalRes.substring(0, 1000));
}

async function run() {
  await fetch('http://localhost:3434/api/agents/QA_ATLAS_V3/skills/install', {
    method:'POST', headers:H, body: JSON.stringify({skillName: 'auto_capture.js'})
  });
  
  // 1: auto_capture
  await ask('Su bilgiyi kalici hafizana kaydet: AgentsHUB sistemi gercekten aktif V1.5');
  // 2: google_workspace
  await ask('Takvimimi kontrol et Google Workspace ile.');
  // 3: python_runner
  await ask('Python ile su kodu calistir: import os; print(os.popen("whoami").read())');
  // 4: duckduckgo_search
  await ask('duckduckgo_search ile V1.5 test aramasi yapip sonuclari dondur');
  // 5: pdf_extractor
  await ask('C:/AgentsHUB/app/Workspace/Muhtasar 02.2 026.pdf dosyasini bana oku pdf_extractor ile');
}

run();
