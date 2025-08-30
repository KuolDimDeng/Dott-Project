#!/usr/bin/env python
"""
Fix inconsistent migration history for transport app
Run this before migrations to fix the dependency issue
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

def fix_transport_migrations():
    """Fix the transport migration inconsistency"""
    with connection.cursor() as cursor:
        # Check current migration state
        cursor.execute("""
            SELECT name FROM django_migrations 
            WHERE app = 'transport' 
            ORDER BY id
        """)
        migrations = cursor.fetchall()
        print(f"Current transport migrations: {[m[0] for m in migrations]}")
        
        # Remove the problematic migration record
        cursor.execute("""
            DELETE FROM django_migrations 
            WHERE app = 'transport' 
            AND name = '0003_add_transport_models'
        """)
        print("Removed 0003_add_transport_models migration record")
        
        # Now it can be reapplied in the correct order
        print("Migration history fixed. You can now run migrations normally.")

if __name__ == "__main__":
    try:
        fix_transport_migrations()
        print("✅ Successfully fixed migration history")
    except Exception as e:
        print(f"❌ Error fixing migrations: {e}")
        sys.exit(1)