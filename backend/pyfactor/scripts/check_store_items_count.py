#!/usr/bin/env python
"""
Check the actual count of StoreItems in the database and analyze the data
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.db.models import Count, Q

def check_store_items():
    """Check StoreItems table and data"""

    print("=" * 60)
    print("STORE ITEMS DATABASE ANALYSIS")
    print("=" * 60)

    # First check if the table exists
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'store_items'
            );
        """)
        table_exists = cursor.fetchone()[0]

        if not table_exists:
            print("❌ The store_items table does NOT exist in the database!")
            print("\nThis explains why the catalog appears empty.")
            print("\nTo create the table, you need to:")
            print("1. Run migrations: python manage.py migrate inventory")
            print("2. Or create it manually with SQL")
            return

        print("✅ The store_items table exists")

        # Count total records
        cursor.execute("SELECT COUNT(*) FROM store_items;")
        total_count = cursor.fetchone()[0]
        print(f"\n📊 Total StoreItems in database: {total_count}")

        if total_count == 0:
            print("\n❌ The store_items table is EMPTY!")
            print("\nThis is why the catalog shows no items.")
            print("\nThe global catalog will be populated as merchants:")
            print("1. Add products with unknown barcodes")
            print("2. Submit them to staging")
            print("3. Get approved (manually or auto-approved)")
            return

        # Count items with barcodes
        cursor.execute("SELECT COUNT(*) FROM store_items WHERE barcode IS NOT NULL AND barcode != '';")
        barcode_count = cursor.fetchone()[0]
        print(f"📊 Items with barcodes: {barcode_count}")

        # Count verified items
        cursor.execute("SELECT COUNT(*) FROM store_items WHERE verified = true;")
        verified_count = cursor.fetchone()[0]
        print(f"📊 Verified items: {verified_count}")

        # Get sample items
        cursor.execute("""
            SELECT barcode, name, brand, category, verified
            FROM store_items
            LIMIT 10;
        """)
        sample_items = cursor.fetchall()

        if sample_items:
            print("\n📋 Sample items from catalog:")
            print("-" * 60)
            for item in sample_items:
                barcode, name, brand, category, verified = item
                verified_str = "✅" if verified else "❌"
                print(f"{verified_str} {barcode or 'NO_BARCODE'} | {name} | {brand or 'N/A'} | {category}")

        # Check staging table
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'inventory_storeitemstaging'
            );
        """)
        staging_exists = cursor.fetchone()[0]

        if staging_exists:
            cursor.execute("SELECT COUNT(*) FROM inventory_storeitemstaging WHERE status = 'pending';")
            pending_count = cursor.fetchone()[0]
            print(f"\n📦 Items pending in staging: {pending_count}")

def check_merchant_items():
    """Check MerchantStoreItems (items added to merchant inventories)"""

    print("\n" + "=" * 60)
    print("MERCHANT STORE ITEMS ANALYSIS")
    print("=" * 60)

    with connection.cursor() as cursor:
        # Check if merchant_store_items table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_name = 'merchant_store_items'
            );
        """)
        table_exists = cursor.fetchone()[0]

        if not table_exists:
            print("❌ The merchant_store_items table does NOT exist")
            return

        cursor.execute("SELECT COUNT(DISTINCT merchant_id) FROM merchant_store_items;")
        merchant_count = cursor.fetchone()[0] if cursor.fetchone() else 0
        print(f"👥 Merchants using catalog: {merchant_count}")

        cursor.execute("SELECT COUNT(*) FROM merchant_store_items;")
        total_merchant_items = cursor.fetchone()[0] if cursor.fetchone() else 0
        print(f"📊 Total merchant inventory items from catalog: {total_merchant_items}")

if __name__ == '__main__':
    try:
        check_store_items()
        check_merchant_items()

        print("\n" + "=" * 60)
        print("ANALYSIS COMPLETE")
        print("=" * 60)

        print("\n🔍 Key findings:")
        print("1. The mobile app is requesting 100 items (limit=100)")
        print("2. Django API has default pagination of 50 items")
        print("3. The actual database may be empty or have limited data")
        print("4. The '1000' displayed might be hardcoded or test data")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()