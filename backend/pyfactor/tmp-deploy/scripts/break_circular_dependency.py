#!/usr/bin/env python
"""
Radical approach to break circular dependencies by:
1. Temporarily modifying all models involved in circular dependencies
2. Running migrations in a controlled order
3. Restoring the original model files
4. Creating migrations to add back the relationships

This script:
- Backs up hr/models.py, users/models.py, banking/models.py, and custom_auth/models.py
- Modifies all files to remove circular references
- Drops all tables in the database
- Deletes all migration files
- Creates and applies migrations with the modified models in a specific order
- Restores the original model files
- Creates and applies migrations to add back the relationships

Usage:
python scripts/break_circular_dependency.py
"""

import os
import sys
import subprocess
import re
import shutil
import tempfile
import logging

# Add the parent directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

import django
django.setup()

from django.conf import settings

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Set up constants
HR_MODEL_PATH = 'hr/models.py'
USERS_MODEL_PATH = 'users/models.py'
BANKING_MODEL_PATH = 'banking/models.py'
CUSTOM_AUTH_MODEL_PATH = 'custom_auth/models.py'

def run_command(command):
    """Run a shell command and print output"""
    logger.info(f"Running: {command}")
    result = subprocess.run(command, shell=True)
    if result.returncode != 0:
        logger.error(f"Error executing: {command}")
        return False
    return True

def get_db_connection_string():
    """Get database connection string from Django settings"""
    db_settings = settings.DATABASES['default']
    db_name = db_settings['NAME']
    db_user = db_settings['USER']
    db_password = db_settings['PASSWORD']
    db_host = db_settings['HOST']
    db_port = db_settings['PORT']
    
    # Build psql connection string
    conn_string = f"psql -h {db_host} -p {db_port} -U {db_user} -d {db_name}"
    
    # Set PGPASSWORD environment variable if password is provided
    if db_password:
        os.environ['PGPASSWORD'] = db_password
    
    return conn_string

def backup_file(file_path):
    """Create a backup of a file"""
    backup_path = f"{file_path}.bak"
    if os.path.exists(file_path):
        shutil.copy2(file_path, backup_path)
        logger.info(f"Created backup of {file_path} at {backup_path}")
        return backup_path
    else:
        logger.error(f"File not found: {file_path}")
        return None

def fix_indentation_issues():
    """Fix indentation issues in model files"""
    try:
        # Fix users/models.py using a more robust line-by-line approach
        with open(USERS_MODEL_PATH, 'r') as f:
            lines = f.readlines()
        
        fixed_lines = []
        in_role_choices = False
        for line in lines:
            # Check if we're entering ROLE_CHOICES definition
            if 'ROLE_CHOICES' in line and '[' in line:
                in_role_choices = True
                fixed_lines.append(line)
            # Check if we're at the closing bracket of ROLE_CHOICES
            elif in_role_choices and ']' in line:
                in_role_choices = False
                # Ensure proper indentation for closing bracket
                fixed_lines.append('    ]\n')
            # Fix indentation for closing braces inside ROLE_CHOICES
            elif in_role_choices and '}' in line and not line.strip().startswith('}'):
                # Ensure proper indentation for closing brace
                fixed_lines.append('    ' + line.strip() + '\n')
            # Fix indentation for 'employee = None' line
            elif 'employee = None' in line and '# Will fix this after initial migration' in line:
                fixed_lines.append('    employee = None  # Will fix this after initial migration\n')
            # Keep other lines unchanged
            else:
                fixed_lines.append(line)
        
        # Write the fixed content back to the file
        with open(USERS_MODEL_PATH, 'w') as f:
            f.writelines(fixed_lines)
        
        logger.info("Fixed indentation issues in users/models.py using line-by-line approach")
        return True
    except Exception as e:
        logger.error(f"Error fixing indentation issues: {str(e)}")
        return False

def modify_banking_model():
    """Replace Employee ForeignKey with UUID field in banking/models.py"""
    try:
        with open(BANKING_MODEL_PATH, 'r') as f:
            content = f.read()
        
        # Replace employee ForeignKey with simple UUID
        modified = re.sub(
            r'employee\s*=\s*models\.ForeignKey\(.*?hr\.Employee.*?\)',
            'employee_id = models.UUIDField(null=True, blank=True)  # Temporarily replaced ForeignKey',
            content,
            flags=re.DOTALL
        )
        
        # Check if any changes were made
        if modified == content:
            logger.warning("No changes made to banking/models.py. The employee ForeignKey pattern might not have been found.")
            logger.warning("You may need to manually modify the file.")
        
        with open(BANKING_MODEL_PATH, 'w') as f:
            f.write(modified)
        
        logger.info("Modified banking/models.py to replace employee ForeignKey with UUIDField")
        return True
    except Exception as e:
        logger.error(f"Error modifying banking/models.py: {str(e)}")
        return False

def modify_custom_auth_model():
    """Modify Tenant model to break circular dependency with User"""
    try:
        with open(CUSTOM_AUTH_MODEL_PATH, 'r') as f:
            content = f.read()
        
        # Replace owner ForeignKey with simple UUID
        modified = re.sub(
            r'owner\s*=\s*models\.OneToOneField\(.*?User.*?\)',
            'owner_id = models.UUIDField(null=True, blank=True)  # Temporarily replaced OneToOneField',
            content,
            flags=re.DOTALL
        )
        
        # Check if any changes were made
        if modified == content:
            logger.warning("No changes made to custom_auth/models.py. The owner OneToOneField pattern might not have been found.")
            logger.warning("You may need to manually modify the file.")
        
        with open(CUSTOM_AUTH_MODEL_PATH, 'w') as f:
            f.write(modified)
        
        logger.info("Modified custom_auth/models.py to replace owner OneToOneField with UUIDField")
        return True
    except Exception as e:
        logger.error(f"Error modifying custom_auth/models.py: {str(e)}")
        return False

def modify_hr_model():
    """Replace ForeignKey references with UUID fields in hr/models.py"""
    try:
        with open(HR_MODEL_PATH, 'r') as f:
            content = f.read()
        
        # Replace business ForeignKey with simple UUID
        modified = re.sub(
            r'business\s*=\s*models\.ForeignKey\([^)]+\)',
            'business_id = models.UUIDField(null=True, blank=True)  # Temporarily replaced ForeignKey',
            content
        )
        
        # If the regex didn't match, try a more flexible pattern
        if modified == content:
            modified = re.sub(
                r'business\s*=\s*models\.ForeignKey\(.*?users\.Business.*?\)',
                'business_id = models.UUIDField(null=True, blank=True)  # Temporarily replaced ForeignKey',
                content,
                flags=re.DOTALL
            )
        
        # If still no match, look for any business ForeignKey
        if modified == content:
            modified = re.sub(
                r'business\s*=\s*models\.ForeignKey\(.*?\)',
                'business_id = models.UUIDField(null=True, blank=True)  # Temporarily replaced ForeignKey',
                content,
                flags=re.DOTALL
            )
        
        # Check if any changes were made
        if modified == content:
            logger.warning("No changes made to hr/models.py. The business ForeignKey pattern might not have been found.")
            logger.warning("You may need to manually modify the file.")
        
        with open(HR_MODEL_PATH, 'w') as f:
            f.write(modified)
        
        logger.info("Modified hr/models.py to replace business ForeignKey with UUIDField")
        return True
    except Exception as e:
        logger.error(f"Error modifying hr/models.py: {str(e)}")
        return False

def modify_users_model():
    """Remove any references to hr app in users/models.py"""
    try:
        # First fix any indentation issues
        if not fix_indentation_issues():
            return False
            
        with open(USERS_MODEL_PATH, 'r') as f:
            content = f.read()
        
        # Look for imports from hr app
        modified = re.sub(
            r'from hr[. ].*import.*\n',
            '# Temporarily removed import from hr\n',
            content
        )
        
        # Replace any hr related fields
        modified = re.sub(
            r'employee\s*=\s*models\..*\(.*hr\..*\)',
            '# Temporarily removed employee field\n    employee_id = models.UUIDField(null=True, blank=True)',
            modified,
            flags=re.DOTALL
        )
        
        # If the regex didn't match, try a more flexible pattern
        if modified == content:
            modified = re.sub(
                r'employee\s*=\s*models\.ForeignKey\(.*?\)',
                '# Temporarily removed employee field\n    employee_id = models.UUIDField(null=True, blank=True)',
                content,
                flags=re.DOTALL
            )
        
        # Check if any changes were made
        if modified == content:
            logger.warning("No changes made to users/models.py. The employee ForeignKey pattern might not have been found.")
            logger.warning("You may need to manually modify the file.")
        
        with open(USERS_MODEL_PATH, 'w') as f:
            f.write(modified)
        
        logger.info("Modified users/models.py to remove references to hr app")
        return True
    except Exception as e:
        logger.error(f"Error modifying users/models.py: {str(e)}")
        return False

def restore_files(backup_paths):
    """Restore original model files from backups"""
    success = True
    for original, backup in backup_paths:
        if backup and os.path.exists(backup):
            try:
                shutil.copy2(backup, original)
                logger.info(f"Restored {original} from backup")
                os.remove(backup)
            except Exception as e:
                logger.error(f"Error restoring {original} from backup: {str(e)}")
                success = False
    return success

def drop_all_tables():
    """Drop all tables in the database"""
    try:
        sql = """
        DO $$ DECLARE
            r RECORD;
        BEGIN
            -- Disable foreign key checks
            EXECUTE 'SET CONSTRAINTS ALL DEFERRED';
            
            -- Drop all tables
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
            
            -- Drop all tenant schemas if they exist
            FOR r IN (SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%') LOOP
                EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(r.schema_name) || ' CASCADE';
            END LOOP;
        END $$;
        """
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
            f.write(sql)
            sql_path = f.name
        
        conn_string = get_db_connection_string()
        success = run_command(f"{conn_string} -f {sql_path}")
        
        os.unlink(sql_path)
        return success
    except Exception as e:
        logger.error(f"Error dropping tables: {str(e)}")
        return False

def main():
    # Step 1: Backup models
    logger.info("Step 1: Backing up model files")
    backup_paths = [
        (HR_MODEL_PATH, backup_file(HR_MODEL_PATH)),
        (USERS_MODEL_PATH, backup_file(USERS_MODEL_PATH)),
        (BANKING_MODEL_PATH, backup_file(BANKING_MODEL_PATH)),
        (CUSTOM_AUTH_MODEL_PATH, backup_file(CUSTOM_AUTH_MODEL_PATH))
    ]
    
    # Check if backups were created successfully
    if None in [path[1] for path in backup_paths]:
        logger.error("Failed to create backups of model files")
        return False
    
    try:
        # Step 2: Modify models to break dependencies
        logger.info("Step 2: Modifying models to break circular dependencies")
        if not (modify_hr_model() and
                modify_users_model() and
                modify_banking_model() and
                modify_custom_auth_model()):
            logger.error("Failed to modify model files")
            restore_files(backup_paths)
            return False
        
        # Step 3: Drop all tables
        logger.info("Step 3: Dropping all database tables")
        if not drop_all_tables():
            logger.error("Failed to drop tables")
            restore_files(backup_paths)
            return False
        
        # Step 4: Delete all migrations
        logger.info("Step 4: Deleting all migration files")
        if not run_command("find */migrations -type f -name '*.py' -not -name '__init__.py' -delete"):
            logger.error("Failed to delete migrations")
            restore_files(backup_paths)
            return False
        
        # Step 5: Make migrations for all apps
        logger.info("Step 5: Creating fresh migrations")
        if not run_command("python manage.py makemigrations"):
            logger.error("Failed to create migrations")
            restore_files(backup_paths)
            return False
        
        # Step 6: Apply migrations in controlled order
        logger.info("Step 6: Applying migrations in controlled order")
        
        # First apply auth and contenttypes
        logger.info("Step 6.1: Applying auth and contenttypes migrations")
        if not run_command("python manage.py migrate auth"):
            logger.error("Failed to apply auth migrations")
            restore_files(backup_paths)
            return False
        
        if not run_command("python manage.py migrate contenttypes"):
            logger.error("Failed to apply contenttypes migrations")
            restore_files(backup_paths)
            return False
        
        # Then apply custom_auth (without tenant relationship to user)
        logger.info("Step 6.2: Applying custom_auth migrations")
        if not run_command("python manage.py migrate custom_auth"):
            logger.error("Failed to apply custom_auth migrations")
            restore_files(backup_paths)
            return False
        
        # Then users (without hr dependencies)
        logger.info("Step 6.3: Applying users migrations")
        if not run_command("python manage.py migrate users"):
            logger.error("Failed to apply users migrations")
            restore_files(backup_paths)
            return False
        
        # Then hr (without banking dependencies)
        logger.info("Step 6.4: Applying hr migrations")
        if not run_command("python manage.py migrate hr"):
            logger.error("Failed to apply hr migrations")
            restore_files(backup_paths)
            return False
        
        # Then banking
        logger.info("Step 6.5: Applying banking migrations")
        if not run_command("python manage.py migrate banking"):
            logger.error("Failed to apply banking migrations")
            restore_files(backup_paths)
            return False
        
        # Then onboarding
        logger.info("Step 6.6: Applying onboarding migrations")
        if not run_command("python manage.py migrate onboarding"):
            logger.error("Failed to apply onboarding migrations")
            restore_files(backup_paths)
            return False
        
        # Then remaining apps
        logger.info("Step 6.7: Applying remaining migrations")
        if not run_command("python manage.py migrate"):
            logger.error("Failed to apply remaining migrations")
            restore_files(backup_paths)
            return False
        
        # Step 7: Restore original model files
        logger.info("Step 7: Restoring original model files")
        if not restore_files(backup_paths):
            logger.error("Failed to restore original model files")
            return False
        
        # Step 8: Create migrations to add relationships back
        logger.info("Step 8: Creating migrations to restore relationships")
        if not run_command("python manage.py makemigrations hr users banking custom_auth --name restore_relationships"):
            logger.error("Failed to create migrations to restore relationships")
            return False
        
        # Step 9: Apply final migrations
        logger.info("Step 9: Applying final migrations")
        if not run_command("python manage.py migrate"):
            logger.error("Failed to apply final migrations")
            return False
        
        logger.info("Database successfully rebuilt with circular dependencies resolved!")
        return True
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        # Restore original files if anything went wrong
        restore_files(backup_paths)
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)