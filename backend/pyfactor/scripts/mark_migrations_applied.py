#!/usr/bin/env python
"""
Mark problematic migrations as applied without running them.
Run this after creating tables manually with SQL.
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def mark_migrations_as_fake():
    """Mark specific problematic migrations as applied."""

    migrations_to_fake = [
        # Chat migrations that reference tables we created manually
        ('chat', '0001_initial'),
        ('chat', '0002_add_sender_type'),

        # Marketplace migrations with courier integration
        ('marketplace', '0003_add_courier_integration'),
        ('marketplace', '0004_consumer_order_courier'),

        # Any other problematic migrations
    ]

    print("=" * 50)
    print("MARKING MIGRATIONS AS APPLIED (FAKE)")
    print("=" * 50)

    for app_label, migration_name in migrations_to_fake:
        try:
            print(f"\nMarking {app_label}.{migration_name} as applied...")
            execute_from_command_line([
                'manage.py',
                'migrate',
                app_label,
                migration_name,
                '--fake'
            ])
            print(f"✓ Successfully marked {app_label}.{migration_name} as applied")
        except Exception as e:
            print(f"✗ Error marking {app_label}.{migration_name}: {str(e)}")
            # Continue with other migrations even if one fails
            continue

    print("\n" + "=" * 50)
    print("CHECKING MIGRATION STATUS")
    print("=" * 50)

    # Show current migration status
    execute_from_command_line(['manage.py', 'showmigrations', '--list'])

    print("\n" + "=" * 50)
    print("RUNNING REMAINING MIGRATIONS")
    print("=" * 50)

    # Try to run any remaining migrations
    try:
        execute_from_command_line(['manage.py', 'migrate'])
        print("\n✓ All migrations completed successfully!")
    except Exception as e:
        print(f"\n✗ Error running migrations: {str(e)}")
        print("\nYou may need to manually fix remaining issues.")

if __name__ == '__main__':
    mark_migrations_as_fake()