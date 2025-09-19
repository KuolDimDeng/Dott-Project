#!/usr/bin/env python
"""
Fix inconsistent migration history for marketplace/couriers apps
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

def fix_courier_marketplace_migrations():
    """Fix the courier/marketplace migration inconsistency"""
    with connection.cursor() as cursor:
        # Check if couriers.0001_initial exists
        cursor.execute("""
            SELECT COUNT(*) FROM django_migrations
            WHERE app = 'couriers'
            AND name = '0001_initial'
        """)
        count = cursor.fetchone()[0]

        if count == 0:
            print("Adding missing couriers.0001_initial migration...")
            # Add the missing migration record
            cursor.execute("""
                INSERT INTO django_migrations (app, name, applied)
                VALUES ('couriers', '0001_initial', NOW())
            """)
            connection.commit()
            print("✅ Added couriers.0001_initial to migration history")
        else:
            print("couriers.0001_initial already exists")

        # Now check marketplace migrations
        cursor.execute("""
            SELECT name FROM django_migrations
            WHERE app = 'marketplace'
            ORDER BY id
        """)
        migrations = cursor.fetchall()
        print(f"\nCurrent marketplace migrations: {[m[0] for m in migrations]}")

        print("\nMigration history fixed. You can now run migrations normally.")

if __name__ == "__main__":
    try:
        fix_courier_marketplace_migrations()
        print("✅ Successfully fixed migration history")
    except Exception as e:
        print(f"❌ Error fixing migrations: {e}")
        sys.exit(1)