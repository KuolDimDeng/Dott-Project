#!/usr/bin/env python
"""
Script to apply the UserProfile migration to all tenant schemas.

This script:
1. Identifies all tenant schemas
2. For each tenant schema, adds the updated_at column to the users_userprofile table
3. Sets the updated_at value to the same as modified_at for existing records

Usage:
    python manage.py shell < scripts/apply_userprofile_migration_to_tenants.py
"""

import logging
from django.db import connection
from django.utils import timezone
from custom_auth.models import Tenant

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('userprofile_migration.log')
    ]
)
logger = logging.getLogger(__name__)

def get_all_tenant_schemas():
    """Get all tenant schemas from the database."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT schema_name FROM information_schema.schemata
            WHERE schema_name LIKE 'tenant_%'
        """)
        return [row[0] for row in cursor.fetchall()]

def check_column_exists(cursor, schema_name, table_name, column_name):
    """Check if a column exists in a table."""
    cursor.execute(f"""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = %s
            AND table_name = %s
            AND column_name = %s
        )
    """, [schema_name, table_name, column_name])
    return cursor.fetchone()[0]

def add_updated_at_column(cursor, schema_name):
    """Add updated_at column to users_userprofile table in the specified schema."""
    # Check if the column already exists
    if check_column_exists(cursor, schema_name, 'users_userprofile', 'updated_at'):
        logger.info(f"Column 'updated_at' already exists in {schema_name}.users_userprofile")
        return False
    
    # Add the column
    cursor.execute(f"""
        SET search_path TO "{schema_name}";
        ALTER TABLE users_userprofile
        ADD COLUMN updated_at timestamp with time zone;
    """)
    
    # Set default values for existing records
    cursor.execute(f"""
        SET search_path TO "{schema_name}";
        UPDATE users_userprofile
        SET updated_at = modified_at
        WHERE updated_at IS NULL;
    """)
    
    # Add not-null constraint
    cursor.execute(f"""
        SET search_path TO "{schema_name}";
        ALTER TABLE users_userprofile
        ALTER COLUMN updated_at SET NOT NULL;
    """)
    
    return True

def apply_migration_to_all_tenants():
    """Apply the UserProfile migration to all tenant schemas."""
    logger.info("Starting UserProfile migration to all tenant schemas")
    
    # Get all tenant schemas
    tenant_schemas = get_all_tenant_schemas()
    logger.info(f"Found {len(tenant_schemas)} tenant schemas")
    
    # Process each tenant schema
    for schema_name in tenant_schemas:
        logger.info(f"Processing schema: {schema_name}")
        
        # Create a new connection with autocommit=True to avoid transaction issues
        with connection.cursor() as cursor:
            try:
                # Check if users_userprofile table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = %s AND table_name = 'users_userprofile'
                    )
                """, [schema_name])
                if not cursor.fetchone()[0]:
                    logger.warning(f"users_userprofile table doesn't exist in schema {schema_name}, skipping")
                    continue
                
                # Add updated_at column
                if add_updated_at_column(cursor, schema_name):
                    logger.info(f"Successfully added updated_at column to {schema_name}.users_userprofile")
                
            except Exception as e:
                logger.error(f"Error processing schema {schema_name}: {str(e)}")
                continue
    
    logger.info("UserProfile migration completed")

if __name__ == "__main__":
    apply_migration_to_all_tenants()