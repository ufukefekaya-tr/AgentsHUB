import { skill as clawhub_remote } from '../Marketplace/skills/clawhub_remote.js';
import { skill as clawhub_installer } from '../Marketplace/skills/clawhub_installer.js';

(async () => {
   console.log("--- 1. ARA ---");
   const searchRes = await clawhub_remote.execute({ action: "search", query: "pdf" }, {});
   console.log("Arama Sonucu:", searchRes);

   console.log("\n--- 2. İNDİR ---");
   const dlRes = await clawhub_remote.execute({ action: "download", query: "pdf" }, {});
   console.log("İndirme Sonucu:", dlRes);

   console.log("\n--- 3. KURULUM (LIST) ---");
   const installList = await clawhub_installer.execute({ action: "list" }, { agentId: "QA_ATLAS_V3" });
   console.log("Mevcut Market:", installList);

   console.log("\n--- 4. KURULUM (pdf) ---");
   // Burada `pdf_SKILL.md` kurulsun diyeceğine pdf deniyoruz, ne yapacak görelim.
   const installRes1 = await clawhub_installer.execute({ action: "install", skill_name: "pdf" }, { agentId: "QA_ATLAS_V3" });
   console.log("pdf_SKILL.md denemesi:", installRes1);
   
   console.log("\n--- 4. KURULUM (pdf_SKILL.md) ---");
   const installRes2 = await clawhub_installer.execute({ action: "install", skill_name: "pdf_SKILL.md" }, { agentId: "QA_ATLAS_V3" });
   console.log("pdf_SKILL.md denemesi:", installRes2);
})();
