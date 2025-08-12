#!/usr/bin/env python
"""
Script to fix the business_id column type in users_userprofile table.
This script changes the column type from bigint to uuid to match the Business model's id field.
"""

import os
import sys
import django
import logging
import uuid
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

def fix_business_id_column():
    """
    Fix the business_id column type in users_userprofile table.
    Changes the column type from bigint to uuid.
    """
    logger.info("Starting business_id column type fix...")
    
    try:
        with connection.cursor() as cursor:
            # Check if the column exists and its current type
            cursor.execute("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'users_userprofile' 
                AND column_name = 'business_id'
            """)
            result = cursor.fetchone()
            
            if not result:
                logger.error("business_id column not found in users_userprofile table")
                return False
                
            current_type = result[0]
            logger.info(f"Current business_id column type: {current_type}")
            
            if current_type.lower() == 'uuid':
                logger.info("Column is already UUID type. No changes needed.")
                return True
                
            # Begin transaction for the column type change
            with transaction.atomic():
                # 1. Create a temporary UUID column
                logger.info("Creating temporary UUID column...")
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    ADD COLUMN business_id_uuid UUID NULL
                """)
                
                # 2. Create the users_business_details table if it doesn't exist
                logger.info("Ensuring users_business_details table exists...")
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users_business_details (
                        business_id UUID PRIMARY KEY REFERENCES users_business(id),
                        business_type VARCHAR(50),
                        business_subtype_selections JSONB DEFAULT '{}'::jsonb,
                        legal_structure VARCHAR(50) DEFAULT 'SOLE_PROPRIETORSHIP',
                        date_founded DATE,
                        country VARCHAR(2) DEFAULT 'US',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                
                # 3. Drop the foreign key constraint if it exists
                logger.info("Dropping foreign key constraint if it exists...")
                cursor.execute("""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.table_constraints 
                            WHERE constraint_name = 'users_userprofile_business_id_fkey' 
                            AND table_name = 'users_userprofile'
                        ) THEN
                            ALTER TABLE users_userprofile DROP CONSTRAINT users_userprofile_business_id_fkey;
                        END IF;
                    END
                    $$;
                """)
                
                # 4. Drop the business_id column
                logger.info("Dropping original business_id column...")
                cursor.execute("""
                    ALTER TABLE users_userprofile DROP COLUMN business_id
                """)
                
                # 5. Rename the UUID column to business_id
                logger.info("Renaming UUID column to business_id...")
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    RENAME COLUMN business_id_uuid TO business_id
                """)
                
                # 6. Add foreign key constraint
                logger.info("Adding foreign key constraint...")
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    ADD CONSTRAINT users_userprofile_business_id_fkey 
                    FOREIGN KEY (business_id) REFERENCES users_business(id) ON DELETE CASCADE
                """)
                
                # 7. Add index on business_id
                logger.info("Adding index on business_id...")
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS users_userprofile_business_id_idx 
                    ON users_userprofile(business_id)
                """)
                
                # 8. Ensure the modified_at column exists
                logger.info("Ensuring modified_at column exists...")
                cursor.execute("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'users_userprofile' 
                            AND column_name = 'modified_at'
                        ) THEN
                            ALTER TABLE users_userprofile 
                            ADD COLUMN modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
                        END IF;
                    END
                    $$;
                """)
                
            logger.info("Column type change completed successfully!")
            return True
            
    except Exception as e:
        logger.error(f"Error fixing business_id column type: {str(e)}")
        return False

if __name__ == "__main__":
    success = fix_business_id_column()
    if success:
        logger.info("Script completed successfully!")
        sys.exit(0)
    else:
        logger.error("Script failed!")
        sys.exit(1)