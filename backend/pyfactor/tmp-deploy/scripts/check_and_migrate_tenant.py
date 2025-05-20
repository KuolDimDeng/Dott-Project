#!/usr/bin/env python
"""
Script to check and migrate a specific tenant schema.

This script will:
1. Check if the tenant exists
2. Check if the tenant schema exists
3. Check if the schema has tables
4. Run migrations if needed

Usage:
python scripts/check_and_migrate_tenant.py <tenant_id>

Example:
python scripts/check_and_migrate_tenant.py a5d09fbf-796e-48f5-b7c7-06b48a9ea119
"""

import os
import sys
import logging
import argparse
import psycopg2
from psycopg2 import sql

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.core.management import call_command
from django.db import connections, connection
from django.conf import settings
from custom_auth.models import Tenant

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
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

def list_tables_in_schema(tenant_id: uuid.UUID:
    """List all tables in the schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY table_name
            """, [schema_name])
            tables = [row[0] for row in cursor.fetchall()]
            
            logger.info(f"Found {len(tables)} tables in schema {schema_name}")
            for table in tables:
                logger.info(f"  - {table}")
                
            return tables
    except Exception as e:
        logger.error(f"Error listing tables: {str(e)}")
        return []
    finally:
        if conn:
            conn.close()

def create_schema(tenant_id: uuid.UUID:
    """Create the schema if it doesn't exist"""
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
            
            logger.info(f"Created schema {schema_name}")
            return True
    except Exception as e:
        logger.error(f"Error creating schema: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def run_migrations_for_schema(tenant_id: uuid.UUID:
    """Run migrations for the schema"""
    try:
        # Set search path to tenant schema
        with connection.cursor() as cursor:
            # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id),public')
        
        # Run migrations for all tenant apps
        tenant_apps = settings.TENANT_APPS
        logger.info(f"Running migrations for {len(tenant_apps)} tenant apps in schema {schema_name}")
        
        # First run the general migrate command
        try:
            call_command('migrate', verbosity=1)
            logger.info(f"General migrations completed successfully for schema {schema_name}")
        except Exception as migrate_error:
            logger.error(f"Error running general migrations for schema {schema_name}: {str(migrate_error)}")
        
        # Then run migrations for each TENANT_APP specifically
        for app in tenant_apps:
            try:
                logger.info(f"Running migrations for app {app} in schema {schema_name}")
                call_command('migrate', app, verbosity=1)
                logger.info(f"Successfully migrated app {app} in schema {schema_name}")
            except Exception as app_error:
                logger.error(f"Error running migrations for app {app} in schema {schema_name}: {str(app_error)}")
                # Continue with other apps even if one fails
        
        return True
    except Exception as e:
        logger.error(f"Error running migrations for schema {schema_name}: {str(e)}")
        return False
    finally:
        # Reset search path to public
        with connection.cursor() as cursor:
            cursor.execute('-- RLS: No need to set search_path with tenant-aware context
    -- Original: SET search_path TO public')

def check_and_migrate_tenant(tenant_id):
    """Check and migrate a specific tenant schema"""
    try:
        # Get tenant
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            logger.info(f"Found tenant: {tenant.name} (Schema: { tenant.id})")
        except Tenant.DoesNotExist:
            logger.error(f"Tenant with ID {tenant_id} does not exist")
            return False
        
        schema_name =  tenant.id
        
        # Check if schema exists
        if not schema_exists(schema_name):
            logger.warning(f"Schema {schema_name} does not exist. Creating it.")
            if not create_schema(schema_name):
                logger.error(f"Failed to create schema {schema_name}")
                return False
        
        # List tables in schema
        tables = list_tables_in_schema(schema_name)
        
        # Run migrations if schema has no tables
        if not tables:
            logger.warning(f"Schema {schema_name} has no tables. Running migrations.")
            if not run_migrations_for_schema(schema_name):
                logger.error(f"Failed to run migrations for schema {schema_name}")
                return False
            
            # Update tenant status
            tenant.database_status = 'active'
            tenant.save(update_fields=['database_status'])
            logger.info(f"Updated tenant status to 'active'")
            
            # List tables after migrations
            tables_after = list_tables_in_schema(schema_name)
            if not tables_after:
                logger.error(f"Schema {schema_name} still has no tables after migrations")
                return False
        else:
            logger.info(f"Schema {schema_name} already has {len(tables)} tables. No migration needed.")
        
        return True
    except Exception as e:
        logger.error(f"Error checking and migrating tenant {tenant_id}: {str(e)}")
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Check and migrate a specific tenant schema')
    parser.add_argument('tenant_id', help='ID of the tenant to check and migrate')
    args = parser.parse_args()
    
    tenant_id = args.tenant_id
    
    # Check and migrate tenant
    if check_and_migrate_tenant(tenant_id):
        logger.info(f"Successfully checked and migrated tenant {tenant_id}")
    else:
        logger.error(f"Failed to check and migrate tenant {tenant_id}")
        sys.exit(1)

if __name__ == "__main__":
    main()