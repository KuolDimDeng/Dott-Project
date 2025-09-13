#!/usr/bin/env python
"""
Fix migration conflict on staging database.

The issue: marketplace.0003_add_courier_integration is applied but depends on
couriers.0001_initial which isn't marked as applied.

Solution: Mark couriers.0001_initial as applied (fake it) since the courier
integration is already in the database.
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, '/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.core.management import call_command

def fix_migration_conflict():
    """Fix the migration conflict by marking couriers.0001_initial as applied."""

    print("🔧 Fixing migration conflict...")
    print("=" * 60)

    try:
        # First, check current migration status
        print("\n📋 Current migration status:")
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT app, name
                FROM django_migrations
                WHERE app IN ('marketplace', 'couriers', 'advertising')
                ORDER BY app, id
            """)
            rows = cursor.fetchall()

            for app, name in rows:
                print(f"  {app}: {name}")

        # Check if couriers.0001_initial is already applied
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM django_migrations
                WHERE app = 'couriers' AND name = '0001_initial'
            """)
            count = cursor.fetchone()[0]

            if count > 0:
                print("\n✅ couriers.0001_initial is already marked as applied")
            else:
                print("\n⚠️  couriers.0001_initial is NOT marked as applied")
                print("🔄 Marking it as applied (fake migration)...")

                # Use Django's migrate command with --fake flag
                call_command('migrate', 'couriers', '0001_initial', '--fake')
                print("✅ Successfully marked couriers.0001_initial as applied")

        # Now check if we can apply the new migrations
        print("\n📝 Checking pending migrations:")
        call_command('showmigrations', '--plan', verbosity=0)

        print("\n🚀 Ready to apply new migrations!")
        print("Run: python manage.py migrate")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

    return True

if __name__ == '__main__':
    success = fix_migration_conflict()
    sys.exit(0 if success else 1)