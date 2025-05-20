#!/usr/bin/env python
"""
Initializes RLS tenant context parameter at server startup
Run this before starting the Django server
"""

import os
import sys
import logging
import psycopg2
from psycopg2 import OperationalError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("rls-init")

# Constants
TENANT_CONTEXT_PARAM = 'app.current_tenant'
EMPTY_TENANT_VALUE = ''  # Empty string instead of NULL

def get_db_connection():
    """Get database connection from environment variables or default settings"""
    # Load environment variables from .env file
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_file):
        logger.info(f"Loading environment from {env_file}")
        with open(env_file, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

    # Get database connection parameters
    db_name = os.environ.get('DATABASE_NAME', 'dott_main')
    db_user = os.environ.get('DATABASE_USER', 'dott_admin')
    db_password = os.environ.get('DATABASE_PASSWORD', '')
    db_host = os.environ.get('DATABASE_HOST', 'localhost')
    db_port = os.environ.get('DATABASE_PORT', '5432')

    try:
        # Connect to the database
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        conn.autocommit = True  # Needed for SET commands to take effect
        logger.info(f"Successfully connected to database {db_name}")
        return conn
    except OperationalError as e:
        logger.error(f"Database connection error: {e}")
        return None

def init_rls_context():
    """Initialize the RLS tenant context parameter"""
    conn = get_db_connection()
    if not conn:
        logger.error("Failed to establish database connection")
        return False

    try:
        with conn.cursor() as cursor:
            # Try to read the parameter first to check if it exists
            try:
                cursor.execute(f"SHOW {TENANT_CONTEXT_PARAM}")
                result = cursor.fetchone()
                value = result[0] if result else None
                logger.info(f"RLS parameter {TENANT_CONTEXT_PARAM} already exists with value: '{value}'")
            except Exception as e:
                logger.warning(f"Parameter check failed: {e}")
                
                # Try to set at session level
                try:
                    logger.info(f"Setting {TENANT_CONTEXT_PARAM} at session level")
                    cursor.execute(f"SET {TENANT_CONTEXT_PARAM} = %s", (EMPTY_TENANT_VALUE,))
                    
                    # Verify it worked
                    cursor.execute(f"SHOW {TENANT_CONTEXT_PARAM}")
                    result = cursor.fetchone() 
                    value = result[0] if result else None
                    logger.info(f"Parameter value set to: '{value}'")
                except Exception as e2:
                    logger.error(f"Failed to set parameter at session level: {e2}")
                    return False

        return True
    finally:
        conn.close()

if __name__ == "__main__":
    logger.info("Initializing RLS tenant context parameter")
    success = init_rls_context()
    if success:
        logger.info("RLS context parameter initialized successfully")
        sys.exit(0)
    else:
        logger.error("Failed to initialize RLS context parameter")
        sys.exit(1) 