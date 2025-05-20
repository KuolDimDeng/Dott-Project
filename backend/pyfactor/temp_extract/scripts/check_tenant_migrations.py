#!/usr/bin/env python
"""
Script to check tenant schema migrations and diagnose issues.

This script:
1. Identifies all tenant schemas in the database
2. Checks if each schema has tables
3. Verifies if the django_migrations table exists in each schema
4. Checks if all expected tables for tenant apps exist
5. Reports any issues found

Usage:
    python check_tenant_migrations.py [--tenant_id TENANT_ID]

Options:
    --tenant_id TENANT_ID  Check migrations for a specific tenant ID
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

def get_schema_tables(tenant_id: uuid.UUID:
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

def check_migrations_table(tenant_id: uuid.UUID:
    """Check if the django_migrations table exists in the schema."""
    tables = get_schema_tables(schema_name)
    return 'django_migrations' in tables

def get_migration_records(tenant_id: uuid.UUID:
    """Get all migration records from the django_migrations table in the schema."""

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
    if not check_migrations_table(schema_name):
        return []
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Set search path to the tenant schema
    # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id)')
    
    # Get all migration records
    cursor.execute("""
        SELECT app, name, applied
        FROM django_migrations
        ORDER BY app, name
    """)
    
    migrations = [{'app': row[0], 'name': row[1], 'applied': row[2]} for row in cursor.fetchall()]
    
    cursor.close()
    conn.close()
    
    return migrations

def check_expected_tables(tenant_id: uuid.UUID:
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

def check_migration_order(tenant_id: uuid.UUID:
    """
    Check if custom_auth migrations are applied before users migrations.
    
    Returns:
        dict: Info about migration order with keys 'correct_order', 'custom_auth_time', 'users_time'
    """
    if not check_migrations_table(schema_name):
        return {'correct_order': False, 'error': 'No django_migrations table'}
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Set search path to the tenant schema
    # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id)')
    
    # Get timestamps for custom_auth and users initial migrations
    cursor.execute("""
        SELECT 
            (SELECT applied FROM django_migrations 
             WHERE app = 'custom_auth' AND name = '0001_initial') as custom_auth_time,
            (SELECT applied FROM django_migrations 
             WHERE app = 'users' AND name = '0001_initial') as users_time
    """)
    
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    
    # Check if both migrations exist
    if result[0] is None or result[1] is None:
        return {
            'correct_order': False, 
            'error': 'Missing migration record',
            'custom_auth_exists': result[0] is not None,
            'users_exists': result[1] is not None
        }
    
    # Check order (custom_auth should be applied before users)
    return {
        'correct_order': result[0] < result[1],
        'custom_auth_time': result[0],
        'users_time': result[1]
    }

def fix_migration_order(tenant_id: uuid.UUID:
    """
    Fix the order of custom_auth and users migrations by updating timestamps.
    
    Returns:
        bool: True if fix was applied, False otherwise
    """
    if not check_migrations_table(schema_name):
        return False
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Set search path to the tenant schema
    # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id)')
    
    try:
        # Update timestamps to ensure correct order
        cursor.execute("""
            UPDATE django_migrations 
            SET applied = NOW() - INTERVAL '5 minutes'
            WHERE app = 'custom_auth' AND name = '0001_initial';
            
            UPDATE django_migrations 
            SET applied = NOW() - INTERVAL '3 minutes'
            WHERE app = 'users' AND name = '0001_initial';
        """)
        
        success = True
    except Exception as e:
        logger.error(f"Error fixing migration order in {schema_name}: {str(e)}")
        success = False
    
    cursor.close()
    conn.close()
    
    return success

def check_tenant_schema(tenant_id=None, fix_issues=False):
    """Check tenant schema migrations and diagnose issues."""
    process_id = uuid.uuid4()
    start_time = time.time()
    
    # Initialize counters for summary
    total_tenants = 0
    schemas_exist = 0
    schemas_with_tables = 0
    schemas_without_tables = 0
    schemas_with_migrations_table = 0
    schemas_without_migrations_table = 0
    schemas_with_missing_app_tables = 0
    schemas_with_correct_order = 0
    schemas_with_incorrect_order = 0
    schemas_fixed = 0
    
    if tenant_id:
        logger.info(f"[CHECK-{process_id}] Checking tenant schema for tenant {tenant_id}")
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            total_tenants = 1
            
            schema_name =  tenant.id
            logger.info(f"[CHECK-{process_id}] Found tenant: {tenant.name} (Schema: {schema_name})")
            
            # Check if schema exists
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name = %s
            """, [schema_name])
            schema_exists = cursor.fetchone() is not None
            cursor.close()
            conn.close()
            
            if not schema_exists:
                logger.warning(f"[CHECK-{process_id}] Schema {schema_name} does not exist for tenant {tenant_id}")
                return
            
            schemas_exist += 1
            
            # Check if schema has tables
            tables = get_schema_tables(schema_name)
            if len(tables) > 0:
                schemas_with_tables += 1
                logger.info(f"[CHECK-{process_id}] Schema {schema_name} has {len(tables)} tables")
            else:
                schemas_without_tables += 1
                logger.warning(f"[CHECK-{process_id}] Schema {schema_name} has no tables")
            
            # Check if django_migrations table exists
            migrations_table_exists = check_migrations_table(schema_name)
            if migrations_table_exists:
                schemas_with_migrations_table += 1
                logger.info(f"[CHECK-{process_id}] django_migrations table exists in schema {schema_name}")
                
                # Get migration records
                migrations = get_migration_records(schema_name)
                logger.info(f"[CHECK-{process_id}] Found {len(migrations)} migration records in schema {schema_name}")
                
                # Group migrations by app
                app_migrations = {}
                for migration in migrations:
                    app = migration['app']
                    if app not in app_migrations:
                        app_migrations[app] = []
                    app_migrations[app].append(migration['name'])
                
                # Log migrations by app
                for app, migrations in app_migrations.items():
                    logger.info(f"[CHECK-{process_id}] App {app} has {len(migrations)} migrations")
                
                # Check migration order
                order_info = check_migration_order(schema_name)
                if 'error' in order_info:
                    logger.warning(f"[CHECK-{process_id}] Cannot check migration order: {order_info['error']}")
                elif order_info.get('correct_order'):
                    schemas_with_correct_order += 1
                    logger.info(f"[CHECK-{process_id}] Migration order is correct in schema {schema_name}")
                else:
                    schemas_with_incorrect_order += 1
                    logger.error(f"[CHECK-{process_id}] MIGRATION ORDER ISSUE: custom_auth migration applied at {order_info['custom_auth_time']}, users migration applied at {order_info['users_time']}")
                    
                    if fix_issues:
                        if fix_migration_order(schema_name):
                            schemas_fixed += 1
                            logger.info(f"[CHECK-{process_id}] Fixed migration order in schema {schema_name}")
                        else:
                            logger.error(f"[CHECK-{process_id}] Failed to fix migration order in schema {schema_name}")
            else:
                schemas_without_migrations_table += 1
                logger.warning(f"[CHECK-{process_id}] django_migrations table does not exist in schema {schema_name}")
            
            # Check if all expected tables for tenant apps exist
            missing_app_tables = check_expected_tables(schema_name)
            if missing_app_tables:
                schemas_with_missing_app_tables += 1
                logger.warning(f"[CHECK-{process_id}] Missing tables for apps: {', '.join(missing_app_tables)}")
            else:
                logger.info(f"[CHECK-{process_id}] All expected app tables exist in schema {schema_name}")
            
        except Tenant.DoesNotExist:
            logger.error(f"[CHECK-{process_id}] Tenant {tenant_id} does not exist")
            return
    else:
        logger.info(f"[CHECK-{process_id}] Checking all tenant schemas")
        
        # Get all tenants
        tenants = Tenant.objects.filter(is_active=True)
        total_tenants = len(tenants)
        logger.info(f"[CHECK-{process_id}] Found {total_tenants} tenants")
        
        # Check each tenant's schema
        for tenant in tenants:
            schema_name =  tenant.id
            logger.info(f"[CHECK-{process_id}] Checking tenant {tenant.id} ({tenant.name}) with schema {schema_name}")
            
            # Check if schema exists
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name = %s
            """, [schema_name])
            schema_exists = cursor.fetchone() is not None
            cursor.close()
            conn.close()
            
            if not schema_exists:
                logger.warning(f"[CHECK-{process_id}] Schema {schema_name} does not exist for tenant {tenant.id}")
                continue
            
            schemas_exist += 1
            
            # Check if schema has tables
            tables = get_schema_tables(schema_name)
            if len(tables) > 0:
                schemas_with_tables += 1
                logger.info(f"[CHECK-{process_id}] Schema {schema_name} has {len(tables)} tables")
            else:
                schemas_without_tables += 1
                logger.warning(f"[CHECK-{process_id}] Schema {schema_name} has no tables")
            
            # Check if django_migrations table exists
            migrations_table_exists = check_migrations_table(schema_name)
            if migrations_table_exists:
                schemas_with_migrations_table += 1
                logger.info(f"[CHECK-{process_id}] django_migrations table exists in schema {schema_name}")
                
                # Get migration records
                migrations = get_migration_records(schema_name)
                logger.info(f"[CHECK-{process_id}] Found {len(migrations)} migration records in schema {schema_name}")
                
                # Group migrations by app
                app_migrations = {}
                for migration in migrations:
                    app = migration['app']
                    if app not in app_migrations:
                        app_migrations[app] = []
                    app_migrations[app].append(migration['name'])
                
                # Log migrations by app
                for app, migrations in app_migrations.items():
                    logger.info(f"[CHECK-{process_id}] App {app} has {len(migrations)} migrations")
                
                # Check migration order
                order_info = check_migration_order(schema_name)
                if 'error' in order_info:
                    logger.warning(f"[CHECK-{process_id}] Cannot check migration order: {order_info['error']}")
                elif order_info.get('correct_order'):
                    schemas_with_correct_order += 1
                    logger.info(f"[CHECK-{process_id}] Migration order is correct in schema {schema_name}")
                else:
                    schemas_with_incorrect_order += 1
                    logger.error(f"[CHECK-{process_id}] MIGRATION ORDER ISSUE: custom_auth migration applied at {order_info['custom_auth_time']}, users migration applied at {order_info['users_time']}")
                    
                    if fix_issues:
                        if fix_migration_order(schema_name):
                            schemas_fixed += 1
                            logger.info(f"[CHECK-{process_id}] Fixed migration order in schema {schema_name}")
                        else:
                            logger.error(f"[CHECK-{process_id}] Failed to fix migration order in schema {schema_name}")
            else:
                schemas_without_migrations_table += 1
                logger.warning(f"[CHECK-{process_id}] django_migrations table does not exist in schema {schema_name}")
            
            # Check if all expected tables for tenant apps exist
            missing_app_tables = check_expected_tables(schema_name)
            if missing_app_tables:
                schemas_with_missing_app_tables += 1
                logger.warning(f"[CHECK-{process_id}] Missing tables for apps: {', '.join(missing_app_tables)}")
            else:
                logger.info(f"[CHECK-{process_id}] All expected app tables exist in schema {schema_name}")
    
    # Log summary
    logger.info(f"[CHECK-{process_id}] === Summary ===")
    logger.info(f"[CHECK-{process_id}] Total tenants: {total_tenants}")
    logger.info(f"[CHECK-{process_id}] Schemas exist: {schemas_exist}")
    logger.info(f"[CHECK-{process_id}] Schemas with tables: {schemas_with_tables}")
    logger.info(f"[CHECK-{process_id}] Schemas without tables: {schemas_without_tables}")
    logger.info(f"[CHECK-{process_id}] Schemas with django_migrations table: {schemas_with_migrations_table}")
    logger.info(f"[CHECK-{process_id}] Schemas without django_migrations table: {schemas_without_migrations_table}")
    logger.info(f"[CHECK-{process_id}] Schemas with missing app tables: {schemas_with_missing_app_tables}")
    logger.info(f"[CHECK-{process_id}] Schemas with correct migration order: {schemas_with_correct_order}")
    logger.info(f"[CHECK-{process_id}] Schemas with incorrect migration order: {schemas_with_incorrect_order}")
    if fix_issues:
        logger.info(f"[CHECK-{process_id}] Schemas fixed: {schemas_fixed}")
    
    total_elapsed_time = time.time() - start_time
    logger.info(f"[CHECK-{process_id}] Successfully tested tenant migrations in {total_elapsed_time:.2f} seconds")

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Check tenant schema migrations')
    parser.add_argument('--tenant_id', help='Check migrations for a specific tenant ID')
    parser.add_argument('--fix', action='store_true', help='Fix migration order issues')
    args = parser.parse_args()
    
    check_tenant_schema(tenant_id=args.tenant_id, fix_issues=args.fix)