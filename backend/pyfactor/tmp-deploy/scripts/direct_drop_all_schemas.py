#!/usr/bin/env python
"""
Script to directly drop all tenant schemas from the database.
This script will:
1. Connect to the database
2. Execute a SQL script to drop all tenant schemas

Usage:
python scripts/direct_drop_all_schemas.py

WARNING: This will permanently delete all tenant schemas!
"""

import os
import sys
import logging
import psycopg2

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.conf import settings

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

def drop_all_tenant_schemas():
    """Drop all tenant schemas directly using SQL"""
    try:
        # Get SQL script path
        script_path = os.path.join(os.path.dirname(__file__), 'drop_all_tenant_schemas.sql')
        
        # Read SQL script
        with open(script_path, 'r') as f:
            sql_script = f.read()
        
        # Connect to database
        conn = get_db_connection()
        
        # Execute SQL script
        with conn.cursor() as cursor:
            logger.info("Executing SQL script to drop all tenant schemas...")
            cursor.execute(sql_script)
            logger.info("SQL script executed successfully")
        
        # List remaining schemas to verify
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name LIKE 'tenant_%'
            """)
            remaining_schemas = [row[0] for row in cursor.fetchall()]
            
            if remaining_schemas:
                logger.warning(f"There are still {len(remaining_schemas)} tenant schemas remaining")
                logger.warning(f"Remaining schemas: {remaining_schemas}")
            else:
                logger.info("All tenant schemas have been successfully dropped")
        
        return True
    except Exception as e:
        logger.error(f"Error dropping tenant schemas: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def main():
    """Main function"""
    confirmation = input("WARNING: This will permanently delete all tenant schemas. Type 'DROP ALL SCHEMAS' to confirm: ")
    
    if confirmation != "DROP ALL SCHEMAS":
        logger.info("Operation cancelled")
        return
    
    logger.info("Starting schema removal process...")
    
    if drop_all_tenant_schemas():
        logger.info("Schema removal process completed successfully")
    else:
        logger.error("Failed to remove all schemas")

if __name__ == "__main__":
    main()