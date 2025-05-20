#!/usr/bin/env python
"""
Direct approach to reset the database and migrations without restoring original files.

This script:
1. Drops all tables in the database
2. Deletes all migration files
3. Creates and applies fresh migrations in the correct order
4. Uses --fake flag for circular dependencies

Usage:
python scripts/direct_reset.py
"""

import os
import sys
import subprocess
import tempfile
import logging

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
    # Read database settings from environment variables or use defaults
    db_name = os.getenv('DB_NAME', 'dott_main')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'postgres')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    
    # Build psql connection string
    conn_string = f"psql -h {db_host} -p {db_port} -U {db_user} -d {db_name}"
    
    # Set PGPASSWORD environment variable if password is provided
    if db_password:
        os.environ['PGPASSWORD'] = db_password
    
    return conn_string

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
    try:
        # Step 1: Drop all tables
        logger.info("Step 1: Dropping all database tables")
        if not drop_all_tables():
            logger.error("Failed to drop tables")
            return False
        
        # Step 2: Delete all migration files
        logger.info("Step 2: Deleting all migration files")
        if not run_command("find */migrations -type f -name '*.py' -not -name '__init__.py' -delete"):
            logger.error("Failed to delete migrations")
            return False
        
        # Step 3: Make migrations for auth and contenttypes first
        logger.info("Step 3: Creating migrations for auth and contenttypes")
        if not run_command("python manage.py makemigrations auth contenttypes"):
            logger.error("Failed to create auth and contenttypes migrations")
            return False
        
        # Step 4: Apply migrations for auth and contenttypes
        logger.info("Step 4: Applying migrations for auth and contenttypes")
        if not run_command("python manage.py migrate auth"):
            logger.error("Failed to apply auth migrations")
            return False
        
        if not run_command("python manage.py migrate contenttypes"):
            logger.error("Failed to apply contenttypes migrations")
            return False
        
        # Step 5: Make migrations for custom_auth
        logger.info("Step 5: Creating migrations for custom_auth")
        if not run_command("python manage.py makemigrations custom_auth"):
            logger.error("Failed to create custom_auth migrations")
            return False
        
        # Step 6: Apply migrations for custom_auth
        logger.info("Step 6: Applying migrations for custom_auth")
        if not run_command("python manage.py migrate custom_auth"):
            logger.error("Failed to apply custom_auth migrations")
            return False
        
        # Step 7: Make migrations for users
        logger.info("Step 7: Creating migrations for users")
        if not run_command("python manage.py makemigrations users"):
            logger.error("Failed to create users migrations")
            return False
        
        # Step 8: Apply migrations for users
        logger.info("Step 8: Applying migrations for users")
        if not run_command("python manage.py migrate users"):
            logger.error("Failed to apply users migrations")
            return False
        
        # Step 9: Make migrations for all other apps
        logger.info("Step 9: Creating migrations for all other apps")
        if not run_command("python manage.py makemigrations"):
            logger.error("Failed to create migrations for all apps")
            return False
        
        # Step 10: Apply migrations for all other apps
        logger.info("Step 10: Applying migrations for all other apps")
        if not run_command("python manage.py migrate"):
            logger.error("Failed to apply all migrations")
            return False
        
        # Step 11: Create a superuser
        logger.info("Step 11: Creating a superuser")
        superuser_script = """
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@example.com').exists():
    User.objects.create_superuser('admin@example.com', 'adminpassword')
    print("Superuser created successfully")
else:
    print("Superuser already exists")
"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(superuser_script)
            script_path = f.name
        
        if not run_command(f"python manage.py shell < {script_path}"):
            logger.error("Failed to create superuser")
            return False
        
        os.unlink(script_path)
        
        logger.info("Database reset completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)