#!/usr/bin/env python
"""
Script to check Employee table RLS configuration
"""
import os
import sys
import django
from django.db import connection

# Add the parent directory to the path so Django can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def check_employee_rls():
    """Check Employee table RLS configuration"""
    with connection.cursor() as cursor:
        print("=== Employee Table RLS Check ===\n")
        
        # Check if employee table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'hr_employee'
            )
        """)
        if not cursor.fetchone()[0]:
            print("❌ Employee table (hr_employee) does not exist!")
            return
        
        # Check columns
        print("1. Checking columns on hr_employee table:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'hr_employee'
            AND column_name IN ('id', 'business_id', 'tenant_id')
            ORDER BY column_name;
        """)
        columns = cursor.fetchall()
        for col in columns:
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")
        
        if not any(col[0] == 'tenant_id' for col in columns):
            print("   ❌ Missing tenant_id column!")
        
        # Check if RLS is enabled
        print("\n2. Checking RLS status:")
        cursor.execute("""
            SELECT rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'hr_employee';
        """)
        rls_enabled = cursor.fetchone()[0]
        print(f"   - RLS Enabled: {'✅ Yes' if rls_enabled else '❌ No'}")
        
        # Check RLS policies
        print("\n3. Checking RLS policies:")
        cursor.execute("""
            SELECT polname, polcmd, polqual
            FROM pg_policy
            WHERE polrelid = 'public.hr_employee'::regclass;
        """)
        policies = cursor.fetchall()
        if policies:
            for policy in policies:
                print(f"   - Policy: {policy[0]} ({policy[1]})")
                print(f"     Condition: {policy[2]}")
        else:
            print("   ❌ No RLS policies found!")
        
        # Check sample data
        print("\n4. Checking sample data:")
        cursor.execute("""
            SELECT COUNT(*) as total,
                   COUNT(DISTINCT business_id) as distinct_businesses
            FROM hr_employee;
        """)
        stats = cursor.fetchone()
        print(f"   - Total employees: {stats[0]}")
        print(f"   - Distinct businesses: {stats[1]}")
        
        # Check current tenant context
        print("\n5. Checking current tenant context:")
        cursor.execute("SELECT current_setting('app.current_tenant_id', TRUE)")
        current_tenant = cursor.fetchone()[0]
        print(f"   - Current tenant: {current_tenant or 'Not set'}")

if __name__ == "__main__":
    check_employee_rls()