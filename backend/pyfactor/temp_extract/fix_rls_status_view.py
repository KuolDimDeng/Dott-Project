#!/usr/bin/env python3
"""
RLS Status View Fix Script

This script fixes the RLS status view by ensuring it includes all the columns
required by the check_rls.py script, and creates properly structured test tables.
"""

import os
import sys
import django
import logging
import traceback
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('rls_status_view_fix')

# Set up Django environment
sys.path.append(str(Path(__file__).parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_rls_status_view():
    """Fix the RLS status view to ensure it has all required columns"""
    logger.info("Starting RLS status view fix...")
    
    try:
        with connection.cursor() as cursor:
            # Check if the view exists
            cursor.execute("""
            SELECT EXISTS (
                SELECT FROM pg_views WHERE viewname = 'rls_status'
            );
            """)
            view_exists = cursor.fetchone()[0]
            
            if view_exists:
                logger.info("✅ RLS status view exists, recreating with all required columns")
            else:
                logger.info("Creating new RLS status view with all required columns")
                
            # Create/recreate the view with all needed columns
            cursor.execute("""
            DROP VIEW IF EXISTS rls_status;
            
            CREATE OR REPLACE VIEW rls_status AS
            SELECT 
                t.table_name,
                t.table_schema,
                EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = t.table_name AND table_schema = t.table_schema
                    AND column_name = 'tenant_id'
                ) AS has_tenant_id,
                EXISTS (
                    SELECT FROM pg_tables 
                    WHERE tablename = t.table_name AND schemaname = t.table_schema
                    AND rowsecurity = true
                ) AS has_rls_enabled,
                EXISTS (
                    SELECT FROM pg_tables 
                    WHERE tablename = t.table_name AND schemaname = t.table_schema
                    AND rowsecurity = true
                ) AS rls_enabled,
                EXISTS (
                    SELECT FROM pg_policy
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
            logger.info("✅ Fixed RLS status view with all required columns")
                
            # Verify the view has the required columns
            required_columns = ['has_tenant_id', 'rls_enabled', 'has_policy']
            missing_columns = []
            
            for column in required_columns:
                cursor.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'rls_status' AND column_name = '{column}'
                );
                """)
                if not cursor.fetchone()[0]:
                    missing_columns.append(column)
            
            if not missing_columns:
                logger.info("✅ Verified all required columns exist in RLS status view")
                return True
            else:
                logger.error(f"❌ Failed to create columns in RLS status view: {', '.join(missing_columns)}")
                return False
                
    except Exception as e:
        logger.error(f"❌ Error fixing RLS status view: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_test_tables():
    """Fix the RLS test tables used for RLS isolation testing"""
    logger.info("Fixing RLS test tables...")
    
    try:
        with connection.cursor() as cursor:
            # Check if tables exist and drop them to recreate with correct structure
            cursor.execute("""
            DROP TABLE IF EXISTS rls_test_check CASCADE;
            DROP TABLE IF EXISTS rls_test CASCADE;
            """)
            logger.info("Dropped existing test tables for clean recreation")
            
            # Create proper rls_test_check table
            cursor.execute("""
            CREATE TABLE rls_test_check (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Make sure RLS is enabled
            ALTER TABLE rls_test_check ENABLE ROW LEVEL SECURITY;
            
            -- Create policy
            CREATE POLICY tenant_isolation_policy ON rls_test_check
                USING (tenant_id = current_tenant_id() OR current_tenant_id() = 'unset');
                
            -- Insert test data
            INSERT INTO rls_test_check (tenant_id, value) VALUES 
                ('tenant1', 'Data for tenant 1'),
                ('tenant1', 'More data for tenant 1'),
                ('tenant2', 'Data for tenant 2'),
                ('tenant3', 'Data for tenant 3');
            """)
            logger.info("✅ Created rls_test_check table with correct structure and test data")
            
            # Create a general RLS test table
            cursor.execute("""
            CREATE TABLE rls_test (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                name TEXT NOT NULL,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Make sure RLS is enabled
            ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;
            
            -- Create policy
            CREATE POLICY tenant_isolation_policy ON rls_test
                USING (tenant_id = current_tenant_id() OR current_tenant_id() = 'unset');
                
            -- Insert test data
            INSERT INTO rls_test (tenant_id, name, value) VALUES 
                ('tenant1', 'test1', 'Value for tenant 1'),
                ('tenant1', 'test2', 'Another value for tenant 1'),
                ('tenant2', 'test3', 'Value for tenant 2'),
                ('tenant3', 'test4', 'Value for tenant 3');
            """)
            logger.info("✅ Created rls_test table with correct structure and test data")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error fixing RLS test tables: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_check_rls_script():
    """Check if we need to patch the check_rls.py script"""
    logger.info("Checking if check_rls.py script needs patching...")
    
    try:
        script_path = Path(__file__).parent / 'check_rls.py'
        
        if not script_path.exists():
            logger.warning("⚠️ check_rls.py not found in the same directory")
            return False
            
        with open(script_path, 'r') as f:
            content = f.read()
            
        # Check if the script is using 'data' column instead of 'value'
        if "INSERT INTO rls_test_check (tenant_id, data)" in content:
            logger.info("Found reference to 'data' column in check_rls.py, patching...")
            
            # Replace 'data' with 'value'
            patched_content = content.replace(
                "INSERT INTO rls_test_check (tenant_id, data)", 
                "INSERT INTO rls_test_check (tenant_id, value)"
            )
            
            with open(script_path, 'w') as f:
                f.write(patched_content)
                
            logger.info("✅ Patched check_rls.py to use 'value' column instead of 'data'")
            return True
            
        else:
            logger.info("✅ check_rls.py script doesn't need patching")
            return True
            
    except Exception as e:
        logger.error(f"❌ Error checking/patching check_rls.py: {e}")
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("\n=== RLS STATUS VIEW AND TEST TABLES FIX ===\n")
    print("This script fixes all aspects of the RLS configuration required for check_rls.py:")
    print("- RLS status view columns")
    print("- Test tables structure")
    print("- Script compatibility\n")
    
    view_success = fix_rls_status_view()
    table_success = fix_test_tables()
    script_success = fix_check_rls_script()
    
    if view_success and table_success and script_success:
        print("\n✅ All RLS configuration has been fixed successfully!")
        print("You can now run check_rls.py without errors.")
    else:
        print("\n❌ Error fixing RLS configuration. Check the logs for details.")
        if not view_success:
            print("  ❌ RLS status view fix failed")
        if not table_success:
            print("  ❌ Test tables fix failed")
        if not script_success:
            print("  ❌ Script patching failed")
        sys.exit(1) 