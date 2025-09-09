#!/usr/bin/env python
"""
Fix courier tables issue - drops existing tables so migration can recreate them properly
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

def fix_courier_tables():
    """Drop courier tables if they exist and remove migration record"""
    
    print("=== Fixing Courier Tables ===")
    
    try:
        with connection.cursor() as cursor:
            # Get list of courier tables
            courier_tables = [
                'couriers_deliveryorder',
                'couriers_courierearnings', 
                'couriers_courierprofile',
                'couriers_couriercompanybranch',
                'couriers_couriercompany',
            ]
            
            # Drop tables in reverse order (to handle foreign keys)
            for table in courier_tables:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    );
                """)
                exists = cursor.fetchone()[0]
                
                if exists:
                    print(f"Dropping table: {table}")
                    cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")
                    print(f"✅ Dropped {table}")
            
            # Remove migration records
            cursor.execute("""
                DELETE FROM django_migrations 
                WHERE app = 'couriers';
            """)
            deleted = cursor.rowcount
            print(f"✅ Removed {deleted} courier migration record(s)")
            
            print("✅ Courier tables cleaned up. Migration can now run fresh.")
            
    except Exception as e:
        print(f"❌ Error fixing courier tables: {e}")
        sys.exit(1)

if __name__ == '__main__':
    fix_courier_tables()