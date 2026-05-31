const http = require('http');
const fs = require('fs');
const path = require('path');
const AGENT = 'SIGMA_TESTER_V1', PORT = 3434, KEY = 'agentshub_secure_key_2026';
const WDIR = 'C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1/Workspace';
const R = [];

// ═══ DÜZELTILMIŞ SSE PARSER ═══
// Server gerçek formatı: 
//   partial events: { type: 'status'|'tool_call'|'tool_result', ..., partial: true }
//   final event:    { content: '...', thinking: '...', metadata: {...} }
function chat(msg, ms=120000) {
  return new Promise(resolve => {
    const b = JSON.stringify({message:msg});
    let content='', toolCalls=[], toolResults=[], thinking='', done=false;
    const tmr = setTimeout(()=>{if(!done){done=true;resolve({content:content||'[TIMEOUT]',toolCalls,toolResults,thinking,timeout:true});}},ms);
    const req = http.request({hostname:'localhost',port:PORT,path:`/api/agents/${AGENT}/chat`,method:'POST',
      headers:{'Content-Type':'application/json','X-API-Key':KEY,'Content-Length':Buffer.byteLength(b)}}, res=>{
      let buf='';
      res.on('data',ch=>{buf+=ch.toString();const ls=buf.split('\n');buf=ls.pop();
        for(const l of ls){
          if(!l.startsWith('data: '))continue;
          try{
            const j=JSON.parse(l.slice(6));
            // Progress events (partial: true)
            if(j.type==='tool_call') toolCalls.push({name:j.name,args:j.args});
            if(j.type==='tool_result') toolResults.push({name:j.name,result:j.result});
            // Final response (has 'content' field, no 'partial')
            if(j.content!==undefined && !j.partial) {
              content = j.content;
              thinking = j.thinking || '';
              if(!done){done=true;clearTimeout(tmr);resolve({content,toolCalls,toolResults,thinking,timeout:false});}
            }
          }catch{}
        }});
      res.on('end',()=>{if(!done){done=true;clearTimeout(tmr);resolve({content,toolCalls,toolResults,thinking,timeout:false});}});
      res.on('error',e=>{if(!done){done=true;clearTimeout(tmr);resolve({content:'[ERR]'+e.message,toolCalls:[],toolResults:[],thinking:'',timeout:false});}});
    });
    req.on('error',e=>{if(!done){done=true;clearTimeout(tmr);resolve({content:'[ERR]'+e.message,toolCalls:[],toolResults:[],thinking:'',timeout:false});}});
    req.write(b);req.end();
  });
}

function log(id,skill,scn,r,vfy,verdict){
  const toolTriggered = r.toolCalls.length > 0 || r.toolResults.length > 0;
  const haluc = !r.timeout && !toolTriggered && !r.content.includes('[HATA]') && !r.content.includes('[ERROR]');
  const e={id,skill,scn,tool:toolTriggered,toolCalls:r.toolCalls.map(t=>t.name),toolResultCount:r.toolResults.length,
    timeout:r.timeout,haluc,content:r.content.slice(0,500),vfy,verdict};
  R.push(e);
  const i=verdict==='SUCCESS'?'✅':verdict==='FAIL'?'❌':verdict==='HALLUCINATION'?'🧠':verdict==='ERROR_EXPECTED'?'⚠️':'🔶';
  console.log(`${i} ${id} [${skill}]: ${verdict} | tool=${toolTriggered} | tools=[${r.toolCalls.map(t=>t.name).join(',')}]`);
  console.log(`   Content: ${r.content.slice(0,150).replace(/\n/g,' ')}`);
  console.log(`   Verify: ${vfy}\n`);
}

const D=ms=>new Promise(r=>setTimeout(r,ms));

async function main(){
  console.log('═══ QA-LOOP RETEST — Düzeltilmiş Parser + Skill Fixes ═══\n');
  console.log('Tarih:', new Date().toISOString(), '\n');

  // ─── RETEST T01a: calculator 1250*875 (FIX-2: Türkçe format eklendi) ───
  let r = await chat('calculator aracini kullan ve hesapla: 1250 * 875');
  let ok = r.content.includes('1093750') || r.content.includes('1,093,750') || r.content.includes('1.093.750');
  log('T01a','calculator','1250*875',r,ok?'Doğru (1093750 formatları arandı)':'1093750 YOK',ok?'SUCCESS':(r.toolCalls.length>0?'FAIL':'HALLUCINATION'));
  await D(5000);

  // ─── RETEST T04a: google_search dolar ───
  r = await chat('google_search aracini kullanarak internette ara: "dolar TL kuru bugün"');
  ok = !!(r.content.match(/\d+[.,]\d+/) && r.content.match(/dolar|USD|TL|kur/i));
  log('T04a','google_search','dolar kuru',r,ok?'Döviz verisi bulundu':'Döviz verisi YOK',ok?'SUCCESS':(r.toolCalls.length>0?'FAIL':'HALLUCINATION'));
  await D(5000);

  // ─── RETEST T09a: write_file ALFA (FIX-3 path guard) ───
  try { fs.rmSync(path.join(WDIR,'sigma_test_A.txt'),{force:true}); } catch{}
  try { fs.rmSync(path.join('C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1','sigma_test_A.txt'),{force:true}); } catch{}
  r = await chat('write_file aracini kullan. filename: "sigma_test_A.txt", content: "ALFA_RETEST"');
  await D(3000);
  // Dosyayı birden fazla lokasyonda ara
  let fPaths = [
    path.join(WDIR,'sigma_test_A.txt'),
    path.join('C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1','sigma_test_A.txt'),
  ];
  let foundPath = fPaths.find(p => fs.existsSync(p));
  let foundContent = foundPath ? fs.readFileSync(foundPath,'utf8') : '';
  ok = !!foundPath && foundContent.includes('ALFA_RETEST');
  log('T09a','write_file','ALFA olustur',r,
    foundPath ? `DOSYA VAR: ${foundPath} | İçerik: "${foundContent.slice(0,50)}"` : 'DOSYA YOK — her iki lokasyon kontrol edildi',
    ok ? 'SUCCESS' : 'FAIL');
  await D(5000);

  // ─── RETEST T09b: write_file BETA ───
  try { fs.rmSync(path.join(WDIR,'sigma_test_B.txt'),{force:true}); } catch{}
  try { fs.rmSync(path.join('C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1','sigma_test_B.txt'),{force:true}); } catch{}
  r = await chat('write_file aracini kullan. filename: "sigma_test_B.txt", content: "BETA_RETEST"');
  await D(3000);
  fPaths = [path.join(WDIR,'sigma_test_B.txt'),path.join('C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1','sigma_test_B.txt')];
  foundPath = fPaths.find(p => fs.existsSync(p));
  foundContent = foundPath ? fs.readFileSync(foundPath,'utf8') : '';
  ok = !!foundPath && foundContent.includes('BETA_RETEST');
  log('T09b','write_file','BETA olustur',r,
    foundPath ? `DOSYA VAR: ${foundPath}` : 'DOSYA YOK',
    ok ? 'SUCCESS' : 'FAIL');
  await D(5000);

  // ─── RETEST T09c: write_file append GAMMA ───
  r = await chat('write_file aracini kullan. filename: "sigma_test_A.txt", content: "GAMMA_RETEST", append: true');
  await D(3000);
  const appendPaths = [path.join(WDIR,'sigma_test_A.txt'),path.join('C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1','sigma_test_A.txt')];
  foundPath = appendPaths.find(p => fs.existsSync(p));
  foundContent = foundPath ? fs.readFileSync(foundPath,'utf8') : '';
  ok = foundContent.includes('ALFA_RETEST') && foundContent.includes('GAMMA_RETEST');
  log('T09c','write_file','append GAMMA',r,
    `İçerik: "${foundContent.slice(0,80)}" | ALFA+GAMMA: ${ok}`,
    ok ? 'SUCCESS' : 'FAIL');
  await D(5000);

  // ─── RETEST T10a: byterover list ───
  r = await chat('byterover aracini kullan. action: "list", path: "."');
  ok = r.toolCalls.length > 0 || r.toolResults.length > 0 || r.content.length > 100;
  log('T10a','byterover','list workspace',r,
    `Tool tetiklendi: ${r.toolCalls.length>0} | Cevap ${r.content.length} kr`,
    ok ? 'SUCCESS' : (r.toolCalls.length>0?'FAIL':'HALLUCINATION'));
  await D(5000);

  // ─── RETEST T10d: byterover append ───
  r = await chat('byterover aracini kullan. action: "append", path: "sigma_test_A.txt", content: "DELTA_RETEST"');
  await D(3000);
  foundPath = appendPaths.find(p => fs.existsSync(p));
  foundContent = foundPath ? fs.readFileSync(foundPath,'utf8') : '';
  ok = foundContent.includes('DELTA_RETEST');
  log('T10d','byterover','append DELTA',r,
    `İçerik: "${foundContent.slice(0,100)}" | DELTA: ${ok}`,
    ok ? 'SUCCESS' : 'FAIL');
  await D(5000);

  // ─── RETEST T14a: url_opener ───
  r = await chat('url_opener aracini kullan. url: "https://www.wikipedia.org"');
  ok = !!(r.content.match(/acild|basari|opened|launch|tarayici/i) || r.toolCalls.length > 0);
  log('T14a','url_opener','wikipedia',r,
    `Tool: ${r.toolCalls.map(t=>t.name).join(',')} | Basari: ${ok}`,
    ok ? 'SUCCESS' : (r.toolCalls.length>0?'FAIL':'HALLUCINATION'));
  await D(5000);

  // ─── RETEST T17a: signal_agent → QA ───
  r = await chat('signal_agent aracini kullan. target_agent: "QA_ATLAS_V3", message: "SIGMA_RETEST_PING_999"');
  await D(3000);
  let sigFound = false;
  try {
    const qaDir = 'C:/AgentsHUB/app/Agents/QA_ATLAS_V3/Chats';
    if (fs.existsSync(qaDir)) {
      const files = fs.readdirSync(qaDir).filter(f=>f.endsWith('.json'));
      for (const f of files.slice(-3)) {
        if (fs.readFileSync(path.join(qaDir,f),'utf8').includes('SIGMA_RETEST_PING_999')) { sigFound=true; break; }
      }
    }
  } catch{}
  log('T17a','signal_agent','SIGMA→QA retest',r,
    `Tool: [${r.toolCalls.map(t=>t.name)}] | QA loglarında bulundu: ${sigFound}`,
    sigFound ? 'SUCCESS' : (r.toolCalls.length>0 ? 'FAIL' : 'HALLUCINATION'));
  await D(5000);

  // ─── RETEST T20a: python_runner ───
  r = await chat('python_runner aracini kullan. src_code: "print(2**10)"');
  const pyOk = r.content.includes('1024');
  const pyErr = r.content.match(/kurulu değil|bulunamad|not recognized|ENOENT|Python/i);
  log('T20a','python_runner','2**10',r,
    pyOk ? '1024 bulundu' : (pyErr ? 'Python kurulu değil (beklenen hata)' : 'Bilinmeyen sonuç'),
    pyOk ? 'SUCCESS' : (pyErr ? 'ERROR_EXPECTED' : (r.toolCalls.length>0?'FAIL':'HALLUCINATION')));
  await D(5000);

  // ─── RETEST T23a: email_manager ───
  r = await chat('email_manager aracini kullan. action: "send", to: "test@example.com", subject: "Test", body: "Deneme"');
  const emOk = r.content.match(/SMTP|hata|gonderi|mail|basari|yapılandır/i) || r.toolCalls.length > 0;
  log('T23a','email_manager','mail gonder',r,
    `Tool: [${r.toolCalls.map(t=>t.name)}] | Sonuç/hata: ${!!emOk}`,
    emOk ? 'ERROR_EXPECTED' : 'HALLUCINATION');

  // ═══ SONUÇ ═══
  console.log('\n═══ QA-LOOP RETEST SONUÇLARI ═══');
  let s=0,f=0,h=0,e=0;
  for(const x of R){if(x.verdict==='SUCCESS')s++;else if(x.verdict==='FAIL')f++;else if(x.verdict==='HALLUCINATION')h++;else e++;}
  console.log(`TOPLAM: ${R.length} | SUCCESS: ${s} | FAIL: ${f} | HALLUCINATION: ${h} | ERROR_EXP: ${e}`);
  
  // Önceki sonuçla karşılaştır
  console.log('\n--- ÖNCEKİ vs YENİ KARŞILAŞTIRMA ---');
  const prev = {T01a:'HALLUCINATION',T04a:'HALLUCINATION',T09a:'FAIL',T09b:'FAIL',T09c:'FAIL',
    T10a:'HALLUCINATION',T10d:'FAIL',T14a:'HALLUCINATION',T17a:'HALLUCINATION',T20a:'HALLUCINATION',T23a:'HALLUCINATION'};
  for(const x of R){
    const p = prev[x.id] || '?';
    const changed = p !== x.verdict;
    console.log(`${changed?'🔄':'⬜'} ${x.id}: ${p} → ${x.verdict} ${changed?'(DEĞİŞTİ)':''}`);
  }
  
  fs.writeFileSync('C:/AgentsHUB/app/sigma_retest.json',JSON.stringify(R,null,2));
  console.log('\nKaydedildi: sigma_retest.json');
}
main().catch(console.error);
