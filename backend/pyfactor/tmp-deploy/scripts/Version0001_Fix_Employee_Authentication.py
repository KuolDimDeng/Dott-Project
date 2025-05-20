#!/usr/bin/env python
"""
Version0001_Fix_Employee_Authentication.py

This script fixes the authentication issue with the employee management API.
The main issue is that the CognitoAuthentication class is trying to create a User object
with a 'username' parameter, but the custom User model in the application has removed
the username field.

The error occurs in the get_or_create_user method in custom_auth/authentication.py:
ERROR 2025-04-21 12:00:28,362 authentication [Auth] Error creating/updating user: User() got unexpected keyword arguments: 'username'

This script modifies the authentication.py file to remove the username parameter
when creating a user and updates related code.
"""

import os
import sys
import shutil
import re
from datetime import datetime
import argparse

# Add the project root to the path so we can import Django modules
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')

# Constants
AUTH_FILE_PATH = '/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/authentication.py'
BACKUP_SUFFIX = f".backup-{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}"

def create_backup(file_path):
    """Create a backup of the file before modifying it"""
    backup_path = f"{file_path}{BACKUP_SUFFIX}"
    try:
        shutil.copy2(file_path, backup_path)
        print(f"Created backup at {backup_path}")
        return backup_path
    except Exception as e:
        print(f"Error creating backup: {str(e)}")
        sys.exit(1)

def fix_authentication_file():
    """Fix the authentication.py file to handle the user creation correctly"""
    # Create a backup first
    backup_path = create_backup(AUTH_FILE_PATH)
    
    # Read the original file
    with open(AUTH_FILE_PATH, 'r') as f:
        content = f.read()
    
    # Fix 1: Update the user creation code to remove the username parameter
    # Original pattern:
    # user = User.objects.create_user(
    #     email=email,
    #     username=email,  # Use email as username
    #     first_name=first_name,
    #     last_name=last_name,
    #     cognito_sub=cognito_sub
    # )
    pattern = r"user = User\.objects\.create_user\(\s*email=email,\s*username=email,\s*first_name=first_name,\s*last_name=last_name,\s*cognito_sub=cognito_sub\s*\)"
    replacement = """user = User.objects.create_user(
                    email=email,
                    # Remove username parameter which is not supported in custom User model
                    first_name=first_name,
                    last_name=last_name,
                    cognito_sub=cognito_sub
                )"""
    
    # Apply the fix
    modified_content = re.sub(pattern, replacement, content)
    
    # Fix 2: Add error handling for the username field in the update section
    # Find the block where attributes are set and updated
    update_attrs_pattern = r"# Update custom attributes if they exist in the User model\s*for attr_name, attr_value in user_custom_attributes\.items\(\):\s*try:\s*if hasattr\(user, attr_name\):\s*setattr\(user, attr_name, attr_value\)\s*update_fields\.append\(attr_name\)\s*except Exception as e:"
    
    update_attrs_replacement = """# Update custom attributes if they exist in the User model
                for attr_name, attr_value in user_custom_attributes.items():
                    try:
                        # Skip username field which is not in our User model
                        if attr_name == 'username':
                            logger.debug(f"[Auth] Skipping username attribute as it's not in User model")
                            continue
                            
                        if hasattr(user, attr_name):
                            setattr(user, attr_name, attr_value)
                            update_fields.append(attr_name)
                    except Exception as e:"""
    
    modified_content = re.sub(update_attrs_pattern, update_attrs_replacement, modified_content)
    
    # Write the modified content back to the file
    with open(AUTH_FILE_PATH, 'w') as f:
        f.write(modified_content)
    
    print(f"Successfully modified {AUTH_FILE_PATH}")
    print("The authentication system now properly handles user creation with the custom User model.")

def main():
    """Main function to execute the script"""
    parser = argparse.ArgumentParser(description='Fix Employee Authentication')
    parser.add_argument('--dry-run', action='store_true', help='Perform a dry run without making changes')
    args = parser.parse_args()
    
    print("Starting Employee Authentication Fix Script...")
    
    if args.dry_run:
        print("Performing dry run (no changes will be made)")
        # Check if the file exists
        if not os.path.exists(AUTH_FILE_PATH):
            print(f"ERROR: File {AUTH_FILE_PATH} does not exist")
            sys.exit(1)
        print(f"File {AUTH_FILE_PATH} exists and would be modified")
    else:
        # Actually fix the file
        fix_authentication_file()
    
    print("\nEmployeeAuthentication fix complete!")
    print("\nRecommended actions:")
    print("1. Restart the Django server to apply the changes")
    print("2. Verify that employee management API requests now work correctly")
    print("3. Update the script registry with the execution status")

if __name__ == "__main__":
    main() 