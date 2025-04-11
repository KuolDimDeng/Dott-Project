#!/usr/bin/env python
"""
Script to fix tenant schema migrations by directly running migrations for tenant schemas with no tables.

This script:
1. Identifies tenant schemas with no tables
2. Forces migrations to run for those schemas
3. Ensures the django_migrations table is created in the tenant schema
4. Verifies that all expected tables are created

Usage:
    python fix_tenant_migrations.py [--tenant_id TENANT_ID] [--force]

Options:
    --tenant_id TENANT_ID  Fix migrations for a specific tenant ID
    --force                Force migrations even if tables exist
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

from django.db import connection, connections
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

def reset_migrations_for_schema(tenant_id: uuid.UUID:
    """Reset migrations for a schema by removing entries from django_migrations table."""
    logger.info(f"Resetting migrations for schema {schema_name}")
    
    # First check if django_migrations table exists in the schema
    if not check_migrations_table(schema_name):
        logger.info(f"django_migrations table does not exist in schema {schema_name}")
        return
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Set search path to the tenant schema
    # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id)')
    
    # Delete all entries from django_migrations table
    cursor.execute("""
        DELETE FROM django_migrations
        WHERE app IN (
            SELECT app FROM django_migrations
            WHERE app IN (
                SELECT UNNEST(%s)
            )
        )
    """, [list(settings.TENANT_APPS)])
    
    deleted_count = cursor.rowcount
    logger.info(f"Deleted {deleted_count} migration records from {schema_name}.django_migrations")

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
    
    cursor.close()
    conn.close()

def create_migrations_table(tenant_id: uuid.UUID:
    """Create django_migrations table in the schema if it doesn't exist."""
    logger.info(f"Creating django_migrations table in schema {schema_name} if it doesn't exist")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Set search path to the tenant schema
    # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id)')
    
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

def run_migrations_for_schema(tenant_id: uuid.UUID:
    """Run migrations for a schema."""
    logger.info(f"Running migrations for schema {schema_name}")
    
    # Check if schema has tables before migrations
    tables_before = get_schema_tables(schema_name)
    logger.info(f"Tables in schema {schema_name} before migrations:")
    logger.info(f"Found {len(tables_before)} tables in schema {schema_name}")
    
    if len(tables_before) > 0 and not force:
        logger.info(f"Schema {schema_name} already has tables. Skipping migrations.")
        return
    
    # Set search path to tenant schema
    with connection.cursor() as cursor:
        logger.info(f"Set search path to {schema_name}")
        # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id), public')
        
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
    logger.info(f"Tables in schema {schema_name} after migrations:")
    logger.info(f"Found {len(tables_after)} tables in schema {schema_name}")
    
    new_tables = len(tables_after) - len(tables_before)
    logger.info(f"New tables created: {new_tables}")
    
    # Reset search path to public
    with connection.cursor() as cursor:
        cursor.execute('-- RLS: No need to set search_path with tenant-aware context
    -- Original: SET search_path TO public')
    
    logger.info(f"Successfully ran migrations for schema {schema_name}")
    return new_tables

def fix_tenant_schema(tenant_id=None, force=False):
    """Fix tenant schema migrations."""
    process_id = uuid.uuid4()
    start_time = time.time()
    
    if tenant_id:
        logger.info(f"[FIX-{process_id}] Fixing tenant schema for tenant {tenant_id}")
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            schema_name =  tenant.id
            logger.info(f"[FIX-{process_id}] Found tenant: {tenant.name} (Schema: {schema_name})")
            
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
                logger.error(f"[FIX-{process_id}] Schema {schema_name} does not exist for tenant {tenant_id}")
                return
            
            # Reset migrations for schema
            reset_migrations_for_schema(schema_name)
            
            # Create migrations table if it doesn't exist
            create_migrations_table(schema_name)
            
            # Run migrations for schema
            run_migrations_for_schema(schema_name, force=force)
            
        except Tenant.DoesNotExist:
            logger.error(f"[FIX-{process_id}] Tenant {tenant_id} does not exist")
            return
    else:
        logger.info(f"[FIX-{process_id}] Fixing all tenant schemas")
        
        # Get all tenant schemas
        schemas = get_tenant_schemas()
        logger.info(f"[FIX-{process_id}] Found {len(schemas)} tenant schemas")
        
        # Fix each schema
        for schema_name in schemas:
            logger.info(f"[FIX-{process_id}] Processing schema {schema_name}")
            
            # Reset migrations for schema
            reset_migrations_for_schema(schema_name)
            
            # Create migrations table if it doesn't exist
            create_migrations_table(schema_name)
            
            # Run migrations for schema
            run_migrations_for_schema(schema_name, force=force)
    
    total_elapsed_time = time.time() - start_time
    logger.info(f"[FIX-{process_id}] Successfully fixed tenant schema migrations in {total_elapsed_time:.2f} seconds")

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Fix tenant schema migrations')
    parser.add_argument('--tenant_id', help='Fix migrations for a specific tenant ID')
    parser.add_argument('--force', action='store_true', help='Force migrations even if tables exist')
    args = parser.parse_args()
    
    fix_tenant_schema(tenant_id=args.tenant_id, force=args.force)

if __name__ == '__main__':
    main()