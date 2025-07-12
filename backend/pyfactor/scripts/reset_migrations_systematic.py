#!/usr/bin/env python
"""
Script to completely reset and rebuild migrations to solve circular dependencies.
This script uses a systematic approach to handle the order of operations:
1. Drops all tables using SQL
2. Deletes all migration files
3. Creates migrations in a specific dependency order
4. Applies migrations in phases, starting with contenttypes
5. Uses --run-syncdb to create tables without relations first
6. Then applies all migrations to establish relationships

Usage:
python scripts/reset_migrations_systematic.py
"""
import os
import sys
import subprocess
import logging
import time

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
    # Step 1: Create SQL script to drop all tables
    logger.info("Step 1: Creating SQL to drop all tables")
    drop_sql = """
    DO $$ DECLARE
        r RECORD;
    BEGIN
        -- Disable foreign key checks during drops
        EXECUTE 'SET CONSTRAINTS ALL DEFERRED';
        
        -- Drop all tables
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        
        -- Drop all tenant schemas if they exist
        FOR r IN (SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%') LOOP
            EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(r.schema_name) || ' CASCADE';
        END LOOP;
    END $$;
    """
    
    with open('drop_all_tables.sql', 'w') as f:
        f.write(drop_sql)
    
    # Step 2: Run SQL to drop tables
    logger.info("Step 2: Executing SQL to drop all tables")
    conn_string = get_db_connection_string()
    if not run_command(f"{conn_string} -f drop_all_tables.sql"):
        logger.error("Failed to drop tables")
        return False
    
    # Step 3: Delete all migration files
    logger.info("Step 3: Deleting all migration files")
    if not run_command("find */migrations -type f -name '*.py' -not -name '__init__.py' -delete"):
        logger.error("Failed to delete migration files")
        return False
    
    # Step 4: Create and apply migrations in the correct order
    logger.info("Step 4: Creating migrations in order")
    
    # The critical sequence of apps (this order matters)
    dependency_sequence = [
        "contenttypes",  # Must be first
        "auth",          # Needs contenttypes
        "sessions",
        "sites",
        "custom_auth",   # Custom user model
        "users",         # Contains Business
        "hr",            # References Business
        # The rest can follow...
    ]
    
    # First create the migrations
    for app in dependency_sequence:
        logger.info(f"Creating migrations for {app}")
        if not run_command(f"python manage.py makemigrations {app}"):
            logger.error(f"Failed to create migrations for {app}")
            return False
    
    # Create any remaining migrations
    logger.info("Creating migrations for remaining apps")
    if not run_command("python manage.py makemigrations"):
        logger.error("Failed to create remaining migrations")
        return False
    
    # Step 5: Apply migrations in phases to handle dependencies properly
    logger.info("Step 5: Applying migrations in phases")
    
    # Phase 1: Apply contenttypes migrations first (critical)
    if not run_command("python manage.py migrate contenttypes"):
        logger.error("Failed to apply contenttypes migrations")
        return False
    
    # Phase 2: Apply auth migrations
    if not run_command("python manage.py migrate auth"):
        logger.error("Failed to apply auth migrations")
        return False
    
    # Phase 3: Apply other core app migrations
    for app in dependency_sequence[2:]:
        logger.info(f"Migrating {app}")
        if not run_command(f"python manage.py migrate {app}"):
            logger.error(f"Failed to migrate {app}")
            return False
    
    # Phase 4: Apply all remaining migrations with split operations
    logger.info("Applying all remaining migrations")
    
    # First create all tables without relations
    if not run_command("python manage.py migrate --run-syncdb"):
        logger.error("Failed to create basic tables")
        return False
    
    # Then apply all migrations to establish relationships
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