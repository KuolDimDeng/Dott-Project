#!/usr/bin/env python
"""
Script to verify and fix all tenant schemas to ensure they match the public schema.
This script will:
1. List all tenant schemas
2. Check column types against the public schema
3. Fix any mismatches found

Usage:
python scripts/verify_tenant_schemas.py [--fix] [--force]

Options:
--fix: Fix any mismatches found (default is to only report issues)
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

from django.db import connections, connection
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
            logger.info(f"Tenant: {tenant.name} (ID: {tenant.id}, Schema: { tenant.id})")
        
        return tenants
    except Exception as e:
        logger.error(f"Error listing tenants: {str(e)}")
        return []

def get_public_schema_columns(table_name):
    """Get column definitions from the public schema for a specific table"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type, character_maximum_length, 
                       numeric_precision, numeric_scale, is_nullable
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = %s
                ORDER BY ordinal_position
            """, [table_name])
            columns = cursor.fetchall()
            return columns
    except Exception as e:
        logger.error(f"Error getting public schema columns: {str(e)}")
        return []
    finally:
        if conn:
            conn.close()

def get_tenant_schema_columns(tenant_id: uuid.UUID:
    """Get column definitions from a tenant schema for a specific table"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT column_name, data_type, character_maximum_length, 
                       numeric_precision, numeric_scale, is_nullable
                FROM information_schema.columns 
                WHERE table_schema = %s 
                AND table_name = %s
                ORDER BY ordinal_position
            """, [schema_name, table_name])
            columns = cursor.fetchall()
            return columns
    except Exception as e:
        logger.error(f"Error getting tenant schema columns: {str(e)}")
        return []
    finally:
        if conn:
            conn.close()

def fix_column_type(tenant_id: uuid.UUID:
    """Fix the data type of a column in a schema"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # Set search path to the tenant schema
            # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id))
            
            # Alter the column type
            logger.info(f"Fixing column type in {schema_name}.{table_name}.{column_name} to {target_type}")
            cursor.execute(f"""
                ALTER TABLE {table_name} 
                ALTER COLUMN {column_name} TYPE {target_type} USING 
                CASE 
                    WHEN {column_name} IS NULL THEN NULL
                    ELSE {column_name}::text::{target_type} 
                END
            """)
            
            logger.info(f"Successfully fixed column type in {schema_name}.{table_name}.{column_name}")
            return True
    except Exception as e:
        logger.error(f"Error fixing column type: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def verify_tenant_schemas(fix=False, force=False):
    """Verify and optionally fix all tenant schemas"""
    tenants = list_all_tenants()
    if not tenants:
        logger.info("No tenants found in the database")
        return True
    
    if fix and not force:
        confirmation = input(f"This will modify {len(tenants)} tenant schemas. Type 'YES' to confirm: ")
        if confirmation != "YES":
            logger.info("Operation cancelled")
            return False
    
    # Tables to check (add more as needed)
    tables_to_check = ['users_userprofile']
    
    # Get column definitions from public schema

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
    public_columns = {}
    for table in tables_to_check:
        public_columns[table] = get_public_schema_columns(table)
        logger.info(f"Found {len(public_columns[table])} columns in public.{table}")
    
    issues_found = 0
    issues_fixed = 0
    
    for tenant in tenants:
        logger.info(f"Verifying tenant: {tenant.name} (Schema: { tenant.id})")
        
        for table in tables_to_check:
            tenant_columns = get_tenant_schema_columns( tenant.id, table)
            
            if not tenant_columns:
                logger.warning(f"Table {table} not found in tenant schema { tenant.id}")
                continue
            
            logger.info(f"Found {len(tenant_columns)} columns in { tenant.id}.{table}")
            
            # Create dictionaries for easier comparison
            public_col_dict = {col[0]: col for col in public_columns[table]}
            tenant_col_dict = {col[0]: col for col in tenant_columns}
            
            # Check for missing columns
            for col_name in public_col_dict:
                if col_name not in tenant_col_dict:
                    issues_found += 1
                    logger.warning(f"Column {col_name} exists in public.{table} but not in { tenant.id}.{table}")
            
            # Check for type mismatches
            for col_name, tenant_col in tenant_col_dict.items():
                if col_name in public_col_dict:
                    public_col = public_col_dict[col_name]
                    
                    # Compare data types
                    if tenant_col[1] != public_col[1]:  # data_type is at index 1
                        issues_found += 1
                        logger.warning(f"Column type mismatch in { tenant.id}.{table}.{col_name}: {tenant_col[1]} vs public.{table}.{col_name}: {public_col[1]}")
                        
                        if fix:
                            if fix_column_type( tenant.id, table, col_name, public_col[1]):
                                issues_fixed += 1
                            else:
                                logger.error(f"Failed to fix column type for { tenant.id}.{table}.{col_name}")
    
    if issues_found == 0:
        logger.info("No schema issues found in any tenant")
        return True
    else:
        logger.info(f"Found {issues_found} schema issues")
        if fix:
            logger.info(f"Fixed {issues_fixed} out of {issues_found} issues")
            return issues_fixed == issues_found
        else:
            logger.info("Run with --fix to fix these issues")
            return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Verify and fix tenant schemas')
    parser.add_argument('--fix', action='store_true', help='Fix any mismatches found')
    parser.add_argument('--force', action='store_true', help='Skip confirmation prompts')
    args = parser.parse_args()
    
    if verify_tenant_schemas(fix=args.fix, force=args.force):
        logger.info("Tenant schema verification completed successfully")
    else:
        logger.warning("Tenant schema verification completed with issues")
        if not args.fix:
            logger.info("Run with --fix to fix these issues")
        sys.exit(1)

if __name__ == "__main__":
    main()