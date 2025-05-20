#!/usr/bin/env python
"""
Master script to orchestrate the entire process of resetting the database
and handling circular dependencies.

This script:
1. Modifies the hr/models.py file to break the circular dependency
2. Resets the database and applies migrations
3. Restores the original hr/models.py file
4. Creates and applies the migration for the restored foreign key

Usage:
python scripts/reset_db_master.py

This script automates the entire "Break and Fix" strategy for handling
circular dependencies in Django migrations.
"""

import os
import sys
import subprocess
import logging
import time

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
    # Step 1: Modify hr/models.py to break the circular dependency
    logger.info("Step 1: Modifying hr/models.py to break the circular dependency")
    if not run_command("python scripts/modify_hr_model.py"):
        logger.error("Failed to modify hr/models.py")
        return False
    
    # Step 2: Reset the database and apply migrations
    logger.info("Step 2: Resetting the database and applying migrations")
    if not run_command("python scripts/reset_db_break_fix.py"):
        logger.error("Failed to reset the database")
        return False
    
    # Step 3: Restore the original hr/models.py file
    logger.info("Step 3: Restoring the original hr/models.py file")
    if not run_command("python scripts/modify_hr_model.py --restore"):
        logger.error("Failed to restore hr/models.py")
        return False
    
    # Step 4: Create and apply the migration for the restored foreign key
    logger.info("Step 4: Creating and applying the migration for the restored foreign key")
    if not run_command("python manage.py makemigrations hr"):
        logger.error("Failed to create migration for hr")
        return False
    
    if not run_command("python manage.py migrate"):
        logger.error("Failed to apply migrations")
        return False
    
    logger.info("Database reset and circular dependency handling completed successfully!")
    logger.info("Your database has been reset with all tables and relationships properly established.")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)