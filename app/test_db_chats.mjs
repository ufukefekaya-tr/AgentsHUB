import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function queryDb(dbPath, query) {
    try {
        const db = await open({ filename: dbPath, driver: sqlite3.Database });
        const rows = await db.all(query);
        await db.close();
        return rows;
    } catch (e) {
        return { error: e.message };
    }
}

async function main() {
    const dbPaths = [
        path.join(process.cwd(), 'satis_db', 'ziyaretler.db'),
        path.join(process.cwd(), 'satis_db', 'customer_chats.db'),
        path.join(process.cwd(), 'satis_db', 'internal_chats.db'),
        path.join(process.cwd(), 'satis_db', 'quota_hub.db')
    ];

    console.log("SQLITE DATABASE QUERY SEARCH:");
    
    for (const dbp of dbPaths) {
        console.log(`\n--- DB: ${path.basename(dbp)} ---`);
        // Tabloları listele
        const tables = await queryDb(dbp, "SELECT name FROM sqlite_master WHERE type='table'");
        console.log("Tables:", JSON.stringify(tables));
        
        if (Array.isArray(tables)) {
            for (const t of tables) {
                // Her tabloda telegram veya chat ile ilgili kolonları tara
                const info = await queryDb(dbp, `PRAGMA table_info(${t.name})`);
                const cols = info.map(c => c.name);
                
                // Ufuk veya telegram araması yap
                if (cols.length > 0) {
                    const searchQueries = [
                        `SELECT * FROM ${t.name} WHERE ${cols.map(c => `${c} LIKE '%ufuk%'`).join(' OR ')} LIMIT 10`,
                        `SELECT * FROM ${t.name} WHERE ${cols.map(c => `${c} LIKE '%1190118497%'`).join(' OR ')} LIMIT 10`
                    ];
                    
                    for (const sq of searchQueries) {
                        const results = await queryDb(dbp, sq);
                        if (Array.isArray(results) && results.length > 0) {
                            console.log(`Matches in ${t.name}:`, JSON.stringify(results, null, 2));
                        }
                    }
                }
            }
        }
    }
}

main();
