#!/usr/bin/env python
"""
Fix courier migration issue where 0001_initial is marked as applied but tables don't exist
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

def fix_courier_migrations():
    """Fix courier migration state"""
    
    print("=== Fixing Courier Migration State ===")
    
    with connection.cursor() as cursor:
        # Check if courier tables exist
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'couriers_courierprofile'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("❌ CourierProfile table does not exist but migration is marked as applied")
            
            # Remove the migration record so it can be re-applied
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app = 'couriers' AND name = '0001_initial';
            """)
            print("✅ Removed 0001_initial migration record")
            
            # Also remove dependent migrations
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app = 'couriers' AND name LIKE '0002%';
            """)
            print("✅ Removed dependent migration records")
            
            print("✅ Migration state fixed. Migrations will run on next deploy.")
        else:
            print("✅ CourierProfile table exists - no fix needed")

if __name__ == '__main__':
    fix_courier_migrations()