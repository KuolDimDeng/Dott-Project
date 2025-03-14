#!/usr/bin/env python
"""
Script to reset the database and migrations.
This script will:
1. Clean the database by dropping all tables (without dropping the database itself)
2. Delete all migration files (preserving __init__.py)
3. Create fresh migrations for all apps
4. Apply the new migrations

Usage:
python scripts/reset_migrations.py [--force]

Options:
--force: Skip confirmation prompts

WARNING: This will permanently delete all data and migration history!
"""

import os
import sys
import logging
import argparse
import subprocess
import psycopg2

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.conf import settings
from django.db import connection

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

def get_db_connection():
    """Get a direct psycopg2 connection to the database"""
    db_settings = settings.DATABASES['default']
    conn = psycopg2.connect(
        dbname=db_settings['NAME'],
        user=db_settings['USER'],
        password=db_settings['PASSWORD'],
        host=db_settings['HOST'],
        port=db_settings['PORT']
    )
    conn.autocommit = True
    return conn

def clean_database():
    """Clean all tables from the database without dropping it"""
    logger.info("Step 1: Cleaning database")
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # SQL to drop all tables (PostgreSQL specific)
            drop_all_tables_sql = """
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
            
            logger.info("Executing SQL to drop all tables and tenant schemas...")
            cursor.execute(drop_all_tables_sql)
            logger.info("Successfully dropped all tables and tenant schemas")
            
            # Verify no tables remain
            cursor.execute("SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'")
            table_count = cursor.fetchone()[0]
            
            if table_count > 0:
                logger.warning(f"There are still {table_count} tables remaining in the public schema")
                return False
            else:
                logger.info("All tables have been successfully dropped")
                return True
                
    except Exception as e:
        logger.error(f"Error cleaning database: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

def delete_migrations():
    """Delete all migration files except __init__.py"""
    logger.info("Step 2: Removing old migrations")
    
    try:
        # Find all Django app directories
        app_dirs = []
        for root, dirs, files in os.walk('.'):
            if 'migrations' in dirs and 'apps.py' in files:
                app_dirs.append(os.path.join(root, 'migrations'))
        
        logger.info(f"Found {len(app_dirs)} Django app migration directories")
        
        # Delete migration files in each app
        total_deleted = 0
        for migrations_dir in app_dirs:
            if os.path.exists(migrations_dir):
                for filename in os.listdir(migrations_dir):
                    filepath = os.path.join(migrations_dir, filename)
                    if (os.path.isfile(filepath) and 
                        filename.endswith('.py') and 
                        filename != '__init__.py'):
                        os.remove(filepath)
                        logger.info(f"Deleted migration file: {filepath}")
                        total_deleted += 1
        
        logger.info(f"Deleted {total_deleted} migration files")
        return True
    except Exception as e:
        logger.error(f"Error deleting migrations: {str(e)}")
        return False

def find_latest_migration_file(app_name):
    """Find the latest migration file for an app"""
    migrations_dir = os.path.join('.', app_name, 'migrations')
    if os.path.exists(migrations_dir):
        files = [f for f in os.listdir(migrations_dir)
                if f.endswith('.py') and f != '__init__.py']
        if files:
            # Sort files to get the latest one
            files.sort()
            return os.path.join(migrations_dir, files[0])
    return None

def handle_migration_dependencies():
    """Create initial migrations in the correct order to handle dependencies"""
    logger.info("Step 3a: Creating initial migrations with proper dependencies")
    
    # First, create empty initial migrations for core apps
    logger.info("Creating initial migration for users app")
    if not run_command("python manage.py makemigrations users --empty --name initial_models"):
        return False
    
    # Then create empty initial migrations for dependent apps
    logger.info("Creating initial migration for hr app")
    if not run_command("python manage.py makemigrations hr --empty --name initial_models"):
        return False
    
    # Find the migration files
    users_migration_file = find_latest_migration_file('users')
    hr_migration_file = find_latest_migration_file('hr')
    
    if users_migration_file and hr_migration_file:
        users_migration_name = os.path.basename(users_migration_file).replace('.py', '')
        
        # Add dependency to hr migration
        logger.info(f"Adding dependency on users.{users_migration_name} to hr migration")
        with open(hr_migration_file, 'r') as f:
            content = f.read()
        
        # Add dependency on users migration
        content = content.replace(
            "dependencies = [",
            f"dependencies = [\n        ('users', '{users_migration_name}'),"
        )
        
        with open(hr_migration_file, 'w') as f:
            f.write(content)
        
        logger.info("Successfully set up migration dependencies")
        return True
    else:
        logger.error("Could not find migration files")
        return False

def create_migrations():
    """Create fresh migrations"""
    logger.info("Step 3b: Creating migrations for all apps")
    
    # First handle dependencies between users and hr apps
    if not handle_migration_dependencies():
        logger.warning("Failed to set up migration dependencies, continuing anyway")
    
    # Then create migrations for all other apps
    return run_command("python manage.py makemigrations")

def apply_migrations():
    """Apply all migrations"""
    logger.info("Step 4: Applying migrations")
    
    # First migrate the auth and users apps
    logger.info("First migrating auth and users apps")
    if not run_command("python manage.py migrate auth"):
        return False
    if not run_command("python manage.py migrate contenttypes"):
        return False
    if not run_command("python manage.py migrate custom_auth"):
        return False
    if not run_command("python manage.py migrate users"):
        return False
    
    # Then migrate the hr app
    logger.info("Now migrating hr app")
    if not run_command("python manage.py migrate hr"):
        return False
    
    # Finally migrate all other apps
    logger.info("Finally migrating all other apps")
    return run_command("python manage.py migrate")

def reset_migrations(force=False):
    """Reset database and migrations"""
    if not force:
        confirmation = input("WARNING: This will permanently delete all data and migration history. Type 'RESET ALL' to confirm: ")
        
        if confirmation != "RESET ALL":
            logger.info("Operation cancelled")
            return False
    else:
        logger.warning("Force flag set. Proceeding without confirmation.")
    
    logger.info("Starting complete migration reset (preserving database)")
    
    # Step 1: Clean database
    if not clean_database():
        logger.error("Failed to clean database")
        return False
    
    # Step 2: Delete migrations
    if not delete_migrations():
        logger.error("Failed to delete migrations")
        return False
    
    # Step 3: Create migrations
    if not create_migrations():
        logger.error("Failed to create migrations")
        return False
    
    # Step 4: Apply migrations
    if not apply_migrations():
        logger.error("Failed to apply migrations")
        return False
    
    logger.info("Migration reset completed successfully!")
    return True

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Reset database and migrations')
    parser.add_argument('--force', action='store_true', help='Skip confirmation prompts')
    args = parser.parse_args()
    
    if reset_migrations(force=args.force):
        logger.info("Database and migrations have been reset successfully")
    else:
        logger.error("Failed to reset database and migrations")
        sys.exit(1)

if __name__ == "__main__":
    main()