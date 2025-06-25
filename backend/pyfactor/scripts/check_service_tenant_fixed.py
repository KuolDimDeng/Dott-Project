#!/usr/bin/env python
"""
Quick script to check if the Service tenant_id migration was successful.
Run: python scripts/check_service_tenant_fixed.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def check_service_table():
    print("=== Checking Service Table ===\n")
    
    with connection.cursor() as cursor:
        # Check if tenant_id column exists
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_service' 
            AND column_name = 'tenant_id'
        """)
        result = cursor.fetchone()
        
        if result:
            print("✅ SUCCESS! The tenant_id column exists in inventory_service table!")
            print(f"   Column: {result[0]}, Type: {result[1]}")
            print("\n🎉 Service creation should now work properly!")
            
            # Count existing services
            cursor.execute("SELECT COUNT(*) FROM inventory_service")
            count = cursor.fetchone()[0]
            print(f"\n📊 Current number of services in database: {count}")
            
        else:
            print("❌ The tenant_id column is still missing.")
            print("   But the migration said it was applied... checking table structure:")
            
            # Show all columns
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_service'
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            
            print("\nCurrent columns in inventory_service:")
            for col in columns:
                print(f"   - {col[0]} ({col[1]})")

if __name__ == "__main__":
    check_service_table()