#!/usr/bin/env python
"""
Script to reset the database ensuring banking tables are created first.
This avoids circular dependencies between banking and finance.
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

def main():
    # Step 1: Reset the database (use the reset_db_main command)
    logger.info("Step 1: Resetting database...")
    if not run_command("python manage.py reset_db_main --no-input"):
        logger.error("Failed to reset database")
        return False

    # Step 2: Create the banking tables directly with SQL to avoid circular dependencies
    logger.info("Step 2: Creating banking tables directly...")
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS "banking_bankaccount" (
                "id" uuid NOT NULL PRIMARY KEY,
                "name" varchar(255) NOT NULL,
                "account_number" varchar(255) NOT NULL,
                "account_type" varchar(50) NOT NULL,
                "balance" numeric(15, 2) NOT NULL,
                "currency" varchar(3) NOT NULL,
                "is_active" boolean NOT NULL,
                "created_at" timestamp with time zone NOT NULL,
                "updated_at" timestamp with time zone NOT NULL,
                "tenant_id" uuid NOT NULL,
                "user_id" uuid NULL
            );
            """)
            logger.info("Successfully created banking tables")
        except Exception as e:
            logger.error(f"Error creating banking tables: {e}")
            # Continue even if there's an error

    # Step 3: Apply migrations
    logger.info("Step 3: Applying migrations...")
    
    # Set environment variable to override DB router for all migrations
    os.environ['OVERRIDE_DB_ROUTER'] = 'True'
    
    # Apply banking migrations first to mark them as applied
    run_command("python manage.py migrate banking --fake")
    
    # Migrate contenttypes and auth first
    run_command("python manage.py migrate contenttypes")
    run_command("python manage.py migrate auth")
    
    # Apply all other migrations
    run_command("python manage.py migrate --fake-initial")
    
    # Reset the environment variable
    os.environ.pop('OVERRIDE_DB_ROUTER', None)
    
    logger.info("Database reset complete!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 