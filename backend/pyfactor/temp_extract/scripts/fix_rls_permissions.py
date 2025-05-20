#!/usr/bin/env python3
"""
Script to fix RLS permissions issues based on diagnostic findings.
"""

import os
import sys
import logging
import argparse
import psycopg2
from datetime import datetime

# Configure database variables from environment or defaults
DB_NAME = os.environ.get('DB_NAME', 'dott_main')
DB_USER = os.environ.get('DB_USER', 'dott_admin')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'dott_admin_pwd')
DB_HOST = os.environ.get('DB_HOST', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com')
DB_PORT = os.environ.get('DB_PORT', '5432')

# Configure logging
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, f'fix_rls_permissions_{timestamp}.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def check_and_fix_rls_issues(dry_run=True):
    """
    Check and fix RLS issues.
    
    Args:
        dry_run: If True, only report issues but don't fix them.
    """
    # Initialize fixes counter to avoid UnboundLocalError if connection fails
    fixes_applied = 0
    
    try:
        # Connect to PostgreSQL
        logger.info(f"Connecting to PostgreSQL database {DB_NAME} on {DB_HOST} as {DB_USER}")
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.autocommit = True
        
        with conn.cursor() as cursor:
            # Check if row_security is enabled globally
            cursor.execute("SHOW row_security")
            result = cursor.fetchone()
            if result and result[0] == 'off':
                logger.warning("⚠️ Row security is disabled globally")
                if not dry_run:
                    cursor.execute("SET row_security = on")
                    logger.info("✅ Fixed: Row security has been enabled globally")
                    fixes_applied += 1
                else:
                    logger.info("Would fix: Enable row security globally with: SET row_security = on")
            
            # Check user permissions
            cursor.execute("""
                SELECT r.rolname, r.rolbypassrls
                FROM pg_roles r
                WHERE r.rolname = current_user
            """)
            role_info = cursor.fetchone()
            if role_info and role_info[1]:
                logger.warning(f"⚠️ User {role_info[0]} has BYPASSRLS privilege")
                if not dry_run:
                    cursor.execute(f"ALTER ROLE {role_info[0]} NOBYPASSRLS")
                    logger.info(f"✅ Fixed: Revoked BYPASSRLS privilege from user {role_info[0]}")
                    fixes_applied += 1
                else:
                    logger.info(f"Would fix: Revoke BYPASSRLS from user {role_info[0]} with: ALTER ROLE {role_info[0]} NOBYPASSRLS")
            
            # Get tables that need RLS fixed
            cursor.execute("""
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                  AND rowsecurity = false
                  AND tablename NOT LIKE 'django_%'
                  AND tablename NOT LIKE 'auth_%'
            """)
            tables_without_rls = cursor.fetchall()
            
            if tables_without_rls:
                logger.warning(f"Found {len(tables_without_rls)} tables without RLS enabled")
                for table in tables_without_rls:
                    if not dry_run:
                        try:
                            # First check if this table is multi-tenant and should have RLS
                            cursor.execute(f"""
                                SELECT EXISTS (
                                    SELECT 1 
                                    FROM information_schema.columns 
                                    WHERE table_name = %s 
                                      AND column_name = 'tenant_id'
                                )
                            """, (table[0],))
                            
                            result = cursor.fetchone()
                            has_tenant_id = result[0] if result else False
                            
                            if has_tenant_id:
                                # Enable RLS on table
                                cursor.execute(f"ALTER TABLE {table[0]} ENABLE ROW LEVEL SECURITY")
                                logger.info(f"✅ Fixed: Enabled RLS on table {table[0]}")
                                
                                # Force RLS to apply to table owner as well
                                cursor.execute(f"ALTER TABLE {table[0]} FORCE ROW LEVEL SECURITY")
                                logger.info(f"✅ Fixed: Forced RLS on table {table[0]} to apply to table owner")
                                
                                # Create RLS policy if doesn't exist
                                cursor.execute(f"""
                                    SELECT COUNT(*)
                                    FROM pg_policies
                                    WHERE tablename = %s
                                      AND policyname LIKE %s
                                """, (table[0], f"{table[0]}_tenant_isolation%"))
                                
                                result = cursor.fetchone()
                                if result and result[0] == 0:
                                    cursor.execute(f"""
                                        CREATE POLICY {table[0]}_tenant_isolation ON {table[0]}
                                        USING (tenant_id = current_setting('app.current_tenant_id', FALSE))
                                    """)
                                    logger.info(f"✅ Fixed: Created tenant isolation policy on {table[0]}")
                                
                                fixes_applied += 1
                            else:
                                logger.info(f"Skipping table {table[0]} as it doesn't have a tenant_id column")
                        except psycopg2.Error as e:
                            logger.error(f"Error fixing RLS for table {table[0]}: {e}")
                    else:
                        logger.info(f"Would fix: Enable and force RLS on table {table[0]}")
            
            # Check existing policies on tables with RLS enabled
            cursor.execute("""
                SELECT p.tablename, p.policyname
                FROM pg_policies p
                JOIN pg_tables t ON p.tablename = t.tablename
                WHERE t.schemaname = 'public'
                  AND t.rowsecurity = true
            """)
            existing_policies = cursor.fetchall()
            
            if existing_policies:
                logger.info(f"Found {len(existing_policies)} existing RLS policies")
                for policy in existing_policies:
                    # Get policy definition
                    cursor.execute(f"""
                        SELECT pg_get_expr(polqual, polrelid) as using_expr
                        FROM pg_policy
                        WHERE polname = %s
                    """, (policy[1],))
                    
                    policy_def = cursor.fetchone()
                    if policy_def:
                        using_expr = policy_def[0]
                        logger.info(f"Policy {policy[1]} on table {policy[0]} has USING expression: {using_expr}")
                        
                        # Check if policy uses current_setting correctly
                        if "current_setting" in using_expr and "app.current_tenant_id" in using_expr:
                            if "FALSE" not in using_expr and "false" not in using_expr:
                                logger.warning(f"⚠️ Policy {policy[1]} missing FALSE parameter in current_setting function")
                                if not dry_run:
                                    # Recreate policy with correct current_setting call
                                    cursor.execute(f"DROP POLICY {policy[1]} ON {policy[0]}")
                                    cursor.execute(f"""
                                        CREATE POLICY {policy[1]} ON {policy[0]}
                                        USING (tenant_id = current_setting('app.current_tenant_id', FALSE))
                                    """)
                                    logger.info(f"✅ Fixed: Recreated policy {policy[1]} with correct current_setting call")
                                    fixes_applied += 1
                                else:
                                    logger.info(f"Would fix: Recreate policy {policy[1]} with correct current_setting call")
            
            # Check if tenant functions exist
            cursor.execute("""
                SELECT COUNT(*)
                FROM pg_proc
                WHERE proname = 'set_tenant_context'
            """)
            
            result = cursor.fetchone()
            function_count = result[0] if result else 0
            
            if function_count == 0:
                logger.warning("⚠️ set_tenant_context function does not exist")
                if not dry_run:
                    cursor.execute("""
                        CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
                        RETURNS VOID AS $$
                        BEGIN
                            PERFORM set_config('app.current_tenant_id', tenant_id, FALSE);
                        END;
                        $$ LANGUAGE plpgsql;
                    """)
                    logger.info("✅ Fixed: Created set_tenant_context function")
                    fixes_applied += 1
                else:
                    logger.info("Would fix: Create set_tenant_context function")
            
            # Check if app.current_tenant_id parameter can be set
            try:
                cursor.execute("SET app.current_tenant_id = 'test_tenant'")
                cursor.execute("SELECT current_setting('app.current_tenant_id')")
                result = cursor.fetchone()
                if result and result[0] == 'test_tenant':
                    logger.info("✅ app.current_tenant_id parameter can be set and retrieved correctly")
                else:
                    logger.warning("⚠️ app.current_tenant_id parameter not retrievable")
            except psycopg2.Error:
                logger.warning("⚠️ Unable to set app.current_tenant_id parameter")
            
            # Apply fixes for FORCE ROW LEVEL SECURITY
            cursor.execute("""
                SELECT c.relname
                FROM pg_class c
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname = 'public'
                  AND c.relrowsecurity = true
                  AND c.relforcerowsecurity = false
                  AND c.relkind = 'r'
            """)
            
            tables_needing_force_rls = cursor.fetchall()
            if tables_needing_force_rls:
                logger.warning(f"Found {len(tables_needing_force_rls)} tables that need FORCE ROW LEVEL SECURITY")
                for table in tables_needing_force_rls:
                    if not dry_run:
                        try:
                            cursor.execute(f"ALTER TABLE {table[0]} FORCE ROW LEVEL SECURITY")
                            logger.info(f"✅ Fixed: Enabled FORCE ROW LEVEL SECURITY on table {table[0]}")
                            fixes_applied += 1
                        except psycopg2.Error as e:
                            logger.error(f"Error applying FORCE RLS to {table[0]}: {e}")
                    else:
                        logger.info(f"Would fix: Enable FORCE ROW LEVEL SECURITY on table {table[0]}")
            
            # Summary
            if dry_run:
                logger.info(f"\n=== SUMMARY (DRY RUN) ===")
                logger.info(f"Found {fixes_applied} issues that would be fixed.")
            else:
                logger.info(f"\n=== SUMMARY ===")
                logger.info(f"Applied {fixes_applied} fixes.")
                
            if fixes_applied == 0:
                logger.info("No RLS issues found that need fixing! If you're still experiencing RLS issues, it may be related to database configuration or permissions.")
            
    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn is not None:
            conn.close()
            logger.info("Database connection closed")
    
    logger.info(f"Log file available at: {log_file}")
    return fixes_applied

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Fix RLS permissions issues in PostgreSQL')
    parser.add_argument('--apply', action='store_true', help='Apply fixes (default is dry run)')
    args = parser.parse_args()
    
    if args.apply:
        logger.info("Running fix script with APPLY mode enabled")
        check_and_fix_rls_issues(dry_run=False)
    else:
        logger.info("Running fix script in DRY RUN mode (no changes will be made)")
        logger.info("To apply fixes, run with --apply flag")
        check_and_fix_rls_issues(dry_run=True) 