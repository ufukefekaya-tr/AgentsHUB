import fs from 'fs';

async function test() {
  console.log("SENDING REQUEST TO TESTAJANI...");
  const res = await fetch('http://localhost:3434/api/agents/TestAjani/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'agentshub_secure_key_2026'
    },
    body: JSON.stringify({
      message: "Hangi yeteneklerinin (skills) olduğunu kontrol et ve Listele. Sonra 'browser_agent' aracıyla https://news.ycombinator.com sayfasına girip teknolojideki son 2 başlığı Türkçe oku. Playwright ve Browser agent'i gerçekten kullanabildiğini göster."
    })
  });
  
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while(true) {
    const {done, value} = await reader.read();
    if(done) break;
    process.stdout.write(decoder.decode(value));
  }
}

test();
