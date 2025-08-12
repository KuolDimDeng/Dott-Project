#!/usr/bin/env python
"""
Script to fix Employee table by adding tenant_id column and migrating data from business_id
"""
import os
import sys
import django
from django.db import connection, transaction

# Add the parent directory to the path so Django can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def fix_employee_tenant_id():
    """Add tenant_id to Employee table and migrate data"""
    with connection.cursor() as cursor:
        print("=== Fixing Employee Table Tenant ID ===\n")
        
        # Check if tenant_id already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = 'hr_employee'
                AND column_name = 'tenant_id'
            )
        """)
        tenant_id_exists = cursor.fetchone()[0]
        
        if tenant_id_exists:
            print("✅ tenant_id column already exists")
        else:
            print("1. Adding tenant_id column to hr_employee table...")
            try:
                cursor.execute("""
                    ALTER TABLE hr_employee 
                    ADD COLUMN tenant_id UUID;
                """)
                print("   ✅ Added tenant_id column")
                
                # Create index on tenant_id
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS hr_employee_tenant_id_idx 
                    ON hr_employee(tenant_id);
                """)
                print("   ✅ Created index on tenant_id")
            except Exception as e:
                print(f"   ❌ Error adding tenant_id column: {e}")
                return
        
        # Copy business_id to tenant_id where tenant_id is null
        print("\n2. Migrating business_id values to tenant_id...")
        cursor.execute("""
            UPDATE hr_employee 
            SET tenant_id = business_id 
            WHERE tenant_id IS NULL AND business_id IS NOT NULL;
        """)
        updated = cursor.rowcount
        print(f"   ✅ Updated {updated} records")
        
        # Check if RLS is enabled
        cursor.execute("""
            SELECT rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'hr_employee';
        """)
        rls_enabled = cursor.fetchone()[0]
        
        if not rls_enabled:
            print("\n3. Enabling RLS on hr_employee table...")
            cursor.execute("ALTER TABLE hr_employee ENABLE ROW LEVEL SECURITY;")
            print("   ✅ RLS enabled")
        else:
            print("\n3. RLS is already enabled")
        
        # Create RLS policy if it doesn't exist
        print("\n4. Creating RLS policies...")
        
        # Drop existing policies if any
        cursor.execute("""
            SELECT polname FROM pg_policy 
            WHERE polrelid = 'public.hr_employee'::regclass;
        """)
        existing_policies = cursor.fetchall()
        for policy in existing_policies:
            cursor.execute(f"DROP POLICY IF EXISTS {policy[0]} ON hr_employee;")
            print(f"   - Dropped existing policy: {policy[0]}")
        
        # Create new RLS policy
        cursor.execute("""
            CREATE POLICY tenant_isolation_policy ON hr_employee
            FOR ALL
            USING (
                tenant_id::text = COALESCE(current_setting('app.current_tenant_id', TRUE), 'unset')
                OR current_setting('app.current_tenant_id', TRUE) = 'unset'
                OR current_setting('app.current_tenant_id', TRUE) IS NULL
            );
        """)
        print("   ✅ Created tenant_isolation_policy")
        
        # Verify the fix
        print("\n5. Verification:")
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(tenant_id) as with_tenant_id,
                COUNT(DISTINCT tenant_id) as distinct_tenants
            FROM hr_employee;
        """)
        stats = cursor.fetchone()
        print(f"   - Total employees: {stats[0]}")
        print(f"   - Employees with tenant_id: {stats[1]}")
        print(f"   - Distinct tenants: {stats[2]}")
        
        print("\n✅ Employee table RLS fix completed!")

if __name__ == "__main__":
    with transaction.atomic():
        fix_employee_tenant_id()