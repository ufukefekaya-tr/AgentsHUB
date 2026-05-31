import { runGenesis } from './src/memory/genesis.js';
import fs from 'fs/promises';
import path from 'path';

async function setup() {
    try {
        console.log("Cleaning test directories...");
        const agentsDir = path.join(process.cwd(), 'Agents');
        const items = await fs.readdir(agentsDir);
        for(let item of items) {
            if(item.startsWith('test')) {
                await fs.rm(path.join(agentsDir, item), { recursive: true, force: true });
                console.log("Deleted", item);
            }
        }

        console.log("Generating Master Agent...");
        const result = await runGenesis('Etkilesim_Ajani');
        console.log("Result:", result);
    } catch(err) {
        console.error("Error:", err);
    }
}
setup();
