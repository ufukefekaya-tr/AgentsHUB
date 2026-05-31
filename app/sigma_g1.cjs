const http = require('http');
const fs = require('fs');
const AGENT = 'SIGMA_TESTER_V1', PORT = 3434, KEY = 'agentshub_secure_key_2026';
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
  console.log('=== GRUP 1: ANINDA CALISMASI GEREKEN YETENEKLER (18 test) ===\n');

  // T01a calculator 1250*875
  let r=await chat('calculator aracini kullan ve hesapla: 1250 * 875');
  let ok=r.text.includes('1093750')||r.text.includes('1,093,750');
  log('T01a','calculator','1250*875',r,ok?'1093750 bulundu':'1093750 YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T01b calculator sqrt(144)+2^10
  r=await chat('calculator aracini kullan ve hesapla: sqrt(144) + 2^10');
  ok=r.text.includes('1036');
  log('T01b','calculator','sqrt(144)+2^10',r,ok?'1036 bulundu':'1036 YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T01c calculator sin(90)*pi
  r=await chat('calculator aracini kullan ve hesapla: sin(90) * pi');
  ok=r.text.includes('3.14')||r.text.includes('2.80')||r.text.includes('2.81');
  log('T01c','calculator','sin(90)*pi',r,ok?'Trig sonuc makul':'Sonuc YOK',ok?'SUCCESS':(r.tc.length>0?'PARTIAL':'HALLUCINATION'));
  await D(4000);

  // T02a get_time saat kac
  r=await chat('get_server_time aracini kullan. Su an saat kac?');
  ok=!!(r.text.match(/\d{1,2}:\d{2}/)||r.text.includes('2026'));
  log('T02a','get_time','saat kac',r,ok?'Zaman verisi var':'Zaman YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T02b get_time London
  r=await chat('get_server_time aracini kullan. timezone: Europe/London');
  ok=!!(r.text.match(/\d{1,2}[:.]\d{2}/)||r.text.includes('London')||r.text.includes('GMT'));
  log('T02b','get_time','London tz',r,ok?'London saat var':'YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T03a weather Istanbul
  r=await chat('weather aracini kullan. Istanbul hava durumunu getir.');
  ok=!!(r.text.match(/-?\d+.*[°C]/i)||r.text.match(/sicaklik|derece|temperature/i));
  log('T03a','weather','Istanbul',r,ok?'Sicaklik verisi var':'YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T03b weather London
  r=await chat('weather aracini kullan. London hava durumunu getir.');
  ok=!!(r.text.match(/-?\d+.*[°C]/i)||r.text.match(/temperature|humidity/i));
  log('T03b','weather','London',r,ok?'London hava var':'YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T03c weather Ankara 3gun
  r=await chat('weather aracini kullan. Ankara icin 3 gunluk hava tahmini.');
  ok=!!(r.text.match(/gun|forecast|tahmin|pazar|sali/i));
  log('T03c','weather','Ankara 3gun',r,ok?'Tahmin var':'YOK',ok?'SUCCESS':(r.tc.length>0?'PARTIAL':'HALLUCINATION'));
  await D(4000);

  // T04a google_search dolar
  r=await chat('google_search aracini kullan. "dolar kuru bugun" ara.');
  ok=!!(r.text.match(/\d+[.,]\d+/)&&r.text.match(/dolar|USD|TL|kur/i));
  log('T04a','google_search','dolar kuru',r,ok?'Doviz verisi var':'YOK',ok?'SUCCESS':(r.tc.length>0?'PARTIAL':'HALLUCINATION'));
  await D(4000);

  // T04b google_search yapay zeka
  r=await chat('google_search aracini kullan. "yapay zeka nedir" ara.');
  ok=r.text.length>100;
  log('T04b','google_search','yapay zeka',r,ok?`${r.text.length} kr cevap`:'Cok kisa',ok?'SUCCESS':'FAIL');
  await D(4000);

  // T05a duckduckgo Python
  r=await chat('duckduckgo_search aracini kullan. "Python programming" ara.');
  ok=!!(r.text.match(/python/i)&&r.text.length>80);
  log('T05a','duckduckgo_search','Python',r,ok?'Python sonuc var':'YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T05b duckduckgo ML
  r=await chat('duckduckgo_search aracini kullan. "machine learning 2025" ara.');
  ok=r.text.length>80;
  log('T05b','duckduckgo_search','ML 2025',r,ok?'Sonuc var':'YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T06a web_scraper example.com
  r=await chat('web_scraper aracini kullan. https://example.com adresini oku.');
  ok=r.text.includes('Example Domain')||r.text.includes('example');
  log('T06a','web_scraper','example.com',r,ok?'Example Domain bulundu':'YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T06b web_scraper httpbin
  r=await chat('web_scraper aracini kullan. https://httpbin.org/html sayfasini oku.');
  ok=r.text.includes('Melville')||r.text.includes('Moby')||r.text.includes('Herman');
  log('T06b','web_scraper','httpbin/html',r,ok?'Melville bulundu':'YOK',ok?'SUCCESS':(r.tc.length>0?'PARTIAL':'HALLUCINATION'));
  await D(4000);

  // T07a health_checker UP
  r=await chat('health_checker aracini kullan. Kontrol et: ["https://www.google.com","https://example.com"]');
  ok=!!(r.text.match(/UP|200|OK|ayakta|erisi/i));
  log('T07a','health_checker','google+example',r,ok?'UP tespit':'YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T07b health_checker 503
  r=await chat('health_checker aracini kullan. Kontrol et: ["https://httpstat.us/503"]');
  ok=!!(r.text.match(/503|DOWN|DEGRADED|basarisiz|hata/i));
  log('T07b','health_checker','503',r,ok?'503 tespit':'YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T08a system_monitor CPU RAM
  r=await chat('system_monitor aracini kullan. CPU ve RAM durumunu goster.');
  ok=!!(r.text.match(/CPU|cpu/i)&&r.text.match(/%|\d+.*GB/i));
  log('T08a','system_monitor','CPU+RAM',r,ok?'CPU/RAM verisi var':'YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));
  await D(4000);

  // T08b system_monitor Disk
  r=await chat('system_monitor aracini kullan. Disk doluluk oranini goster.');
  ok=!!(r.text.match(/disk|GB|TB|%/i));
  log('T08b','system_monitor','Disk',r,ok?'Disk verisi var':'YOK',ok?'SUCCESS':(r.tc.length>0?'FAIL':'HALLUCINATION'));

  // SONUC
  let s=0,f=0,h=0,p=0;
  for(const x of R){if(x.verdict==='SUCCESS')s++;else if(x.verdict==='FAIL')f++;else if(x.verdict==='HALLUCINATION')h++;else p++;}
  console.log('\n=== GRUP 1 SONUC ===');
  console.log(`Toplam: ${R.length} | SUCCESS: ${s} | FAIL: ${f} | HALLUCINATION: ${h} | PARTIAL/DIGER: ${p}`);
  fs.writeFileSync('C:/AgentsHUB/app/sigma_g1.json',JSON.stringify(R,null,2));
  console.log('Kaydedildi: sigma_g1.json');
}
main().catch(console.error);
