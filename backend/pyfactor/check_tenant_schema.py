#!/usr/bin/env python3
"""
Check the schema of custom_auth_tenant table
"""
import psycopg2

# Database connection settings
DB_CONFIG = {
    'host': 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com',
    'database': 'dott_production',
    'user': 'dott_user',
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'port': '5432',
    'sslmode': 'require'
}

def check_schema():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Get column information
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'custom_auth_tenant'
            ORDER BY ordinal_position
        """)
        
        print("Columns in custom_auth_tenant table:")
        for row in cur.fetchall():
            print(f"  - {row[0]}: {row[1]} (nullable: {row[2]})")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()