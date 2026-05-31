const http = require('http');
const fs = require('fs');
const path = require('path');
const AGENT = 'SIGMA_TESTER_V1', PORT = 3434, KEY = 'agentshub_secure_key_2026';
const WDIR = 'C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1/Workspace';
const MDIR = 'C:/AgentsHUB/Marketplace/skills';
const R = [];

function chat(msg, ms=90000) {
  return new Promise(resolve => {
    const b = JSON.stringify({message:msg});
    let txt='',tcs=[],trs=[],done=false;
    const tmr = setTimeout(()=>{if(!done){done=true;resolve({text:txt||'[TIMEOUT]',tc:tcs,tr:trs,to:true});}},ms);
    const req = http.request({hostname:'localhost',port:PORT,path:`/api/agents/${AGENT}/chat`,method:'POST',
      headers:{'Content-Type':'application/json','X-API-Key':KEY,'Content-Length':Buffer.byteLength(b)}}, res=>{
      let buf='';
      res.on('data',ch=>{buf+=ch.toString();const ls=buf.split('\n');buf=ls.pop();
        for(const l of ls){if(!l.startsWith('data: '))continue;try{const j=JSON.parse(l.slice(6));
          if(j.text)txt+=j.text;if(j.tool_call)tcs.push(j.tool_call);if(j.tool_result!==undefined)trs.push(j.tool_result);
          if(j.done&&!done){done=true;clearTimeout(tmr);resolve({text:txt,tc:tcs,tr:trs,to:false});}
        }catch{}}});
      res.on('end',()=>{if(!done){done=true;clearTimeout(tmr);resolve({text:txt,tc:tcs,tr:trs,to:false});}});
      res.on('error',e=>{if(!done){done=true;clearTimeout(tmr);resolve({text:'[ERR]'+e.message,tc:[],tr:[],to:false});}});
    });
    req.on('error',e=>{if(!done){done=true;clearTimeout(tmr);resolve({text:'[ERR]'+e.message,tc:[],tr:[],to:false});}});
    req.write(b);req.end();
  });
}
function log(id,skill,scn,r,vfy,verdict){
  const e={id,skill,scn,tool:r.tc.length>0||r.tr.length>0,tcN:r.tc.length,trN:r.tr.length,
    timeout:r.to,haluc:!r.to&&r.tc.length===0&&r.tr.length===0,resp:r.text.slice(0,500),vfy,verdict};
  R.push(e);
  const i=verdict==='SUCCESS'?'✅':verdict==='FAIL'?'❌':verdict==='HALLUCINATION'?'🧠':'⚠️';
  console.log(`${i} ${id} [${skill}]: ${verdict} | tool=${e.tool}`);
  console.log(`   Resp: ${r.text.slice(0,120).replace(/\n/g,' ')}`);
  console.log(`   Verify: ${vfy}\n`);
}
const D=ms=>new Promise(r=>setTimeout(r,ms));

async function main(){
  // ═══ GRUP 3: EXCEL (4 test) ═══
  console.log('=== GRUP 3: EXCEL (4 test) ===\n');
  
  let r = await chat('excel_manager aracini kullan. action: write, filename: sigma_rapor.xlsx, sheetName: Satislar, content: \'[{"Urun":"Laptop","Miktar":5,"Fiyat":15000},{"Urun":"Mouse","Miktar":20,"Fiyat":250}]\'');
  await D(2000);
  const xlsPath = path.join(WDIR,'sigma_rapor.xlsx');
  const xlsExists = fs.existsSync(xlsPath);
  log('T13a','excel_manager','write 2 satir',r,`Dosya var: ${xlsExists}`,xlsExists?'SUCCESS':'FAIL');
  await D(4000);

  r = await chat('excel_manager aracini kullan. action: info, filename: sigma_rapor.xlsx');
  const infoOk = r.text.includes('Satislar') || r.text.includes('Sheet') || r.text.includes('Urun');
  log('T13b','excel_manager','info',r,`Sekme bilgisi: ${infoOk}`,infoOk?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  r = await chat('excel_manager aracini kullan. action: read, filename: sigma_rapor.xlsx');
  const readOk = r.text.includes('Laptop') && r.text.includes('Mouse');
  log('T13c','excel_manager','read',r,`Laptop+Mouse: ${readOk}`,readOk?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  r = await chat('excel_manager aracini kullan. action: append, filename: sigma_rapor.xlsx, content: \'[{"Urun":"Klavye","Miktar":10,"Fiyat":500}]\'');
  log('T13d','excel_manager','append 1 satir',r,`Basari mesaji: ${!!(r.text.match(/append|eklendi|basari/i))}`,
    r.text.match(/append|eklendi|basari/i)?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // ═══ GRUP 4: GELISMIS (15 test) ═══
  console.log('\n=== GRUP 4: GELISMIS YETENEKLER ===\n');

  // T14a url_opener
  r = await chat('url_opener aracini kullan. https://www.wikipedia.org adresini ac.');
  log('T14a','url_opener','wikipedia',r,`Basari: ${!!(r.text.match(/acild|basari|opened|launch/i))}`,
    r.text.match(/acild|basari|opened|launch/i)?'SUCCESS':(r.tc.length>0?'PARTIAL':'HALLUCINATION'));
  await D(4000);

  // T15a clawhub_installer list
  r = await chat('clawhub_install aracini kullan. action: list');
  const listOk = r.text.includes('calculator') || r.text.includes('weather') || r.text.match(/\d+ skill/i);
  log('T15a','clawhub_installer','list',r,`Skill listesi: ${listOk}`,listOk?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T16a clawhub_remote search
  r = await chat('clawhub_remote aracini kullan. action: search, query: "translator"');
  const searchOk = r.text.length > 50 && (r.tc.length > 0 || r.tr.length > 0);
  log('T16a','clawhub_remote','search translator',r,`Sonuc: ${searchOk}`,searchOk?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T16b clawhub_remote inspect
  r = await chat('clawhub_remote aracini kullan. action: inspect, query: "weather"');
  const inspOk = r.text.includes('1.0.0') || r.text.includes('steipete') || r.text.includes('119');
  log('T16b','clawhub_remote','inspect weather',r,`Versiyon/owner: ${inspOk}`,inspOk?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T16c clawhub_remote download PROJEDE OLMAYAN skill
  const mktBefore = fs.readdirSync(MDIR);
  r = await chat('clawhub_remote aracini kullan. action: download, query: "pomodoro". clawhub.ai\'den pomodoro skill\'ini indir.',120000);
  await D(3000);
  const mktAfter = fs.readdirSync(MDIR);
  const newFiles = mktAfter.filter(f => !mktBefore.includes(f));
  log('T16c','clawhub_remote','download pomodoro (YENİ)',r,
    newFiles.length>0 ? `YENİ DOSYA: ${newFiles.join(',')}` : 'YENİ DOSYA YOK! Ajan yaniltmis olabilir!',
    newFiles.length>0?'SUCCESS':'FAIL');
  await D(4000);

  // T17a signal_agent -> QA_ATLAS_V3
  r = await chat('signal_agent aracini kullan. target_agent: "QA_ATLAS_V3", message: "SIGMA_PING_TEST_12345"');
  await D(3000);
  // Bagimsiz dogrulama: QA chat loglarini kontrol et
  const qaChatsDir = 'C:/AgentsHUB/app/Agents/QA_ATLAS_V3/Chats';
  let signalFound = false;
  try {
    const chatFiles = fs.readdirSync(qaChatsDir).filter(f=>f.endsWith('.json'));
    for (const cf of chatFiles.slice(-3)) {
      const content = fs.readFileSync(path.join(qaChatsDir,cf),'utf8');
      if (content.includes('SIGMA_PING_TEST_12345')) { signalFound = true; break; }
    }
  } catch {}
  log('T17a','signal_agent','SIGMA->QA ping',r,
    `QA chat loglarinda SIGMA_PING_TEST: ${signalFound}`,
    signalFound?'SUCCESS':(r.text.match(/gonder|iletti|basari/i)?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T17c signal_agent olmayan ajana
  r = await chat('signal_agent aracini kullan. target_agent: "GHOST_AGENT_999", message: "test"');
  const ghostErr = r.text.match(/hata|error|bulunamad|mevcut degil|yok/i);
  log('T17c','signal_agent','ghost agent hata',r,`Hata mesaji: ${!!ghostErr}`,ghostErr?'SUCCESS':'FAIL');
  await D(4000);

  // T18a skill_creator
  r = await chat('skill_creator aracini kullan. "random_joke" adinda bir skill yaz. Her calistiginda 3 farkli sakadan birini dondurecek basit bir JS skill yaz.');
  await D(2000);
  const skillFile = fs.existsSync(path.join('C:/AgentsHUB/app/Agents',AGENT,'skills','random_joke.js'));
  const skillMkt = fs.existsSync(path.join(MDIR,'random_joke.js'));
  log('T18a','skill_creator','random_joke',r,
    `Agent skills: ${skillFile} | Marketplace: ${skillMkt}`,
    (skillFile||skillMkt)?'SUCCESS':'FAIL');
  await D(4000);

  // T19a auto_capture
  r = await chat('Benim adim Ali ve ben Ankara\'da yasiyorum. Metalurji sektorunde calisiyorum. Bu bilgileri kalici hafizana kaydet.');
  const memOk = r.text.match(/kaydett|hafiza|not|otomatik/i);
  log('T19a','auto_capture','bilgi kaydet',r,`Hafiza kaydi: ${!!memOk}`,memOk?'SUCCESS':'PARTIAL');
  await D(4000);

  // T20a python_runner print(2**10)
  r = await chat('python_runner aracini kullan. Su Python kodunu calistir: print(2**10)');
  const py1024 = r.text.includes('1024');
  log('T20a','python_runner','2**10',r,`1024: ${py1024}`,py1024?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T20b python_runner os.name
  r = await chat('python_runner aracini kullan. Su Python kodunu calistir: import os; print(os.name)');
  const pyNt = r.text.includes('nt') || r.text.includes('posix');
  log('T20b','python_runner','os.name',r,`nt/posix: ${pyNt}`,pyNt?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T29a image_generator robot
  r = await chat('image_generator aracini kullan. prompt: "A red robot working in a factory, digital art style"',120000);
  await D(3000);
  const imgMatch = r.text.match(/[A-Z]:[\\\/][^\s"']+\.(png|jpg|jpeg)/i);
  let imgOk = false, imgVerify = 'Path bulunamadi';
  if (imgMatch) {
    const p = imgMatch[0].replace(/\\\\/g,'\\');
    const ex = fs.existsSync(p);
    const sz = ex ? fs.statSync(p).size : 0;
    imgOk = ex && sz > 1000;
    imgVerify = `Path: ${p} | Var: ${ex} | Boyut: ${sz}`;
  }
  log('T29a','image_generator','red robot',r,imgVerify,imgOk?'SUCCESS':'FAIL');
  await D(4000);

  // ═══ GRUP 5: DIS SERVIS (hata mesaji dogrulama) ═══
  console.log('\n=== GRUP 5: DIS SERVIS TESTI (hata mesaji beklenir) ===\n');

  // T21a brave_search
  r = await chat('brave_search aracini kullan. "yapay zeka haberleri" ara.');
  const braveOk = r.text.match(/API|key|hata|sonuc|brave/i);
  log('T21a','brave_search','arama',r,`Sonuc/hata: ${!!braveOk}`,braveOk?'ERROR_EXPECTED':'HALLUCINATION');
  await D(4000);

  // T22a tavily_search
  r = await chat('tavily_search aracini kullan. "makine ogrenmesi nedir" arastir.');
  const tavOk = r.text.match(/API|key|hata|sonuc|tavily/i);
  log('T22a','tavily_search','arastir',r,`Sonuc/hata: ${!!tavOk}`,tavOk?'ERROR_EXPECTED':'HALLUCINATION');
  await D(4000);

  // T23a email_manager
  r = await chat('email_manager aracini kullan. action: send, to: "test@example.com", subject: "Test", body: "Deneme"');
  const mailOk = r.text.match(/SMTP|hata|gonderi|mail|basari/i);
  log('T23a','email_manager','mail gonder',r,`Sonuc/hata: ${!!mailOk}`,mailOk?'ERROR_EXPECTED':'HALLUCINATION');
  await D(4000);

  // T24a github_manager
  r = await chat('github_manager aracini kullan. action: issues, repo: "microsoft/vscode"');
  const ghOk = r.text.match(/token|hata|issue|github|GITHUB/i);
  log('T24a','github_manager','issue listele',r,`Sonuc/hata: ${!!ghOk}`,ghOk?'ERROR_EXPECTED':'HALLUCINATION');
  await D(4000);

  // T25a google_workspace
  r = await chat('google_workspace aracini kullan. action: list_emails');
  const gwOk = r.text.match(/OAuth|hata|token|credential|google/i);
  log('T25a','google_workspace','gmail listele',r,`Sonuc/hata: ${!!gwOk}`,gwOk?'ERROR_EXPECTED':'HALLUCINATION');
  await D(4000);

  // T26a browser_agent
  r = await chat('browser_agent aracini kullan. url: "https://example.com"');
  const brwOk = r.text.match(/playwright|hata|Example|browser|chrome/i);
  log('T26a','browser_agent','example.com',r,`Sonuc/hata: ${!!brwOk}`,brwOk?'ERROR_EXPECTED':'HALLUCINATION');
  await D(4000);

  // T27a pdf_extractor
  r = await chat('pdf_extractor aracini kullan. filename: "test.pdf"');
  const pdfOk = r.text.match(/pdf|hata|bulunamad|parse|modul/i);
  log('T27a','pdf_extractor','pdf oku',r,`Sonuc/hata: ${!!pdfOk}`,pdfOk?'ERROR_EXPECTED':'HALLUCINATION');
  await D(4000);

  // T28a mcp_bridge
  r = await chat('mcp_bridge aracini kullan. server_url: "http://localhost:9999"');
  const mcpOk = r.text.match(/MCP|hata|baglanti|connection|refused/i);
  log('T28a','mcp_bridge','MCP baglan',r,`Sonuc/hata: ${!!mcpOk}`,mcpOk?'ERROR_EXPECTED':'HALLUCINATION');

  // ═══ GENEL SONUC ═══
  let s=0,f=0,h=0,p=0;
  for(const x of R){if(x.verdict==='SUCCESS')s++;else if(x.verdict==='FAIL')f++;else if(x.verdict==='HALLUCINATION')h++;else p++;}
  console.log('\n=== GRUP 3+4+5 SONUC ===');
  console.log(`Toplam: ${R.length} | SUCCESS: ${s} | FAIL: ${f} | HAL: ${h} | EXPECTED_ERR/OTHER: ${p}`);
  fs.writeFileSync('C:/AgentsHUB/app/sigma_g345.json',JSON.stringify(R,null,2));
  console.log('Kaydedildi: sigma_g345.json');
}
main().catch(console.error);
