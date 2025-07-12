#!/usr/bin/env python
"""
Script to fix migration order issues by creating new migrations that break the circular dependency.
This script will:
1. Create a new migration for hr app that adds the business field with a deferred foreign key constraint
2. Create a new migration for users app that adds the employee field to BusinessMember
"""

import os
import sys
import subprocess
from pathlib import Path

# Add the project directory to the Python path
project_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(project_dir))

def run_command(command):
    """Run a shell command and print output"""
    print(f"Running: {command}")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    print(result.stdout)
    return True

def create_hr_migration():
    """Create a new migration for hr app that adds the business field with a deferred constraint"""
    migration_content = """# Generated manually to fix circular dependency

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='business',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='business_employees', to='users.business'),
            # This will be applied after the users.business table exists
        ),
    ]
"""
    migration_path = os.path.join(project_dir, 'hr', 'migrations', '0003_employee_business.py')
    with open(migration_path, 'w') as f:
        f.write(migration_content)
    print(f"Created migration: {migration_path}")
    return True

def main():
    # Create the hr migration
    if create_hr_migration():
        print("Created new migrations to fix circular dependency")
        
        # Apply migrations in the correct order
        print("Applying migrations in the correct order...")
        
        # First apply auth and contenttypes migrations
        run_command("python manage.py migrate auth")
        run_command("python manage.py migrate contenttypes")
        run_command("python manage.py migrate admin")
        run_command("python manage.py migrate sessions")
        run_command("python manage.py migrate sites")
        
        # Apply custom_auth migrations
        run_command("python manage.py migrate custom_auth")
        
        # Apply hr initial migrations (without business field)
        run_command("python manage.py migrate hr 0001_initial")
        run_command("python manage.py migrate hr 0002_initial")
        
        # Apply users initial migration (creates Business model)
        run_command("python manage.py migrate users 0001_initial")
        
        # Apply hr migration that adds the business field
        run_command("python manage.py migrate hr 0003_employee_business")
        
        # Apply users migration that adds the employee field to BusinessMember
        run_command("python manage.py migrate users 0002_businessmember_employee")
        
        # Apply remaining migrations
        run_command("python manage.py migrate")
        
        print("Migration order fixed successfully!")
    else:
        print("Failed to create migrations")

if __name__ == "__main__":
    main()