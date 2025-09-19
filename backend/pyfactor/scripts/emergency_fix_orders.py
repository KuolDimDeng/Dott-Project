#!/usr/bin/env python
"""
Emergency fix for marketplace orders table
"""

import os
import sys
import django

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def emergency_fix():
    print("=" * 50)
    print("EMERGENCY ORDER TABLE FIX")
    print("=" * 50)

    with connection.cursor() as cursor:
        # First, let's see what consumer order tables exist
        print("\n1. Finding consumer order tables...")
        cursor.execute("""
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_name IN (
                'marketplace_consumer_orders',
                'marketplace_consumerorder',
                'consumer_orders'
            )
            ORDER BY table_name, ordinal_position
        """)

        tables_columns = {}
        for row in cursor.fetchall():
            table = row[0]
            column = row[1]
            if table not in tables_columns:
                tables_columns[table] = []
            tables_columns[table].append(column)

        if not tables_columns:
            print("   ❌ No consumer order tables found!")

            # Let's check what marketplace tables exist with 'order' in the name
            cursor.execute("""
                SELECT DISTINCT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name LIKE '%order%'
                ORDER BY table_name
            """)

            print("\n   Tables with 'order' in name:")
            for row in cursor.fetchall():
                print(f"   - {row[0]}")

        else:
            # Found tables, let's check their columns
            for table, columns in tables_columns.items():
                print(f"\n   Table: {table}")
                print(f"   Columns: {', '.join(columns[:5])}...")  # Show first 5

                # Check for our required columns
                required = ['service_fee', 'pickup_pin', 'consumer_delivery_pin']
                missing = [col for col in required if col not in columns]

                if missing:
                    print(f"   ⚠️ Missing columns: {missing}")

                    # Add the missing columns to this table
                    print(f"\n2. Adding missing columns to {table}...")

                    for col in missing:
                        try:
                            if col == 'service_fee':
                                cursor.execute(f"""
                                    ALTER TABLE {table}
                                    ADD COLUMN service_fee DECIMAL(10, 2) DEFAULT 0
                                """)
                            else:
                                cursor.execute(f"""
                                    ALTER TABLE {table}
                                    ADD COLUMN {col} VARCHAR(6) DEFAULT ''
                                """)
                            print(f"   ✅ Added {col}")
                        except Exception as e:
                            if 'already exists' in str(e).lower():
                                print(f"   ℹ️ {col} already exists")
                            else:
                                print(f"   ❌ Failed to add {col}: {e}")

                    connection.commit()
                    print("   ✅ Changes committed")
                else:
                    print("   ✅ All required columns exist")

        # Now check the actual model's table name from Django
        print("\n3. Checking Django model table name...")
        try:
            from marketplace.order_models import ConsumerOrder
            table_name = ConsumerOrder._meta.db_table
            print(f"   Django model uses table: {table_name}")

            # Check this table's columns
            cursor.execute(f"""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = '{table_name}'
                ORDER BY ordinal_position
            """)

            columns = [row[0] for row in cursor.fetchall()]
            if columns:
                print(f"   Found {len(columns)} columns")
                required = ['service_fee', 'pickup_pin', 'consumer_delivery_pin']
                missing = [col for col in required if col not in columns]

                if missing:
                    print(f"   ⚠️ Missing: {missing}")

                    # Add missing columns
                    for col in missing:
                        try:
                            if col == 'service_fee':
                                cursor.execute(f"""
                                    ALTER TABLE {table_name}
                                    ADD COLUMN service_fee DECIMAL(10, 2) DEFAULT 0
                                """)
                            else:
                                cursor.execute(f"""
                                    ALTER TABLE {table_name}
                                    ADD COLUMN {col} VARCHAR(6) DEFAULT ''
                                """)
                            print(f"   ✅ Added {col} to {table_name}")
                        except Exception as e:
                            print(f"   ❌ Error: {e}")

                    connection.commit()
                    print("   ✅ Committed")
                else:
                    print("   ✅ All columns exist!")
            else:
                print(f"   ❌ Table {table_name} not found in database")

        except ImportError as e:
            print(f"   ❌ Could not import ConsumerOrder model: {e}")

        # Final verification
        print("\n4. Final verification...")
        cursor.execute("""
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE column_name IN ('service_fee', 'pickup_pin', 'consumer_delivery_pin')
            AND table_name LIKE '%order%'
            ORDER BY table_name, column_name
        """)

        results = cursor.fetchall()
        if results:
            print("   ✅ Found columns in tables:")
            current_table = None
            for table, column in results:
                if table != current_table:
                    print(f"\n   Table: {table}")
                    current_table = table
                print(f"      - {column}")
        else:
            print("   ⚠️ Required columns not found in any order tables")

if __name__ == "__main__":
    emergency_fix()
    print("\n" + "=" * 50)
    print("EMERGENCY FIX COMPLETE")
    print("Try placing an order now!")
    print("=" * 50)