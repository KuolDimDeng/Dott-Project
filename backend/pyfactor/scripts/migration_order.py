# migration_order.py
import os
import sys
import django
from django.core.management import call_command
from django.conf import settings
import importlib

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Define the migration order
MIGRATION_ORDER = [
    # Foundation apps first
    'contenttypes',
    'auth',
    'admin',
    'sessions',
    
    # Auth-related apps
    'custom_auth',
    
    # Core business models
    'users',
    
    # HR and related apps
    'hr',
    
    # Banking after HR
    'banking',
    
    # Onboarding after users
    'onboarding',
    
    # All other apps
    'analysis',
    'chart',
    'crm',
    'finance',
    'integrations',
    'inventory',
    'payments',
    'payroll',
    'purchases',
    'reports',
    'sales',
    'taxes',
    'transport',
]

def disable_db_routers():
    """Temporarily disable database routers to allow migrations to run"""
    print("Temporarily disabling database routers...")
    
    # Save original routers
    original_routers = settings.DATABASE_ROUTERS
    
    # Completely disable routers
    settings.DATABASE_ROUTERS = []
    
    # Create a dummy router class that allows all operations
    class AllowAllRouter:
        def db_for_read(self, model, **hints):
            return 'default'
            
        def db_for_write(self, model, **hints):
            return 'default'
            
        def allow_relation(self, obj1, obj2, **hints):
            return True
            
        def allow_migrate(self, db, app_label, model_name=None, **hints):
            return True
    
    # Add our dummy router
    settings.DATABASE_ROUTERS = [AllowAllRouter()]
    
    # Reload the db_routers module to apply changes
    try:
        db_routers_module = importlib.import_module('pyfactor.db_routers')
        importlib.reload(db_routers_module)
        print("Database routers disabled successfully")
    except ImportError:
        print("Could not find db_routers module to reload")
        
    return original_routers

def run_migrations():
    print("Creating fresh migrations...")
    call_command('makemigrations')
    
    # Disable database routers to allow all migrations to run
    original_routers = disable_db_routers()
    
    try:
        print("Applying migrations in controlled order...")
        for app in MIGRATION_ORDER:
            try:
                print(f"Migrating {app}...")
                call_command('migrate', app)
            except Exception as e:
                print(f"Error migrating {app}: {e}")
                # If there's an error, try to reset the database connection
                from django.db import connection
                connection.close()
        
        # Final migration pass to catch any dependencies
        print("Final migration pass...")
        try:
            call_command('migrate')
        except Exception as e:
            print(f"Error in final migration pass: {e}")
            # If there's an error, try to reset the database connection
            from django.db import connection
            connection.close()
            print("Attempting one more migration pass...")
            call_command('migrate')
        
        print("Migration complete!")
    finally:
        # Restore original routers
        print("Restoring original database routers...")
        settings.DATABASE_ROUTERS = original_routers

if __name__ == "__main__":
    run_migrations()