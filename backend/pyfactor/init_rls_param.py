#!/usr/bin/env python
"""
Script to initialize the app.current_tenant parameter in PostgreSQL.
This fixes the "unrecognized configuration parameter" error.
"""

import os
import sys
import logging
import psycopg2
from psycopg2 import sql
from django.conf import settings

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('init-rls-param')

# Required constants
TENANT_CONTEXT_PARAM = 'app.current_tenant'
EMPTY_TENANT_VALUE = ''

def connect_to_db():
    """Connect to the database using Django settings"""
    try:
        # Get database settings from Django
        db_settings = settings.DATABASES['default']
        
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host=db_settings.get('HOST', 'localhost'),
            database=db_settings.get('NAME', ''),
            user=db_settings.get('USER', ''),
            password=db_settings.get('PASSWORD', ''),
            port=db_settings.get('PORT', 5432)
        )
        
        # Set autocommit to avoid transaction issues with ALTER DATABASE
        conn.autocommit = True
        
        logger.info(f"Successfully connected to database {db_settings.get('NAME')}")
        return conn
    
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        sys.exit(1)

def initialize_tenant_context_param(conn):
    """Initialize the app.current_tenant parameter if it doesn't exist"""
    try:
        with conn.cursor() as cursor:
            # First, get the current database name
            cursor.execute("SELECT current_database();")
            db_name = cursor.fetchone()[0]
            logger.info(f"Working with database: {db_name}")
            
            # Try to check if parameter exists by reading it
            try:
                cursor.execute(f"SHOW {TENANT_CONTEXT_PARAM}")
                value = cursor.fetchone()[0]
                logger.info(f"Parameter {TENANT_CONTEXT_PARAM} already exists with value: {value}")
                return True
            except Exception:
                logger.info(f"Parameter {TENANT_CONTEXT_PARAM} does not exist, creating it...")
            
            # Initialize the parameter at database level (requires superuser)
            try:
                cursor.execute(
                    sql.SQL("ALTER DATABASE {} SET {} = %s").format(
                        sql.Identifier(db_name),
                        sql.Identifier(TENANT_CONTEXT_PARAM)
                    ),
                    [EMPTY_TENANT_VALUE]
                )
                logger.info(f"Successfully set {TENANT_CONTEXT_PARAM} at database level")
                return True
            except Exception as e:
                logger.warning(f"Could not set parameter at database level: {str(e)}")
                logger.info("Will try to set parameter at session level instead")
            
            # Initialize at session level (fallback)
            cursor.execute(f"SET {TENANT_CONTEXT_PARAM} = %s", (EMPTY_TENANT_VALUE,))
            logger.info(f"Successfully set {TENANT_CONTEXT_PARAM} at session level")
            
            # Verify it worked
            cursor.execute(f"SHOW {TENANT_CONTEXT_PARAM}")
            value = cursor.fetchone()[0]
            logger.info(f"Parameter value now: {value}")
            
            return True
            
    except Exception as e:
        logger.error(f"Failed to initialize tenant context parameter: {str(e)}")
        return False

def main():
    """Main function to run the script"""
    logger.info("Starting RLS parameter initialization...")
    
    # Set up Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
    import django
    django.setup()
    
    # Connect to database and initialize parameter
    conn = connect_to_db()
    try:
        if initialize_tenant_context_param(conn):
            logger.info("RLS parameter initialization complete")
        else:
            logger.error("Failed to initialize RLS parameter")
            sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main() 