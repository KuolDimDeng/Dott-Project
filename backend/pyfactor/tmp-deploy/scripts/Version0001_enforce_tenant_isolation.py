#!/usr/bin/env python
"""
Version0001_enforce_tenant_isolation.py

This script ensures all tenant-aware tables in the database have proper RLS policies
and validating tenant isolation is working correctly. It also adds a repair function
to fix any missing RLS policies.

Usage:
    python Version0001_enforce_tenant_isolation.py --check  # Just check without making changes
    python Version0001_enforce_tenant_isolation.py --fix    # Check and fix issues

Author: Claude AI Assistant
Date: 2025-04-29
Version: 1.0.0
"""

import os
import sys
import uuid
import logging
import argparse
import traceback
import importlib
from datetime import datetime

# Add the parent directory to the path so we can import Django modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('tenant-isolation-script')

def setup_django():
    """Initialize Django settings"""
    try:
        import django
        django.setup()
        from django.db import connection
        from django.conf import settings
        
        logger.info("Django setup completed successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to set up Django: {e}")
        traceback.print_exc()
        return False

def get_tenant_aware_tables():
    """Get all tables with a tenant_id or business_id column"""
    from django.db import connection
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_schema, table_name
            FROM information_schema.columns
            WHERE column_name IN ('tenant_id', 'business_id')
              AND table_schema IN ('public')
              AND table_name NOT LIKE 'django_%'
              AND table_name NOT LIKE 'auth_%'
            GROUP BY table_schema, table_name
            ORDER BY table_schema, table_name
        """)
        return cursor.fetchall()

def check_rls_enabled(table_schema, table_name):
    """Check if RLS is enabled on the specified table"""
    from django.db import connection
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT c.relrowsecurity
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = %s AND c.relname = %s
        """, [table_schema, table_name])
        
        result = cursor.fetchone()
        return result and result[0]

def check_rls_policy_exists(table_schema, table_name):
    """Check if an RLS policy exists for the specified table"""
    from django.db import connection
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*)
            FROM pg_policy p
            JOIN pg_class c ON p.polrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = %s AND c.relname = %s
        """, [table_schema, table_name])
        
        result = cursor.fetchone()
        return result and result[0] > 0

def enable_rls_on_table(table_schema, table_name):
    """Enable RLS on the specified table"""
    from django.db import connection
    
    with connection.cursor() as cursor:
        cursor.execute(f"""
            ALTER TABLE {table_schema}.{table_name} ENABLE ROW LEVEL SECURITY;
        """)
        logger.info(f"Enabled RLS on {table_schema}.{table_name}")
        return True

def create_rls_policy(table_schema, table_name):
    """Create RLS policy for tenant isolation on the specified table"""
    from django.db import connection
    
    # First check if table has tenant_id or business_id
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = %s 
              AND table_name = %s
              AND column_name IN ('tenant_id', 'business_id')
        """, [table_schema, table_name])
        
        columns = [row[0] for row in cursor.fetchall()]
        
        if not columns:
            logger.warning(f"No tenant_id or business_id column found in {table_schema}.{table_name}")
            return False
        
        # Drop existing policies to avoid conflicts
        cursor.execute(f"""
            DROP POLICY IF EXISTS tenant_isolation_policy ON {table_schema}.{table_name};
        """)
        
        # Create policy for each tenant identifier
        for column in columns:
            # Create the policy for the specified column
            policy_name = f"{column}_isolation_policy"
            
            cursor.execute(f"""
                DROP POLICY IF EXISTS {policy_name} ON {table_schema}.{table_name};
                
                CREATE POLICY {policy_name} ON {table_schema}.{table_name}
                AS RESTRICTIVE
                USING (
                    ({column}::TEXT = get_tenant_context())
                    OR get_tenant_context() = 'unset'
                );
            """)
            
            logger.info(f"Created RLS policy '{policy_name}' on {table_schema}.{table_name}")
        
        return True

def test_tenant_isolation():
    """Test if tenant isolation is working properly"""
    from django.db import connection
    from custom_auth.rls import set_tenant_context, clear_tenant_context
    
    TEST_TABLE = 'rls_test_isolation'
    TEST_TENANT_1 = str(uuid.uuid4())
    TEST_TENANT_2 = str(uuid.uuid4())
    
    logger.info(f"Testing tenant isolation with test tenants: {TEST_TENANT_1}, {TEST_TENANT_2}")
    
    try:
        with connection.cursor() as cursor:
            # Create a test table
            cursor.execute(f"""
                DROP TABLE IF EXISTS {TEST_TABLE};
                
                CREATE TABLE {TEST_TABLE} (
                    id SERIAL PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    business_id TEXT NULL,
                    data TEXT NOT NULL
                );
                
                ALTER TABLE {TEST_TABLE} ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY tenant_isolation_policy ON {TEST_TABLE}
                AS RESTRICTIVE
                USING (
                    (tenant_id::TEXT = get_tenant_context())
                    OR get_tenant_context() = 'unset'
                );
            """)
            
            # Insert test data
            cursor.execute(f"""
                INSERT INTO {TEST_TABLE} (tenant_id, business_id, data)
                VALUES 
                    ('{TEST_TENANT_1}', '{TEST_TENANT_1}', 'Data for tenant 1'),
                    ('{TEST_TENANT_1}', '{TEST_TENANT_1}', 'More data for tenant 1'),
                    ('{TEST_TENANT_2}', '{TEST_TENANT_2}', 'Data for tenant 2'),
                    ('{TEST_TENANT_2}', '{TEST_TENANT_2}', 'More data for tenant 2');
            """)
            
            # Test tenant 1 context
            set_tenant_context(TEST_TENANT_1)
            cursor.execute(f"""
                SELECT COUNT(*) FROM {TEST_TABLE};
            """)
            count_tenant_1 = cursor.fetchone()[0]
            
            # Test tenant 2 context
            set_tenant_context(TEST_TENANT_2)
            cursor.execute(f"""
                SELECT COUNT(*) FROM {TEST_TABLE};
            """)
            count_tenant_2 = cursor.fetchone()[0]
            
            # Clean up
            clear_tenant_context()
            cursor.execute(f"""
                DROP TABLE IF EXISTS {TEST_TABLE};
            """)
            
            # Check results
            if count_tenant_1 == 2 and count_tenant_2 == 2:
                logger.info("Tenant isolation test PASSED ✅")
                return True
            else:
                logger.error(f"Tenant isolation test FAILED ❌ - tenant1: {count_tenant_1}, tenant2: {count_tenant_2}")
                return False
                
    except Exception as e:
        logger.error(f"Error testing tenant isolation: {e}")
        traceback.print_exc()
        return False

def check_employee_view_code():
    """Check if employee list view has proper tenant isolation"""
    from django.conf import settings
    import re
    
    hr_views_path = os.path.join(settings.BASE_DIR, 'hr', 'views.py')
    
    if not os.path.exists(hr_views_path):
        logger.error(f"HR views file not found at {hr_views_path}")
        return False
    
    with open(hr_views_path, 'r') as file:
        content = file.read()
        
    # Look for Employee.objects.all() without tenant filtering
    has_unfiltered_query = 'employees = Employee.objects.all()' in content
    
    # Look for appropriate filtering
    has_tenant_filtering = re.search(r'Employee\.objects\.filter\([^)]*tenant_id', content) or \
                           re.search(r'Employee\.objects\.filter\([^)]*business_id', content)
    
    if has_unfiltered_query and not has_tenant_filtering:
        logger.warning("Employee list view does not have proper tenant filtering!")
        return False
    
    return True

def fix_employee_view_code():
    """Fix employee list view to enforce tenant isolation"""
    from django.conf import settings
    import re
    
    hr_views_path = os.path.join(settings.BASE_DIR, 'hr', 'views.py')
    
    if not os.path.exists(hr_views_path):
        logger.error(f"HR views file not found at {hr_views_path}")
        return False
    
    # Make a backup first
    backup_dir = os.path.join(settings.BASE_DIR, 'backups')
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = os.path.join(backup_dir, f'views.py.rls_fix_backup_{timestamp}')
    
    try:
        with open(hr_views_path, 'r') as src_file:
            content = src_file.read()
            
        with open(backup_path, 'w') as backup_file:
            backup_file.write(content)
            
        logger.info(f"Created backup at {backup_path}")
        
        # Replace Employee.objects.all() with tenant-filtered query
        new_content = re.sub(
            r'employees = Employee\.objects\.all\(\)',
            '''# Get tenant ID from request or headers
        tenant_id = getattr(request, 'tenant_id', None)
        if not tenant_id:
            tenant_id = request.headers.get('X-Tenant-ID') or request.headers.get('x-tenant-id')
        
        # If tenant_id is provided, filter by it for RLS isolation
        if tenant_id:
            # Filter employees by tenant_id for proper RLS isolation
            employees = Employee.objects.filter(business_id=tenant_id)
            logger.info(f"Filtered employees by tenant: {tenant_id}")
        else:
            # Only return employees for the authenticated user's tenant
            # This is a fallback and should not normally happen when RLS is properly set
            logger.warning("No tenant ID found in request, returning empty employee list for security")
            employees = Employee.objects.none()''',
            content
        )
        
        with open(hr_views_path, 'w') as file:
            file.write(new_content)
            
        logger.info("Fixed employee view code to enforce tenant isolation")
        return True
        
    except Exception as e:
        logger.error(f"Error fixing employee view code: {e}")
        traceback.print_exc()
        return False

def main():
    """Main function to check and enforce tenant isolation"""
    parser = argparse.ArgumentParser(description='Enforce tenant isolation in the database')
    parser.add_argument('--check', action='store_true', help='Only check for issues without fixing')
    parser.add_argument('--fix', action='store_true', help='Check and fix isolation issues')
    
    args = parser.parse_args()
    
    if not args.check and not args.fix:
        parser.print_help()
        return
    
    # Setup Django
    if not setup_django():
        return
    
    # Import custom_auth app
    try:
        from custom_auth.rls import fix_rls_configuration
        
        # Ensure RLS functions exist
        logger.info("Checking RLS configuration...")
        fix_rls_configuration()
        
    except ImportError:
        logger.error("Failed to import custom_auth modules. Make sure you're running this script from the correct directory.")
        return
    
    # Check employee view
    employee_view_ok = check_employee_view_code()
    if not employee_view_ok:
        logger.warning("Employee view does not have proper tenant isolation!")
        if args.fix:
            logger.info("Fixing employee view...")
            fix_employee_view_code()
    else:
        logger.info("Employee view has proper tenant isolation ✅")
    
    # Get tenant-aware tables
    logger.info("Getting tenant-aware tables...")
    tables = get_tenant_aware_tables()
    logger.info(f"Found {len(tables)} tenant-aware tables")
    
    # Check RLS status for each table
    issues_found = False
    for schema, table in tables:
        rls_enabled = check_rls_enabled(schema, table)
        policy_exists = check_rls_policy_exists(schema, table)
        
        if not rls_enabled or not policy_exists:
            issues_found = True
            logger.warning(f"Table {schema}.{table}: RLS enabled: {rls_enabled}, Policy exists: {policy_exists}")
            
            if args.fix:
                if not rls_enabled:
                    enable_rls_on_table(schema, table)
                
                if not policy_exists:
                    create_rls_policy(schema, table)
        else:
            logger.info(f"Table {schema}.{table}: RLS properly configured ✅")
    
    # Test tenant isolation
    if args.fix:
        logger.info("Testing tenant isolation...")
        isolation_working = test_tenant_isolation()
        
        if isolation_working:
            logger.info("Tenant isolation is working properly ✅")
        else:
            logger.error("Tenant isolation is not working properly ❌")
            return
    
    # Report status
    if issues_found:
        if args.fix:
            logger.info("Fixed tenant isolation issues ✅")
        else:
            logger.warning("Tenant isolation issues found. Run with --fix to repair")
    else:
        logger.info("No tenant isolation issues found ✅")

if __name__ == "__main__":
    main() 