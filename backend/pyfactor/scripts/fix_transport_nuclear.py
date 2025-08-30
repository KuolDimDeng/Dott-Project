#!/usr/bin/env python
"""
Nuclear option: Completely reset transport migrations
Run this in Render shell if nothing else works
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

def nuclear_fix():
    """Nuclear option - completely reset transport migrations"""
    
    print("=== NUCLEAR TRANSPORT MIGRATION FIX ===")
    print("⚠️  This will reset all transport migrations!")
    
    with connection.cursor() as cursor:
        # 1. Remove ALL transport migrations
        cursor.execute("""
            DELETE FROM django_migrations 
            WHERE app = 'transport'
        """)
        print(f"✅ Removed {cursor.rowcount} transport migration records")
        
        # 2. Check if transport tables exist
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'transport_%'
        """)
        table_count = cursor.fetchone()[0]
        print(f"Found {table_count} transport tables in database")
        
        # 3. Fake all transport migrations as applied
        print("Faking transport migrations as applied...")
        try:
            call_command('migrate', 'transport', '0001_ensure_base_tables', '--fake')
            print("✅ Faked 0001_ensure_base_tables")
        except:
            pass
        
        try:
            call_command('migrate', 'transport', '0002_initial', '--fake')
            print("✅ Faked 0002_initial")
        except:
            pass
        
        try:
            call_command('migrate', 'transport', '0003_add_transport_models', '--fake')
            print("✅ Faked 0003_add_transport_models")
        except:
            pass
        
        print("\n✅ Transport migrations have been reset")
        print("Now run: python manage.py migrate")

if __name__ == "__main__":
    nuclear_fix()