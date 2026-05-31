import sqlite3
import os
import json

db_paths = [
    os.path.join(os.getcwd(), 'satis_db', 'ziyaretler.db'),
    os.path.join(os.getcwd(), 'satis_db', 'customer_chats.db'),
    os.path.join(os.getcwd(), 'satis_db', 'internal_chats.db'),
    os.path.join(os.getcwd(), 'satis_db', 'quota_hub.db')
]

print("PYTHON SQLITE SEARCH:")

for dbp in db_paths:
    if not os.path.exists(dbp):
        print(f"File not found: {dbp}")
        continue
    
    print(f"\n--- DB: {os.path.basename(dbp)} ---")
    try:
        conn = sqlite3.connect(dbp)
        cursor = conn.cursor()
        
        # Tabloları listele
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"Tables: {tables}")
        
        for table in tables:
            cursor.execute(f"PRAGMA table_info({table})")
            cols = [c[1] for c in cursor.fetchall()]
            
            # Arama sorguları
            for search_term in ['ufuk', '1190118497', 'telegram']:
                where_clause = " OR ".join([f"{col} LIKE '%{search_term}%'" for col in cols])
                if not where_clause:
                    continue
                
                query = f"SELECT * FROM {table} WHERE {where_clause} LIMIT 10"
                try:
                    cursor.execute(query)
                    rows = cursor.fetchall()
                    if rows:
                        print(f"Matches in table {table} for '{search_term}':")
                        for row in rows:
                            print(row)
                except Exception as table_err:
                    pass
                    
        conn.close()
    except Exception as e:
        print(f"Error reading DB: {e}")
