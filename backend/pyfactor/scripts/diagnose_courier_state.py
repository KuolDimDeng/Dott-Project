#!/usr/bin/env python
"""
Diagnose the current state of courier tables and migrations.
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

def diagnose_courier_state():
    """Diagnose courier tables and migrations state"""
    
    print("=== Courier State Diagnosis ===")
    print("")
    
    with connection.cursor() as cursor:
        # Check migrations
        print("1. Checking django_migrations table:")
        cursor.execute("""
            SELECT name, applied 
            FROM django_migrations 
            WHERE app = 'couriers'
            ORDER BY name;
        """)
        migrations = cursor.fetchall()
        if migrations:
            for m in migrations:
                print(f"   - {m[0]} (applied: {m[1]})")
        else:
            print("   No courier migrations found")
        print("")
        
        # Check tables
        print("2. Checking courier tables in database:")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'couriers_%'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        if tables:
            for t in tables:
                # Get row count
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {t[0]};")
                    count = cursor.fetchone()[0]
                    print(f"   - {t[0]} ({count} rows)")
                except:
                    print(f"   - {t[0]} (unable to count rows)")
        else:
            print("   No courier tables found")
        print("")
        
        # Check columns of couriers_couriercompany if it exists
        print("3. Checking couriercompany table structure (if exists):")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'couriers_couriercompany'
            ORDER BY ordinal_position
            LIMIT 5;
        """)
        columns = cursor.fetchall()
        if columns:
            for c in columns:
                print(f"   - {c[0]}: {c[1]}")
            print("   ...")
        else:
            print("   Table doesn't exist")
        print("")
        
        # Check for any errors in django_migrations
        print("4. Checking for duplicate migrations:")
        cursor.execute("""
            SELECT app, name, COUNT(*) 
            FROM django_migrations 
            WHERE app = 'couriers'
            GROUP BY app, name 
            HAVING COUNT(*) > 1;
        """)
        duplicates = cursor.fetchall()
        if duplicates:
            print("   WARNING: Found duplicate migrations!")
            for d in duplicates:
                print(f"   - {d[0]}.{d[1]}: {d[2]} times")
        else:
            print("   No duplicate migrations")
        print("")
        
        # Check transport app state for comparison
        print("5. Transport app state (for comparison):")
        cursor.execute("""
            SELECT name 
            FROM django_migrations 
            WHERE app = 'transport'
            ORDER BY name;
        """)
        transport_migrations = cursor.fetchall()
        print(f"   Transport migrations: {len(transport_migrations)}")
        for tm in transport_migrations[:3]:
            print(f"   - {tm[0]}")
        if len(transport_migrations) > 3:
            print(f"   ... and {len(transport_migrations) - 3} more")
        print("")
        
        # Final diagnosis
        print("=== DIAGNOSIS ===")
        if len(migrations) > 0 and len(tables) == 0:
            print("❌ PROBLEM: Migrations marked as applied but tables don't exist")
            print("   SOLUTION: Run force_courier_migration.py to reset")
        elif len(migrations) == 0 and len(tables) > 0:
            print("❌ PROBLEM: Tables exist but migrations not marked")
            print("   SOLUTION: Run force_courier_migration.py to reset")
        elif len(migrations) > 0 and len(tables) > 0:
            if len(tables) < 5:
                print("⚠️ WARNING: Partial tables exist")
                print("   SOLUTION: Run force_courier_migration.py to reset")
            else:
                print("✅ OK: Tables and migrations appear to be in sync")
        else:
            print("✅ CLEAN: No courier tables or migrations (ready for fresh install)")

if __name__ == '__main__':
    diagnose_courier_state()