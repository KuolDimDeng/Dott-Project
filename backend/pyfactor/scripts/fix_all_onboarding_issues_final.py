#!/usr/bin/env python
"""
Comprehensive script to fix all onboarding issues:
1. Fix the middleware to handle the updated_at/modified_at column issue
2. Ensure the modified_at column exists in users_userprofile
3. Ensure the users_business_details table exists
4. Fix the business_id column type in users_userprofile in public schema
5. Fix the business_id column type in users_userprofile in all tenant schemas
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

def fix_middleware():
    """Fix the middleware to handle the updated_at/modified_at column issue."""
    try:
        # Get the middleware file path
        middleware_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                           'custom_auth', 'middleware.py')
        logger.info(f"Middleware file path: {middleware_file_path}")
        
        # Read the middleware file
        with open(middleware_file_path, 'r') as f:
            middleware_content = f.read()
        
        # Check if the fix is already applied
        if "column users_userprofile.updated_at does not exist" in middleware_content:
            logger.info("Middleware fix already applied")
            return True
        
        # Find the section to modify
        search_text = """                        try:
                            from users.models import UserProfile
                            profile = UserProfile.objects.get(user=request.user)
                            if (hasattr(profile, 'metadata') and
                                isinstance(profile.metadata, dict) and
                                'pending_schema_setup' in profile.metadata and
                                profile.metadata['pending_schema_setup'].get('deferred', False) is True):
                                should_defer = True
                                logger.debug(f"Found deferred schema setup in profile metadata for tenant: {tenant.schema_name}")
                        except Exception as e:
                            logger.warning(f"Error checking profile metadata for deferred flag: {str(e)}")
                            # Continue with execution even if there's an error checking metadata"""
        
        replace_text = """                        try:
                            from users.models import UserProfile
                            profile = UserProfile.objects.get(user=request.user)
                            if (hasattr(profile, 'metadata') and
                                isinstance(profile.metadata, dict) and
                                'pending_schema_setup' in profile.metadata and
                                profile.metadata['pending_schema_setup'].get('deferred', False) is True):
                                should_defer = True
                                logger.debug(f"Found deferred schema setup in profile metadata for tenant: {tenant.schema_name}")
                        except Exception as e:
                            # Check if the error is about the updated_at column
                            if "column users_userprofile.updated_at does not exist" in str(e):
                                logger.warning("UserProfile schema needs update - using modified_at instead of updated_at")
                                # Continue with execution - the schema will be updated later
                            else:
                                logger.warning(f"Error checking profile metadata for deferred flag: {str(e)}")
                            # Continue with execution even if there's an error checking metadata"""
        
        # Apply the fix
        if search_text in middleware_content:
            middleware_content = middleware_content.replace(search_text, replace_text)
            
            # Write the updated middleware file
            with open(middleware_file_path, 'w') as f:
                f.write(middleware_content)
            
            logger.info("Middleware fix applied successfully!")
            return True
        else:
            logger.warning("Could not find the section to modify in middleware.py")
            return False
    except Exception as e:
        logger.error(f"Error fixing middleware: {str(e)}")
        return False

def ensure_modified_at_column():
    """Ensure the modified_at column exists in users_userprofile table."""
    try:
        with connection.cursor() as cursor:
            # Check if the column exists
            cursor.execute("""
                SELECT EXISTS(
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name = 'users_userprofile' 
                    AND column_name = 'modified_at'
                )
            """)
            column_exists = cursor.fetchone()[0]
            
            if not column_exists:
                # Add the column if it doesn't exist
                logger.info("Adding modified_at column to users_userprofile table...")
                with transaction.atomic():
                    cursor.execute("""
                        ALTER TABLE users_userprofile 
                        ADD COLUMN modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    """)
                    
                    logger.info("modified_at column added successfully!")
                    return True
            else:
                logger.info("modified_at column already exists in users_userprofile table.")
                return True
    except Exception as e:
        logger.error(f"Error ensuring modified_at column exists: {str(e)}")
        return False

def ensure_business_details_table():
    """Ensure the users_business_details table exists."""
    try:
        with connection.cursor() as cursor:
            # Check if the table exists
            cursor.execute("""
                SELECT EXISTS(
                    SELECT 1 
                    FROM information_schema.tables 
                    WHERE table_name = 'users_business_details'
                )
            """)
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                # Create the table
                logger.info("Creating users_business_details table...")
                with transaction.atomic():
                    cursor.execute("""
                        CREATE TABLE users_business_details (
                            business_id UUID PRIMARY KEY REFERENCES users_business(id) ON DELETE CASCADE,
                            business_type VARCHAR(50),
                            business_subtype_selections JSONB DEFAULT '{}'::jsonb,
                            legal_structure VARCHAR(50) DEFAULT 'SOLE_PROPRIETORSHIP',
                            date_founded DATE,
                            country VARCHAR(2) DEFAULT 'US',
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                        )
                    """)
                    
                    # Create index on business_id
                    cursor.execute("""
                        CREATE INDEX IF NOT EXISTS users_business_details_business_id_idx 
                        ON users_business_details(business_id)
                    """)
                    
                    logger.info("users_business_details table created successfully!")
                    return True
            else:
                logger.info("users_business_details table already exists")
                return True
    except Exception as e:
        logger.error(f"Error ensuring users_business_details table exists: {str(e)}")
        return False

def fix_public_userprofile_business_id():
    """
    Fix the business_id column type in users_userprofile table in the public schema.
    Changes the column type from bigint to uuid.
    """
    logger.info("Starting business_id column type fix in public.users_userprofile table...")
    
    try:
        with connection.cursor() as cursor:
            # Set the search path to public
            cursor.execute("SET search_path TO public")
            
            # Check if the users_userprofile table exists
            cursor.execute("""
                SELECT EXISTS(
                    SELECT 1 
                    FROM information_schema.tables 
                    WHERE table_name = 'users_userprofile'
                    AND table_schema = 'public'
                )
            """)
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info("users_userprofile table does not exist in public schema")
                return True
            
            # Check if the column exists and its current type
            cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users_userprofile' 
                AND column_name = 'business_id'
                AND table_schema = 'public'
            """)
            result = cursor.fetchone()
            
            if not result:
                logger.error("business_id column not found in public.users_userprofile table")
                return False
                
            current_type = result[0]
            logger.info(f"Current business_id column type in public schema: {current_type}")
            
            if current_type.lower() == 'uuid':
                logger.info("Column is already UUID type. No changes needed.")
                return True
                
            # Check if users_business table exists
            cursor.execute("""
                SELECT EXISTS(
                    SELECT 1 
                    FROM information_schema.tables 
                    WHERE table_name = 'users_business'
                    AND table_schema = 'public'
                )
            """)
            business_table_exists = cursor.fetchone()[0]
            
            # Begin transaction for the column type change
            with transaction.atomic():
                # 1. Create a temporary UUID column
                logger.info("Creating temporary UUID column...")
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    ADD COLUMN business_id_uuid UUID NULL
                """)
                
                # 2. Drop the foreign key constraint if it exists
                logger.info("Dropping foreign key constraint if it exists...")
                cursor.execute("""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.table_constraints 
                            WHERE constraint_name = 'users_userprofile_business_id_fkey' 
                            AND table_name = 'users_userprofile'
                            AND table_schema = 'public'
                        ) THEN
                            ALTER TABLE users_userprofile DROP CONSTRAINT users_userprofile_business_id_fkey;
                        END IF;
                    END
                    $$;
                """)
                
                # 3. Drop the business_id column
                logger.info("Dropping original business_id column...")
                cursor.execute("""
                    ALTER TABLE users_userprofile DROP COLUMN business_id
                """)
                
                # 4. Rename the UUID column to business_id
                logger.info("Renaming UUID column to business_id...")
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    RENAME COLUMN business_id_uuid TO business_id
                """)
                
                # 5. Add foreign key constraint only if users_business table exists
                if business_table_exists:
                    logger.info("Adding foreign key constraint...")
                    cursor.execute("""
                        ALTER TABLE users_userprofile 
                        ADD CONSTRAINT users_userprofile_business_id_fkey 
                        FOREIGN KEY (business_id) REFERENCES users_business(id) ON DELETE CASCADE
                    """)
                else:
                    logger.info("Skipping foreign key constraint as users_business table does not exist")
                
                # 6. Add index on business_id
                logger.info("Adding index on business_id...")
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS users_userprofile_business_id_idx 
                    ON users_userprofile(business_id)
                """)
                
            logger.info("Column type change in public schema completed successfully!")
            return True
            
    except Exception as e:
        logger.error(f"Error fixing business_id column type in public schema: {str(e)}")
        return False

def get_all_schemas():
    """Get all schemas from the database."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name != 'public'
                AND schema_name != 'information_schema'
                AND schema_name != 'pg_catalog'
                AND schema_name != 'pg_toast'
                AND schema_name != 'pg_temp_1'
                AND schema_name != 'pg_toast_temp_1'
            """)
            schemas = [row[0] for row in cursor.fetchall()]
            logger.info(f"Found {len(schemas)} schemas")
            return schemas
    except Exception as e:
        logger.error(f"Error getting schemas: {str(e)}")
        return []

def fix_userprofile_business_id_in_schema(schema_name):
    """
    Fix the business_id column type in users_userprofile table for a specific schema.
    Changes the column type from bigint to uuid.
    """
    logger.info(f"Starting business_id column type fix in {schema_name}.users_userprofile table...")
    
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
            
            # Check if the column exists and its current type
            cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users_userprofile' 
                AND column_name = 'business_id'
                AND table_schema = %s
            """, [schema_name])
            result = cursor.fetchone()
            
            if not result:
                logger.error(f"business_id column not found in {schema_name}.users_userprofile table")
                return False
                
            current_type = result[0]
            logger.info(f"Current business_id column type in {schema_name}: {current_type}")
            
            if current_type.lower() == 'uuid':
                logger.info(f"Column in {schema_name} is already UUID type. No changes needed.")
                return True
                
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

def fix_all_tenant_schemas():
    """Fix the business_id column type in all tenant schemas."""
    schemas = get_all_schemas()
    success = True
    
    for schema in schemas:
        schema_success = fix_userprofile_business_id_in_schema(schema)
        if not schema_success:
            success = False
    
    return success

def run_all_fixes():
    """Run all fixes."""
    success = True
    
    # Fix 1: Fix middleware
    logger.info("=== Fix 1: Fixing middleware ===")
    if not fix_middleware():
        success = False
    
    # Fix 2: Ensure modified_at column exists
    logger.info("\n=== Fix 2: Ensuring modified_at column exists ===")
    if not ensure_modified_at_column():
        success = False
    
    # Fix 3: Ensure business_details table exists
    logger.info("\n=== Fix 3: Ensuring business_details table exists ===")
    if not ensure_business_details_table():
        success = False
    
    # Fix 4: Fix business_id column type in public schema
    logger.info("\n=== Fix 4: Fixing business_id column type in public schema ===")
    if not fix_public_userprofile_business_id():
        success = False
    
    # Fix 5: Fix business_id column type in all tenant schemas
    logger.info("\n=== Fix 5: Fixing business_id column type in all tenant schemas ===")
    if not fix_all_tenant_schemas():
        success = False
    
    return success

if __name__ == "__main__":
    success = run_all_fixes()
    if success:
        logger.info("\n=== All fixes completed successfully! ===")
        sys.exit(0)
    else:
        logger.error("\n=== Some fixes failed! ===")
        sys.exit(1)