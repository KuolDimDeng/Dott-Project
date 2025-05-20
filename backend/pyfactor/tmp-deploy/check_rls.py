#!/usr/bin/env python3
"""
RLS Verification Script - Production Ready

This script performs comprehensive checks on Row Level Security (RLS) configuration
in PostgreSQL for multi-tenant isolation. Designed for AWS RDS production environments.

It verifies:
1. RLS functions existence and correctness
2. Tenant isolation effectiveness
3. RLS middleware configuration
4. Database configuration compatibility
5. RLS status across all tables

For production use with AWS RDS.
"""

import os
import sys
import django
import logging
import argparse
import traceback
from pathlib import Path

# Set up logging with clear formatting
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('rls_check')

# Set up Django environment
sys.path.append(str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.conf import settings

def print_header(title):
    """Print a section header"""
    print(f"\n=== {title} ===")

def test_rls_functions():
    """Check if RLS functions are properly defined and working"""
    print_header("TESTING RLS FUNCTIONS")
    
    try:
        with connection.cursor() as cursor:
            # 1. Test the primary function
            print("Testing get_tenant_context() (primary function)...")
            try:
                cursor.execute("SELECT get_tenant_context()")
                result = cursor.fetchone()[0]
                print(f"✅ get_tenant_context() works - returned '{result}'")
            except Exception as e:
                print(f"❌ Error with get_tenant_context(): {e}")
                logger.error(f"Error with get_tenant_context(): {e}")
                logger.error(traceback.format_exc())
                
            # 2. Test alias functions
            print("\nTesting get_current_tenant_id() (compatibility alias)...")
            try:
                cursor.execute("SELECT get_current_tenant_id()")
                result = cursor.fetchone()[0]
                print(f"✅ get_current_tenant_id() alias works - returned '{result}'")
            except Exception as e:
                print(f"❌ Error with get_current_tenant_id(): {e}")
                logger.error(f"Error with get_current_tenant_id(): {e}")
            
            print("\nTesting current_tenant_id() (policy alias)...")
            try:
                cursor.execute("SELECT current_tenant_id()")
                result = cursor.fetchone()[0]
                print(f"✅ current_tenant_id() alias works - returned '{result}'")
            except Exception as e:
                print(f"❌ Error with current_tenant_id(): {e}")
                logger.error(f"Error with current_tenant_id(): {e}")
            
            # 3. Test setter function
            print("\nTesting set_tenant_context()...")
            try:
                cursor.execute("SELECT set_tenant_context('test_tenant')")
                cursor.execute("SELECT get_tenant_context()")
                result = cursor.fetchone()[0]
                if result == 'test_tenant':
                    print(f"✅ set_tenant_context() works - set tenant to '{result}'")
                else:
                    print(f"❌ set_tenant_context() failed - expected 'test_tenant', got '{result}'")
                    logger.error(f"set_tenant_context() failed - expected 'test_tenant', got '{result}'")
            except Exception as e:
                print(f"❌ Error with set_tenant_context(): {e}")
                logger.error(f"Error with set_tenant_context(): {e}")
            
            # 4. Test clear function
            print("\nTesting clear_tenant_context()...")
            try:
                cursor.execute("SELECT clear_tenant_context()")
                cursor.execute("SELECT get_tenant_context()")
                result = cursor.fetchone()[0]
                if result == 'unset':
                    print(f"✅ clear_tenant_context() works - reset to '{result}'")
                else:
                    print(f"❌ clear_tenant_context() failed - expected 'unset', got '{result}'")
                    logger.error(f"clear_tenant_context() failed - expected 'unset', got '{result}'")
            except Exception as e:
                print(f"❌ Error with clear_tenant_context(): {e}")
                logger.error(f"Error with clear_tenant_context(): {e}")
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        logger.error(f"Database connection error: {e}")
        logger.error(traceback.format_exc())

def test_rls_isolation():
    """Test if RLS provides proper tenant isolation"""
    print_header("TESTING RLS ISOLATION")
    
    try:
        with connection.cursor() as cursor:
            # Create test table if it doesn't exist
            print("Setting up test data...")
            try:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS rls_test_check (
                    id SERIAL PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                """)
                
                # Enable RLS on test table
                cursor.execute("ALTER TABLE rls_test_check ENABLE ROW LEVEL SECURITY;")
                
                # Create or replace policy using the standard function
                cursor.execute("DROP POLICY IF EXISTS tenant_isolation_policy ON rls_test_check;")
                cursor.execute("""
                CREATE POLICY tenant_isolation_policy ON rls_test_check
                USING (
                    (tenant_id = get_tenant_context() AND get_tenant_context() != 'unset')
                    OR get_tenant_context() = 'unset'
                );
                """)
                
                # Clean existing test data
                cursor.execute("DELETE FROM rls_test_check;")
                
                # Insert test data for different tenants
                cursor.execute("INSERT INTO rls_test_check (tenant_id, value) VALUES ('tenant1', 'Data for tenant 1');")
                cursor.execute("INSERT INTO rls_test_check (tenant_id, value) VALUES ('tenant1', 'More data for tenant 1');")
                cursor.execute("INSERT INTO rls_test_check (tenant_id, value) VALUES ('tenant2', 'Data for tenant 2');")
                cursor.execute("INSERT INTO rls_test_check (tenant_id, value) VALUES ('tenant3', 'Data for tenant 3');")
                
                # Create index for performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_rls_test_check_tenant_id ON rls_test_check (tenant_id);")
                
                print("✅ Test data and RLS policy successfully set up")
            except Exception as e:
                print(f"❌ Error setting up test data: {e}")
                logger.error(f"Error setting up test data: {e}")
                logger.error(traceback.format_exc())
                return
            
            # Test with unset tenant (should see all rows - admin access)
            cursor.execute("SELECT clear_tenant_context();")
            cursor.execute("SELECT COUNT(*) FROM rls_test_check;")
            unset_count = cursor.fetchone()[0]
            print(f"Admin context (unset): Sees {unset_count} rows (expected 4)")
            if unset_count == 4:
                print("✅ Admin can see all rows as expected")
            else:
                print(f"❌ Admin sees {unset_count} rows instead of 4")
                logger.error(f"Admin sees {unset_count} rows instead of 4")
            
            # Test with tenant1
            cursor.execute("SELECT set_tenant_context('tenant1');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_check;")
            tenant1_count = cursor.fetchone()[0]
            print(f"Tenant1 context: Sees {tenant1_count} rows (expected 2)")
            if tenant1_count == 2:
                print("✅ Tenant1 sees only its 2 rows as expected")
            else:
                print(f"❌ Tenant1 sees {tenant1_count} rows instead of 2")
                logger.error(f"Tenant1 sees {tenant1_count} rows instead of 2")
            
            # Test with tenant2
            cursor.execute("SELECT set_tenant_context('tenant2');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_check;")
            tenant2_count = cursor.fetchone()[0]
            print(f"Tenant2 context: Sees {tenant2_count} rows (expected 1)")
            if tenant2_count == 1:
                print("✅ Tenant2 sees only its 1 row as expected")
            else:
                print(f"❌ Tenant2 sees {tenant2_count} rows instead of 1")
                logger.error(f"Tenant2 sees {tenant2_count} rows instead of 1")
            
            # Test with non-existent tenant
            cursor.execute("SELECT set_tenant_context('nonexistent');")
            cursor.execute("SELECT COUNT(*) FROM rls_test_check;")
            nonexistent_count = cursor.fetchone()[0]
            print(f"Nonexistent tenant context: Sees {nonexistent_count} rows (expected 0)")
            if nonexistent_count == 0:
                print("✅ Nonexistent tenant sees 0 rows as expected")
            else:
                print(f"❌ Nonexistent tenant sees {nonexistent_count} rows instead of 0")
                logger.error(f"Nonexistent tenant sees {nonexistent_count} rows instead of 0")
            
            # Reset context
            cursor.execute("SELECT clear_tenant_context();")
            
    except Exception as e:
        print(f"❌ Error testing RLS isolation: {e}")
        logger.error(f"Error testing RLS isolation: {e}")
        logger.error(traceback.format_exc())

def check_rls_middleware():
    """Check if RLS middleware is configured in Django settings"""
    print_header("CHECKING RLS MIDDLEWARE")
    
    # Standard middleware class paths
    standard_middleware = 'custom_auth.rls_middleware.RowLevelSecurityMiddleware'
    enhanced_middleware = 'custom_auth.enhanced_rls_middleware.EnhancedRowLevelSecurityMiddleware'
    
    middleware_list = getattr(settings, 'MIDDLEWARE', [])
    
    standard_found = standard_middleware in middleware_list
    enhanced_found = enhanced_middleware in middleware_list
    
    if enhanced_found:
        print("✅ Enhanced RLS middleware is configured")
    elif standard_found:
        print("✅ Standard RLS middleware is configured")
        print("ℹ️  Consider upgrading to enhanced middleware for better reliability")
    else:
        print("❌ No RLS middleware found in settings.MIDDLEWARE")
        logger.error("No RLS middleware found in settings.MIDDLEWARE")
        print("ℹ️  Add one of these to your settings.py:")
        print(f"   - '{standard_middleware}'")
        print(f"   - '{enhanced_middleware}' (recommended)")

def check_database_config():
    """Check database configuration for RLS compatibility"""
    print_header("CHECKING DATABASE CONFIGURATION")
    
    db_config = getattr(settings, 'DATABASES', {}).get('default', {})
    
    if not db_config:
        print("❌ No database configuration found")
        logger.error("No database configuration found")
        return
    
    # Check engine
    engine = db_config.get('ENGINE', '')
    if 'postgresql' not in engine.lower():
        print(f"❌ Database engine '{engine}' may not support RLS")
        logger.error(f"Database engine '{engine}' may not support RLS")
        print("ℹ️  RLS requires PostgreSQL")
    else:
        print(f"✅ Database engine is PostgreSQL-compatible: {engine}")
    
    # Check connection options for AWS specifics
    options = db_config.get('OPTIONS', {})
    if options:
        print("✅ Database OPTIONS are configured")
        
        # Check for sslmode for AWS RDS
        if 'sslmode' in options:
            print(f"✅ SSL mode is configured: {options['sslmode']}")
        else:
            print("ℹ️  Consider setting sslmode for AWS RDS connections")
    else:
        print("ℹ️  No database OPTIONS configured (optional)")
        print("   Consider adding OPTIONS for AWS RDS connections")

def check_rls_tables():
    """Check which tables have RLS enabled"""
    print_header("CHECKING RLS TABLE STATUS")
    
    try:
        with connection.cursor() as cursor:
            # Try to access rls_status view
            try:
                cursor.execute("""
                SELECT COUNT(*) 
                FROM pg_views 
                WHERE viewname = 'rls_status' 
                AND schemaname = 'public'
                """)
                view_exists = cursor.fetchone()[0] > 0
                
                if view_exists:
                    print("✅ RLS status view exists")
                    
                    # Query the view for status
                    cursor.execute("""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE has_tenant_id) as with_tenant_id,
                        COUNT(*) FILTER (WHERE rls_enabled) as with_rls_enabled,
                        COUNT(*) FILTER (WHERE has_policy) as with_policy
                    FROM rls_status
                    """)
                    
                    result = cursor.fetchone()
                    total, with_tenant_id, with_rls_enabled, with_policy = result
                    
                    print(f"Total tables: {total}")
                    print(f"Tables with tenant_id column: {with_tenant_id}")
                    print(f"Tables with RLS enabled: {with_rls_enabled}")
                    print(f"Tables with policies: {with_policy}")
                    
                    if with_tenant_id == with_rls_enabled == with_policy:
                        print("✅ All tenant tables have proper RLS configuration")
                    else:
                        print("❌ Some tenant tables may have incomplete RLS configuration")
                        logger.error("Some tenant tables have incomplete RLS configuration")
                        
                        # Show details of tables with issues
                        if with_tenant_id > with_rls_enabled or with_tenant_id > with_policy:
                            cursor.execute("""
                            SELECT table_name, has_tenant_id, rls_enabled, has_policy
                            FROM rls_status
                            WHERE has_tenant_id = TRUE 
                            AND (rls_enabled = FALSE OR has_policy = FALSE)
                            """)
                            
                            issue_tables = cursor.fetchall()
                            if issue_tables:
                                print("\nTables with incomplete RLS setup:")
                                for table in issue_tables:
                                    print(f"- {table[0]}: RLS Enabled={table[2]}, Has Policy={table[3]}")
                else:
                    print("❌ RLS status view doesn't exist")
                    logger.error("RLS status view doesn't exist")
                    
                    # Fallback to direct queries
                    print("ℹ️  Checking tables directly...")
                    
                    # Find tenant tables
                    cursor.execute("""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' AND column_name = 'tenant_id'
                    """)
                    tenant_tables = cursor.fetchone()[0]
                    print(f"Tables with tenant_id column: {tenant_tables}")
                    
            except Exception as e:
                print(f"❌ Error querying RLS status: {e}")
                logger.error(f"Error querying RLS status: {e}")
                logger.error(traceback.format_exc())
                
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        logger.error(f"Database connection error: {e}")
        logger.error(traceback.format_exc())

def check_aws_specific():
    """Check AWS RDS specific configurations"""
    print_header("CHECKING AWS RDS SPECIFIC CONFIGURATIONS")
    
    try:
        with connection.cursor() as cursor:
            # Check PostgreSQL version
            try:
                cursor.execute("SELECT version()")
                version = cursor.fetchone()[0]
                print(f"PostgreSQL version: {version}")
                
                if "amazon" in version.lower():
                    print("✅ Running on AWS RDS PostgreSQL")
                else:
                    print("ℹ️  Not running on AWS RDS - this is fine for development")
                
            except Exception as e:
                print(f"❌ Error checking PostgreSQL version: {e}")
                logger.error(f"Error checking PostgreSQL version: {e}")
            
            # Check for connection pooling
            try:
                cursor.execute("SHOW max_connections")
                max_connections = cursor.fetchone()[0]
                print(f"Max database connections: {max_connections}")
                
                # For AWS RDS, warn if connections are too high
                if int(max_connections) > 100:
                    print("ℹ️  High max_connections setting - consider connection pooling for production")
            except Exception as e:
                print(f"❌ Error checking connection settings: {e}")
                logger.error(f"Error checking connection settings: {e}")
                
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        logger.error(f"Database connection error: {e}")

def main():
    """Run all RLS checks"""
    # Process command line arguments
    parser = argparse.ArgumentParser(
        description="RLS Check - Verify Row Level Security configuration for AWS RDS PostgreSQL"
    )
    parser.add_argument('--all', action='store_true', help='Run all checks including extended AWS tests')
    args = parser.parse_args()
    
    print("\n=== RLS CONFIGURATION CHECK ===")
    print("Running comprehensive tests on RLS configuration...")
    
    # Run all checks
    test_rls_functions()
    test_rls_isolation()
    check_rls_middleware()
    check_database_config()
    check_rls_tables()
    
    # AWS RDS specific checks
    if args.all:
        check_aws_specific()
    
    print("\n=== CHECK COMPLETE ===")
    print("If any issues were found, run fix_rls_direct.py to resolve them")
    print("Or use scripts/rls_manager.py for a comprehensive solution")

if __name__ == "__main__":
    main() 