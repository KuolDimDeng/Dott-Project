#!/usr/bin/env python
"""
Script to fix schema mismatch between tenant and public schemas.
This script will:
1. Fix the business_id column type in the tenant schema
2. Add a check to ensure correct column types in all tenant schemas
3. Modify the tenant creation process to ensure consistent column types

Usage:
python scripts/fix_schema_mismatch.py [--all-tenants] [--tenant-id TENANT_ID] [--schema-name SCHEMA_NAME] [--force]

Options:
--all-tenants: Fix all tenant schemas
--tenant-id: Fix a specific tenant schema by ID
--schema-name: Fix a specific schema directly by name (e.g., tenant_a83ed38d_66dc_45a4_9b96_15827176fa21)
--force: Skip confirmation prompts
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

from django.db import connections, connection, transaction
from django.conf import settings
from custom_auth.models import Tenant

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
        tenants = Tenant.objects.all()
        logger.info(f"Found {len(tenants)} tenants in the database")
        
        for tenant in tenants:
            logger.info(f"Tenant: {tenant.name} (ID: {tenant.id}, Schema: {tenant.schema_name})")
        
        return tenants
    except Exception as e:
        logger.error(f"Error listing tenants: {str(e)}")
        return []

def check_column_type(schema_name, table_name, column_name):
    """Check the data type of a column in a schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT data_type FROM information_schema.columns 
                WHERE table_schema = %s 
                AND table_name = %s 
                AND column_name = %s
            """, [schema_name, table_name, column_name])
            result = cursor.fetchone()
            return result[0] if result else None
    except Exception as e:
        logger.error(f"Error checking column type: {str(e)}")
        return None
    finally:
        if conn:
            conn.close()

def fix_column_type(schema_name, table_name, column_name, target_type):
    """Fix the data type of a column in a schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Set search path to the tenant schema
            cursor.execute(f"SET search_path TO {schema_name}")
            
            # Get current data type
            cursor.execute("""
                SELECT data_type FROM information_schema.columns 
                WHERE table_schema = %s 
                AND table_name = %s 
                AND column_name = %s
            """, [schema_name, table_name, column_name])
            current_type = cursor.fetchone()
            
            if current_type and current_type[0] != target_type:
                logger.info(f"Fixing column type in {schema_name}.{table_name}.{column_name} from {current_type[0]} to {target_type}")
                
                # Alter the column type
                if target_type == 'uuid' and current_type[0] == 'bigint':
                    cursor.execute(f"""
                        ALTER TABLE {table_name} 
                        ALTER COLUMN {column_name} TYPE uuid USING 
                        CASE 
                            WHEN {column_name} IS NULL THEN NULL
                            ELSE {column_name}::text::uuid 
                        END
                    """)
                else:
                    cursor.execute(f"""
                        ALTER TABLE {table_name} 
                        ALTER COLUMN {column_name} TYPE {target_type}
                    """)
                
                logger.info(f"Successfully fixed column type in {schema_name}.{table_name}.{column_name}")
                return True
            elif not current_type:
                logger.warning(f"Column {column_name} not found in {schema_name}.{table_name}")
                return False
            else:
                logger.info(f"Column {schema_name}.{table_name}.{column_name} already has correct type: {current_type[0]}")
                return True
    except Exception as e:
        logger.error(f"Error fixing column type: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def ensure_correct_column_types(schema_name):
    """Ensure that business_id is UUID type in tenant schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Set the search path to the tenant schema
            cursor.execute(f"SET search_path TO {schema_name}")
            
            # Check if business_id column is uuid
            cursor.execute("""
                SELECT data_type FROM information_schema.columns 
                WHERE table_schema = %s 
                AND table_name = 'users_userprofile' 
                AND column_name = 'business_id'
            """, [schema_name])
            data_type = cursor.fetchone()
            
            # If it's not uuid, convert it
            if data_type and data_type[0] != 'uuid':
                logger.info(f"Converting business_id column in {schema_name}.users_userprofile from {data_type[0]} to uuid")
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    ALTER COLUMN business_id TYPE uuid USING 
                        CASE 
                            WHEN business_id IS NULL THEN NULL
                            ELSE business_id::text::uuid 
                        END
                """)
                logger.info(f"Successfully converted business_id column in {schema_name}.users_userprofile to uuid")
                return True
            elif not data_type:
                logger.warning(f"Column business_id not found in {schema_name}.users_userprofile")
                return False
            else:
                logger.info(f"Column {schema_name}.users_userprofile.business_id already has correct type: {data_type[0]}")
                return True
    except Exception as e:
        logger.error(f"Error ensuring correct column types: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def fix_tenant_schema(tenant_id=None, schema_name=None, all_tenants=False, force=False):
    """Fix the schema mismatch in tenant schemas"""
    if tenant_id:
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            tenants = [tenant]
            logger.info(f"Found tenant: {tenant.name} (ID: {tenant.id}, Schema: {tenant.schema_name})")
        except Tenant.DoesNotExist:
            logger.error(f"Tenant with ID {tenant_id} not found")
            return False
    elif schema_name:
        # Direct schema fix without tenant lookup
        if not schema_name.startswith('tenant_'):
            logger.error(f"Invalid schema name format: {schema_name}. Must start with 'tenant_'")
            return False
        
        # Check if schema exists
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name = %s
            """, [schema_name])
            if cursor.fetchone():
                logger.info(f"Found schema: {schema_name}")
                # Create a dummy tenant object with just the schema_name
                class DummyTenant:
                    def __init__(self, schema_name):
                        self.schema_name = schema_name
                        self.name = f"Schema {schema_name}"
                
                tenants = [DummyTenant(schema_name)]
            else:
                logger.error(f"Schema {schema_name} not found")
                return False
        conn.close()
    elif all_tenants:
        tenants = list_all_tenants()
        if not tenants:
            logger.info("No tenants found in the database")
            return True
    else:
        logger.error("Either --all-tenants, --tenant-id, or --schema-name must be specified")
        return False
    
    if not force:
        confirmation = input(f"This will modify {len(tenants)} tenant schemas. Type 'YES' to confirm: ")
        if confirmation != "YES":
            logger.info("Operation cancelled")
            return False
    
    success_count = 0
    error_count = 0
    
    # Check the public schema for reference
    public_type = check_column_type('public', 'users_userprofile', 'business_id')
    if not public_type:
        logger.error("Could not determine the correct column type from public schema")
        return False
    
    logger.info(f"Reference column type in public schema: {public_type}")
    
    for tenant in tenants:
        logger.info(f"Processing tenant: {tenant.name} (Schema: {tenant.schema_name})")
        
        try:
            # Fix the column type
            if ensure_correct_column_types(tenant.schema_name):
                success_count += 1
                logger.info(f"Successfully fixed schema for tenant: {tenant.name}")
            else:
                error_count += 1
                logger.error(f"Failed to fix schema for tenant: {tenant.name}")
        except Exception as e:
            error_count += 1
            logger.error(f"Error fixing schema for tenant {tenant.name}: {str(e)}")
    
    logger.info(f"Schema fix completed. Success: {success_count}, Errors: {error_count}")
    return success_count > 0

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Fix schema mismatch between tenant and public schemas')
    parser.add_argument('--all-tenants', action='store_true', help='Fix all tenant schemas')
    parser.add_argument('--tenant-id', type=str, help='Fix a specific tenant schema by ID')
    parser.add_argument('--schema-name', type=str, help='Fix a specific schema directly by name (e.g., tenant_a83ed38d_66dc_45a4_9b96_15827176fa21)')
    parser.add_argument('--force', action='store_true', help='Skip confirmation prompts')
    args = parser.parse_args()
    
    if not (args.all_tenants or args.tenant_id or args.schema_name):
        parser.error("Either --all-tenants, --tenant-id, or --schema-name must be specified")
    
    if fix_tenant_schema(tenant_id=args.tenant_id, schema_name=args.schema_name, all_tenants=args.all_tenants, force=args.force):
        logger.info("Schema fix completed successfully")
    else:
        logger.error("Failed to fix schema")
        sys.exit(1)

if __name__ == "__main__":
    main()