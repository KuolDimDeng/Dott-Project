#!/usr/bin/env python
"""
Script to initialize tables in an existing database.
This script will:
1. Check if the database exists
2. Run all migrations to create the necessary tables
3. Set up proper permissions

Usage:
python scripts/initialize_database_tables.py [database_name]

If database_name is not provided, it will use the name from settings.py
"""

import os
import sys
import django
import logging
import argparse
import psycopg2
from psycopg2 import sql
from django.core.management import call_command
from django.db import connections, connection
from django.conf import settings

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_db_connection(db_name):
    """Get a connection to the specified database"""
    db_settings = settings.DATABASES['default']
    conn = psycopg2.connect(
        dbname=db_name,
        user=db_settings['USER'],
        password=db_settings['PASSWORD'],
        host=db_settings['HOST'],
        port=db_settings['PORT']
    )
    conn.autocommit = True
    return conn

def database_exists(db_name):
    """Check if the database exists"""
    try:
        # Try to connect to the database
        conn = get_db_connection(db_name)
        conn.close()
        return True
    except psycopg2.OperationalError as e:
        if "does not exist" in str(e):
            return False
        else:
            logger.error(f"Error checking if database exists: {str(e)}")
            raise
    except Exception as e:
        logger.error(f"Error checking if database exists: {str(e)}")
        raise

def run_migrations(db_name):
    """Run all migrations on the database"""
    try:
        # Update the database name in Django settings
        settings.DATABASES['default']['NAME'] = db_name
        
        # Close existing connections
        connections.close_all()
        
        # Run migrations
        logger.info("Running migrations...")
        call_command('migrate', verbosity=1)
        logger.info("Migrations completed successfully")
        
        return True
    except Exception as e:
        logger.error(f"Error running migrations: {str(e)}")
        return False

def setup_permissions(db_name):
    """Set up proper permissions for the database"""
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cursor:
            db_user = settings.DATABASES['default']['USER']
            
            # Grant schema usage
            cursor.execute(f"GRANT USAGE ON SCHEMA public TO {db_user}")
            
            # Grant table permissions
            cursor.execute(f"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {db_user}")
            cursor.execute(f"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {db_user}")
            cursor.execute(f"GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO {db_user}")
            
            # Set default privileges for future tables
            cursor.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {db_user}")
            cursor.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {db_user}")
            cursor.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO {db_user}")
            
            logger.info(f"Set up permissions for user {db_user} on database {db_name}")
            return True
    except Exception as e:
        logger.error(f"Error setting up permissions: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def check_tables_exist(db_name):
    """Check if tables already exist in the database"""
    try:
        conn = get_db_connection(db_name)
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            table_count = cursor.fetchone()[0]
            return table_count > 0
    except Exception as e:
        logger.error(f"Error checking tables: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def initialize_database_tables(db_name):
    """Initialize tables in an existing database"""
    logger.info(f"Initializing tables in database: {db_name}")
    
    # Check if database exists
    if not database_exists(db_name):
        logger.error(f"Database {db_name} does not exist. Please create it first in AWS console.")
        return False
    
    # Check if tables already exist
    if check_tables_exist(db_name):
        logger.warning(f"Tables already exist in database {db_name}")
        confirmation = input(f"Tables already exist in database {db_name}. Do you want to run migrations anyway? (yes/no): ")
        
        if confirmation.lower() != "yes":
            logger.info("Operation cancelled")
            return False
    
    # Run migrations
    if not run_migrations(db_name):
        return False
    
    # Set up permissions
    if not setup_permissions(db_name):
        return False
    
    logger.info(f"Tables in database {db_name} initialized successfully")
    return True

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Initialize tables in an existing database')
    parser.add_argument('database_name', nargs='?', default=None, help='Name of the database to initialize tables in')
    args = parser.parse_args()
    
    # Use provided database name or get from settings
    db_name = args.database_name or settings.DATABASES['default']['NAME']
    
    # Initialize the database tables
    if initialize_database_tables(db_name):
        logger.info(f"Database {db_name} tables are ready for use")
    else:
        logger.error(f"Failed to initialize tables in database {db_name}")
        sys.exit(1)

if __name__ == "__main__":
    # Set up Django environment
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
    django.setup()
    
    main()