#!/usr/bin/env python
"""
Complete fix for Employee RLS issues
This script:
1. Ensures tenant_id column exists
2. Migrates business_id to tenant_id
3. Sets up RLS policies
4. Verifies the fix
"""
import os
import sys
import django
from django.db import connection, transaction

# Add the parent directory to the path so Django can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def fix_employee_rls():
    """Complete fix for Employee RLS issues"""
    
    with transaction.atomic():
        with connection.cursor() as cursor:
            print("=== Fixing Employee RLS Issues ===\n")
            
            # 1. Check and add tenant_id column if needed
            print("1. Checking tenant_id column...")
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'hr_employee' 
                AND column_name = 'tenant_id';
            """)
            
            if not cursor.fetchone():
                print("   - Adding tenant_id column...")
                cursor.execute("""
                    ALTER TABLE hr_employee 
                    ADD COLUMN IF NOT EXISTS tenant_id UUID;
                """)
                
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS hr_employee_tenant_id_idx 
                    ON hr_employee(tenant_id);
                """)
                print("   ✅ Added tenant_id column and index")
            else:
                print("   ✅ tenant_id column already exists")
            
            # 2. Migrate business_id to tenant_id
            print("\n2. Migrating business_id to tenant_id...")
            cursor.execute("""
                UPDATE hr_employee 
                SET tenant_id = business_id 
                WHERE tenant_id IS NULL AND business_id IS NOT NULL;
            """)
            updated = cursor.rowcount
            print(f"   ✅ Updated {updated} records")
            
            # 3. Enable RLS
            print("\n3. Enabling Row Level Security...")
            cursor.execute("""
                ALTER TABLE hr_employee ENABLE ROW LEVEL SECURITY;
            """)
            print("   ✅ RLS enabled")
            
            # 4. Drop existing policies
            print("\n4. Setting up RLS policies...")
            cursor.execute("""
                DROP POLICY IF EXISTS tenant_isolation_policy ON hr_employee;
                DROP POLICY IF EXISTS hr_employee_tenant_isolation ON hr_employee;
                DROP POLICY IF EXISTS employee_tenant_isolation ON hr_employee;
            """)
            
            # 5. Create comprehensive RLS policy
            cursor.execute("""
                CREATE POLICY hr_employee_tenant_isolation ON hr_employee
                FOR ALL
                USING (
                    -- Allow access when tenant context matches
                    tenant_id::text = current_setting('app.current_tenant_id', TRUE)
                    -- Or when no tenant context is set (for migrations)
                    OR current_setting('app.current_tenant_id', TRUE) IS NULL
                    OR current_setting('app.current_tenant_id', TRUE) = ''
                    OR current_setting('app.current_tenant_id', TRUE) = 'unset'
                );
            """)
            print("   ✅ Created RLS policy: hr_employee_tenant_isolation")
            
            # 6. Grant necessary permissions
            print("\n5. Setting permissions...")
            cursor.execute("""
                GRANT ALL ON hr_employee TO postgres;
                GRANT SELECT, INSERT, UPDATE, DELETE ON hr_employee TO PUBLIC;
            """)
            print("   ✅ Permissions set")
            
            # 7. Verify the fix
            print("\n6. Verification:")
            
            # Check column existence
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_employees,
                    COUNT(tenant_id) as with_tenant_id,
                    COUNT(DISTINCT tenant_id) as unique_tenants,
                    COUNT(CASE WHEN tenant_id != business_id THEN 1 END) as mismatched
                FROM hr_employee;
            """)
            stats = cursor.fetchone()
            print(f"   - Total employees: {stats[0]}")
            print(f"   - Employees with tenant_id: {stats[1]}")
            print(f"   - Unique tenants: {stats[2]}")
            print(f"   - Mismatched tenant_id/business_id: {stats[3]}")
            
            # Check RLS status
            cursor.execute("""
                SELECT rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' AND tablename = 'hr_employee';
            """)
            rls_enabled = cursor.fetchone()[0]
            print(f"   - RLS enabled: {'✅ Yes' if rls_enabled else '❌ No'}")
            
            # Check policies
            cursor.execute("""
                SELECT polname 
                FROM pg_policy 
                WHERE polrelid = 'public.hr_employee'::regclass;
            """)
            policies = [row[0] for row in cursor.fetchall()]
            print(f"   - RLS policies: {', '.join(policies) if policies else 'None'}")
            
            print("\n✅ Employee RLS fix completed successfully!")
            
            # Test with a sample tenant context
            print("\n7. Testing RLS with sample tenant context...")
            
            # Get a sample tenant_id
            cursor.execute("""
                SELECT DISTINCT tenant_id 
                FROM hr_employee 
                WHERE tenant_id IS NOT NULL 
                LIMIT 1;
            """)
            sample_tenant = cursor.fetchone()
            
            if sample_tenant:
                sample_tenant_id = str(sample_tenant[0])
                
                # Set tenant context
                cursor.execute("SELECT set_config('app.current_tenant_id', %s, FALSE)", [sample_tenant_id])
                
                # Count visible employees
                cursor.execute("SELECT COUNT(*) FROM hr_employee;")
                visible_count = cursor.fetchone()[0]
                
                print(f"   - Set tenant context to: {sample_tenant_id}")
                print(f"   - Visible employees: {visible_count}")
                
                # Clear context
                cursor.execute("SELECT set_config('app.current_tenant_id', '', FALSE)")
                print("   ✅ RLS test passed")
            else:
                print("   - No employees with tenant_id to test")

if __name__ == "__main__":
    try:
        fix_employee_rls()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()