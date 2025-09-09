#!/usr/bin/env python
"""
Comprehensive fix for courier deployment issues.
This script ensures courier tables and migrations are in a consistent state.
"""
import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction

def fix_courier_deployment():
    """Fix courier deployment by ensuring consistent state"""
    
    print("=== Comprehensive Courier Deployment Fix ===")
    print("")
    
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Step 1: Check if courier migrations are marked as applied
                cursor.execute("""
                    SELECT name FROM django_migrations 
                    WHERE app = 'couriers'
                    ORDER BY name;
                """)
                applied_migrations = cursor.fetchall()
                
                print(f"Found {len(applied_migrations)} courier migrations marked as applied:")
                for migration in applied_migrations:
                    print(f"  - {migration[0]}")
                print("")
                
                # Step 2: Check which courier tables actually exist
                courier_tables = [
                    'couriers_couriercompany',
                    'couriers_couriercompanybranch',
                    'couriers_courierprofile',
                    'couriers_deliveryorder',
                    'couriers_courierearnings',
                ]
                
                existing_tables = []
                missing_tables = []
                
                for table in courier_tables:
                    cursor.execute(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = '{table}'
                        );
                    """)
                    exists = cursor.fetchone()[0]
                    if exists:
                        existing_tables.append(table)
                    else:
                        missing_tables.append(table)
                
                print(f"Existing tables ({len(existing_tables)}):")
                for table in existing_tables:
                    print(f"  ✅ {table}")
                print("")
                
                if missing_tables:
                    print(f"Missing tables ({len(missing_tables)}):")
                    for table in missing_tables:
                        print(f"  ❌ {table}")
                    print("")
                
                # Step 3: Determine the action needed
                if len(applied_migrations) > 0 and len(existing_tables) == len(courier_tables):
                    # All tables exist and migrations are marked - we're good
                    print("✅ Courier tables and migrations are in sync. No action needed.")
                    return
                
                elif len(applied_migrations) > 0 and len(existing_tables) < len(courier_tables):
                    # Migrations marked but tables missing - need to recreate
                    print("⚠️ Migrations marked as applied but tables are missing.")
                    print("   This can happen if tables were dropped manually.")
                    print("   Will clear migration records so Django can recreate tables.")
                    print("")
                    
                    # Remove migration records
                    cursor.execute("""
                        DELETE FROM django_migrations 
                        WHERE app = 'couriers';
                    """)
                    deleted = cursor.rowcount
                    print(f"✅ Removed {deleted} courier migration record(s)")
                    
                    # Drop any existing tables to ensure clean state
                    for table in existing_tables:
                        print(f"   Dropping existing table: {table}")
                        cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
                    print("✅ Dropped existing courier tables")
                    
                elif len(applied_migrations) == 0 and len(existing_tables) > 0:
                    # Tables exist but migrations not marked - unusual case
                    print("⚠️ Tables exist but migrations not marked as applied.")
                    print("   This is an unusual state - likely from manual table creation.")
                    print("   Will drop tables and let Django recreate them properly.")
                    print("")
                    
                    # Drop existing tables
                    for table in courier_tables:
                        cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
                        print(f"   Dropped: {table}")
                    print("✅ Dropped all courier tables")
                    
                else:
                    # No migrations and no tables - clean slate
                    print("✅ Clean slate - no courier migrations or tables found.")
                    print("   Django will create everything fresh.")
                
                print("")
                print("✅ Courier deployment state fixed. Migrations can now run.")
                print("   Django will handle creating the tables through migrations.")
                
    except Exception as e:
        print(f"❌ Error fixing courier deployment: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    fix_courier_deployment()