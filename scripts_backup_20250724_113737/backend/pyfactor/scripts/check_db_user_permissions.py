#!/usr/bin/env python3
"""
Check database user permissions that might be affecting RLS behavior.
"""

import os
import sys
import logging
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
log_file = os.path.join(log_dir, f'db_user_permissions_{timestamp}.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def check_user_permissions():
    """Check database user permissions and roles that might affect RLS."""
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
            # Get current user
            cursor.execute("SELECT current_user, current_database(), session_user")
            user_info = cursor.fetchone()
            if user_info:
                logger.info(f"Current user: {user_info[0]}, Database: {user_info[1]}, Session user: {user_info[2]}")
            else:
                logger.warning("Could not retrieve user information")
            
            # Check user roles
            cursor.execute("""
                SELECT r.rolname, r.rolsuper, r.rolinherit, r.rolcreaterole, 
                       r.rolcreatedb, r.rolcanlogin, r.rolreplication, r.rolbypassrls
                FROM pg_roles r
                WHERE r.rolname = current_user
            """)
            role_info = cursor.fetchone()
            if role_info:
                logger.info(f"Role name: {role_info[0]}")
                logger.info(f"Is superuser: {role_info[1]}")
                logger.info(f"Inherits privileges: {role_info[2]}")
                logger.info(f"Can create roles: {role_info[3]}")
                logger.info(f"Can create databases: {role_info[4]}")
                logger.info(f"Can login: {role_info[5]}")
                logger.info(f"Is replication role: {role_info[6]}")
                logger.info(f"Bypasses RLS: {role_info[7]}")
                
                if role_info[7]:  # rolbypassrls is True
                    logger.warning("⚠️ CRITICAL ISSUE FOUND: Current user has BYPASSRLS privilege!")
                    logger.warning("This privilege allows the user to bypass ALL row security policies!")
                    logger.warning("This is likely why RLS policies are not being enforced!")
            else:
                logger.warning("Could not retrieve role information")
            
            # Check role memberships (which roles the current user is a member of)
            cursor.execute("""
                SELECT r.rolname
                FROM pg_roles r
                JOIN pg_auth_members m ON m.roleid = r.oid
                JOIN pg_roles u ON m.member = u.oid
                WHERE u.rolname = current_user
            """)
            memberships = cursor.fetchall()
            if memberships:
                logger.info(f"User is a member of these roles: {', '.join([r[0] for r in memberships])}")
                
                # Check if any of these roles have BYPASSRLS
                placeholders = ','.join(['%s'] * len(memberships))
                cursor.execute(f"""
                    SELECT rolname, rolbypassrls 
                    FROM pg_roles 
                    WHERE rolname IN ({placeholders}) AND rolbypassrls = true
                """, [r[0] for r in memberships])
                bypass_roles = cursor.fetchall()
                if bypass_roles:
                    logger.warning("⚠️ CRITICAL ISSUE FOUND: User inherits BYPASSRLS from these roles:")
                    for role in bypass_roles:
                        logger.warning(f"  - {role[0]}")
                    logger.warning("This allows the user to bypass ALL row security policies!")
            
            # Check database-specific privileges
            cursor.execute("""
                SELECT privilege_type 
                FROM information_schema.role_usage_grants
                WHERE grantee = current_user
            """)
            privileges = cursor.fetchall()
            if privileges:
                logger.info(f"User has these database privileges: {', '.join([p[0] for p in privileges])}")
            
            # Check table ownerships
            cursor.execute("""
                SELECT tablename 
                FROM pg_tables 
                WHERE tableowner = current_user
                LIMIT 10
            """)
            owned_tables = cursor.fetchall()
            if owned_tables:
                logger.info(f"User owns these tables (showing first 10): {', '.join([t[0] for t in owned_tables])}")
                logger.info("Table owners can bypass RLS unless FORCE ROW LEVEL SECURITY is enabled")
            
            # Check RLS configuration
            cursor.execute("""
                SELECT tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                  AND tablename LIKE 'rls_%test%'
            """)
            rls_tables = cursor.fetchall()
            for table in rls_tables:
                logger.info(f"Table {table[0]}: RLS enabled = {table[1]}")
                
                # Check if FORCE ROW LEVEL SECURITY is enabled
                cursor.execute(f"""
                    SELECT relname, relrowsecurity, relforcerowsecurity 
                    FROM pg_class 
                    WHERE relname = %s
                """, (table[0],))
                force_rls = cursor.fetchone()
                if force_rls:
                    logger.info(f"Table {force_rls[0]}: RLS enabled = {force_rls[1]}, FORCE RLS = {force_rls[2]}")
                    
                    if not force_rls[2]:
                        logger.warning(f"⚠️ FORCE ROW LEVEL SECURITY is not enabled on {force_rls[0]}")
                        logger.warning("This means the table owner can bypass RLS policies!")
            
            # Check for any active client-set configuration parameters
            cursor.execute("SELECT name, setting FROM pg_settings WHERE name LIKE 'app.%'")
            app_settings = cursor.fetchall()
            if app_settings:
                logger.info("Active application settings:")
                for setting in app_settings:
                    logger.info(f"  {setting[0]} = {setting[1]}")
            
            # Test if RLS works with current user
            logger.info("Testing RLS with current user...")
            
            # Safe execution with None checking
            try:
                cursor.execute("SET app.current_tenant_id = 'tenant1'")
                cursor.execute("SELECT COUNT(*) FROM rls_test_table")
                result = cursor.fetchone()
                count = result[0] if result else None
                logger.info(f"Rows visible with tenant1: {count if count is not None else 'unknown'}")
            except psycopg2.Error as e:
                logger.error(f"Error testing tenant1 visibility: {e}")
            
            try:
                cursor.execute("SET app.current_tenant_id = 'tenant2'")
                cursor.execute("SELECT COUNT(*) FROM rls_test_table")
                result = cursor.fetchone()
                count = result[0] if result else None
                logger.info(f"Rows visible with tenant2: {count if count is not None else 'unknown'}")
            except psycopg2.Error as e:
                logger.error(f"Error testing tenant2 visibility: {e}")
            
            # Check PostgreSQL configuration parameters related to security
            cursor.execute("""
                SELECT name, setting, context 
                FROM pg_settings 
                WHERE name IN (
                    'row_security', 
                    'default_with_oids', 
                    'session_preload_libraries',
                    'shared_preload_libraries'
                )
            """)
            pg_settings = cursor.fetchall()
            for setting in pg_settings:
                logger.info(f"PostgreSQL setting {setting[0]} = {setting[1]} (context: {setting[2]})")
            
            # Summary and recommendations
            logger.info("\n=== SUMMARY ===")
            if role_info and role_info[7]:
                logger.warning("⚠️ RLS ISSUE IDENTIFIED: Current user has BYPASSRLS privilege")
                logger.warning("RECOMMENDATION: Revoke BYPASSRLS from this user with:")
                logger.warning(f"  ALTER ROLE {role_info[0]} NOBYPASSRLS;")
            elif bypass_roles:
                logger.warning("⚠️ RLS ISSUE IDENTIFIED: User inherits BYPASSRLS from other roles")
                logger.warning("RECOMMENDATION: Revoke these role memberships or remove BYPASSRLS from them")
            
            force_rls_issues = False
            for table in rls_tables:
                cursor.execute(f"""
                    SELECT relforcerowsecurity 
                    FROM pg_class 
                    WHERE relname = %s
                """, (table[0],))
                result = cursor.fetchone()
                if result and not result[0]:
                    force_rls_issues = True
                    
            if force_rls_issues:
                logger.warning("⚠️ RLS ISSUE IDENTIFIED: Some tables don't have FORCE ROW LEVEL SECURITY enabled")
                logger.warning("RECOMMENDATION: Enable it with:")
                logger.warning("  ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY;")
            
    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn is not None:
            conn.close()
            logger.info("Database connection closed")
            
    logger.info(f"Log file available at: {log_file}")

if __name__ == "__main__":
    check_user_permissions() 