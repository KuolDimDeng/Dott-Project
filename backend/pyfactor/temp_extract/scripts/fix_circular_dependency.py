#!/usr/bin/env python
"""
Script to fix circular dependency issues in migrations by running them in a specific order.
"""

import os
import sys
import django
from django.core.management import call_command

# Add the parent directory to sys.path to allow importing from the project
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def run_migrations_in_order():
    """
    Run migrations in a specific order to avoid circular dependencies.
    """
    print("Running migrations in a specific order to fix circular dependencies...")
    
    # First, run migrations for apps that don't depend on other apps
    print("\n1. Running migrations for base apps...")
    call_command('migrate', 'contenttypes')
    call_command('migrate', 'auth')
    call_command('migrate', 'admin')
    call_command('migrate', 'sessions')
    call_command('migrate', 'sites')
    call_command('migrate', 'custom_auth')
    
    # Run users migrations to create the users_business table
    print("\n2. Running users migrations...")
    call_command('migrate', 'users', '0001_initial')
    
    # Run finance migrations that depend on users_business
    print("\n3. Running finance migrations...")
    call_command('migrate', 'finance', '0002_initial')
    call_command('migrate', 'finance', '0003_fix_business_dependency')
    
    # Run the rest of the users migrations
    print("\n4. Running remaining users migrations...")
    call_command('migrate', 'users')
    
    # Handle tenant app migrations that were being blocked
    print("\n5. Running tenant app migrations...")
    
    # Temporarily disable the tenant app blocking in db_routers
    # This is done by setting an environment variable that the router can check
    os.environ['ALLOW_TENANT_MIGRATIONS_IN_PUBLIC'] = 'True'
    
    # Run migrations for tenant apps that were being blocked
    call_command('migrate', 'taxes')
    call_command('migrate', 'purchases')
    
    # Reset the environment variable
    os.environ.pop('ALLOW_TENANT_MIGRATIONS_IN_PUBLIC', None)
    
    # Run the rest of the migrations
    print("\n6. Running remaining migrations...")
    call_command('migrate')
    
    print("\nMigration order fixed successfully!")

if __name__ == '__main__':
    run_migrations_in_order()