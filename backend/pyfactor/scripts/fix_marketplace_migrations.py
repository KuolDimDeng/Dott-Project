#!/usr/bin/env python
"""
Script to fix marketplace and chat migrations in production
Run this in Render shell before applying migrations
"""
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.core.management import call_command

def fix_marketplace_migrations():
    """Fix marketplace and chat migrations to work with custom_auth.User"""
    
    print("=== FIXING MARKETPLACE & CHAT MIGRATIONS ===")
    
    with connection.cursor() as cursor:
        # Check if marketplace or chat migrations already exist
        cursor.execute("""
            SELECT COUNT(*) FROM django_migrations 
            WHERE app IN ('marketplace', 'chat')
        """)
        existing = cursor.fetchone()[0]
        
        if existing > 0:
            print(f"⚠️  Found {existing} existing marketplace/chat migrations")
            print("Removing them to start fresh...")
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app IN ('marketplace', 'chat')
            """)
            print(f"✅ Removed {cursor.rowcount} migration records")
        
        # Check if tables already exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE 'marketplace_%' OR table_name LIKE 'chat_%')
        """)
        tables = cursor.fetchall()
        
        if tables:
            print(f"Found {len(tables)} existing tables:")
            for table in tables:
                print(f"  - {table[0]}")
            
            print("\n⚠️  Tables already exist. Will fake migrations.")
            fake_flag = '--fake'
        else:
            print("✅ No existing tables found. Will create them.")
            fake_flag = None
        
        # Apply marketplace migrations
        print("\nApplying marketplace migrations...")
        try:
            if fake_flag:
                call_command('migrate', 'marketplace', fake_flag)
            else:
                call_command('migrate', 'marketplace')
            print("✅ Marketplace migrations applied")
        except Exception as e:
            print(f"❌ Error applying marketplace migrations: {e}")
            return False
        
        # Apply chat migrations
        print("\nApplying chat migrations...")
        try:
            if fake_flag:
                call_command('migrate', 'chat', fake_flag)
            else:
                call_command('migrate', 'chat')
            print("✅ Chat migrations applied")
        except Exception as e:
            print(f"❌ Error applying chat migrations: {e}")
            return False
        
        print("\n✅ All migrations fixed successfully!")
        return True

if __name__ == "__main__":
    success = fix_marketplace_migrations()
    sys.exit(0 if success else 1)