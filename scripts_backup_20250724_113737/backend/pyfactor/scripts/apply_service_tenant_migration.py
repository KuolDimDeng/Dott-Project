#!/usr/bin/env python
"""
Script to apply the pending Service tenant_id migration.
This migration adds multi-tenant support to the Service model.

Run this script from the Django shell:
python manage.py shell < scripts/apply_service_tenant_migration.py
"""

import os
import sys
from django.core.management import execute_from_command_line
from django.db import connection

def check_and_apply_migration():
    print("Checking for pending inventory migrations...")
    
    # Check if the tenant_id column exists
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'inventory_service' 
            AND column_name = 'tenant_id'
        """)
        result = cursor.fetchone()
        
        if result:
            print("✅ The tenant_id column already exists in inventory_service table.")
            return
        else:
            print("❌ The tenant_id column is missing from inventory_service table.")
            print("   This is causing the 500 errors when creating services.")
    
    # Show current migration status
    print("\nCurrent migration status for inventory app:")
    os.system("python manage.py showmigrations inventory")
    
    print("\nApplying pending migrations...")
    try:
        # Apply the specific migration
        os.system("python manage.py migrate inventory 0007_add_tenant_to_service")
        print("✅ Migration 0007_add_tenant_to_service applied successfully!")
        
        # Verify the column now exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'inventory_service' 
                AND column_name = 'tenant_id'
            """)
            result = cursor.fetchone()
            
            if result:
                print("✅ Verified: tenant_id column has been added to inventory_service table.")
            else:
                print("❌ Error: tenant_id column still missing after migration.")
                
    except Exception as e:
        print(f"❌ Error applying migration: {str(e)}")
        print("\nTry running this command manually:")
        print("python manage.py migrate inventory")

if __name__ == "__main__":
    check_and_apply_migration()