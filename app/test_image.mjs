import { SandboxRunner } from './src/skills/sandbox_runner.js';
import path from 'path';

async function test() {
    const filePath = 'file:///' + path.resolve('./Agents/MASTER_TESTER/skills/image_generator.js').replace(/\\/g, '/');
    const skillObj = {
        name: 'image_generator',
        __filePath: filePath
    };

    const enhancedContext = {
        apiKey: "__API_KEY__",
        vertexProject: "873195891345",
        vertexLocation: "",
        agentId: "MASTER_TESTER",
        imageQuality: "fast",
        aspectRatio: "1:1"
    };

    console.log("Runner baslatiliyor...");
    const res = await SandboxRunner.executeIsolated(skillObj, { prompt: "A futuristic robotic arm" }, "MASTER_TESTER", enhancedContext);
    console.log("SONUC:");
    console.log(res);
}

test().catch(console.error);

