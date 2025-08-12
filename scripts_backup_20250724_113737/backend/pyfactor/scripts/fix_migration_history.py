#!/usr/bin/env python
"""
Script to fix the migration history in the database.

This script:
1. Updates the applied timestamp of migrations to ensure they're in the correct order
2. Fixes the issue where onboarding.0001_initial was applied before business.0001_initial

Usage:
    python fix_migration_history.py
"""

import os
import sys
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

def check_migration_order():
    """Check if onboarding.0001_initial is applied before business.0001_initial."""
    Migration = MigrationRecorder.Migration
    
    try:
        onboarding_migration = Migration.objects.get(app='onboarding', name='0001_initial')
        business_migration_1 = Migration.objects.get(app='business', name='0001_initial')
        business_migration_2 = Migration.objects.get(app='business', name='0002_initial')
        hr_migration = Migration.objects.get(app='hr', name='0001_initial')
        
        logger.info(f"Found onboarding.0001_initial (applied at {onboarding_migration.applied})")
        logger.info(f"Found business.0001_initial (applied at {business_migration_1.applied})")
        logger.info(f"Found business.0002_initial (applied at {business_migration_2.applied})")
        logger.info(f"Found hr.0001_initial (applied at {hr_migration.applied})")
        
        if onboarding_migration.applied < business_migration_1.applied:
            logger.warning("ISSUE DETECTED: onboarding.0001_initial is applied before business.0001_initial")
            return True
        elif onboarding_migration.applied < business_migration_2.applied:
            logger.warning("ISSUE DETECTED: onboarding.0001_initial is applied before business.0002_initial")
            return True
        else:
            logger.info("Migration order is correct: business migrations are applied before onboarding.0001_initial")
            return False
    except Migration.DoesNotExist as e:
        logger.error(f"Could not find one of the migrations: {str(e)}")
        return False

def fix_migration_order():
    """Fix the migration order by updating the applied timestamps."""
    Migration = MigrationRecorder.Migration
    
    try:
        onboarding_migration = Migration.objects.get(app='onboarding', name='0001_initial')
        business_migration_1 = Migration.objects.get(app='business', name='0001_initial')
        business_migration_2 = Migration.objects.get(app='business', name='0002_initial')
        hr_migration = Migration.objects.get(app='hr', name='0001_initial')
        
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
    except Migration.DoesNotExist as e:
        logger.error(f"Could not find one of the migrations: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Error updating migration order: {str(e)}")
        return False

def main():
    """Main function."""
    logger.info("Checking migration order...")
    issue_detected = check_migration_order()
    
    if issue_detected:
        logger.info("Fixing migration order...")
        success = fix_migration_order()
        
        if success:
            logger.info("Migration order fixed successfully")
            logger.info("You should now be able to run migrations without errors")
        else:
            logger.error("Failed to fix migration order")
    else:
        logger.info("No issues detected with migration order")

if __name__ == '__main__':
    main()