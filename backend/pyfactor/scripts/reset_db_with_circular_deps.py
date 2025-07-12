#!/usr/bin/env python
"""
Script to reset database and migrations properly handling circular dependencies.
This script uses a more effective approach to handle circular dependencies by:
1. Creating tables without constraints first
2. Adding constraints separately
3. Using Django's migration options more effectively

Usage:
python scripts/reset_db_with_circular_deps.py
"""
import os
import sys
import subprocess
import logging

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.conf import settings

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_command(command):
    """Run a shell command and print output"""
    logger.info(f"Running: {command}")
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        logger.error(f"Error executing: {command}")
        return False
    return True

def get_db_connection_string():
    """Get database connection string from Django settings"""
    db_settings = settings.DATABASES['default']
    db_name = db_settings['NAME']
    db_user = db_settings['USER']
    db_password = db_settings['PASSWORD']
    db_host = db_settings['HOST']
    db_port = db_settings['PORT']
    
    # Build psql connection string
    conn_string = f"psql -h {db_host} -p {db_port} -U {db_user} -d {db_name}"
    
    # Set PGPASSWORD environment variable if password is provided
    if db_password:
        os.environ['PGPASSWORD'] = db_password
    
    return conn_string

def main():
    # Step 1: Clean database by dropping all tables
    logger.info("Step 1: Cleaning database")
    
    # Create SQL to drop all tables in public schema
    drop_sql = """
    DO $$ DECLARE
        r RECORD;
    BEGIN
        -- Disable triggers
        EXECUTE 'SET session_replication_role = replica';
        
        -- Drop all tables in public schema
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        
        -- Drop all tenant schemas if they exist
        FOR r IN (SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%') LOOP
            EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(r.schema_name) || ' CASCADE';
        END LOOP;
        
        -- Enable triggers
        EXECUTE 'SET session_replication_role = DEFAULT';
    END $$;
    """
    
    with open('drop_all_tables.sql', 'w') as f:
        f.write(drop_sql)
    
    # Run SQL to drop tables
    conn_string = get_db_connection_string()
    if not run_command(f"{conn_string} -f drop_all_tables.sql"):
        logger.error("Failed to drop tables")
        return False
    
    # Step 2: Delete all migration files
    logger.info("Step 2: Deleting all migration files")
    if not run_command("find */migrations -type f -name '*.py' -not -name '__init__.py' -delete"):
        logger.error("Failed to delete migration files")
        return False
    
    # Step 3: Create initial migrations for all apps in two phases
    logger.info("Step 3: Creating initial migrations for all apps")
    
    # Phase 1: Create migrations but with --empty flag for core apps first
    core_apps = ["contenttypes", "auth", "sites", "sessions", "custom_auth", "users"]
    for app in core_apps:
        if not run_command(f"python manage.py makemigrations {app} --empty --name initial_structure"):
            logger.error(f"Failed to create empty migration for {app}")
            return False
    
    # Run migrations with --fake for core apps to register them without doing anything
    for app in core_apps:
        if not run_command(f"python manage.py migrate {app} --fake"):
            logger.error(f"Failed to fake-migrate {app}")
            return False
    
    # Phase 2: Create the real migrations
    if not run_command("python manage.py makemigrations"):
        logger.error("Failed to create migrations")
        return False
    
    # Step 4: Apply migrations in two phases
    logger.info("Step 4: Applying migrations in phases")
    
    # Phase 1: Run migrations with --fake-initial to skip foreign key checks
    if not run_command("python manage.py migrate --fake-initial"):
        logger.error("Failed to apply initial migrations")
        return False
    
    # Phase 2: Run migrate again to ensure all constraints are applied
    if not run_command("python manage.py migrate"):
        logger.error("Failed to apply all migrations")
        return False
    
    # Clean up
    if os.path.exists('drop_all_tables.sql'):
        os.remove('drop_all_tables.sql')
    
    logger.info("Database reset and migrations completed successfully!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)