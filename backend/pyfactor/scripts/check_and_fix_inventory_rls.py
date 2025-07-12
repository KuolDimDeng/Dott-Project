#!/usr/bin/env python
"""
Script to check and fix RLS (Row-Level Security) for inventory tables
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
from custom_auth.rls import create_rls_policy_for_table, check_rls_status

def check_inventory_rls():
    """Check RLS status for inventory tables"""
    print("Checking RLS status for inventory tables...")
    
    with connection.cursor() as cursor:
        # Check if the RLS status view exists
        cursor.execute("""
        SELECT EXISTS (
            SELECT 1 FROM pg_views 
            WHERE viewname = 'rls_status'
        );
        """)
        
        if not cursor.fetchone()[0]:
            print("RLS status view does not exist. Creating it...")
            # Create the view if it doesn't exist
            cursor.execute("""
            CREATE OR REPLACE VIEW rls_status AS
            SELECT 
                t.table_name,
                t.table_schema,
                EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = t.table_name 
                    AND table_schema = t.table_schema
                    AND column_name = 'tenant_id'
                ) AS has_tenant_id,
                EXISTS (
                    SELECT FROM pg_tables 
                    WHERE tablename = t.table_name 
                    AND schemaname = t.table_schema
                    AND rowsecurity = true
                ) AS rls_enabled,
                (
                    SELECT COUNT(*) > 0 
                    FROM pg_policy 
                    WHERE pg_policy.polrelid = (t.table_schema || '.' || t.table_name)::regclass
                ) AS has_policy,
                (
                    SELECT string_agg(polname, ', ') 
                    FROM pg_policy 
                    WHERE pg_policy.polrelid = (t.table_schema || '.' || t.table_name)::regclass
                ) AS policies
            FROM information_schema.tables t
            WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
            AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_schema, t.table_name;
            """)
        
        # Now check inventory tables
        cursor.execute("""
        SELECT table_name, has_tenant_id, rls_enabled, has_policy, policies
        FROM rls_status 
        WHERE table_name LIKE 'inventory_%'
        ORDER BY table_name;
        """)
        
        inventory_tables = cursor.fetchall()
        
        print(f"\nFound {len(inventory_tables)} inventory tables:")
        print("-" * 80)
        print(f"{'Table Name':<30} {'Has tenant_id':<15} {'RLS Enabled':<15} {'Has Policy':<15}")
        print("-" * 80)
        
        tables_needing_rls = []
        
        for table_name, has_tenant_id, rls_enabled, has_policy, policies in inventory_tables:
            print(f"{table_name:<30} {str(has_tenant_id):<15} {str(rls_enabled):<15} {str(has_policy):<15}")
            
            # If table has tenant_id but no RLS policy, add it to the list
            if has_tenant_id and not has_policy:
                tables_needing_rls.append(table_name)
        
        return tables_needing_rls

def fix_inventory_rls(tables):
    """Create RLS policies for inventory tables that need them"""
    if not tables:
        print("\nAll inventory tables with tenant_id already have RLS policies!")
        return
    
    print(f"\nCreating RLS policies for {len(tables)} tables...")
    
    for table_name in tables:
        print(f"\nProcessing {table_name}...")
        success = create_rls_policy_for_table(table_name)
        if success:
            print(f"✅ Successfully created RLS policy for {table_name}")
        else:
            print(f"❌ Failed to create RLS policy for {table_name}")

def test_rls_context():
    """Test setting and getting RLS context"""
    print("\nTesting RLS context functions...")
    
    from custom_auth.rls import set_tenant_context, get_current_tenant_id, clear_tenant_context
    
    # Test setting context
    test_tenant_id = "cb86762b-3e32-43bb-963d-f5d5b0bc009e"
    print(f"Setting tenant context to: {test_tenant_id}")
    set_tenant_context(test_tenant_id)
    
    # Test getting context
    current_tenant = get_current_tenant_id()
    print(f"Current tenant context: {current_tenant}")
    
    # Test query with context
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM inventory_supplier")
        count = cursor.fetchone()[0]
        print(f"Suppliers visible with tenant context: {count}")
    
    # Clear context
    clear_tenant_context()
    print("Cleared tenant context")

if __name__ == "__main__":
    print("RLS Check and Fix Script for Inventory Tables")
    print("=" * 80)
    
    # Check current status
    tables_needing_rls = check_inventory_rls()
    
    # Fix tables that need RLS
    if tables_needing_rls:
        response = input(f"\nDo you want to create RLS policies for {len(tables_needing_rls)} tables? (y/n): ")
        if response.lower() == 'y':
            fix_inventory_rls(tables_needing_rls)
    
    # Test RLS context
    print("\n" + "=" * 80)
    test_rls_context()
    
    print("\nDone!")