#!/usr/bin/env python3
"""
Fix production migration by directly adding timezone column to custom_auth_user table
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from django.db import connection

def fix_production_migration():
    """Add timezone column directly and mark migrations as applied"""
    
    print("🔧 Fixing production timezone migration...")
    
    try:
        with connection.cursor() as cursor:
            # First check if timezone column already exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'custom_auth_user' 
                AND column_name = 'timezone'
            """)
            
            if not cursor.fetchone():
                print("📝 Adding timezone column to custom_auth_user...")
                cursor.execute("""
                    ALTER TABLE custom_auth_user 
                    ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'
                """)
                print("✅ Timezone column added")
            else:
                print("ℹ️ Timezone column already exists")
            
            # Mark custom_auth migration as applied
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied) 
                SELECT 'custom_auth', '0002_add_user_timezone', NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM django_migrations 
                    WHERE app = 'custom_auth' AND name = '0002_add_user_timezone'
                )
            """)
            
            # Mark users migration as applied (empty migration)
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied) 
                SELECT 'users', '0009_add_user_timezone', NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM django_migrations 
                    WHERE app = 'users' AND name = '0009_add_user_timezone'
                )
            """)
            
            print("✅ Migration fix completed successfully!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    fix_production_migration()