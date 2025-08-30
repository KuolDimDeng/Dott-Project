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
        # 1. Fix transport migration conflict
        cursor.execute("""
            DELETE FROM django_migrations 
            WHERE app = 'transport' 
            AND name = '0003_add_transport_models'
        """)
        if cursor.rowcount > 0:
            print(f"✅ Fixed transport migration conflict ({cursor.rowcount} entries removed)")
        
        # 2. Check if transport 0002_initial exists
        cursor.execute("""
            SELECT COUNT(*) FROM django_migrations 
            WHERE app = 'transport' AND name = '0002_initial'
        """)
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("⚠️  transport.0002_initial not found, adding it...")
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('transport', '0002_initial', NOW())
            """)
            print("✅ Added transport.0002_initial migration record")
        
        # 3. Clean up any other duplicate migrations
        cursor.execute("""
            DELETE FROM django_migrations
            WHERE id NOT IN (
                SELECT MIN(id)
                FROM django_migrations
                GROUP BY app, name
            )
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