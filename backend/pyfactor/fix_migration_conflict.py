#!/usr/bin/env python3
"""
Fix migration conflict on production server
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
from django.core.management import execute_from_command_line

def fix_migration_conflict():
    """Mark problematic migration as applied and run correct migration"""
    
    print("🔧 Fixing migration conflict...")
    
    try:
        with connection.cursor() as cursor:
            # Check if the problematic migration is recorded
            cursor.execute("""
                SELECT COUNT(*) FROM django_migrations 
                WHERE app = 'users' AND name = '0009_add_user_timezone'
            """)
            count = cursor.fetchone()[0]
            
            if count == 0:
                # Mark the problematic migration as applied (fake it)
                print("📝 Marking users.0009_add_user_timezone as applied...")
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied) 
                    VALUES ('users', '0009_add_user_timezone', NOW())
                """)
                print("✅ Migration marked as applied")
            else:
                print("ℹ️ Migration already marked as applied")
        
        # Now run the correct migration
        print("🚀 Running custom_auth migration...")
        execute_from_command_line(['manage.py', 'migrate', 'custom_auth'])
        
        print("✅ Migration conflict resolved!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    fix_migration_conflict()