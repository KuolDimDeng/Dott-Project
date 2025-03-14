#!/usr/bin/env python
"""
Script to monitor tenant schemas and fix any issues.

This script:
1. Checks all tenant schemas for issues
2. Fixes any schemas with missing tables
3. Can be run as a scheduled task to ensure all tenant schemas are properly maintained

Usage:
    python monitor_tenant_schemas.py [--fix] [--verbose]

Options:
    --fix       Automatically fix any issues found (default: just report)
    --verbose   Show detailed logs
"""

import os
import sys
import django
import argparse
import logging
import uuid
import time
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s %(asctime)s %(name)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.conf import settings
from custom_auth.models import Tenant
from custom_auth.tasks import migrate_tenant_schema

def get_db_connection():
    """Get a direct database connection using psycopg2."""
    db_settings = settings.DATABASES['default']
    conn = psycopg2.connect(
        dbname=db_settings['NAME'],
        user=db_settings['USER'],
        password=db_settings['PASSWORD'],
        host=db_settings['HOST'],
        port=db_settings['PORT']
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    return conn

def get_tenant_schemas():
    """Get all tenant schemas from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
        ORDER BY schema_name
    """)
    schemas = [row[0] for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    return schemas

def get_schema_tables(schema_name):
    """Get all tables in a schema."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = %s
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """, [schema_name])
    tables = [row[0] for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    return tables

def check_migrations_table(schema_name):
    """Check if the django_migrations table exists in the schema."""
    tables = get_schema_tables(schema_name)
    return 'django_migrations' in tables

def check_expected_tables(schema_name):
    """Check if all expected tables for tenant apps exist in the schema."""
    tables = get_schema_tables(schema_name)
    tenant_apps = settings.TENANT_APPS
    
    missing_app_tables = []
    
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

def create_migrations_table(schema_name):
    """Create django_migrations table in the schema if it doesn't exist."""
    logger.info(f"Creating django_migrations table in schema {schema_name} if it doesn't exist")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Set search path to the tenant schema
    cursor.execute(f'SET search_path TO "{schema_name}"')
    
    # Check if django_migrations table exists
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = %s 
            AND table_name = 'django_migrations'
        )
    """, [schema_name])
    
    table_exists = cursor.fetchone()[0]
    
    if not table_exists:
        logger.info(f"Creating django_migrations table in schema {schema_name}")
        cursor.execute("""
            CREATE TABLE django_migrations (
                id serial NOT NULL PRIMARY KEY,
                app character varying(255) NOT NULL,
                name character varying(255) NOT NULL,
                applied timestamp with time zone NOT NULL
            )
        """)
    else:
        logger.info(f"django_migrations table already exists in schema {schema_name}")
    
    cursor.close()
    conn.close()

def monitor_tenant_schemas(fix=False, verbose=False):
    """Monitor tenant schemas and fix any issues."""
    process_id = uuid.uuid4()
    start_time = time.time()
    
    if verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info(f"[MONITOR-{process_id}] Starting tenant schema monitoring")
    
    try:
        # Get all tenants
        tenants = Tenant.objects.filter(is_active=True)
        logger.info(f"[MONITOR-{process_id}] Found {len(tenants)} active tenants")
        
        # Initialize counters for summary
        schemas_checked = 0
        schemas_with_issues = 0
        schemas_fixed = 0
        schemas_with_errors = 0
        schemas_with_missing_tables = 0
        schemas_with_missing_migrations_table = 0
        
        # Check each tenant's schema
        for tenant in tenants:
            tenant_start_time = time.time()
            schema_name = tenant.schema_name
            logger.info(f"[MONITOR-{process_id}] Checking tenant {tenant.id} ({tenant.name}) with schema {schema_name}")
            
            # Check if schema exists
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT schema_name
                    FROM information_schema.schemata
                    WHERE schema_name = %s
                """, [schema_name])
                schema_exists = cursor.fetchone() is not None
            
            if not schema_exists:
                logger.warning(f"[MONITOR-{process_id}] Schema {schema_name} does not exist for tenant {tenant.id}")
                schemas_with_issues += 1
                
                if fix:
                    logger.info(f"[MONITOR-{process_id}] Creating schema {schema_name}")
                    try:
                        with connection.cursor() as cursor:
                            # Create schema
                            cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
                            
                            # Set up permissions
                            db_user = connection.settings_dict['USER']
                            cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
                            cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
                            cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
                        
                        # Run migrations for the new schema
                        migrate_tenant_schema.delay(str(tenant.id))
                        logger.info(f"[MONITOR-{process_id}] Scheduled migration task for tenant {tenant.id}")
                        schemas_fixed += 1
                    except Exception as e:
                        logger.error(f"[MONITOR-{process_id}] Error creating schema {schema_name}: {str(e)}")
                        schemas_with_errors += 1
                
                continue
            
            schemas_checked += 1
            
            # Check if django_migrations table exists
            migrations_table_exists = check_migrations_table(schema_name)
            
            if not migrations_table_exists:
                logger.warning(f"[MONITOR-{process_id}] django_migrations table does not exist in schema {schema_name}")
                schemas_with_issues += 1
                schemas_with_missing_migrations_table += 1
            
            # Check if schema has tables
            tables = get_schema_tables(schema_name)
            table_count = len(tables)
            
            logger.info(f"[MONITOR-{process_id}] Schema {schema_name} has {table_count} tables")
            
            # Check for expected tables for each tenant app
            missing_app_tables = check_expected_tables(schema_name)
            
            if missing_app_tables:
                logger.warning(f"[MONITOR-{process_id}] Missing tables for apps: {', '.join(missing_app_tables)}")
                schemas_with_issues += 1
                schemas_with_missing_tables += 1
            
            # Fix issues if requested
            if fix and (not migrations_table_exists or missing_app_tables or table_count == 0):
                logger.info(f"[MONITOR-{process_id}] Fixing issues with schema {schema_name}")
                try:
                    # Schedule migration task
                    migrate_tenant_schema.delay(str(tenant.id))
                    logger.info(f"[MONITOR-{process_id}] Scheduled migration task for tenant {tenant.id}")
                    schemas_fixed += 1
                except Exception as e:
                    logger.error(f"[MONITOR-{process_id}] Error scheduling migration for schema {schema_name}: {str(e)}")
                    schemas_with_errors += 1
            
            tenant_elapsed_time = time.time() - tenant_start_time
            logger.info(f"[MONITOR-{process_id}] Finished checking tenant {tenant.id} in {tenant_elapsed_time:.2f} seconds")
        
        # Log summary
        logger.info(f"[MONITOR-{process_id}] Tenant schema monitoring summary:")
        logger.info(f"[MONITOR-{process_id}] - Schemas checked: {schemas_checked}")
        logger.info(f"[MONITOR-{process_id}] - Schemas with issues: {schemas_with_issues}")
        logger.info(f"[MONITOR-{process_id}] - Schemas with missing tables: {schemas_with_missing_tables}")
        logger.info(f"[MONITOR-{process_id}] - Schemas with missing migrations table: {schemas_with_missing_migrations_table}")
        
        if fix:
            logger.info(f"[MONITOR-{process_id}] - Schemas fixed: {schemas_fixed}")
            logger.info(f"[MONITOR-{process_id}] - Schemas with errors: {schemas_with_errors}")
        
        total_elapsed_time = time.time() - start_time
        logger.info(f"[MONITOR-{process_id}] Successfully completed tenant schema monitoring in {total_elapsed_time:.2f} seconds")
        
        return True
    
    except Exception as e:
        total_elapsed_time = time.time() - start_time
        logger.error(f"[MONITOR-{process_id}] Error in monitor_tenant_schemas: {str(e)}", exc_info=True)
        return False

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Monitor tenant schemas')
    parser.add_argument('--fix', action='store_true', help='Automatically fix any issues found')
    parser.add_argument('--verbose', action='store_true', help='Show detailed logs')
    args = parser.parse_args()
    
    monitor_tenant_schemas(fix=args.fix, verbose=args.verbose)

if __name__ == '__main__':
    main()