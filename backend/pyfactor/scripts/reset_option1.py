#!/usr/bin/env python
"""
Reset script using Option 1: Temporarily Removing the Business Reference Entirely.

This script:
1. Checks if the business field in hr/models.py has been commented out
2. Drops all tables in the database
3. Deletes all migration files
4. Creates migrations for core apps first, then remaining apps
5. Applies migrations in the correct order
6. Provides instructions for adding the business relationship back

Before running this script:
1. Edit hr/models.py and comment out or remove the business field:
   # business = models.ForeignKey(
   #     'users.Business',
   #     on_delete=models.CASCADE,
   #     related_name='business_employees',
   #     null=True,
   #     blank=True
   # )

After running this script:
1. Edit hr/models.py to add the business field back
2. Generate a migration for just that field:
   python manage.py makemigrations hr --name add_business_relationship
   python manage.py migrate hr

Usage:
python scripts/reset_option1.py
"""

import os
import sys
import subprocess
import logging
import re

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

def check_hr_model():
    """Check if the business field in hr/models.py has been commented out"""
    try:
        with open('hr/models.py', 'r') as f:
            content = f.read()
            
        # Check if there's an uncommented business ForeignKey
        pattern = r"^\s*business\s*=\s*models\.ForeignKey\("
        if re.search(pattern, content, re.MULTILINE):
            logger.error("ERROR: The business field in hr/models.py has not been commented out!")
            logger.error("Please edit hr/models.py and comment out or remove the business field:")
            logger.error("""
# Comment out or remove entirely:
# business = models.ForeignKey(
#     'users.Business',
#     on_delete=models.CASCADE,
#     related_name='business_employees',
#     null=True,
#     blank=True
# )
            """)
            return False
        
        return True
    except Exception as e:
        logger.error(f"Error checking hr/models.py: {str(e)}")
        return False

def main():
    # Check if the business field in hr/models.py has been commented out
    if not check_hr_model():
        return False
    
    # Step 1: Drop all tables
    logger.info("Step 1: Dropping all tables")
    
    drop_sql = """
    DO $$ DECLARE
        r RECORD;
    BEGIN
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
    logger.info("Step 2: Deleting all migration files")
    if not run_command("find */migrations -type f -name '*.py' -not -name '__init__.py' -delete"):
        logger.error("Failed to delete migrations")
        return False
    
    # Step 3: Make migrations for core apps first
    logger.info("Step 3: Creating migrations for core apps first")
    
    # Core apps in order
    core_apps = ["contenttypes", "auth", "sites", "sessions", "custom_auth", "users", "hr"]
    
    for app in core_apps:
        logger.info(f"Creating migrations for {app}")
        if not run_command(f"python manage.py makemigrations {app}"):
            logger.error(f"Failed to create migrations for {app}")
            return False
    
    # Step 4: Make migrations for remaining apps
    logger.info("Step 4: Creating migrations for remaining apps")
    if not run_command("python manage.py makemigrations"):
        logger.error("Failed to create migrations for remaining apps")
        return False
    
    # Step 5: Apply migrations in the correct order
    logger.info("Step 5: Applying migrations in the correct order")
    
    # Apply contenttypes migrations first
    if not run_command("python manage.py migrate contenttypes"):
        logger.error("Failed to apply contenttypes migrations")
        return False
    
    # Apply auth migrations
    if not run_command("python manage.py migrate auth"):
        logger.error("Failed to apply auth migrations")
        return False
    
    # Apply other core app migrations
    for app in core_apps[2:]:
        logger.info(f"Applying migrations for {app}")
        if not run_command(f"python manage.py migrate {app}"):
            logger.error(f"Failed to apply migrations for {app}")
            return False
    
    # Apply all remaining migrations
    logger.info("Applying all remaining migrations")
    if not run_command("python manage.py migrate"):
        logger.error("Failed to apply all migrations")
        return False
    
    # Clean up
    if os.path.exists('drop_all_tables.sql'):
        os.remove('drop_all_tables.sql')
    
    logger.info("Database reset complete!")
    logger.info("\nNEXT STEPS:")
    logger.info("1. Edit hr/models.py to add the business field back:")
    logger.info("""
business = models.ForeignKey(
    'users.Business',
    on_delete=models.CASCADE,
    related_name='business_employees',
    null=True,
    blank=True
)
    """)
    logger.info("2. Generate a migration for just that field:")
    logger.info("   python manage.py makemigrations hr --name add_business_relationship")
    logger.info("   python manage.py migrate hr")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)