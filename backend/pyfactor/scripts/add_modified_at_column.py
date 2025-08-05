#!/usr/bin/env python
"""
Script to add the modified_at column to the users_userprofile table if it doesn't exist.
"""

import os
import sys
import django
import logging
from django.db import connection, transaction as db_transaction

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

def add_modified_at_column():
    """
    Add the modified_at column to the users_userprofile table if it doesn't exist.
    """
    logger.info("Checking if modified_at column exists in users_userprofile table...")
    
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
            
            if column_exists:
                logger.info("modified_at column already exists in users_userprofile table.")
                return True
                
            # Add the column if it doesn't exist
            logger.info("Adding modified_at column to users_userprofile table...")
            with db_transaction.atomic():
                cursor.execute("""
                    ALTER TABLE users_userprofile 
                    ADD COLUMN modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                """)
                
                logger.info("modified_at column added successfully!")
                return True
                
    except Exception as e:
        logger.error(f"Error adding modified_at column: {str(e)}")
        return False

if __name__ == "__main__":
    success = add_modified_at_column()
    if success:
        logger.info("Script completed successfully!")
        sys.exit(0)
    else:
        logger.error("Script failed!")
        sys.exit(1)