#!/usr/bin/env python
"""
Fix missing is_open_now field in marketplace_business_listing table
Run this in Render shell: python scripts/staging_migration_is_open_now_fix.py
"""
import os
import django
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.management import execute_from_command_line

def main():
    """Run the marketplace migration to add is_open_now field"""
    try:
        print("🔄 Running marketplace migration 0007_add_is_open_now_field...")
        execute_from_command_line([
            'manage.py', 'migrate', 'marketplace', '0007_add_is_open_now_field'
        ])
        print("✅ Migration completed successfully!")
        
        # Verify the field was added
        from marketplace.models import BusinessListing
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'marketplace_business_listing' 
                AND column_name = 'is_open_now'
            """)
            result = cursor.fetchone()
            
            if result:
                print("✅ Verified: is_open_now column exists in database")
            else:
                print("❌ Error: is_open_now column not found after migration")
                return 1
                
        # Test that we can query BusinessListing without errors
        count = BusinessListing.objects.count()
        print(f"✅ Successfully queried BusinessListing table ({count} records)")
        
        return 0
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())