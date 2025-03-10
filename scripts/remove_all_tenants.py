#!/usr/bin/env python
"""
Script to remove all tenants from the dott_main database.
This script will:
1. List all tenants in the database
2. Delete all tenant records
3. Drop all tenant schemas

Usage:
python manage.py shell < scripts/remove_all_tenants.py

WARNING: This will permanently delete all tenant data!
"""

import os
import sys
import django
import logging
import psycopg2
from django.db import connection, transaction
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
    from custom_auth.models import Tenant
    
    tenants = Tenant.objects.all()
    logger.info(f"Found {tenants.count()} tenants in the database")
    
    for tenant in tenants:
        logger.info(f"Tenant: {tenant.name} (ID: {tenant.id}, Schema: {tenant.schema_name})")
    
    return tenants

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

def delete_tenant_record(tenant):
    """Delete a tenant record from the database"""
    try:
        tenant_id = tenant.id
        tenant_name = tenant.name
        schema_name = tenant.schema_name
        
        # Delete the tenant record
        tenant.delete()
        logger.info(f"Deleted tenant record: {tenant_name} (ID: {tenant_id})")
        return True
    except Exception as e:
        logger.error(f"Error deleting tenant record {tenant.id}: {str(e)}")
        return False

def remove_all_tenants():
    """Remove all tenants from the database"""
    tenants = list_all_tenants()
    
    if not tenants:
        logger.info("No tenants found in the database")
        return
    
    confirmation = input(f"WARNING: This will permanently delete all {tenants.count()} tenants and their data. Type 'DELETE ALL TENANTS' to confirm: ")
    
    if confirmation != "DELETE ALL TENANTS":
        logger.info("Operation cancelled")
        return
    
    logger.info("Starting tenant removal process...")
    
    success_count = 0
    error_count = 0
    
    for tenant in tenants:
        try:
            # First drop the schema
            schema_dropped = drop_tenant_schema(tenant.schema_name)
            
            # Then delete the tenant record
            record_deleted = delete_tenant_record(tenant)
            
            if schema_dropped and record_deleted:
                success_count += 1
            else:
                error_count += 1
                
        except Exception as e:
            logger.error(f"Error processing tenant {tenant.id}: {str(e)}")
            error_count += 1
    
    logger.info(f"Tenant removal completed. Success: {success_count}, Errors: {error_count}")

if __name__ == "__main__":
    # This script is meant to be run with Django's shell
    if 'shell' not in sys.argv:
        logger.error("This script should be run using 'python manage.py shell < scripts/remove_all_tenants.py'")
        sys.exit(1)
        
    remove_all_tenants()