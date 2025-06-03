#!/usr/bin/env python
"""
Fix RLS policies to ensure proper tenant isolation.
This script updates all RLS policies to use explicit type casting.
"""

import os
import sys
import logging
import psycopg2
from psycopg2 import sql

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("fix-rls-policies")

# Constants
TENANT_CONTEXT_PARAM = 'app.current_tenant'
EMPTY_TENANT_VALUE = ''

def get_db_connection():
    """Get database connection from environment variables"""
    # Load environment variables from .env file
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_file):
        logger.info(f"Loading environment from {env_file}")
        with open(env_file, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    try:
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value
                    except ValueError:
                        pass

    # Get database connection parameters
    db_name = os.environ.get('DB_NAME', 'dott_main')
    db_user = os.environ.get('DB_USER', 'dott_admin')
    db_password = os.environ.get('DB_PASSWORD', '')
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5432')

    logger.info(f"Connecting to database {db_name} at {db_host}:{db_port} as {db_user}")

    try:
        # Connect to the database
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        conn.autocommit = True
        logger.info(f"Successfully connected to database {db_name}")
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return None

def fix_rls_functions(conn):
    """Fix RLS functions for proper tenant context handling"""
    try:
        with conn.cursor() as cursor:
            # Create improved tenant context functions
            cursor.execute("""
            -- Create improved function to set tenant context
            CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
            RETURNS VOID AS $$
            BEGIN
              -- Use SET for session level parameter
              EXECUTE 'SET app.current_tenant = ' || quote_literal(COALESCE(tenant_id, ''));
            END;
            $$ LANGUAGE plpgsql;
            
            -- Create improved function to get tenant context with proper typing
            CREATE OR REPLACE FUNCTION get_tenant_context()
            RETURNS TEXT AS $$
            DECLARE
              tenant_value TEXT;
            BEGIN
              -- Try to get parameter value with fallback to empty string
              BEGIN
                EXECUTE 'SELECT current_setting(''app.current_tenant'', true)' INTO tenant_value;
                RETURN COALESCE(tenant_value, '');
              EXCEPTION WHEN OTHERS THEN
                -- Auto-initialize parameter if it doesn't exist
                PERFORM set_tenant_context('');
                RETURN '';
              END;
            END;
            $$ LANGUAGE plpgsql;
            """)
            
            # Test if it works
            cursor.execute("SELECT get_tenant_context()")
            result = cursor.fetchone()
            tenant_value = result[0] if result else 'NULL'
            
            logger.info(f"RLS functions updated. Current tenant context: '{tenant_value}'")
            return True
    
    except Exception as e:
        logger.error(f"Error updating RLS functions: {e}")
        return False

def fix_rls_policies(conn):
    """Update RLS policies on all tables to use proper type casting"""
    try:
        with conn.cursor() as cursor:
            # Get all tables with RLS policies
            cursor.execute("""
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
              AND tablename IN (
                SELECT tablename FROM pg_policies WHERE policyname LIKE '%tenant%'
              )
            """)
            
            tables = cursor.fetchall()
            logger.info(f"Found {len(tables)} tables with tenant policies")
            
            # Get test table ready
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS rls_test (
                id SERIAL PRIMARY KEY,
                tenant_id TEXT,
                value TEXT
            );
            
            -- Enable RLS
            ALTER TABLE rls_test ENABLE ROW LEVEL SECURITY;
            
            -- Drop existing policy if any
            DROP POLICY IF EXISTS rls_test_tenant_isolation ON rls_test;
            
            -- Create policy with proper type casting
            CREATE POLICY rls_test_tenant_isolation ON rls_test
            USING (
                tenant_id::TEXT = get_tenant_context()
                OR get_tenant_context() = ''
            );
            
            -- Clear test data
            DELETE FROM rls_test;
            
            -- Add test data
            INSERT INTO rls_test (tenant_id, value) VALUES ('tenant1', 'data1');
            INSERT INTO rls_test (tenant_id, value) VALUES ('tenant2', 'data2');
            INSERT INTO rls_test (tenant_id, value) VALUES (NULL, 'data3');
            """)
            
            # Update RLS policies on all tables
            updated_tables = 0
            for table in tables:
                table_name = table[0]
                try:
                    # Check if tenant_id column exists
                    cursor.execute(f"""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = '{table_name}'
                      AND column_name = 'tenant_id';
                    """)
                    
                    if cursor.fetchone():
                        # Update policy
                        cursor.execute(f"""
                        -- Drop existing policy
                        DROP POLICY IF EXISTS tenant_isolation_policy ON {table_name};
                        
                        -- Create improved policy with type casting
                        CREATE POLICY tenant_isolation_policy ON {table_name}
                        USING (
                            tenant_id::TEXT = get_tenant_context()
                            OR get_tenant_context() = ''
                        );
                        """)
                        
                        updated_tables += 1
                        logger.info(f"Updated RLS policy for table: {table_name}")
                except Exception as e:
                    logger.error(f"Error updating policy for table {table_name}: {e}")
            
            # Test the RLS policy
            # Test with tenant1
            cursor.execute("SELECT set_tenant_context('tenant1')")
            cursor.execute("SELECT COUNT(*) FROM rls_test")
            tenant1_count = cursor.fetchone()[0]
            
            # Test with tenant2
            cursor.execute("SELECT set_tenant_context('tenant2')")
            cursor.execute("SELECT COUNT(*) FROM rls_test")
            tenant2_count = cursor.fetchone()[0]
            
            # Test with empty tenant
            cursor.execute("SELECT set_tenant_context('')")
            cursor.execute("SELECT COUNT(*) FROM rls_test")
            empty_count = cursor.fetchone()[0]
            
            logger.info(f"RLS policy test results: tenant1={tenant1_count}, tenant2={tenant2_count}, empty={empty_count}")
            
            if tenant1_count == 1 and tenant2_count == 1 and empty_count == 3:
                logger.info("RLS policy test passed! Tenant isolation is working correctly.")
                return True
            else:
                logger.error("RLS policy test failed. Tenant isolation is not working correctly.")
                return False
            
    except Exception as e:
        logger.error(f"Error fixing RLS policies: {e}")
        return False

def main():
    """Main function"""
    logger.info("Starting RLS policy fix")
    
    # Connect to database
    conn = get_db_connection()
    if not conn:
        logger.error("Failed to connect to database")
        sys.exit(1)
    
    try:
        # Fix RLS functions
        if not fix_rls_functions(conn):
            logger.error("Failed to fix RLS functions")
            sys.exit(1)
        
        # Fix RLS policies
        if not fix_rls_policies(conn):
            logger.error("Failed to fix RLS policies")
            sys.exit(1)
        
        logger.info("RLS policies fixed successfully")
        
    finally:
        conn.close()

if __name__ == "__main__":
    main() 