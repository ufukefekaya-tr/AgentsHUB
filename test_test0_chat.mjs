import http from 'http';

function post(url, headers, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const postData = JSON.stringify(data);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                ...headers
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function main() {
    try {
        console.log("1. Logging in...");
        const loginRes = await post('http://localhost:3434/api/system/login', {}, { password: 'agentshub_secure_key_2026' });
        console.log("Login Status:", loginRes.status, loginRes.body);
        if (!loginRes.body?.token) {
            console.error("Login failed!");
            return;
        }
        const token = loginRes.body.token;

        console.log("\n2. Sending chat message to test0...");
        const chatRes = await post('http://localhost:3434/api/agents/test0/chat', {
            'Authorization': `Bearer ${token}`
        }, {
            message: "Merhaba test0, sistemin nasıl çalışıyor? Hangi modeldesin?",
            history: []
        });

        console.log("Chat Status:", chatRes.status);
        console.log("Chat Response Body:", chatRes.body);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
