import { SkillRegistry } from "./src/skills/registry.js";
SkillRegistry.sync("TestAjani").then(res => console.log("Done:", res)).catch(console.error);
