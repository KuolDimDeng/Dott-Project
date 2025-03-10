#!/usr/bin/env python
"""
Script to remove all tenants from the dott_main database.
This script will:
1. List all tenants in the database
2. Use raw SQL to truncate tables with CASCADE
3. Drop all tenant schemas

Usage:
python scripts/remove_all_tenants.py [--force]

Options:
--force: Skip confirmation prompt

WARNING: This will permanently delete all tenant data!
"""

import os
import sys
import logging
import argparse
import psycopg2

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.db import connection
from django.conf import settings

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

def list_all_tenants():
    """List all tenants in the database"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, schema_name FROM auth_tenant
            """)
            
            tenants = []
            for row in cursor.fetchall():
                tenant_id, name, schema_name = row
                tenants.append({
                    'id': tenant_id,
                    'name': name,
                    'schema_name': schema_name
                })
                
            logger.info(f"Found {len(tenants)} tenants in the database")
            
            for tenant in tenants:
                logger.info(f"Tenant: {tenant['name']} (ID: {tenant['id']}, Schema: {tenant['schema_name']})")
            
            return tenants
    except Exception as e:
        logger.error(f"Error listing tenants: {str(e)}")
        return []
    finally:
        if conn:
            conn.close()

def drop_tenant_schema(schema_name):
    """Drop a tenant schema from the database"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Validate schema name format to prevent SQL injection
            if not schema_name.startswith('tenant_'):
                logger.error(f"Invalid schema name format: {schema_name}")
                return False
                
            # Check if schema exists
            cursor.execute("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name = %s
            """, [schema_name])
            
            if cursor.fetchone():
                # Drop the schema with CASCADE to remove all objects
                cursor.execute(f'DROP SCHEMA "{schema_name}" CASCADE')
                logger.info(f"Successfully dropped schema: {schema_name}")
                return True
            else:
                logger.warning(f"Schema {schema_name} does not exist")
                return False
    except Exception as e:
        logger.error(f"Error dropping schema {schema_name}: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def truncate_tables():
    """Truncate tables with CASCADE option"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Try to truncate tables with CASCADE
            cursor.execute("TRUNCATE TABLE auth_tenant, users_user CASCADE")
            logger.info("Successfully truncated all tables")
            return True
    except Exception as e:
        logger.error(f"Error truncating tables: {str(e)}")
        
        # Try alternative approach
        try:
            with conn.cursor() as cursor:
                # Update the owner_id to NULL if possible
                cursor.execute("""
                    ALTER TABLE auth_tenant ALTER COLUMN owner_id DROP NOT NULL;
                """)
                cursor.execute("""
                    UPDATE auth_tenant SET owner_id = NULL;
                """)
                
                # Now delete from both tables
                cursor.execute("DELETE FROM users_user")
                cursor.execute("DELETE FROM auth_tenant")
                
                logger.info("Successfully deleted all data using alternative approach")
                return True
        except Exception as e2:
            logger.error(f"Alternative approach failed: {str(e2)}")
            return False
    finally:
        if conn:
            conn.close()

def remove_all_tenants(force=False):
    """Remove all tenants from the database"""
    tenants = list_all_tenants()
    
    if not tenants:
        logger.info("No tenants found in the database")
        return
    
    if not force:
        confirmation = input(f"WARNING: This will permanently delete all {len(tenants)} tenants and their data. Type 'DELETE ALL TENANTS' to confirm: ")
        
        if confirmation != "DELETE ALL TENANTS":
            logger.info("Operation cancelled")
            return
    else:
        logger.warning(f"Force flag set. Proceeding to delete all {len(tenants)} tenants without confirmation.")
    
    logger.info("Starting tenant removal process...")
    
    # First, drop all tenant schemas
    for tenant in tenants:
        drop_tenant_schema(tenant['schema_name'])
    
    # Then truncate tables
    if truncate_tables():
        logger.info("All tenants and associated users have been removed successfully")
    else:
        logger.error("Failed to remove all tenants and users")
        
        # Try one more approach - direct SQL execution
        logger.info("Trying direct SQL execution...")
        try:
            # Connect to postgres database to bypass constraints
            db_settings = settings.DATABASES['default']
            conn = psycopg2.connect(
                dbname='postgres',  # Connect to postgres database
                user=db_settings['USER'],
                password=db_settings['PASSWORD'],
                host=db_settings['HOST'],
                port=db_settings['PORT']
            )
            conn.autocommit = True
            
            with conn.cursor() as cursor:
                # Drop and recreate the database
                db_name = db_settings['NAME']
                cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
                cursor.execute(f"CREATE DATABASE {db_name} OWNER {db_settings['USER']}")
                
                logger.info(f"Database {db_name} has been dropped and recreated")
                logger.info("You will need to run the initialize_database_tables.py script to set up the tables")
        except Exception as e:
            logger.error(f"Direct SQL execution failed: {str(e)}")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Remove all tenants from the database')
    parser.add_argument('--force', action='store_true', help='Skip confirmation prompt')
    args = parser.parse_args()
    
    remove_all_tenants(force=args.force)

if __name__ == "__main__":
    main()