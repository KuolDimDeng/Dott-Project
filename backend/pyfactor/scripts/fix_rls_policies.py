#!/usr/bin/env python3
"""
Script to update existing RLS policies with the corrected approach.
This fixes the NULL tenant context issue by using empty strings instead.
"""

import os
import sys
import django
import logging
from pathlib import Path

# Set up Django environment
sys.path.append(str(Path(__file__).parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.apps import apps

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('fix_rls')

def get_tenant_aware_tables():
    """Get all tenant-aware tables from the database"""
    tenant_tables = []
    
    with connection.cursor() as cursor:
        # Find tables with tenant_id column
        cursor.execute("""
            SELECT table_schema, table_name
            FROM information_schema.columns
            WHERE column_name = 'tenant_id'
            AND table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name
        """)
        
        for schema, table in cursor.fetchall():
            tenant_tables.append((schema, table))
    
    return tenant_tables

def fix_rls_policies():
    """Fix existing RLS policies to use empty strings instead of NULL values"""
    # Create or replace tenant context handling function
    with connection.cursor() as cursor:
        logger.info("Setting up RLS helper function for handling NULL values...")
        
        # Create function to handle NULL values when setting config
        cursor.execute('''
        CREATE OR REPLACE FUNCTION set_config_with_empty(param text, value text) RETURNS text AS $$
        BEGIN
            RETURN set_config(param, COALESCE(value, ''), false);
        END;
        $$ LANGUAGE plpgsql;
        ''')
        
        # Update database parameter
        cursor.execute('ALTER DATABASE current_database() SET "app.current_tenant" = \'\';')
        
        logger.info("✓ Database parameters configured")
        
        # Update existing policies for tenant_id tables
        tables = get_tenant_aware_tables()
        logger.info(f"Found {len(tables)} tenant-aware tables to update")
        
        success_count = 0
        failure_count = 0
        
        for schema, table in tables:
            table_name = f"{schema}.{table}"
            logger.info(f"Updating RLS policy for {table_name}...")
            
            try:
                # Check if an RLS policy exists
                cursor.execute("""
                    SELECT policyname 
                    FROM pg_policies
                    WHERE schemaname = %s AND tablename = %s
                """, [schema, table])
                
                policies = cursor.fetchall()
                
                if not policies:
                    logger.warning(f"No RLS policies found for {table_name}, creating new policy...")
                    # Create new policy
                    cursor.execute(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;")
                    cursor.execute(f"""
                    CREATE POLICY tenant_isolation_policy ON {table_name}
                    AS RESTRICTIVE
                    USING (
                        (tenant_id::TEXT = current_setting('app.current_tenant', TRUE))
                        OR current_setting('app.current_tenant', TRUE) = ''
                    );
                    """)
                else:
                    # Update each policy that exists
                    for policy_name, in policies:
                        logger.info(f"Updating policy {policy_name} on {table_name}...")
                        cursor.execute(f"DROP POLICY IF EXISTS {policy_name} ON {table_name};")
                        cursor.execute(f"""
                        CREATE POLICY {policy_name} ON {table_name}
                        AS RESTRICTIVE
                        USING (
                            (tenant_id::TEXT = current_setting('app.current_tenant', TRUE))
                            OR current_setting('app.current_tenant', TRUE) = ''
                        );
                        """)
                
                success_count += 1
                logger.info(f"✓ RLS policy updated for {table_name}")
                
            except Exception as e:
                failure_count += 1
                logger.error(f"Failed to update RLS for {table_name}: {str(e)}")
        
        # Set current tenant parameter 
        cursor.execute("SET app.current_tenant = '';")
        
        logger.info(f"RLS policies update complete: {success_count} updated, {failure_count} failures")

if __name__ == "__main__":
    logger.info("Starting RLS policy fix...")
    fix_rls_policies()
    logger.info("RLS policy fix completed") 