#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Version0001_add_employee_fields_hr_employee.py

This script adds new fields to the Employee model in the HR module:
- ID_verified: Boolean field (true/false) with default value of false
- supervisor: Reference to another employee who is their supervisor, defaulting to the owner
- areManager: Boolean field (true/false) with default value of false
- supervising: Field to track one or more employees being supervised by this employee, defaulting to null

The script also updates the AWS RDS database table hr_employee to reflect these changes.

Author: Claude
Date: 2025-04-24
Version: 1.0
"""

import os
import sys
import django
import logging
from datetime import datetime
import uuid
import shutil
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"employee_fields_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("employee_fields_update")

# Add the project root to the Python path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Import Django models after setting up the environment
from django.db import models, connection, transaction
from django.db.migrations.operations.fields import AddField, AlterField
from django.db.migrations.operations.models import CreateModel
from django.db.migrations.operations.special import RunPython
from django.apps import apps
from django.conf import settings
from hr.models import Employee
from users.models import Business

def backup_file(file_path):
    """Create a backup of the specified file"""
    backup_path = f"{file_path}.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    logger.info(f"Created backup of {file_path} at {backup_path}")
    return backup_path

def update_employee_model():
    """Update the Employee model with the new fields"""
    try:
        # Path to the models.py file
        models_path = Path(__file__).resolve().parent.parent / 'hr' / 'models.py'
        
        # Create a backup of the models.py file
        backup_path = backup_file(models_path)
        
        # Read the current content of the models.py file
        with open(models_path, 'r') as file:
            content = file.read()
        
        # Check if the fields already exist
        if 'ID_verified = models.BooleanField' in content:
            logger.warning("ID_verified field already exists in the Employee model")
        else:
            # Add the ID_verified field
            content = content.replace(
                '    business_id = models.UUIDField(null=True, blank=True)',
                '    business_id = models.UUIDField(null=True, blank=True)\n    ID_verified = models.BooleanField(default=False)'
            )
            logger.info("Added ID_verified field to the Employee model")
        
        if 'areManager = models.BooleanField' in content:
            logger.warning("areManager field already exists in the Employee model")
        else:
            # Add the areManager field
            content = content.replace(
                '    ID_verified = models.BooleanField(default=False)',
                '    ID_verified = models.BooleanField(default=False)\n    areManager = models.BooleanField(default=False)'
            )
            logger.info("Added areManager field to the Employee model")
        
        if 'supervising = models.ManyToManyField' in content:
            logger.warning("supervising field already exists in the Employee model")
        else:
            # Add the supervising field
            content = content.replace(
                '    areManager = models.BooleanField(default=False)',
                '    areManager = models.BooleanField(default=False)\n    supervising = models.ManyToManyField(\'self\', related_name=\'supervised_by\', blank=True, symmetrical=False)'
            )
            logger.info("Added supervising field to the Employee model")
        
        # Update the supervisor field to default to the owner
        if 'supervisor = models.ForeignKey' in content:
            # We'll handle this in the database update function
            logger.info("supervisor field already exists in the Employee model")
        
        # Write the updated content back to the models.py file
        with open(models_path, 'w') as file:
            file.write(content)
        
        logger.info("Successfully updated the Employee model")
        return True
    
    except Exception as e:
        logger.error(f"Error updating the Employee model: {str(e)}")
        return False

def create_migration():
    """Create a migration file for the model changes"""
    try:
        # Path to the migrations directory
        migrations_dir = Path(__file__).resolve().parent.parent / 'hr' / 'migrations'
        
        # Get the latest migration number
        migration_files = [f for f in os.listdir(migrations_dir) if f.endswith('.py') and f != '__init__.py']
        latest_migration = max([int(f.split('_')[0]) for f in migration_files if f.split('_')[0].isdigit()])
        new_migration_number = latest_migration + 1
        
        # Create the migration file
        migration_path = migrations_dir / f'{new_migration_number:04d}_add_employee_fields.py'
        
        # Read the current content of models.py to check which fields need to be added
        models_path = Path(__file__).resolve().parent.parent / 'hr' / 'models.py'
        with open(models_path, 'r') as file:
            content = file.read()
        
        # Prepare operations list based on which fields don't exist
        operations = []
        
        if 'ID_verified = models.BooleanField' not in content:
            operations.append("""
        migrations.AddField(
            model_name='employee',
            name='ID_verified',
            field=models.BooleanField(default=False),
        )""")
        
        if 'areManager = models.BooleanField' not in content:
            operations.append("""
        migrations.AddField(
            model_name='employee',
            name='areManager',
            field=models.BooleanField(default=False),
        )""")
        
        if 'supervising = models.ManyToManyField' not in content:
            operations.append("""
        migrations.AddField(
            model_name='employee',
            name='supervising',
            field=models.ManyToManyField(blank=True, related_name='supervised_by', to='hr.employee', symmetrical=False),
        )""")
        
        if not operations:
            logger.warning('No new fields to add in migration')
            return 'no_changes'
        
        migration_content = f"""# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '{latest_migration:04d}_previous_migration'),
    ]

    operations = [{''.join(operations)}
    ]
"""
        
        with open(migration_path, 'w') as file:
            file.write(migration_content)
        
        logger.info(f'Created migration file: {migration_path}')
        return True
    
    except Exception as e:
        logger.error(f'Error creating migration: {str(e)}')
        return False

def update_database():
    """Update the database with the new fields and set default supervisor to owner"""
    try:
        # Check if we need to apply any migrations
        from django.core.management import call_command
        from django.db import connection
        
        # Get the list of applied migrations
        with connection.cursor() as cursor:
            cursor.execute("SELECT app, name FROM django_migrations WHERE app='hr'")
            applied_migrations = {name for app, name in cursor.fetchall()}
        
        # Check if we have any new migrations to apply
        migrations_dir = Path(__file__).resolve().parent.parent / 'hr' / 'migrations'
        migration_files = [f for f in os.listdir(migrations_dir) if f.endswith('.py') and f != '__init__.py']
        new_migrations = [f.replace('.py', '') for f in migration_files if f.replace('.py', '') not in applied_migrations]
        
        if new_migrations:
            # Apply the migration
            with transaction.atomic():
                call_command('migrate', 'hr')
                logger.info("Applied new migrations")
        else:
            logger.info("No new migrations to apply")
        
        # Update existing employees to set supervisor to owner if not set
        with transaction.atomic():
            for business in Business.objects.all():
                # Find the owner of the business
                owner = Employee.objects.filter(business_id=business.id, role='owner').first()
                if owner:
                    # Update employees without a supervisor to have the owner as supervisor
                    employees_without_supervisor = Employee.objects.filter(
                        business_id=business.id, 
                        supervisor__isnull=True
                    ).exclude(id=owner.id)  # Exclude the owner
                    
                    count = employees_without_supervisor.update(supervisor=owner)
                    logger.info(f"Updated {count} employees in business {business.id} to have owner as supervisor")
            
            logger.info("Successfully updated the database")
            return True
    
    except Exception as e:
        logger.error(f"Error updating the database: {str(e)}")
        return False

def update_script_registry():
    """Update the script registry with information about this script"""
    try:
        registry_path = project_root / 'backend' / 'pyfactor' / 'scripts' / 'script_registry.md'
        
        # Create a backup of the registry file
        backup_path = backup_file(registry_path)
        
        # Read the current content of the registry file
        with open(registry_path, 'r') as file:
            content = file.read()
        
        # Add the new script to the registry
        new_entry = f"""| Version0001_add_employee_fields_hr_employee.py | 1.0 | Add new fields to Employee model (ID_verified, areManager, supervising) and update supervisor defaults | Completed | {datetime.now().strftime('%Y-%m-%d')} |
"""
        
        # Find the position to insert the new entry
        if "## Backend Scripts" in content:
            insert_pos = content.find("## Backend Scripts") + len("## Backend Scripts")
            content = content[:insert_pos] + "\n" + new_entry + content[insert_pos:]
        else:
            # If the section doesn't exist, add it
            content += f"\n## Backend Scripts\n\n{new_entry}\n"
        
        # Write the updated content back to the registry file
        with open(registry_path, 'w') as file:
            file.write(content)
        
        logger.info("Successfully updated the script registry")
        return True
    
    except Exception as e:
        logger.error(f"Error updating the script registry: {str(e)}")
        return False

def main():
    """Main function to run the script"""
    logger.info("Starting employee fields update script")
    
    # Update the Employee model
    if not update_employee_model():
        logger.error("Failed to update the Employee model. Aborting.")
        return False
    
    # Create the migration
    migration_result = create_migration()
    if not migration_result:
        logger.error("Failed to create the migration. Aborting.")
        return False
    
    # Only update the database if we created a new migration
    if migration_result and migration_result != 'no_changes':
        # Update the database
        if not update_database():
            logger.error("Failed to update the database. Aborting.")
            return False
    else:
        logger.info("No database changes needed")
    
    # Update the script registry
    if not update_script_registry():
        logger.warning("Failed to update the script registry.")
    
    logger.info("Employee fields update script completed successfully")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 