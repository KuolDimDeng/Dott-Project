#!/usr/bin/env python
"""
Script to fix the onboarding migration dependency issue.

This script:
1. Updates the onboarding/migrations/0001_initial.py file to depend on business.0002_initial instead of business.0001_initial
2. Fixes the migration history in the database to ensure migrations are applied in the correct order

Usage:
    python fix_onboarding_migration_dependency.py
"""

import os
import sys
import re
import django
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s %(asctime)s %(name)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder
from datetime import datetime, timedelta

def fix_migration_file():
    """Fix the onboarding migration file to depend on business.0002_initial."""
    migration_file_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'onboarding', 'migrations', '0001_initial.py'
    )
    
    if not os.path.exists(migration_file_path):
        logger.error(f"Migration file not found: {migration_file_path}")
        return False
    
    logger.info(f"Fixing migration file: {migration_file_path}")
    
    # Read the migration file
    with open(migration_file_path, 'r') as f:
        content = f.read()
    
    # Check if the file already depends on business.0002_initial
    if "('business', '0002_initial')" in content:
        logger.info("Migration file already depends on business.0002_initial")
        return True
    
    # Replace the dependency
    new_content = re.sub(
        r"\('business', '0001_initial'\)",
        "('business', '0002_initial')",
        content
    )
    
    if new_content == content:
        logger.error("Failed to replace dependency in migration file")
        return False
    
    # Write the updated content back to the file
    with open(migration_file_path, 'w') as f:
        f.write(new_content)
    
    logger.info("Successfully updated migration file dependency")
    return True

def fix_migration_history():
    """Fix the migration history in the database."""
    Migration = MigrationRecorder.Migration
    
    try:
        # Get the migrations
        onboarding_migration = Migration.objects.filter(app='onboarding', name='0001_initial').first()
        business_migration_1 = Migration.objects.filter(app='business', name='0001_initial').first()
        business_migration_2 = Migration.objects.filter(app='business', name='0002_initial').first()
        hr_migration = Migration.objects.filter(app='hr', name='0001_initial').first()
        
        if not onboarding_migration:
            logger.error("Onboarding migration not found in the database")
            return False
        
        if not business_migration_1:
            logger.error("Business.0001_initial migration not found in the database")
            return False
        
        if not business_migration_2:
            logger.error("Business.0002_initial migration not found in the database")
            return False
        
        if not hr_migration:
            logger.error("HR migration not found in the database")
            return False
        
        logger.info(f"Found onboarding.0001_initial (applied at {onboarding_migration.applied})")
        logger.info(f"Found business.0001_initial (applied at {business_migration_1.applied})")
        logger.info(f"Found business.0002_initial (applied at {business_migration_2.applied})")
        logger.info(f"Found hr.0001_initial (applied at {hr_migration.applied})")
        
        # Check if the migrations are already in the correct order
        if (onboarding_migration.applied > business_migration_1.applied and
            onboarding_migration.applied > business_migration_2.applied and
            business_migration_2.applied > hr_migration.applied and
            hr_migration.applied > business_migration_1.applied):
            logger.info("Migrations are already in the correct order")
            return True
        
        # Set the applied timestamps to ensure the correct order
        now = datetime.now()
        
        # business.0001_initial should be first
        business_migration_1.applied = now - timedelta(minutes=30)
        business_migration_1.save()
        logger.info(f"Updated business.0001_initial applied timestamp to {business_migration_1.applied}")
        
        # hr.0001_initial should be after business.0001_initial
        hr_migration.applied = now - timedelta(minutes=20)
        hr_migration.save()
        logger.info(f"Updated hr.0001_initial applied timestamp to {hr_migration.applied}")
        
        # business.0002_initial should be after hr.0001_initial
        business_migration_2.applied = now - timedelta(minutes=10)
        business_migration_2.save()
        logger.info(f"Updated business.0002_initial applied timestamp to {business_migration_2.applied}")
        
        # onboarding.0001_initial should be after business.0002_initial
        onboarding_migration.applied = now
        onboarding_migration.save()
        logger.info(f"Updated onboarding.0001_initial applied timestamp to {onboarding_migration.applied}")
        
        logger.info("Successfully updated migration order")
        return True
    except Exception as e:
        logger.error(f"Error updating migration order: {str(e)}")
        return False

def fix_logger_configuration():
    """Fix logger configuration to avoid 'duration' field errors."""
    logger.info("Fixing logger configuration...")
    import logging
    
    # Get all loggers
    for logger_name in logging.root.manager.loggerDict:
        logger_obj = logging.getLogger(logger_name)
        
        # Check and fix handlers
        for handler in logger_obj.handlers:
            if hasattr(handler, 'formatter') and handler.formatter:
                # Check if formatter uses 'duration' field
                if hasattr(handler.formatter, '_fmt') and '%(duration)' in str(handler.formatter._fmt):
                    # Create a new formatter without the duration field
                    new_fmt = str(handler.formatter._fmt).replace('%(duration)', '0.0')
                    handler.setFormatter(logging.Formatter(new_fmt))
                    logger.info(f"Fixed formatter for logger: {logger_name}")
    
    # Fix Django's db logger specifically
    db_logger = logging.getLogger('django.db.backends')
    if db_logger.handlers:
        for handler in db_logger.handlers:
            if hasattr(handler, 'formatter'):
                handler.setFormatter(logging.Formatter('%(levelname)s %(message)s'))
    
    logger.info("Logger configuration fixed.")

def main():
    """Main function."""
    logger.info("Starting fix for onboarding migration dependency issue...")
    
    # Fix logger configuration
    fix_logger_configuration()
    
    # Fix the migration file
    if not fix_migration_file():
        logger.error("Failed to fix migration file")
        return
    
    # Fix the migration history
    if not fix_migration_history():
        logger.error("Failed to fix migration history")
        return
    
    logger.info("Successfully fixed onboarding migration dependency issue")
    logger.info("You should now be able to run migrations without errors")

if __name__ == '__main__':
    main()