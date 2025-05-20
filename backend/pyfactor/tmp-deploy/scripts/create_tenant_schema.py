#!/usr/bin/env python
"""
Script to create a tenant schema and apply migrations to it.

This script:
1. Creates a new tenant schema
2. Applies all tenant app migrations to the schema
3. Verifies that tables are created in the schema

Usage:
    python create_tenant_schema.py <schema_name>
"""

import os
import sys
import django
import logging
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

from django.conf import settings
from django.db import connection

def fix_logger_configuration():
    """Fix logger configuration to avoid 'duration' field errors."""
    logger.info("Fixing logger configuration...")
    import logging
    
    # Get all loggers
    for logger_name in logging.root.manager.loggerDict:
        logger_obj = logging.getLogger(logger_name)
        
        # Check and fix handlers
        for handler in logger_obj.handlers:
            if hasattr(handler, 'formatter') and handler.formatter:
                # Check if formatter uses 'duration' field
                if hasattr(handler.formatter, '_fmt') and '%(duration)' in str(handler.formatter._fmt):
                    # Create a new formatter without the duration field
                    new_fmt = str(handler.formatter._fmt).replace('%(duration)', '0.0')
                    handler.setFormatter(logging.Formatter(new_fmt))
                    logger.info(f"Fixed formatter for logger: {logger_name}")
    
    # Fix Django's db logger specifically
    db_logger = logging.getLogger('django.db.backends')
    if db_logger.handlers:
        for handler in db_logger.handlers:
            if hasattr(handler, 'formatter'):
                handler.setFormatter(logging.Formatter('%(levelname)s %(message)s'))
    
    logger.info("Logger configuration fixed.")

def create_schema(tenant_id: uuid.UUID:
    """Create a new schema in the database."""
    logger.info(f"Creating schema: {schema_name}")
    
    # Get database connection details
    db_settings = settings.DATABASES['default']
    
    # Connect to the database
    conn = psycopg2.connect(
        dbname=db_settings['NAME'],
        user=db_settings['USER'],
        password=db_settings['PASSWORD'],
        host=db_settings['HOST'],
        port=db_settings['PORT']
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    
    # Create the schema
    with conn.cursor() as cursor:
        # Check if schema exists
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = %s;", (schema_name,))
        if cursor.fetchone():
            logger.info(f"Schema {schema_name} already exists")
        else:
            cursor.execute(f'CREATE SCHEMA "{schema_name}";')
            logger.info(f"Schema {schema_name} created successfully")
    
    conn.close()
    
    return True

def apply_migrations(tenant_id: uuid.UUID:
    """Apply migrations to the schema."""
    logger.info(f"Applying migrations to schema: {schema_name}")
    
    # Set the search path to the tenant schema
    with connection.cursor() as cursor:
        # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id),public;')
        logger.info(f"Set search path to {schema_name}")
        
        # Get the current search path
        cursor.execute("SHOW search_path;")
        search_path = cursor.fetchone()[0]
        logger.info(f"Current search path: {search_path}")
    
    # Get the tenant apps from settings
    tenant_apps = getattr(settings, 'TENANT_APPS', [])
    logger.info(f"Running migrations for {len(tenant_apps)} tenant apps")
    
    # Apply migrations for each tenant app
    for app in tenant_apps:
        try:
            logger.info(f"Running migrations for app: {app}")
            django.core.management.call_command('migrate', app)
        except Exception as e:
            logger.error(f"Error applying migrations for app {app}: {e}")
    
    logger.info("Migrations completed successfully")
    
    return True

def verify_tables(tenant_id: uuid.UUID:
    """Verify that tables are created in the schema."""
    logger.info(f"Verifying tables in schema: {schema_name}")
    
    # Get database connection details
    db_settings = settings.DATABASES['default']
    
    # Connect to the database
    conn = psycopg2.connect(
        dbname=db_settings['NAME'],
        user=db_settings['USER'],
        password=db_settings['PASSWORD'],
        host=db_settings['HOST'],
        port=db_settings['PORT']
    )
    
    # Get the tables in the schema
    with conn.cursor() as cursor:
        cursor.execute(f"""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = %s
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """, (schema_name,))
        tables = cursor.fetchall()
    
    conn.close()
    
    # Print the tables
    logger.info(f"Found {len(tables)} tables in schema {schema_name}")
    for table in tables:
        logger.info(f"- {table[0]}")
    
    return len(tables) > 0

def main():
    """Main function."""
    # Fix logger configuration
    fix_logger_configuration()
    
    # Get the schema name from command line arguments

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
    if len(sys.argv) < 2:
        logger.error("Please provide a schema name")
        logger.info("Usage: python create_tenant_schema.py <schema_name>")
        return
    
    schema_name = sys.argv[1]
    
    # Create the schema
    if not create_schema(schema_name):
        logger.error("Failed to create schema")
        return
    
    # Apply migrations
    if not apply_migrations(schema_name):
        logger.error("Failed to apply migrations")
        return
    
    # Verify tables
    if not verify_tables(schema_name):
        logger.error("Failed to verify tables")
        return
    
    logger.info(f"Successfully created schema {schema_name} and applied migrations")

if __name__ == '__main__':
    main()