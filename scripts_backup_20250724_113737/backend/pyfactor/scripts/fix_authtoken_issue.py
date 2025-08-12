#!/usr/bin/env python3
"""
Fix authtoken table issue by creating the missing table manually
This is a temporary fix for the production database
"""
import os
import sys
import django
from pathlib import Path

# Add the parent directory to the path
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_authtoken_table():
    """Create the authtoken_token table if it doesn't exist"""
    
    with connection.cursor() as cursor:
        # Check if the table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'authtoken_token'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            logger.info("Creating authtoken_token table...")
            
            # Create the table with minimal structure
            # This matches Django REST Framework's Token model
            cursor.execute("""
                CREATE TABLE authtoken_token (
                    key VARCHAR(40) PRIMARY KEY,
                    created TIMESTAMP WITH TIME ZONE NOT NULL,
                    user_id INTEGER NOT NULL REFERENCES custom_auth_user(id) ON DELETE CASCADE
                );
                
                CREATE INDEX authtoken_token_user_id_idx ON authtoken_token(user_id);
            """)
            
            logger.info("Successfully created authtoken_token table")
        else:
            logger.info("authtoken_token table already exists")
            
            # Check if it has the correct structure
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'authtoken_token'
                ORDER BY ordinal_position;
            """)
            
            columns = cursor.fetchall()
            logger.info(f"Existing columns: {columns}")

def remove_orphaned_tokens():
    """Remove any tokens for users that don't exist"""
    
    with connection.cursor() as cursor:
        # Check if table exists first
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'authtoken_token'
            );
        """)
        
        if cursor.fetchone()[0]:
            # Remove orphaned tokens
            cursor.execute("""
                DELETE FROM authtoken_token 
                WHERE user_id NOT IN (SELECT id FROM custom_auth_user);
            """)
            
            deleted_count = cursor.rowcount
            if deleted_count > 0:
                logger.info(f"Removed {deleted_count} orphaned tokens")
            else:
                logger.info("No orphaned tokens found")

if __name__ == "__main__":
    logger.info("Starting authtoken fix...")
    
    try:
        fix_authtoken_table()
        remove_orphaned_tokens()
        logger.info("Authtoken fix completed successfully")
    except Exception as e:
        logger.error(f"Error fixing authtoken table: {e}")
        sys.exit(1)