#!/usr/bin/env python
"""
Force courier migration to succeed by clearing any conflicting state.
This is a nuclear option that ensures migrations can proceed.
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

def force_courier_migration():
    """Force courier migration by completely resetting the courier app state"""
    
    print("=== Force Courier Migration Fix ===")
    print("WARNING: This will drop all courier tables and reset migrations")
    print("")
    
    with connection.cursor() as cursor:
        try:
            # Step 1: Drop ALL courier tables if they exist (CASCADE handles dependencies)
            print("Dropping all courier tables...")
            tables_to_drop = [
                'couriers_deliveryorder',
                'couriers_courierearnings',
                'couriers_courierprofile',
                'couriers_couriercompanybranch',
                'couriers_couriercompany',
            ]
            
            for table in tables_to_drop:
                try:
                    cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
                    print(f"  Dropped: {table}")
                except Exception as e:
                    print(f"  Warning dropping {table}: {e}")
            
            print("")
            
            # Step 2: Remove ALL courier migration records
            print("Removing all courier migration records...")
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app = 'couriers';
            """)
            deleted = cursor.rowcount
            print(f"  Removed {deleted} migration record(s)")
            print("")
            
            # Step 3: Also check for any orphaned sequences
            print("Cleaning up any orphaned sequences...")
            cursor.execute("""
                SELECT sequence_name 
                FROM information_schema.sequences 
                WHERE sequence_name LIKE 'couriers_%';
            """)
            sequences = cursor.fetchall()
            for seq in sequences:
                try:
                    cursor.execute(f"DROP SEQUENCE IF EXISTS {seq[0]} CASCADE;")
                    print(f"  Dropped sequence: {seq[0]}")
                except Exception as e:
                    print(f"  Warning dropping sequence {seq[0]}: {e}")
            
            if not sequences:
                print("  No orphaned sequences found")
            print("")
            
            # Step 4: Verify clean state
            print("Verifying clean state...")
            
            # Check no tables exist
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name LIKE 'couriers_%';
            """)
            table_count = cursor.fetchone()[0]
            
            # Check no migrations marked
            cursor.execute("""
                SELECT COUNT(*) FROM django_migrations 
                WHERE app = 'couriers';
            """)
            migration_count = cursor.fetchone()[0]
            
            if table_count == 0 and migration_count == 0:
                print("✅ SUCCESS: Courier app is in a clean state")
                print("   - No courier tables exist")
                print("   - No courier migrations marked as applied")
                print("   - Django can now create everything fresh")
            else:
                print(f"⚠️ WARNING: Not fully clean - {table_count} tables, {migration_count} migrations")
            
            print("")
            print("✅ Force migration fix complete. Django migrations can now proceed.")
            
        except Exception as e:
            print(f"❌ Error during force migration: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    force_courier_migration()