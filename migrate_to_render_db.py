#!/usr/bin/env python3
"""
Simple script to test Render PostgreSQL connection and create basic database structure
"""
import psycopg2
import psycopg2.extras
import os
from datetime import datetime

# Render PostgreSQL connection details
DB_CONFIG = {
    'host': 'dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com',
    'database': 'dott_production',
    'user': 'dott_user',
    'password': 'SG65SMG79zpPfx8lRDWlIBTfxw1VCVnJ',
    'port': 5432,
    'sslmode': 'require'
}

def test_connection():
    """Test connection to Render PostgreSQL"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print("✅ Successfully connected to Render PostgreSQL!")
        
        # Get database info
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()
        print(f"📊 PostgreSQL Version: {version[0]}")
        
        cur.execute("SELECT current_database();")
        db_name = cur.fetchone()
        print(f"🗄️ Current Database: {db_name[0]}")
        
        cur.execute("SELECT current_user;")
        user = cur.fetchone()
        print(f"👤 Current User: {user[0]}")
        
        # List existing tables
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cur.fetchall()
        print(f"\n📋 Existing Tables ({len(tables)}):")
        for table in tables:
            print(f"  - {table[0]}")
        
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def create_migration_log():
    """Create a migration log table"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Create migration log table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS migration_log (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50) DEFAULT 'started',
                details TEXT
            );
        """)
        
        # Log this migration
        cur.execute("""
            INSERT INTO migration_log (migration_name, details) 
            VALUES (%s, %s);
        """, (
            'aws_rds_to_render_migration', 
            f'Migration started at {datetime.now()} - Moving from AWS RDS to Render PostgreSQL'
        ))
        
        conn.commit()
        print("✅ Created migration log table")
        
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Failed to create migration log: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Render PostgreSQL Migration Test")
    print("=" * 50)
    
    if test_connection():
        create_migration_log()
        print("\n🎉 Migration test completed successfully!")
        print("\n📝 Next Steps:")
        print("1. Update your Render service environment variables")
        print("2. Run Django migrations: python manage.py migrate")
        print("3. Create superuser: python manage.py createsuperuser")
        print("4. Test your application")
    else:
        print("\n💥 Migration test failed!") 