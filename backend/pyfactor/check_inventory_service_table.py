#!/usr/bin/env python
import os
import sys
import django

# Add the project to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def check_inventory_service_table():
    """Check if inventory_service table has tenant_id column"""
    
    with connection.cursor() as cursor:
        # Get table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'inventory_service'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        if not columns:
            print("❌ Table 'inventory_service' not found!")
            return
        
        print("✅ Table 'inventory_service' structure:")
        print("-" * 80)
        print(f"{'Column Name':<30} {'Data Type':<20} {'Nullable':<10} {'Default':<20}")
        print("-" * 80)
        
        has_tenant_id = False
        for col in columns:
            column_name, data_type, is_nullable, column_default = col
            print(f"{column_name:<30} {data_type:<20} {is_nullable:<10} {str(column_default or ''):<20}")
            if column_name == 'tenant_id':
                has_tenant_id = True
        
        print("-" * 80)
        
        if has_tenant_id:
            print("\n✅ SUCCESS: tenant_id column exists in inventory_service table!")
        else:
            print("\n❌ ERROR: tenant_id column is missing from inventory_service table!")
            print("\nTo add the tenant_id column, run this SQL:")
            print("ALTER TABLE inventory_service ADD COLUMN tenant_id UUID;")
            
        # Check for RLS policies
        cursor.execute("""
            SELECT pol.polname, pol.polcmd
            FROM pg_policies pol
            WHERE pol.tablename = 'inventory_service';
        """)
        
        policies = cursor.fetchall()
        
        if policies:
            print("\n📋 RLS Policies on inventory_service:")
            for policy in policies:
                print(f"  - {policy[0]} ({policy[1]})")
        else:
            print("\n⚠️  No RLS policies found on inventory_service table")

if __name__ == '__main__':
    check_inventory_service_table()