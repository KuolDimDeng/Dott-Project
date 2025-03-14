#!/usr/bin/env python
"""
Script to test tenant migrations by creating a test tenant schema and running migrations.

This script:
1. Creates a test tenant schema with a unique name
2. Runs migrations for the test schema
3. Verifies that all expected tables are created
4. Cleans up the test schema

Usage:
    python test_tenant_migrations.py [--keep]

Options:
    --keep  Keep the test schema after the test (default: delete it)
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
from django.core.management import call_command
from custom_auth.models import Tenant

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

def create_test_schema():
    """Create a test schema with a unique name."""
    test_id = uuid.uuid4()
    schema_name = f"tenant_test_{test_id}".replace('-', '_')
    logger.info(f"Creating test schema: {schema_name}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create schema
    cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
    
    # Set up permissions
    db_user = connection.settings_dict['USER']
    cursor.execute(f'GRANT USAGE ON SCHEMA "{schema_name}" TO {db_user}')
    cursor.execute(f'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "{schema_name}" TO {db_user}')
    cursor.execute(f'ALTER DEFAULT PRIVILEGES IN SCHEMA "{schema_name}" GRANT ALL ON TABLES TO {db_user}')
    
    cursor.close()
    conn.close()
    
    return schema_name

def drop_schema(schema_name):
    """Drop a schema."""
    logger.info(f"Dropping schema: {schema_name}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Drop schema
    cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
    
    cursor.close()
    conn.close()

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

def run_migrations_for_schema(schema_name):
    """Run migrations for a schema."""
    logger.info(f"Running migrations for schema {schema_name}")
    
    # Check if schema has tables before migrations
    tables_before = get_schema_tables(schema_name)
    logger.info(f"Tables in schema {schema_name} before migrations: {len(tables_before)}")
    
    # Set search path to tenant schema
    with connection.cursor() as cursor:
        logger.info(f"Setting search path to {schema_name}")
        cursor.execute(f'SET search_path TO "{schema_name}", public')
        
        # Verify search path was set correctly
        cursor.execute('SHOW search_path')
        current_path = cursor.fetchone()[0]
        logger.info(f"Current search path: {current_path}")
    
    # Run migrations for all tenant apps
    tenant_apps = settings.TENANT_APPS
    logger.info(f"Running migrations for {len(tenant_apps)} tenant apps")
    
    app_success_count = 0
    app_error_count = 0
    
    for app in tenant_apps:
        try:
            logger.info(f"Running migrations for app: {app}")
            call_command('migrate', app, verbosity=1)
            app_success_count += 1
        except Exception as e:
            app_error_count += 1
            logger.error(f"Error running migrations for app {app}: {str(e)}")
            # Continue with other apps even if one fails
    
    # Check if schema has tables after migrations
    tables_after = get_schema_tables(schema_name)
    logger.info(f"Tables in schema {schema_name} after migrations: {len(tables_after)}")
    
    new_tables = len(tables_after) - len(tables_before)
    logger.info(f"New tables created: {new_tables}")
    
    # Check if django_migrations table exists
    migrations_table_exists = check_migrations_table(schema_name)
    logger.info(f"django_migrations table exists: {migrations_table_exists}")
    
    # Check if all expected tables for tenant apps exist
    missing_app_tables = check_expected_tables(schema_name)
    if missing_app_tables:
        logger.warning(f"Missing tables for apps: {', '.join(missing_app_tables)}")
    else:
        logger.info(f"All expected app tables exist in schema {schema_name}")
    
    # Reset search path to public
    with connection.cursor() as cursor:
        cursor.execute('SET search_path TO public')
    
    return {
        'tables_before': len(tables_before),
        'tables_after': len(tables_after),
        'new_tables': new_tables,
        'migrations_table_exists': migrations_table_exists,
        'missing_app_tables': missing_app_tables,
        'app_success_count': app_success_count,
        'app_error_count': app_error_count
    }

def test_tenant_migrations(keep=False):
    """Test tenant migrations by creating a test schema and running migrations."""
    process_id = uuid.uuid4()
    start_time = time.time()
    
    logger.info(f"[TEST-{process_id}] Starting tenant migration test")
    
    # Create test schema
    schema_name = create_test_schema()
    
    try:
        # Run migrations for schema
        results = run_migrations_for_schema(schema_name)
        
        # Log results
        logger.info(f"[TEST-{process_id}] Test results:")
        logger.info(f"[TEST-{process_id}] - Tables before migrations: {results['tables_before']}")
        logger.info(f"[TEST-{process_id}] - Tables after migrations: {results['tables_after']}")
        logger.info(f"[TEST-{process_id}] - New tables created: {results['new_tables']}")
        logger.info(f"[TEST-{process_id}] - django_migrations table exists: {results['migrations_table_exists']}")
        logger.info(f"[TEST-{process_id}] - App migrations succeeded: {results['app_success_count']}")
        logger.info(f"[TEST-{process_id}] - App migrations failed: {results['app_error_count']}")
        
        if results['missing_app_tables']:
            logger.warning(f"[TEST-{process_id}] - Missing tables for apps: {', '.join(results['missing_app_tables'])}")
        else:
            logger.info(f"[TEST-{process_id}] - All expected app tables exist")
        
        # Determine test success
        test_success = (
            results['new_tables'] > 0 and
            results['migrations_table_exists'] and
            not results['missing_app_tables'] and
            results['app_error_count'] == 0
        )
        
        if test_success:
            logger.info(f"[TEST-{process_id}] Test PASSED: Tenant migrations are working correctly")
        else:
            logger.error(f"[TEST-{process_id}] Test FAILED: Tenant migrations are not working correctly")
        
    finally:
        # Clean up
        if not keep:
            drop_schema(schema_name)
            logger.info(f"[TEST-{process_id}] Cleaned up test schema")
        else:
            logger.info(f"[TEST-{process_id}] Keeping test schema: {schema_name}")
    
    total_elapsed_time = time.time() - start_time
    logger.info(f"[TEST-{process_id}] Successfully completed tenant migration test in {total_elapsed_time:.2f} seconds")

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Test tenant migrations')
    parser.add_argument('--keep', action='store_true', help='Keep the test schema after the test')
    args = parser.parse_args()
    
    test_tenant_migrations(keep=args.keep)

if __name__ == '__main__':
    main()