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
    
    try:
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
                print("❌ CourierProfile table does not exist")
                
                # Check if migration is marked as applied
                cursor.execute("""
                    SELECT COUNT(*) FROM django_migrations 
                    WHERE app = 'couriers' AND name = '0001_initial';
                """)
                migration_applied = cursor.fetchone()[0] > 0
                
                if migration_applied:
                    print("❌ Migration 0001_initial is marked as applied but table doesn't exist")
                    
                    # Remove ALL courier migration records to start fresh
                    cursor.execute("""
                        DELETE FROM django_migrations 
                        WHERE app = 'couriers';
                    """)
                    deleted = cursor.rowcount
                    print(f"✅ Removed {deleted} courier migration record(s)")
                    
                    # Also remove marketplace courier integration migrations
                    cursor.execute("""
                        DELETE FROM django_migrations 
                        WHERE app = 'marketplace' 
                        AND name IN ('0003_add_courier_integration', '0006_merge_20250909_1710');
                    """)
                    deleted = cursor.rowcount
                    if deleted > 0:
                        print(f"✅ Removed {deleted} marketplace courier migration record(s)")
                    
                    print("✅ Migration state fixed. Courier migrations will run fresh.")
                else:
                    print("✅ Migration not marked as applied - will run normally")
            else:
                print("✅ CourierProfile table exists - no fix needed")
                
    except Exception as e:
        print(f"⚠️ Error fixing migrations: {e}")
        # Don't fail the deployment
        pass

if __name__ == '__main__':
    fix_courier_migrations()