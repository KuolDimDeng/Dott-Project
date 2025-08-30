#!/usr/bin/env python
"""
Pre-migration fix to resolve conflicts before running makemigrations
This must run BEFORE makemigrations to avoid the InconsistentMigrationHistory error
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

def fix_migration_conflicts():
    """Fix all known migration conflicts"""
    
    print("=== Pre-Migration Conflict Resolution ===")
    
    with connection.cursor() as cursor:
        # 1. Get current transport migrations
        cursor.execute("""
            SELECT name, id FROM django_migrations 
            WHERE app = 'transport' 
            ORDER BY id
        """)
        transport_migrations = cursor.fetchall()
        print(f"Current transport migrations: {[m[0] for m in transport_migrations]}")
        
        # 2. Clear ALL transport migrations to fix ordering issues
        cursor.execute("""
            DELETE FROM django_migrations 
            WHERE app = 'transport'
        """)
        if cursor.rowcount > 0:
            print(f"✅ Cleared {cursor.rowcount} transport migration(s) to fix ordering")
        
        # 3. Re-add them in the correct order
        transport_order = [
            '0001_ensure_base_tables',
            '0002_initial',
            '0003_add_transport_models'
        ]
        
        for migration_name in transport_order:
            # Check if this migration was previously applied
            was_applied = any(m[0] == migration_name for m in transport_migrations)
            if was_applied:
                cursor.execute("""
                    INSERT INTO django_migrations (app, name, applied)
                    VALUES ('transport', %s, NOW())
                """, [migration_name])
                print(f"✅ Re-added {migration_name} in correct order")
        
        # 4. Clean up any other duplicate migrations
        cursor.execute("""
            DELETE FROM django_migrations a
            USING django_migrations b
            WHERE a.id > b.id 
            AND a.app = b.app 
            AND a.name = b.name
        """)
        if cursor.rowcount > 0:
            print(f"✅ Removed {cursor.rowcount} duplicate migration entries")
        
        print("✅ Migration conflicts resolved")

if __name__ == "__main__":
    try:
        fix_migration_conflicts()
    except Exception as e:
        print(f"Error fixing migrations: {e}")
        # Don't fail - let the migration process continue
        sys.exit(0)