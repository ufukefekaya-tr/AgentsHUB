import { parentPort, workerData } from 'worker_threads';
import { pathToFileURL } from 'url';

/**
 * AgentsHUB - Mutlak İzole Kum Havuzu - İşçi Sınıfı
 * IP-5 KM-5.2 execution isolation context.
 * 
 * Bu işçi ana thread'den ayrı yaşar. Eğer bir yerküre parçalanması (while(true)) yaratırsa,
 * Gateway onu rahatlıkla celladına yollayabilir (worker.terminate()).
 */
async function run() {
    try {
        // Cache bypass için dinamik import
        const fetchPath = `${workerData.filePath}?t=${Date.now()}`;
        const module = await import(fetchPath);
        
        let result;
        const contextObj = { agentId: workerData.agentId, ...(workerData.configOverrides || {}) };
        if (module.action) {
            result = await module.action(workerData.args, contextObj);
        } else if (module.skill && module.skill.execute) {
            result = await module.skill.execute(workerData.args, contextObj);
        } else if (module.execute) {
            result = await module.execute(workerData.args, contextObj);
        } else {
            throw new Error("Geçerli çalışma metodu yok (action veya execute bulunamadı).");
        }
        
        parentPort.postMessage({ success: true, result });
    } catch (e) {
        parentPort.postMessage({ success: false, error: e.message });
    }
}

run();
