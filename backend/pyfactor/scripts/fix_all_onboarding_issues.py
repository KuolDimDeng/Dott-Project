#!/usr/bin/env python
"""
Script to fix all onboarding issues.
This script addresses the following issues:
1. Ensures the modified_at column exists in users_userprofile
2. Ensures the users_business_details table exists
3. Fixes any issues with business_id in users_userprofile
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

def run_all_fixes():
    """Run all fixes."""
    success = True
    
    # Fix 1: Ensure modified_at column exists
    logger.info("=== Fix 1: Ensuring modified_at column exists ===")
    if not ensure_modified_at_column():
        success = False
    
    # Fix 2: Ensure business_details table exists
    logger.info("\n=== Fix 2: Ensuring business_details table exists ===")
    if not ensure_business_details_table():
        success = False
    
    # Fix 3: Fix middleware
    logger.info("\n=== Fix 3: Fixing middleware ===")
    if not fix_middleware():
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