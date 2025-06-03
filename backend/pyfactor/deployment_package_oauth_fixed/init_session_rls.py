#!/usr/bin/env python
"""
Initialize RLS tenant context at session level for each database connection.
This simpler approach focuses only on session-level parameter to avoid permission issues.
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
logger = logging.getLogger("session-rls-init")

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
                    try:
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value
                    except ValueError:
                        # Skip lines that don't have key=value format
                        pass

    # Get database connection parameters from .env variables
    db_name = os.environ.get('DB_NAME', 'dott_main')
    db_user = os.environ.get('DB_USER', 'dott_admin')
    db_password = os.environ.get('DB_PASSWORD', '')
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5432')

    logger.info(f"Connecting to database {db_name} at {db_host}:{db_port} as {db_user}")

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

def create_session_parameter():
    """Create session-level RLS parameter for tenant context"""
    conn = get_db_connection()
    if not conn:
        logger.error("Failed to establish database connection")
        return False

    try:
        with conn.cursor() as cursor:
            # Create the function to set and get tenant context
            cursor.execute("""
            -- Create function to set tenant context if it doesn't exist
            CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
            RETURNS VOID AS $$
            BEGIN
              -- Use SET for session level parameter
              EXECUTE 'SET app.current_tenant = ' || quote_literal(tenant_id);
            END;
            $$ LANGUAGE plpgsql;
            
            -- Create function to get tenant context with fallback
            CREATE OR REPLACE FUNCTION get_tenant_context()
            RETURNS TEXT AS $$
            DECLARE
              tenant_value TEXT;
            BEGIN
              -- Try to get parameter value with fallback to empty string
              BEGIN
                EXECUTE 'SELECT current_setting(''app.current_tenant'', true)' INTO tenant_value;
                RETURN COALESCE(tenant_value, '');
              EXCEPTION WHEN OTHERS THEN
                -- Auto-initialize parameter if it doesn't exist
                PERFORM set_tenant_context('');
                RETURN '';
              END;
            END;
            $$ LANGUAGE plpgsql;
            """)
            
            # Set the parameter at session level
            cursor.execute(f"SELECT set_tenant_context('{EMPTY_TENANT_VALUE}')")
            
            # Test if it works
            cursor.execute("SELECT get_tenant_context()")
            result = cursor.fetchone()
            tenant_value = result[0] if result else 'NULL'
            
            logger.info(f"Tenant context parameter value: '{tenant_value}'")
            return True
    
    except Exception as e:
        logger.error(f"Error creating session parameter: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    logger.info("Creating session-level RLS parameter")
    if create_session_parameter():
        logger.info("Session RLS parameter successfully created")
        sys.exit(0)
    else:
        logger.error("Failed to create session RLS parameter")
        sys.exit(1) 