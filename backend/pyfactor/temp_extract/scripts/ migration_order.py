# migration_order.py
import os
import django
from django.core.management import call_command

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

def run_migrations():
    print("Creating fresh migrations...")
    call_command('makemigrations')
    
    print("Applying migrations in controlled order...")
    for app in MIGRATION_ORDER:
        try:
            print(f"Migrating {app}...")
            call_command('migrate', app)
        except Exception as e:
            print(f"Error migrating {app}: {e}")
    
    # Final migration to catch any dependencies
    print("Final migration pass...")
    call_command('migrate')
    
    print("Migration complete!")

if __name__ == "__main__":
    run_migrations()