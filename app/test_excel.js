import { skill as excelSkill } from '../Marketplace/skills/excel_manager.js';

async function test() {
    console.log("--- TEST 1: WRITE ---");
    const resWrite = await excelSkill.execute({
        action: "write",
        filename: "test_satislar.xlsx",
        content: JSON.stringify([{ "Müşteri": "Ahmet", "Tutar": 100 }, { "Müşteri": "Ayşe", "Tutar": 250 }])
    }, { agentId: "QA_ATLAS_V3" });
    console.log(resWrite);

    console.log("\n--- TEST 2: INFO ---");
    const resInfo = await excelSkill.execute({
        action: "info",
        filename: "test_satislar.xlsx"
    }, { agentId: "QA_ATLAS_V3" });
    console.log(resInfo);

    console.log("\n--- TEST 3: READ ---");
    const resRead = await excelSkill.execute({
        action: "read",
        filename: "test_satislar.xlsx",
        limit: 1
    }, { agentId: "QA_ATLAS_V3" });
    console.log(resRead);

    console.log("\n--- TEST 4: APPEND ---");
    const resAppend = await excelSkill.execute({
        action: "append",
        filename: "test_satislar.xlsx",
        content: JSON.stringify([{ "Müşteri": "Can", "Tutar": 500 }])
    }, { agentId: "QA_ATLAS_V3" });
    console.log(resAppend);

    console.log("\n--- TEST 5: READ AFTER APPEND ---");
    const resReadFinal = await excelSkill.execute({
        action: "read",
        filename: "test_satislar.xlsx"
    }, { agentId: "QA_ATLAS_V3" });
    console.log(resReadFinal);
}

test().catch(console.error);
