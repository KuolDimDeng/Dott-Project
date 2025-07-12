#!/usr/bin/env python
"""
Script to reset migrations in the correct order to handle circular dependencies.
This script will:
1. Clean the database using the existing reset_migrations.py script
2. Create initial migrations for core apps first
3. Apply those core migrations in a specific order
4. Create migrations for the remaining apps
5. Apply all migrations

Usage:
python scripts/reset_migrations_in_order.py

This script ensures that tables are created in the correct order to avoid
foreign key reference issues caused by circular dependencies between apps.
"""

import os
import sys
import subprocess
import time

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

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

def main():
    # Step 1: Clean the database using your existing script
    logger.info("Step 1: Cleaning database and removing migrations")
    if not run_command("python scripts/reset_migrations.py --force"):
        logger.error("Failed to clean database")
        return False
    
    # Step 2: Create initial migrations for core apps
    logger.info("Step 2: Creating initial migrations for core apps")
    
    # Core apps first
    core_apps = ["contenttypes", "auth", "sites", "sessions", "custom_auth", "users"]
    for app in core_apps:
        if not run_command(f"python manage.py makemigrations {app}"):
            logger.error(f"Failed to create migrations for {app}")
            return False
    
    # Step 3: Apply these core migrations first
    logger.info("Step 3: Applying core migrations")
    if not run_command("python manage.py migrate auth"):
        logger.error("Failed to apply auth migrations")
        return False
        
    if not run_command("python manage.py migrate contenttypes"):
        logger.error("Failed to apply contenttypes migrations")
        return False
        
    if not run_command("python manage.py migrate custom_auth"):
        logger.error("Failed to apply custom_auth migrations")
        return False
        
    if not run_command("python manage.py migrate users"):
        logger.error("Failed to apply users migrations")
        return False
    
    # Step 4: Create migrations for the rest of the apps
    logger.info("Step 4: Creating migrations for remaining apps")
    if not run_command("python manage.py makemigrations"):
        logger.error("Failed to create remaining migrations")
        return False
    
    # Step 5: Apply all migrations
    logger.info("Step 5: Applying all migrations")
    if not run_command("python manage.py migrate"):
        logger.error("Failed to apply all migrations")
        return False
    
    logger.info("Database reset and migrations completed successfully!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)