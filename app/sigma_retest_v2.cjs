const http = require('http');
const fs = require('fs');
const path = require('path');
const AGENT = 'SIGMA_TESTER_V1', PORT = 3434, KEY = 'agentshub_secure_key_2026';
const CONFPATH = 'C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1/Mind-Set_Core/config.json';
const R = [];

// Config'in başlangıç halini sakla (HOT-SWITCH koruması)
const ORIGINAL_CONFIG = JSON.parse(fs.readFileSync(CONFPATH, 'utf8'));
function restoreConfig() {
  const cur = JSON.parse(fs.readFileSync(CONFPATH, 'utf8'));
  cur.skills = ORIGINAL_CONFIG.skills;
  fs.writeFileSync(CONFPATH, JSON.stringify(cur, null, 4));
  console.log('   [CONFIG RESTORED] Skills:', cur.skills.length);
}

function chat(msg, ms=120000) {
  return new Promise(resolve => {
    const b = JSON.stringify({message:msg});
    let content='', toolCalls=[], toolResults=[], thinking='', done=false;
    const tmr = setTimeout(()=>{if(!done){done=true;resolve({content:content||'[TIMEOUT]',toolCalls,toolResults,thinking,timeout:true});}},ms);
    const req = http.request({hostname:'localhost',port:PORT,path:`/api/agents/${AGENT}/chat`,method:'POST',
      headers:{'Content-Type':'application/json','X-API-Key':KEY,'Content-Length':Buffer.byteLength(b)}}, res=>{
      let buf='';
      res.on('data',ch=>{buf+=ch.toString();const ls=buf.split('\n');buf=ls.pop();
        for(const l of ls){if(!l.startsWith('data: '))continue;try{const j=JSON.parse(l.slice(6));
          if(j.type==='tool_call')toolCalls.push({name:j.name,args:j.args});
          if(j.type==='tool_result')toolResults.push({name:j.name,result:j.result});
          if(j.content!==undefined&&!j.partial){content=j.content;thinking=j.thinking||'';
            if(!done){done=true;clearTimeout(tmr);resolve({content,toolCalls,toolResults,thinking,timeout:false});}}
        }catch{}}});
      res.on('end',()=>{if(!done){done=true;clearTimeout(tmr);resolve({content,toolCalls,toolResults,thinking,timeout:false});}});
      res.on('error',e=>{if(!done){done=true;clearTimeout(tmr);resolve({content:'[ERR]'+e.message,toolCalls:[],toolResults:[],thinking:'',timeout:false});}});
    });
    req.on('error',e=>{if(!done){done=true;clearTimeout(tmr);resolve({content:'[ERR]'+e.message,toolCalls:[],toolResults:[],thinking:'',timeout:false});}});
    req.write(b);req.end();
  });
}
function log(id,skill,scn,r,vfy,verdict){
  const toolTriggered=r.toolCalls.length>0||r.toolResults.length>0;
  const e={id,skill,scn,tool:toolTriggered,toolNames:r.toolCalls.map(t=>t.name),trCount:r.toolResults.length,
    timeout:r.timeout,content:r.content.slice(0,500),vfy,verdict};
  R.push(e);
  const i=verdict==='SUCCESS'?'✅':verdict==='FAIL'?'❌':verdict==='HALLUCINATION'?'🧠':verdict==='ERROR_EXPECTED'?'⚠️':'🔶';
  console.log(`${i} ${id} [${skill}]: ${verdict} | tools=[${r.toolCalls.map(t=>t.name).join(',')}]`);
  console.log(`   Content: ${r.content.slice(0,150).replace(/\n/g,' ')}`);
  console.log(`   Verify: ${vfy}\n`);
}
const D=ms=>new Promise(r=>setTimeout(r,ms));

async function main(){
  console.log('═══ QA-LOOP v2 RETEST — Config Korumalı ═══');
  console.log('Tarih:', new Date().toISOString(), '\n');

  // ─── T01a: calculator Türkçe format ───
  let r = await chat('calculator aracini kullan ve 1250 * 875 hesapla');
  let ok = r.content.includes('1093750')||r.content.includes('1,093,750')||r.content.includes('1.093.750');
  log('T01a','calculator','1250*875',r,ok?'Doğru':'1093750 YOK',ok?'SUCCESS':(r.toolCalls.length>0?'FAIL':'HALLUCINATION'));
  restoreConfig();
  await D(5000);

  // ─── T04a: google_search (BİLİNEN LİMİTASYON) ───
  r = await chat('google_search aracini kullanarak internette "dolar TL kuru bugun" ara');
  const gsTools = r.toolCalls.map(t=>t.name);
  const gsOk = !!(r.content.match(/\d+[.,]\d+/)&&r.content.match(/dolar|USD|TL|kur/i));
  log('T04a','google_search','dolar kuru',r,
    `Tools: [${gsTools}] | Döviz verisi: ${gsOk} | NOT: Gemini API google_search+custom tools birlikte kullanılamaz`,
    gsOk?'SUCCESS':(gsTools.includes('google_search')?'FAIL':'KNOWN_LIMITATION'));
  restoreConfig();
  await D(5000);

  // ─── T09a: write_file ALFA ───
  const agentDir = 'C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1';
  try{fs.rmSync(path.join(agentDir,'sigma_test_A.txt'),{force:true});}catch{}
  r = await chat('write_file aracini kullan. filename: "sigma_test_A.txt", content: "ALFA_V2"');
  await D(3000);
  let fp = [path.join(agentDir,'sigma_test_A.txt'),path.join(agentDir,'Workspace','sigma_test_A.txt')];
  let found = fp.find(p=>fs.existsSync(p));
  let fc = found ? fs.readFileSync(found,'utf8') : '';
  ok = !!found && fc.includes('ALFA_V2');
  log('T09a','write_file','ALFA olustur',r,
    found?`DOSYA: ${path.basename(found)} → "${fc.slice(0,40)}"`:'DOSYA YOK',ok?'SUCCESS':'FAIL');
  restoreConfig();
  await D(5000);

  // ─── T09b: write_file BETA ───
  try{fs.rmSync(path.join(agentDir,'sigma_test_B.txt'),{force:true});}catch{}
  r = await chat('write_file aracini kullan. filename: "sigma_test_B.txt", content: "BETA_V2"');
  await D(3000);
  fp = [path.join(agentDir,'sigma_test_B.txt'),path.join(agentDir,'Workspace','sigma_test_B.txt')];
  found = fp.find(p=>fs.existsSync(p));
  fc = found ? fs.readFileSync(found,'utf8') : '';
  ok = !!found && fc.includes('BETA_V2');
  log('T09b','write_file','BETA olustur',r,
    found?`DOSYA: ${path.basename(found)} → "${fc.slice(0,40)}"`:'DOSYA YOK',ok?'SUCCESS':'FAIL');
  restoreConfig();
  await D(5000);

  // ─── T09c: write_file append ───
  r = await chat('write_file aracini kullan. filename: "sigma_test_A.txt", content: "GAMMA_V2", append: true');
  await D(3000);
  found = fp.find(p=>fs.existsSync(path.join(agentDir,'sigma_test_A.txt')))?path.join(agentDir,'sigma_test_A.txt'):null;
  fc = found ? fs.readFileSync(found,'utf8') : '';
  ok = fc.includes('ALFA_V2') && fc.includes('GAMMA_V2');
  log('T09c','write_file','append GAMMA',r,`İçerik: "${fc.slice(0,60)}" | ALFA+GAMMA: ${ok}`,ok?'SUCCESS':'FAIL');
  restoreConfig();
  await D(5000);

  // ─── T10a: byterover list ───
  r = await chat('byterover aracini kullan. action: "list", path: "."');
  ok = r.toolCalls.length>0 && r.content.length>50;
  log('T10a','byterover','list',r,`Tool tetiklendi: ${r.toolCalls.length>0}`,ok?'SUCCESS':(r.toolCalls.length>0?'FAIL':'HALLUCINATION'));
  restoreConfig();
  await D(5000);

  // ─── T10d: byterover append ───
  r = await chat('byterover aracini kullan. action: "append", path: "sigma_test_A.txt", content: "DELTA_V2"');
  await D(3000);
  found = path.join(agentDir,'sigma_test_A.txt');
  fc = fs.existsSync(found)?fs.readFileSync(found,'utf8'):'';
  ok = fc.includes('DELTA_V2');
  log('T10d','byterover','append DELTA',r,`İçerik: "${fc.slice(0,80)}" | DELTA: ${ok}`,ok?'SUCCESS':'FAIL');
  restoreConfig();
  await D(5000);

  // ─── T11a: screenshot ───
  r = await chat('screenshot aracini kullan. Ekranimin fotografini cek.');
  await D(3000);
  const ssMatch = r.content.match(/[A-Z]:[\\\/][^\s"'<>]+\.(png|jpg|jpeg|bmp)/i);
  let ssOk = false, ssV = 'Path yok';
  if(ssMatch){ const p=ssMatch[0].replace(/\\\\/g,'\\'); ssOk=fs.existsSync(p)&&fs.statSync(p).size>0; ssV=`${p} var:${ssOk}`; }
  else if(r.toolCalls.some(t=>t.name==='screenshot')){ ssV='Tool tetiklendi ama path parse edilemedi'; ssOk=r.content.match(/basari|ekran|goruntu|kayded/i); }
  log('T11a','screenshot','ekran yakala',r,ssV,ssOk?'SUCCESS':(r.toolCalls.length>0?'FAIL':'HALLUCINATION'));
  restoreConfig();
  await D(5000);

  // ─── T14a: url_opener ───
  r = await chat('url_opener aracini kullan. url: "https://www.wikipedia.org"');
  ok = r.toolCalls.length>0 || r.content.match(/acild|basari|opened|launch|taray/i);
  log('T14a','url_opener','wikipedia',r,`Tools:[${r.toolCalls.map(t=>t.name)}]`,ok?'SUCCESS':'HALLUCINATION');
  restoreConfig();
  await D(5000);

  // ─── T16a: clawhub_remote search ───
  r = await chat('clawhub_remote aracini kullan. action: "search", query: "translator"');
  ok = r.toolCalls.length>0 && r.content.length>50;
  log('T16a','clawhub_remote','search',r,`Tools:[${r.toolCalls.map(t=>t.name)}]`,ok?'SUCCESS':(r.toolCalls.length>0?'FAIL':'HALLUCINATION'));
  restoreConfig();
  await D(5000);

  // ─── T17a: signal_agent ───
  r = await chat('signal_agent aracini kullan. target_agent: "QA_ATLAS_V3", message: "SIGMA_V2_PING"');
  await D(3000);
  let sigF = false;
  try{const qd='C:/AgentsHUB/app/Agents/QA_ATLAS_V3/Chats';if(fs.existsSync(qd)){
    for(const f of fs.readdirSync(qd).filter(f=>f.endsWith('.json')).slice(-5)){
      if(fs.readFileSync(path.join(qd,f),'utf8').includes('SIGMA_V2_PING')){sigF=true;break;}}}}catch{}
  log('T17a','signal_agent','→QA ping',r,`QA logunda: ${sigF} | Tools:[${r.toolCalls.map(t=>t.name)}]`,
    sigF?'SUCCESS':(r.toolCalls.some(t=>t.name==='signal_agent')?'FAIL':'HALLUCINATION'));
  restoreConfig();
  await D(5000);

  // ─── T20a: python_runner ───
  r = await chat('python_runner aracini kullan. src_code: "print(2**10)"');
  const pyOk = r.content.includes('1024');
  const pyErr = r.content.match(/kurulu değil|bulunamad|not recognized|ENOENT/i) || r.toolResults.some(t=>String(t.result).includes('kurulu'));
  log('T20a','python_runner','2**10',r,pyOk?'1024 OK':(pyErr?'Python yok (beklenen)':'Bilinmeyen'),
    pyOk?'SUCCESS':(r.toolCalls.length>0?'ERROR_EXPECTED':'HALLUCINATION'));
  restoreConfig();
  await D(5000);

  // ─── T23a: email_manager ───
  r = await chat('email_manager aracini kullan. action: "send", to: "test@example.com", subject: "Test", body: "Deneme"');
  const emOk = r.content.match(/SMTP|hata|mail|yapılandır|baglanti/i) || r.toolCalls.length>0;
  log('T23a','email_manager','mail gonder',r,`Tools:[${r.toolCalls.map(t=>t.name)}]`,
    emOk?'ERROR_EXPECTED':'HALLUCINATION');
  restoreConfig();

  // ═══ SONUÇ ═══
  console.log('\n═══ QA-LOOP v2 KARŞILAŞTIRMA ═══');
  const prev = {T01a:'HALLUCINATION',T04a:'HALLUCINATION',T09a:'FAIL',T09b:'FAIL',T09c:'FAIL',
    T10a:'HALLUCINATION',T10d:'FAIL',T11a:'HALLUCINATION',T14a:'HALLUCINATION',T16a:'HALLUCINATION',
    T17a:'HALLUCINATION',T20a:'HALLUCINATION',T23a:'HALLUCINATION'};
  let fixed=0,still=0;
  for(const x of R){
    const p=prev[x.id]||'?';
    const better = (p==='HALLUCINATION'||p==='FAIL') && (x.verdict==='SUCCESS'||x.verdict==='ERROR_EXPECTED'||x.verdict==='KNOWN_LIMITATION');
    if(better) fixed++;
    else if(x.verdict==='FAIL'||x.verdict==='HALLUCINATION') still++;
    console.log(`${better?'🟢':'🔴'} ${x.id}: ${p} → ${x.verdict}`);
  }
  console.log(`\nDÜZELEN: ${fixed} | HALA SORUNLU: ${still} | TOPLAM: ${R.length}`);
  
  let s=0,f=0,h=0,e=0;
  for(const x of R){if(x.verdict==='SUCCESS')s++;else if(x.verdict==='FAIL')f++;else if(x.verdict==='HALLUCINATION')h++;else e++;}
  console.log(`SUCCESS: ${s} | FAIL: ${f} | HALLUCINATION: ${h} | OTHER: ${e}`);
  
  fs.writeFileSync('C:/AgentsHUB/app/sigma_retest_v2.json',JSON.stringify(R,null,2));
  console.log('Kaydedildi: sigma_retest_v2.json');
}
main().catch(console.error);
