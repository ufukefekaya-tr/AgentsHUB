const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3434,
  path: '/api/agents/test0/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'agentshub_secure_key_2026'
  }
}, (res) => {
  res.on('data', (chunk) => {
    process.stdout.write(chunk.toString());
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(JSON.stringify({
  message: "byterover (action:execute) kullanarak klasörü listele. Çok kısa ol.",
  history: [],
  configOverrides: { thinkingEnabled: false, model: 'gemini-3.1-pro-preview' }
}));
req.end();
