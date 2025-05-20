#!/usr/bin/env python
"""
Reset script using Option 2: Temporarily Remove HR from INSTALLED_APPS.

This script:
1. Checks if 'hr' has been commented out from INSTALLED_APPS in settings.py
2. Drops all tables in the database using a more radical approach (DROP SCHEMA public CASCADE)
3. Deletes all migration files
4. Creates and applies migrations without HR
5. Provides instructions for adding HR back to INSTALLED_APPS and applying HR migrations

Before running this script:
1. Edit your settings.py and comment out 'hr' from INSTALLED_APPS

After running this script:
1. Edit settings.py and uncomment 'hr' in INSTALLED_APPS
2. Create HR migrations and apply them:
   python manage.py makemigrations hr
   python manage.py migrate hr

Usage:
python scripts/reset_option2.py
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

def check_hr_in_installed_apps():
    """Check if 'hr' is in INSTALLED_APPS"""
    try:
        # Check if 'hr' is in INSTALLED_APPS
        if 'hr' in settings.INSTALLED_APPS:
            logger.error("ERROR: 'hr' is still in INSTALLED_APPS!")
            logger.error("Please edit your settings.py and comment out 'hr' from INSTALLED_APPS")
            
            # Try to find the settings file
            settings_file = None
            for path in sys.path:
                potential_path = os.path.join(path, 'pyfactor', 'settings.py')
                if os.path.exists(potential_path):
                    settings_file = potential_path
                    break
            
            if settings_file:
                logger.error(f"Settings file found at: {settings_file}")
            
            return False
        
        return True
    except Exception as e:
        logger.error(f"Error checking INSTALLED_APPS: {str(e)}")
        return False

def main():
    # Check if 'hr' has been commented out from INSTALLED_APPS
    if not check_hr_in_installed_apps():
        return False
    
    # Step 1: Drop all tables using a more radical approach
    logger.info("Step 1: Dropping all tables using DROP SCHEMA public CASCADE")
    
    drop_sql = "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    
    with open('drop_schema.sql', 'w') as f:
        f.write(drop_sql)
    
    conn_string = get_db_connection_string()
    if not run_command(f"{conn_string} -f drop_schema.sql"):
        logger.error("Failed to drop schema")
        return False
    
    # Step 2: Delete all migrations
    logger.info("Step 2: Deleting all migration files")
    if not run_command("find */migrations -type f -name '*.py' -not -name '__init__.py' -delete"):
        logger.error("Failed to delete migrations")
        return False
    
    # Step 3: Create migrations (without HR)
    logger.info("Step 3: Creating migrations (without HR)")
    if not run_command("python manage.py makemigrations"):
        logger.error("Failed to create migrations")
        return False
    
    # Step 4: Apply migrations
    logger.info("Step 4: Applying migrations")
    if not run_command("python manage.py migrate"):
        logger.error("Failed to apply migrations")
        return False
    
    # Clean up
    if os.path.exists('drop_schema.sql'):
        os.remove('drop_schema.sql')
    
    logger.info("Database reset complete!")
    logger.info("\nNEXT STEPS:")
    logger.info("1. Edit settings.py and uncomment 'hr' in INSTALLED_APPS")
    logger.info("2. Create HR migrations and apply them:")
    logger.info("   python manage.py makemigrations hr")
    logger.info("   python manage.py migrate hr")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)