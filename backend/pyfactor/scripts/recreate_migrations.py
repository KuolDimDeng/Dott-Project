#!/usr/bin/env python
"""
Script to recreate migrations in the correct order.

This script:
1. Deletes all migration files except __init__.py
2. Creates new migrations in the correct order
3. Applies the migrations

Usage:
    python recreate_migrations.py
"""

import os
import sys
import django
import logging
import shutil
import subprocess

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

def find_migration_files():
    """Find all migration files except __init__.py."""
    logger.info("Finding migration files...")
    
    migration_files = []
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    for root, dirs, files in os.walk(base_dir):
        if 'migrations' in dirs:
            migration_path = os.path.join(root, 'migrations')
            for file in os.listdir(migration_path):
                if file != '__init__.py' and file.endswith('.py'):
                    migration_files.append(os.path.join(migration_path, file))
    
    logger.info(f"Found {len(migration_files)} migration files")
    
    return migration_files

def delete_migration_files(migration_files):
    """Delete all migration files except __init__.py."""
    logger.info("Deleting migration files...")
    
    for file in migration_files:
        try:
            os.remove(file)
            logger.info(f"Deleted file: {file}")
        except Exception as e:
            logger.error(f"Failed to delete file {file}: {e}")
    
    logger.info("Migration files deleted successfully")
    
    return True

def create_migrations():
    """Create new migrations in the correct order."""
    logger.info("Creating new migrations...")
    
    # Create migrations for shared apps first
    shared_apps = ['admin', 'auth', 'contenttypes', 'custom_auth']
    for app in shared_apps:
        try:
            logger.info(f"Creating migrations for shared app: {app}")
            django.core.management.call_command('makemigrations', app)
        except Exception as e:
            logger.error(f"Failed to create migrations for app {app}: {e}")
    
    # Create migrations for business app
    try:
        logger.info("Creating migrations for business app")
        django.core.management.call_command('makemigrations', 'business')
    except Exception as e:
        logger.error(f"Failed to create migrations for business app: {e}")
    
    # Create migrations for hr app
    try:
        logger.info("Creating migrations for hr app")
        django.core.management.call_command('makemigrations', 'hr')
    except Exception as e:
        logger.error(f"Failed to create migrations for hr app: {e}")
    
    # Create migrations for onboarding app
    try:
        logger.info("Creating migrations for onboarding app")
        django.core.management.call_command('makemigrations', 'onboarding')
    except Exception as e:
        logger.error(f"Failed to create migrations for onboarding app: {e}")
    
    # Create migrations for remaining tenant apps
    tenant_apps = getattr(settings, 'TENANT_APPS', [])
    for app in tenant_apps:
        if app not in ['business', 'hr', 'onboarding']:
            try:
                logger.info(f"Creating migrations for tenant app: {app}")
                django.core.management.call_command('makemigrations', app)
            except Exception as e:
                logger.error(f"Failed to create migrations for app {app}: {e}")
    
    logger.info("Migrations created successfully")
    
    return True

def fix_onboarding_migration():
    """Fix the onboarding migration to depend on business.0002_initial."""
    logger.info("Fixing onboarding migration...")
    
    # Find the onboarding migration file
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    onboarding_migration_path = os.path.join(base_dir, 'onboarding', 'migrations')
    
    for file in os.listdir(onboarding_migration_path):
        if file.startswith('0001_') and file.endswith('.py'):
            migration_file = os.path.join(onboarding_migration_path, file)
            
            # Read the migration file
            with open(migration_file, 'r') as f:
                content = f.read()
            
            # Replace the dependency
            if "('business', '0001_initial')" in content:
                content = content.replace("('business', '0001_initial')", "('business', '0002_initial')")
                
                # Write the updated content back to the file
                with open(migration_file, 'w') as f:
                    f.write(content)
                
                logger.info(f"Fixed dependency in {migration_file}")
            else:
                logger.info(f"No dependency to fix in {migration_file}")
    
    return True

def apply_migrations():
    """Apply the migrations."""
    logger.info("Applying migrations...")
    
    # Apply migrations for auth and contenttypes first
    try:
        logger.info("Applying auth and contenttypes migrations")
        django.core.management.call_command('migrate', 'auth')
        django.core.management.call_command('migrate', 'contenttypes')
        django.core.management.call_command('migrate', 'admin')
    except Exception as e:
        logger.error(f"Failed to apply auth and contenttypes migrations: {e}")
    
    # Apply migrations for shared apps
    shared_apps = ['custom_auth', 'users']
    for app in shared_apps:
        try:
            logger.info(f"Applying migrations for shared app: {app}")
            django.core.management.call_command('migrate', app)
        except Exception as e:
            logger.error(f"Failed to apply migrations for app {app}: {e}")
    
    # Apply migrations for business app
    try:
        logger.info("Applying migrations for business app")
        django.core.management.call_command('migrate', 'business')
    except Exception as e:
        logger.error(f"Failed to apply migrations for business app: {e}")
    
    # Apply migrations for hr app
    try:
        logger.info("Applying migrations for hr app")
        django.core.management.call_command('migrate', 'hr')
    except Exception as e:
        logger.error(f"Failed to apply migrations for hr app: {e}")
    
    # Apply migrations for onboarding app
    try:
        logger.info("Applying migrations for onboarding app")
        django.core.management.call_command('migrate', 'onboarding')
    except Exception as e:
        logger.error(f"Failed to apply migrations for onboarding app: {e}")
    
    # Apply remaining migrations
    try:
        logger.info("Applying remaining migrations")
        django.core.management.call_command('migrate', '--fake-initial')
    except Exception as e:
        logger.error(f"Failed to apply remaining migrations: {e}")
    
    logger.info("Migrations applied successfully")
    
    return True

def main():
    """Main function."""
    # Fix logger configuration
    fix_logger_configuration()
    
    # Find migration files
    migration_files = find_migration_files()
    
    # Delete migration files
    if not delete_migration_files(migration_files):
        logger.error("Failed to delete migration files")
        return
    
    # Create new migrations
    if not create_migrations():
        logger.error("Failed to create migrations")
        return
    
    # Fix onboarding migration
    if not fix_onboarding_migration():
        logger.error("Failed to fix onboarding migration")
        return
    
    # Apply migrations
    if not apply_migrations():
        logger.error("Failed to apply migrations")
        return
    
    logger.info("Successfully recreated and applied migrations")

if __name__ == '__main__':
    main()