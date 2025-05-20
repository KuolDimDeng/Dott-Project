#!/usr/bin/env python
import os
import sys
import django
from django.core.management import call_command

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def restore_original_models():
    """Restore the original model files from backups if they exist"""
    model_files = [
        ('banking/models.py', 'banking/models.py.bak'),
        ('hr/models.py', 'hr/models.py.bak'),
        ('custom_auth/models.py', 'custom_auth/models.py.bak'),
        ('users/models.py', 'users/models.py.bak')
    ]
    
    for model_file, backup_file in model_files:
        if os.path.exists(backup_file):
            print(f"Restoring {model_file} from backup...")
            try:
                with open(backup_file, 'r') as f:
                    content = f.read()
                with open(model_file, 'w') as f:
                    f.write(content)
                print(f"Restored {model_file} successfully")
            except Exception as e:
                print(f"Error restoring {model_file}: {e}")
        else:
            print(f"No backup file found for {model_file}")

def create_relationship_migrations():
    """Create migrations to restore relationships"""
    print("Creating migrations to restore relationships...")
    try:
        call_command('makemigrations', 'banking', 'hr', 'custom_auth', 'users', name='restore_relationships')
        print("Created migrations to restore relationships successfully")
    except Exception as e:
        print(f"Error creating migrations: {e}")

def apply_migrations():
    """Apply the migrations to restore relationships"""
    print("Applying migrations...")
    try:
        call_command('migrate')
        print("Applied migrations successfully")
    except Exception as e:
        print(f"Error applying migrations: {e}")

if __name__ == "__main__":
    print("This script will restore the original model files and create migrations to restore relationships.")
    response = input("Do you want to continue? (yes/no): ")
    
    if response.lower() == 'yes':
        restore_original_models()
        create_relationship_migrations()
        apply_migrations()
        print("\nRelationships have been restored successfully!")
    else:
        print("Operation cancelled.")