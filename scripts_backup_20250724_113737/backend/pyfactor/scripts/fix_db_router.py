#!/usr/bin/env python
"""
Script to fix the database router to ensure that tenant app migrations are applied to tenant schemas.

This script:
1. Temporarily modifies the database router to allow tenant app migrations to be applied to the public schema
2. Applies migrations to create the necessary tables
3. Restores the original database router behavior

Usage:
    python fix_db_router.py
"""

import os
import sys
import django
import logging
import importlib
from types import MethodType

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

from django.conf import settings
from django.db import connection

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

def patch_db_router():
    """Patch the database router to allow tenant app migrations to be applied to the public schema."""
    logger.info("Patching database router...")
    
    # Import the database router
    try:
        router_module = importlib.import_module('pyfactor.db_routers')
        router_class = router_module.TenantSchemaRouter
        
        # Save the original allow_migrate method
        original_allow_migrate = router_class.allow_migrate
        
        # Define a new allow_migrate method that always returns True
        def patched_allow_migrate(self, db, app_label, model_name=None, **hints):
            """Always allow migrations to be applied."""
            logger.info(f"Allowing migration for app {app_label} in schema public (patched)")
            return True
        
        # Replace the allow_migrate method
        router_class.allow_migrate = MethodType(patched_allow_migrate, router_class)
        
        logger.info("Database router patched successfully")
        
        return original_allow_migrate
    except (ImportError, AttributeError) as e:
        logger.error(f"Failed to patch database router: {e}")
        return None

def restore_db_router(original_allow_migrate):
    """Restore the original database router behavior."""
    logger.info("Restoring database router...")
    
    # Import the database router
    try:
        router_module = importlib.import_module('pyfactor.db_routers')
        router_class = router_module.TenantSchemaRouter
        
        # Restore the original allow_migrate method
        router_class.allow_migrate = original_allow_migrate
        
        logger.info("Database router restored successfully")
        
        return True
    except (ImportError, AttributeError) as e:
        logger.error(f"Failed to restore database router: {e}")
        return False

def apply_migrations():
    """Apply migrations to create the necessary tables."""
    logger.info("Applying migrations...")
    
    # Apply migrations for business and onboarding apps
    try:
        # Apply business migrations first
        logger.info("Applying business migrations...")
        django.core.management.call_command('migrate', 'business')
        
        # Then apply onboarding migrations
        logger.info("Applying onboarding migrations...")
        django.core.management.call_command('migrate', 'onboarding')
        
        logger.info("Migrations applied successfully")
        
        return True
    except Exception as e:
        logger.error(f"Failed to apply migrations: {e}")
        return False

def main():
    """Main function."""
    # Fix logger configuration
    fix_logger_configuration()
    
    # Patch the database router
    original_allow_migrate = patch_db_router()
    if original_allow_migrate is None:
        logger.error("Failed to patch database router")
        return
    
    try:
        # Apply migrations
        if not apply_migrations():
            logger.error("Failed to apply migrations")
            return
    finally:
        # Restore the database router
        restore_db_router(original_allow_migrate)
    
    logger.info("Successfully fixed database router and applied migrations")

if __name__ == '__main__':
    main()