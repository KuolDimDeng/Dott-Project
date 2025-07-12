#!/usr/bin/env python
"""
Script to reset the database when circular dependencies have already been broken.
This script:
1. Checks if the circular dependencies have already been broken
2. Fixes any indentation issues in the model files
3. Drops all tables in the database
4. Deletes all migration files
5. Creates and applies migrations
6. Creates migrations to restore relationships if needed

Usage:
python scripts/reset_db_fixed.py
"""

import os
import sys
import subprocess
import re
import tempfile
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

# Set up constants
HR_MODEL_PATH = 'hr/models.py'
USERS_MODEL_PATH = 'users/models.py'

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

def check_circular_dependencies():
    """Check if circular dependencies have already been broken"""
    try:
        # Check hr/models.py
        with open(HR_MODEL_PATH, 'r') as f:
            hr_content = f.read()
        
        # Check users/models.py
        with open(USERS_MODEL_PATH, 'r') as f:
            users_content = f.read()
        
        # Check if business ForeignKey is commented out in hr/models.py
        hr_broken = re.search(r'#\s*business\s*=\s*models\.ForeignKey', hr_content) is not None
        
        # Check if employee ForeignKey is commented out in users/models.py
        users_broken = re.search(r'#\s*employee\s*=\s*models\.ForeignKey', users_content) is not None
        
        return hr_broken and users_broken
    except Exception as e:
        logger.error(f"Error checking circular dependencies: {str(e)}")
        return False

def fix_indentation_issues():
    """Fix indentation issues in model files"""
    try:
        # Fix users/models.py
        with open(USERS_MODEL_PATH, 'r') as f:
            content = f.read()
        
        # Fix indentation for 'employee = None' line
        fixed_content = re.sub(
            r'(\s+)employee = None  # Will fix this after initial migration',
            r'    employee = None  # Will fix this after initial migration',
            content
        )
        
        # Check if any changes were made
        if fixed_content != content:
            with open(USERS_MODEL_PATH, 'w') as f:
                f.write(fixed_content)
            logger.info("Fixed indentation issues in users/models.py")
        
        return True
    except Exception as e:
        logger.error(f"Error fixing indentation issues: {str(e)}")
        return False

def drop_all_tables():
    """Drop all tables in the database"""
    try:
        sql = """
        DO $$ DECLARE
            r RECORD;
        BEGIN
            -- Disable foreign key checks
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
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
            f.write(sql)
            sql_path = f.name
        
        conn_string = get_db_connection_string()
        success = run_command(f"{conn_string} -f {sql_path}")
        
        os.unlink(sql_path)
        return success
    except Exception as e:
        logger.error(f"Error dropping tables: {str(e)}")
        return False

def main():
    # Step 1: Check if circular dependencies have already been broken
    logger.info("Step 1: Checking if circular dependencies have already been broken")
    if not check_circular_dependencies():
        logger.error("Circular dependencies have not been broken in model files")
        logger.error("Please manually comment out the ForeignKey fields in hr/models.py and users/models.py")
        return False
    
    # Step 2: Fix indentation issues
    logger.info("Step 2: Fixing indentation issues in model files")
    if not fix_indentation_issues():
        logger.error("Failed to fix indentation issues")
        return False
    
    # Step 3: Drop all tables
    logger.info("Step 3: Dropping all database tables")
    if not drop_all_tables():
        logger.error("Failed to drop tables")
        return False
    
    # Step 4: Delete all migrations
    logger.info("Step 4: Deleting all migration files")
    if not run_command("find */migrations -type f -name '*.py' -not -name '__init__.py' -delete"):
        logger.error("Failed to delete migrations")
        return False
    
    # Step 5: Make migrations for all apps
    logger.info("Step 5: Creating fresh migrations")
    if not run_command("python manage.py makemigrations"):
        logger.error("Failed to create migrations")
        return False
    
    # Step 6: Apply migrations
    logger.info("Step 6: Applying migrations")
    if not run_command("python manage.py migrate"):
        logger.error("Failed to apply migrations")
        return False
    
    logger.info("Database reset completed successfully!")
    logger.info("\nNEXT STEPS:")
    logger.info("If you want to restore the circular dependencies:")
    logger.info("1. Uncomment the ForeignKey fields in hr/models.py and users/models.py")
    logger.info("2. Create migrations for just those changes:")
    logger.info("   python manage.py makemigrations hr users --name restore_relationships")
    logger.info("3. Apply the migrations:")
    logger.info("   python manage.py migrate")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)