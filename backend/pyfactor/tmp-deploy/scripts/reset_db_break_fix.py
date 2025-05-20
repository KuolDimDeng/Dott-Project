#!/usr/bin/env python
"""
Script to reset the database using the "Break and Fix" strategy.
This script:
1. Drops all tables
2. Deletes all migrations
3. Makes migrations
4. Applies migrations

Note: Before running this script, you need to temporarily modify the hr/models.py file
to break the circular dependency by changing the ForeignKey to a UUIDField.
After running this script, restore the original ForeignKey and run:
python manage.py makemigrations hr
python manage.py migrate

Usage:
python scripts/reset_db_break_fix.py
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
    # Check if the hr/models.py file has been modified
    logger.info("Checking if hr/models.py has been modified to break the circular dependency...")
    
    try:
        with open('hr/models.py', 'r') as f:
            content = f.read()
            if 'business = models.ForeignKey' in content and 'business_id = models.UUIDField' not in content:
                logger.error("ERROR: You need to modify hr/models.py first to break the circular dependency!")
                logger.error("Please change the business ForeignKey to a UUIDField as follows:")
                logger.error("""
# Find this line:
business = models.ForeignKey(
    'users.Business',
    on_delete=models.CASCADE,
    related_name='business_employees',
    null=True,
    blank=True
)

# Change it to:
# Temporarily break circular dependency with UUIDField
business_id = models.UUIDField(null=True, blank=True)
# business = models.ForeignKey('users.Business', on_delete=models.CASCADE, ...)
                """)
                return False
    except Exception as e:
        logger.error(f"Error checking hr/models.py: {str(e)}")
        return False
    
    # Step 1: Drop all tables
    logger.info("Step 1: Dropping all tables")
    
    drop_sql = """
    DO $$ DECLARE
        r RECORD;
    BEGIN
        -- Disable foreign key constraints
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
    
    conn_string = get_db_connection_string()
    if not run_command(f"{conn_string} -f drop_all_tables.sql"):
        logger.error("Failed to drop tables")
        return False
    
    # Step 2: Delete all migrations
    logger.info("Step 2: Deleting all migrations")
    if not run_command("find */migrations -type f -name '*.py' -not -name '__init__.py' -delete"):
        logger.error("Failed to delete migrations")
        return False
    
    # Step 3: Make migrations
    logger.info("Step 3: Making migrations")
    if not run_command("python manage.py makemigrations"):
        logger.error("Failed to make migrations")
        return False
    
    # Step 4: Apply migrations
    logger.info("Step 4: Applying migrations")
    if not run_command("python manage.py migrate"):
        logger.error("Failed to apply migrations")
        return False
    
    # Clean up
    if os.path.exists('drop_all_tables.sql'):
        os.remove('drop_all_tables.sql')
    
    logger.info("Database reset complete!")
    logger.info("\nNEXT STEPS:")
    logger.info("1. Restore the original ForeignKey in hr/models.py:")
    logger.info("""
# Change back to:
business = models.ForeignKey(
    'users.Business',
    on_delete=models.CASCADE,
    related_name='business_employees',
    null=True,
    blank=True
)
    """)
    logger.info("2. Create and apply the migration for the foreign key:")
    logger.info("python manage.py makemigrations hr")
    logger.info("python manage.py migrate")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)