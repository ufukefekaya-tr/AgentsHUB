const http = require('http');
const fs = require('fs');
const path = require('path');
const AGENT = 'SIGMA_TESTER_V1', PORT = 3434, KEY = 'agentshub_secure_key_2026';
const WDIR = 'C:/AgentsHUB/app/Agents/SIGMA_TESTER_V1/Workspace';
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
  console.log(`${i} ${id} [${skill}]: ${verdict} | tool=${e.tool} | haluc=${e.haluc}`);
  console.log(`   Resp: ${r.text.slice(0,120).replace(/\n/g,' ')}`);
  console.log(`   Verify: ${vfy}\n`);
}

const D=ms=>new Promise(r=>setTimeout(r,ms));

async function main(){
  console.log('=== GRUP 2: DOSYA ISLEMLERI (10 test) ===\n');

  // Temizlik
  try { fs.rmSync(path.join(WDIR,'sigma_test_A.txt'),{force:true}); } catch{}
  try { fs.rmSync(path.join(WDIR,'sigma_test_B.txt'),{force:true}); } catch{}

  // T09a write_file ALFA
  let r = await chat('write_file aracini kullan. sigma_test_A.txt dosyasi olustur, icine "ALFA" yaz.');
  await D(2000);
  const fA = path.join(WDIR,'sigma_test_A.txt');
  const fAexists = fs.existsSync(fA);
  let fAcontent = fAexists ? fs.readFileSync(fA,'utf8') : '';
  const fAok = fAexists && fAcontent.includes('ALFA');
  log('T09a','write_file','ALFA olustur',r,
    fAexists ? `Dosya VAR, icerik: "${fAcontent.slice(0,50)}", ALFA iceriyor: ${fAcontent.includes('ALFA')}` : 'DOSYA YOK!',
    fAok ? 'SUCCESS' : 'FAIL');
  await D(4000);

  // T09b write_file BETA
  r = await chat('write_file aracini kullan. sigma_test_B.txt dosyasi olustur, icine "BETA" yaz.');
  await D(2000);
  const fB = path.join(WDIR,'sigma_test_B.txt');
  const fBexists = fs.existsSync(fB);
  let fBcontent = fBexists ? fs.readFileSync(fB,'utf8') : '';
  const fBok = fBexists && fBcontent.includes('BETA');
  log('T09b','write_file','BETA olustur',r,
    fBexists ? `Dosya VAR, icerik: "${fBcontent.slice(0,50)}", BETA: ${fBcontent.includes('BETA')}` : 'DOSYA YOK!',
    fBok ? 'SUCCESS' : 'FAIL');
  await D(4000);

  // T09c write_file append GAMMA
  r = await chat('write_file aracini kullan. sigma_test_A.txt dosyasina append modunda "GAMMA" ekle. Eski icerigi silme!');
  await D(2000);
  fAcontent = fs.existsSync(fA) ? fs.readFileSync(fA,'utf8') : '';
  const hasGamma = fAcontent.includes('GAMMA') && fAcontent.includes('ALFA');
  log('T09c','write_file','append GAMMA',r,
    `Dosya icerik: "${fAcontent.slice(0,80)}" | ALFA+GAMMA: ${hasGamma}`,
    hasGamma ? 'SUCCESS' : 'FAIL');
  await D(4000);

  // T10a byterover list
  r = await chat('byterover aracini kullan. action: list, path: "."');
  const realDir = fs.readdirSync(path.join('C:/AgentsHUB/app/Agents',AGENT,'Workspace')).slice(0,5).join(',');
  const listOk = r.text.length > 30 && (r.tc.length > 0 || r.tr.length > 0);
  log('T10a','byterover','list workspace',r,
    `Gercek dizin: ${realDir} | Cevap uzunlugu: ${r.text.length}`,
    listOk ? 'SUCCESS' : (r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T10b byterover read package.json
  r = await chat('byterover aracini kullan. action: read, path: "C:/AgentsHUB/app/package.json"');
  const realPkg = JSON.parse(fs.readFileSync('C:/AgentsHUB/app/package.json','utf8'));
  const readOk = r.text.includes(realPkg.name) || r.text.includes('package');
  log('T10b','byterover','read package.json',r,
    `Gercek pkg name: "${realPkg.name}" | Cevapda var: ${r.text.includes(realPkg.name)}`,
    readOk ? 'SUCCESS' : (r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T10c byterover execute
  r = await chat('byterover aracini kullan. action: execute, command: "echo SIGMA_777"');
  const execOk = r.text.includes('SIGMA_777');
  log('T10c','byterover','execute echo',r,
    `SIGMA_777 cevapda: ${execOk}`,
    execOk ? 'SUCCESS' : (r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T10d byterover append
  r = await chat('byterover aracini kullan. action: append, path: "Workspace/sigma_test_A.txt", content: "DELTA"');
  await D(2000);
  fAcontent = fs.existsSync(fA) ? fs.readFileSync(fA,'utf8') : '';
  const hasDelta = fAcontent.includes('DELTA');
  log('T10d','byterover','append DELTA',r,
    `Dosya icerik: "${fAcontent.slice(0,100)}" | DELTA: ${hasDelta}`,
    hasDelta ? 'SUCCESS' : 'FAIL');
  await D(4000);

  // T11a screenshot
  r = await chat('screenshot aracini kullan. Ekranimin fotografini cek.');
  await D(2000);
  // Path bul
  const ssMatch = r.text.match(/[A-Z]:[\\\/][^\s"']+\.(png|jpg|jpeg)/i);
  let ssOk = false;
  let ssVerify = 'Path bulunamadi cevapda';
  if (ssMatch) {
    const ssPath = ssMatch[0].replace(/\\\\/g,'\\');
    const exists = fs.existsSync(ssPath);
    const size = exists ? fs.statSync(ssPath).size : 0;
    ssOk = exists && size > 0;
    ssVerify = `Path: ${ssPath} | Var: ${exists} | Boyut: ${size} bytes`;
  }
  log('T11a','screenshot','ekran yakala',r,ssVerify,ssOk ? 'SUCCESS' : (r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T12a clipboard write
  r = await chat('clipboard aracini kullan. action: write, content: "SIGMA_CLIP_123"');
  const clipWriteOk = r.text.match(/basari|kopyala|panoya|yazildi|clipboard/i);
  log('T12a','clipboard','write SIGMA_CLIP_123',r,
    clipWriteOk ? 'Basari mesaji alindi' : 'Basari mesaji yok',
    clipWriteOk ? 'SUCCESS' : (r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T12b clipboard read
  r = await chat('clipboard aracini kullan. action: read. Panomdaki icerigi oku.');
  const clipReadOk = r.text.includes('SIGMA_CLIP_123');
  log('T12b','clipboard','read pano',r,
    `SIGMA_CLIP_123 cevapda: ${clipReadOk}`,
    clipReadOk ? 'SUCCESS' : (r.tc.length>0?'FAIL':'HALLUCINATION'));

  // SONUC
  let s=0,f=0,h=0,p=0;
  for(const x of R){if(x.verdict==='SUCCESS')s++;else if(x.verdict==='FAIL')f++;else if(x.verdict==='HALLUCINATION')h++;else p++;}
  console.log('\n=== GRUP 2 SONUC ===');
  console.log(`Toplam: ${R.length} | SUCCESS: ${s} | FAIL: ${f} | HAL: ${h} | OTHER: ${p}`);
  fs.writeFileSync('C:/AgentsHUB/app/sigma_g2.json',JSON.stringify(R,null,2));
  console.log('Kaydedildi: sigma_g2.json');
}
main().catch(console.error);
