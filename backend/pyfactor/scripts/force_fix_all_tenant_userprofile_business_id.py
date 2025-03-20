#!/usr/bin/env python
"""
Script to force fix the business_id column type in users_userprofile table in all tenant schemas.
This script changes the column type from bigint to uuid to match the Business model's id field,
regardless of what the current type is reported to be.
"""

import os
import sys
import django
import logging
from django.db import connection, transaction

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_all_tenant_schemas():
    """Get all tenant schemas from the database."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name LIKE 'tenant_%'
            """)
            schemas = [row[0] for row in cursor.fetchall()]
            logger.info(f"Found {len(schemas)} tenant schemas")
            return schemas
    except Exception as e:
        logger.error(f"Error getting tenant schemas: {str(e)}")
        return []

def force_fix_userprofile_business_id_in_schema(schema_name):
    """
    Force fix the business_id column type in users_userprofile table for a specific tenant schema.
    Changes the column type from bigint to uuid, regardless of what the current type is reported to be.
    """
    logger.info(f"Starting force fix of business_id column type in {schema_name}.users_userprofile table...")
    
    try:
        with connection.cursor() as cursor:
            # Set the search path to the schema
            cursor.execute(f"SET search_path TO {schema_name}")
            
            # Check if the users_userprofile table exists in this schema
            cursor.execute("""
                SELECT EXISTS(
                    SELECT 1 
                    FROM information_schema.tables 
                    WHERE table_name = 'users_userprofile'
                    AND table_schema = %s
                )
            """, [schema_name])
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info(f"users_userprofile table does not exist in schema {schema_name}")
                return True
            
            # Check if the column exists
            cursor.execute("""
                SELECT EXISTS(
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'users_userprofile' 
                    AND column_name = 'business_id'
                    AND table_schema = %s
                )
            """, [schema_name])
            column_exists = cursor.fetchone()[0]
            
            if not column_exists:
                logger.error(f"business_id column not found in {schema_name}.users_userprofile table")
                return False
                
            # Begin transaction for the column type change
            with transaction.atomic():
                # 1. Create a temporary UUID column
                logger.info(f"Creating temporary UUID column in {schema_name}...")
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    ADD COLUMN business_id_uuid UUID NULL
                """)
                
                # 2. Drop the foreign key constraint if it exists
                logger.info(f"Dropping foreign key constraint if it exists in {schema_name}...")
                cursor.execute("""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.table_constraints 
                            WHERE constraint_name = 'users_userprofile_business_id_fkey' 
                            AND table_name = 'users_userprofile'
                            AND table_schema = %s
                        ) THEN
                            ALTER TABLE users_userprofile DROP CONSTRAINT users_userprofile_business_id_fkey;
                        END IF;
                    END
                    $$;
                """, [schema_name])
                
                # 3. Drop the business_id column
                logger.info(f"Dropping original business_id column in {schema_name}...")
                cursor.execute("""
                    ALTER TABLE users_userprofile DROP COLUMN business_id
                """)
                
                # 4. Rename the UUID column to business_id
                logger.info(f"Renaming UUID column to business_id in {schema_name}...")
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    RENAME COLUMN business_id_uuid TO business_id
                """)
                
                # 5. Check if users_business table exists
                cursor.execute("""
                    SELECT EXISTS(
                        SELECT 1 
                        FROM information_schema.tables 
                        WHERE table_name = 'users_business'
                        AND table_schema = %s
                    )
                """, [schema_name])
                business_table_exists = cursor.fetchone()[0]
                
                # 6. Add foreign key constraint only if users_business table exists
                if business_table_exists:
                    logger.info(f"Adding foreign key constraint in {schema_name}...")
                    cursor.execute("""
                        ALTER TABLE users_userprofile 
                        ADD CONSTRAINT users_userprofile_business_id_fkey 
                        FOREIGN KEY (business_id) REFERENCES users_business(id) ON DELETE CASCADE
                    """)
                else:
                    logger.info(f"Skipping foreign key constraint in {schema_name} as users_business table does not exist")
                
                # 7. Add index on business_id
                logger.info(f"Adding index on business_id in {schema_name}...")
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS users_userprofile_business_id_idx 
                    ON users_userprofile(business_id)
                """)
                
            logger.info(f"Column type change in {schema_name} completed successfully!")
            return True
            
    except Exception as e:
        logger.error(f"Error fixing business_id column type in {schema_name}: {str(e)}")
        return False
    finally:
        # Reset search path to public
        with connection.cursor() as cursor:
            cursor.execute("SET search_path TO public")

def force_fix_all_tenant_schemas():
    """Force fix the business_id column type in all tenant schemas."""
    schemas = get_all_tenant_schemas()
    success = True
    
    for schema in schemas:
        schema_success = force_fix_userprofile_business_id_in_schema(schema)
        if not schema_success:
            success = False
    
    return success

if __name__ == "__main__":
    success = force_fix_all_tenant_schemas()
    if success:
        logger.info("Script completed successfully!")
        sys.exit(0)
    else:
        logger.error("Script failed!")
        sys.exit(1)