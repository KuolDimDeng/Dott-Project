#!/usr/bin/env python
"""
Script to debug tenant schema creation and migration issues.

This script will:
1. List all tenants and their schema status
2. Check if each schema exists
3. Check if each schema has the expected tables
4. Identify any issues with schema names or migrations
5. Provide detailed diagnostics for troubleshooting

Usage:
python scripts/debug_tenant_schemas.py [--fix] [--tenant_id TENANT_ID]

Options:
--fix: Attempt to fix issues automatically
--tenant_id: Focus on a specific tenant by ID
"""

import os
import sys
import logging
import argparse
import uuid
import time
import psycopg2
from psycopg2 import sql

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.db import connections, connection
from django.conf import settings
from custom_auth.models import Tenant, User
from custom_auth.tasks import migrate_tenant_schema

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tenant_debug.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def get_db_connection():
    """Get a direct psycopg2 connection to the database"""
    db_settings = settings.DATABASES['default']
    conn = psycopg2.connect(
        dbname=db_settings['NAME'],
        user=db_settings['USER'],
        password=db_settings['PASSWORD'],
        host=db_settings['HOST'],
        port=db_settings['PORT']
    )
    conn.autocommit = True
    return conn

def schema_exists(tenant_id: uuid.UUID:
    """Check if the schema exists"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name = %s
            """, [schema_name])
            return cursor.fetchone() is not None
    except Exception as e:
        logger.error(f"Error checking if schema exists: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def get_tables_in_schema(tenant_id: uuid.UUID:
    """Get all tables in the schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY table_name
            """, [schema_name])
            return [row[0] for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Error getting tables: {str(e)}")
        return []
    finally:
        if conn:
            conn.close()

def check_schema_name_format(tenant_id: uuid.UUID:
    """Check if schema name follows the correct format"""
    issues = []
    
    if not schema_name.startswith('tenant_'):
        issues.append("Schema name does not start with 'tenant_' prefix")
    
    if '-' in schema_name:
        issues.append("Schema name contains hyphens instead of underscores")
    
    if len(schema_name) > 63:
        issues.append("Schema name exceeds PostgreSQL's 63 character limit")
    
    return issues

def check_expected_tables(tenant_id: uuid.UUID:
    """Check if schema has all expected tables for tenant apps"""
    missing_app_tables = []
    tenant_apps = settings.TENANT_APPS
    
    for app in tenant_apps:
        app_name = app.split('.')[-1] if '.' in app else app
        app_prefix = f"{app_name}_"
        
        # Check if at least one table exists for this app
        found = False
        for table in tables:
            if table.startswith(app_prefix):
                found = True
                break
        
        if not found:
            missing_app_tables.append(app_name)
    
    return missing_app_tables

def fix_schema_name(tenant):
    """Fix schema name format issues"""
    original_schema_name =  tenant.id
    fixed_schema_name = original_schema_name
    
    # Add tenant_ prefix if missing
    if not fixed_schema_name.startswith('tenant_'):
        fixed_schema_name = f"tenant_{fixed_schema_name}"
    
    # Replace hyphens with underscores
    if '-' in fixed_schema_name:
        fixed_schema_name = fixed_schema_name.replace('-', '_')
    
    # Truncate if too long
    if len(fixed_schema_name) > 63:
        fixed_schema_name = fixed_schema_name[:63]
    
    if fixed_schema_name != original_schema_name:
        logger.info(f"Fixing schema name: '{original_schema_name}' -> '{fixed_schema_name}'")
        
        # Check if the fixed schema name already exists
        if schema_exists(fixed_schema_name):
            logger.error(f"Cannot rename schema: '{fixed_schema_name}' already exists")
            return False
        
        # Update tenant record
         tenant.id = fixed_schema_name
        tenant.save()
        
        # Rename schema in database if original schema exists
        if schema_exists(original_schema_name):
            try:
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute(f'ALTER SCHEMA "{original_schema_name}" RENAME TO "{fixed_schema_name}"')
                logger.info(f"Successfully renamed schema in database")
                return True
            except Exception as e:
                logger.error(f"Error renaming schema: {str(e)}")
                return False
            finally:
                if conn:
                    conn.close()
        else:
            logger.info(f"Original schema does not exist in database, no need to rename")
            return True
    
    return False  # No changes needed

def fix_missing_schema(tenant):
    """Create schema if it doesn't exist"""
    schema_name =  tenant.id
    
    if not schema_exists(schema_name):
        logger.info(f"Creating missing schema: {schema_name}")
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                # Create schema
                cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                
                # Set up permissions
                db_user = connection.settings_dict['USER']
                cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
            
            logger.info(f"Successfully created schema: {schema_name}")
            return True
        except Exception as e:
            logger.error(f"Error creating schema: {str(e)}")
            return False
        finally:
            if conn:
                conn.close()
    
    return False  # Schema already exists

def fix_missing_tables(tenant):
    """Run migrations for schemas with missing tables"""
    logger.info(f"Triggering migrations for tenant: {tenant.id} ({ tenant.id})")
    
    try:
        # Update tenant status
        tenant.database_status = 'pending'
        tenant.save(update_fields=['database_status'])
        
        # Trigger migration task
        task_id = str(uuid.uuid4())
        logger.info(f"Starting migration task {task_id} for tenant {tenant.id}")
        
        # Run migration synchronously for debugging
        migrate_tenant_schema(str(tenant.id))
        
        logger.info(f"Migration task completed for tenant {tenant.id}")
        return True
    except Exception as e:
        logger.error(f"Error triggering migrations: {str(e)}")
        return False

def debug_tenant_schemas(tenant_id=None, fix=False):
    """Debug tenant schemas"""
    logger.info("Starting tenant schema debugging")
    
    # Get tenants
    if tenant_id:
        tenants = Tenant.objects.filter(id=tenant_id)
        if not tenants:
            logger.error(f"Tenant with ID {tenant_id} not found")
            return False
    else:
        tenants = Tenant.objects.all()
    
    logger.info(f"Found {len(tenants)} tenants to check")
    
    # Initialize counters
    total_tenants = len(tenants)
    schemas_exist = 0
    schemas_with_tables = 0
    schemas_with_issues = 0
    schemas_fixed = 0
    
    # Check each tenant
    for tenant in tenants:
        logger.info(f"\n{'='*80}\nChecking tenant: {tenant.id}")
        logger.info(f"Schema name: { tenant.id}")
        logger.info(f"Owner: {tenant.owner.email if tenant.owner else 'None'}")
        logger.info(f"Database status: {tenant.database_status}")
        logger.info(f"Setup status: {tenant.setup_status}")
        
        # Check schema name format
        schema_name_issues = check_schema_name_format( tenant.id)
        if schema_name_issues:
            logger.warning(f"Schema name issues:")
            for issue in schema_name_issues:
                logger.warning(f"  - {issue}")
            
            if fix:
                if fix_schema_name(tenant):
                    schemas_fixed += 1
                    # Refresh tenant after fix
                    tenant.refresh_from_db()
        
        # Check if schema exists
        schema_name =  tenant.id
        schema_exists_flag = schema_exists(schema_name)
        
        if schema_exists_flag:
            schemas_exist += 1
            logger.info(f"Schema exists: Yes")
        else:
            logger.warning(f"Schema exists: No")
            
            if fix:
                if fix_missing_schema(tenant):
                    schemas_fixed += 1
                    schema_exists_flag = True
        
        # Skip table checks if schema doesn't exist
        if not schema_exists_flag:
            schemas_with_issues += 1
            continue
        
        # Check tables in schema
        tables = get_tables_in_schema(schema_name)
        table_count = len(tables)
        
        if table_count > 0:
            schemas_with_tables += 1
            logger.info(f"Tables: {table_count}")
            logger.info(f"Table list: {', '.join(tables)}")
        else:
            logger.warning(f"Tables: 0 (No tables found)")
        
        # Check for missing app tables
        missing_app_tables = check_expected_tables(schema_name, tables)
        if missing_app_tables:
            logger.warning(f"Missing tables for apps: {', '.join(missing_app_tables)}")
            schemas_with_issues += 1
            
            if fix and (table_count == 0 or missing_app_tables):
                if fix_missing_tables(tenant):
                    schemas_fixed += 1
                    
                    # Verify fix
                    tables_after = get_tables_in_schema(schema_name)
                    logger.info(f"Tables after fix: {len(tables_after)}")
                    missing_after = check_expected_tables(schema_name, tables_after)
                    if missing_after:
                        logger.warning(f"Still missing tables for apps: {', '.join(missing_after)}")
                    else:
                        logger.info(f"All expected tables are now present")
    
    # Print summary
    logger.info("\n" + "="*80)
    logger.info("=== Summary ===")
    logger.info(f"Total tenants: {total_tenants}")
    logger.info(f"Schemas exist: {schemas_exist}")
    logger.info(f"Schemas with tables: {schemas_with_tables}")
    logger.info(f"Schemas with issues: {schemas_with_issues}")
    
    if fix:
        logger.info(f"Schemas fixed: {schemas_fixed}")
    
    return True

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Debug tenant schemas')
    parser.add_argument('--fix', action='store_true', help='Attempt to fix issues')
    parser.add_argument('--tenant_id', help='Focus on a specific tenant by ID')
    args = parser.parse_args()
    
    # Debug tenant schemas
    if debug_tenant_schemas(tenant_id=args.tenant_id, fix=args.fix):
        logger.info("Successfully debugged tenant schemas")
    else:
        logger.error("Failed to debug tenant schemas")
        sys.exit(1)

if __name__ == "__main__":
    main()