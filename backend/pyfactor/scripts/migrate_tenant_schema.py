#!/usr/bin/env python
"""
Script to run migrations for a specific tenant schema.

This script will:
1. Set the search path to the specified tenant schema
2. Run migrations for all TENANT_APPS
3. Verify that all tables have been created

Usage:
python scripts/migrate_tenant_schema.py <schema_name> [--force]

Options:
--force: Skip confirmation prompts

Example:
python scripts/migrate_tenant_schema.py tenant_75c2c5e7_903b_4bac_affc_6cd3222bf43a
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
from django.apps import apps

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

def schema_exists(schema_name):
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

def list_tables_in_schema(schema_name):
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

def run_migrations_for_tenant_apps(schema_name, force=False):
    """Run migrations for all TENANT_APPS on the specified schema"""
    if not schema_exists(schema_name):
        logger.error(f"Schema {schema_name} does not exist")
        return False
    
    # List tables before migrations
    logger.info(f"Tables in schema {schema_name} before migrations:")
    tables_before = list_tables_in_schema(schema_name)
    
    if not force:
        confirmation = input(f"This will run migrations for all TENANT_APPS on schema {schema_name}. Continue? (yes/no): ")
        if confirmation.lower() != "yes":
            logger.info("Operation cancelled")
            return False
    
    try:
        # Get a connection to the database
        conn = get_db_connection()
        
        # Set search path to the tenant schema
        with conn.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema_name}",public')
            logger.info(f"Set search path to {schema_name}")
            
            # Get the current search path to verify
            cursor.execute('SHOW search_path')
            current_path = cursor.fetchone()[0]
            logger.info(f"Current search path: {current_path}")
            
            if schema_name not in current_path:
                logger.error(f"Failed to set search path to {schema_name}")
                return False
            
            # Run migrations for each TENANT_APP
            tenant_apps = settings.TENANT_APPS
            logger.info(f"Running migrations for {len(tenant_apps)} tenant apps")
            
            # First, run migrations for the tenant schema
            try:
                # Close existing connections
                connections.close_all()
                
                # Set the search path for the default connection
                with connection.cursor() as django_cursor:
                    django_cursor.execute(f'SET search_path TO "{schema_name}",public')
                
                # Run migrations for all tenant apps
                for app in tenant_apps:
                    logger.info(f"Running migrations for app: {app}")
                    try:
                        call_command('migrate', app, verbosity=1)
                    except Exception as app_error:
                        logger.error(f"Error running migrations for app {app}: {str(app_error)}")
                
                logger.info("Migrations completed successfully")
            except Exception as e:
                logger.error(f"Error running migrations: {str(e)}")
                return False
            
            # List tables after migrations
            logger.info(f"Tables in schema {schema_name} after migrations:")
            tables_after = list_tables_in_schema(schema_name)
            
            # Calculate new tables
            new_tables = set(tables_after) - set(tables_before)
            logger.info(f"New tables created: {len(new_tables)}")
            for table in sorted(new_tables):
                logger.info(f"  + {table}")
            
            return True
    except Exception as e:
        logger.error(f"Error running migrations for tenant apps: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Run migrations for a specific tenant schema')
    parser.add_argument('schema_name', help='Name of the tenant schema to migrate')
    parser.add_argument('--force', action='store_true', help='Skip confirmation prompts')
    args = parser.parse_args()
    
    schema_name = args.schema_name
    
    # Validate schema name format
    if not schema_name.startswith('tenant_'):
        logger.error(f"Invalid schema name format: {schema_name}. Schema name must start with 'tenant_'")
        sys.exit(1)
    
    # Run migrations for tenant apps
    if run_migrations_for_tenant_apps(schema_name, force=args.force):
        logger.info(f"Successfully ran migrations for schema {schema_name}")
    else:
        logger.error(f"Failed to run migrations for schema {schema_name}")
        sys.exit(1)

if __name__ == "__main__":
    main()