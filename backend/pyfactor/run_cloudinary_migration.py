#!/usr/bin/env python
"""
Script to run the Cloudinary migration for StoreItems
Run on server: python run_cloudinary_migration.py
"""

import os
import sys
import django

# Add the app directory to Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Setup Django
django.setup()

from django.core.management import call_command

def run_migration():
    print("=" * 60)
    print("RUNNING CLOUDINARY MIGRATION FOR STOREITEMS")
    print("=" * 60)

    try:
        # Run the specific migration
        print("\nRunning migrations for inventory app...")
        call_command('migrate', 'inventory', verbosity=2)

        print("\n✅ Migration completed successfully!")
        print("You can now run populate_storeitems_cloudinary.py to add images")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)