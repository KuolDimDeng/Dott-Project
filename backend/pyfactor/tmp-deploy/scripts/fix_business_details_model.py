#!/usr/bin/env python
"""
Script to fix the issue with the BusinessDetails model.
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

def ensure_business_details_table_exists():
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

if __name__ == "__main__":
    success = ensure_business_details_table_exists()
    if success:
        logger.info("Script completed successfully!")
        sys.exit(0)
    else:
        logger.error("Script failed!")
        sys.exit(1)