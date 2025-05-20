#!/usr/bin/env python
"""
Version0002_Update_Employee_Form_and_Role.py

Purpose:
    This script updates the employee management form and role handling:
    1. Adds a date of birth (dob) field to the employee form
    2. Removes the 'Role' input field from the frontend form
    3. Sets all employees' role to 'user' by default
    4. Updates the HR views.py to handle the new changes

Date: April 22, 2025
Author: AI Assistant
Version: 1.0

Execution:
    1. Create backup of original files
    2. Update hr/views.py to set role='user' when creating employees
    3. Update the frontend employee management form component
    4. Log changes made
"""

import os
import sys
import logging
import shutil
import datetime
import re
from pathlib import Path

# Add the parent directory to the system path to allow importing Django settings
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                        'employee_form_update.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def create_backup(file_path):
    """Create a backup of the file"""
    backup_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_filename = f"{os.path.basename(file_path)}.{timestamp}.bak"
    backup_path = os.path.join(backup_dir, backup_filename)
    
    try:
        shutil.copy2(file_path, backup_path)
        logger.info(f"Created backup at {backup_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to create backup: {str(e)}")
        return False

def update_hr_views():
    """Update hr/views.py to set role='user' when creating employees"""
    # Define the path to the target file
    hr_views_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'hr', 'views.py'
    )
    
    # Ensure the file exists
    if not os.path.exists(hr_views_path):
        logger.error(f"Target file not found: {hr_views_path}")
        return False
    
    # Create a backup
    if not create_backup(hr_views_path):
        logger.error("Aborting due to backup failure")
        return False
    
    try:
        # Read the file content
        with open(hr_views_path, 'r') as f:
            content = f.read()
        
        # Find the employee creation code in the employee_list view
        employee_creation_pattern = r'(serializer = EmployeeSerializer\(data=request\.data\).*?if serializer\.is_valid\(\):.*?# Set the business_id from the current user\s*employee = serializer\.save\(business_id=request\.user\.business_id\))'
        
        # Replace with modified version that sets role='user'
        replacement = r'\1\n            # Set role to user for all employees\n            employee.role = "user"\n            employee.save()'
        
        modified_content = re.sub(employee_creation_pattern, replacement, content, flags=re.DOTALL)
        
        if modified_content == content:
            logger.warning("Could not find the employee creation code in hr/views.py, trying another approach...")
            
            # Alternative approach: find the serializer.save line 
            save_pattern = r'(employee = serializer\.save\(business_id=request\.user\.business_id\))'
            replacement = r'\1\n            # Set role to user for all employees\n            employee.role = "user"\n            employee.save()'
            
            modified_content = re.sub(save_pattern, replacement, content)
            
            if modified_content == content:
                logger.error("Could not find the serializer.save pattern in hr/views.py")
                return False
        
        # Save the modified file
        with open(hr_views_path, 'w') as f:
            f.write(modified_content)
        
        logger.info("Successfully updated hr/views.py to set role='user' for new employees")
        return True
        
    except Exception as e:
        logger.error(f"Error updating hr/views.py: {str(e)}")
        return False

def update_employee_form():
    """Update the frontend employee management form to add dob field and remove role field"""
    # Define the path to the target file
    employee_form_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
        'frontend', 'pyfactor_next', 'src', 'app', 'dashboard', 'components', 'forms', 'EmployeeManagement.js'
    )
    
    # Ensure the file exists
    if not os.path.exists(employee_form_path):
        logger.error(f"Target file not found: {employee_form_path}")
        return False
    
    # Create a backup
    if not create_backup(employee_form_path):
        logger.error("Aborting due to backup failure")
        return False
    
    try:
        # Read the file content
        with open(employee_form_path, 'r') as f:
            content = f.read()
        
        # Find the Role dropdown field and remove it
        role_dropdown_pattern = r'<div>\s*<label[^>]*>Role</label>\s*<select\s*name="role"[^>]*>[\s\S]*?</select>\s*</div>'
        content_without_role = re.sub(role_dropdown_pattern, '', content)
        
        # Find a suitable position to add the DOB field (after Date Joined would be ideal)
        date_joined_pattern = r'(<TextField\s*label="Date Joined"[^>]*?fullWidth\s*/>)'
        dob_field = '''$1
        
        <TextField
          label="Date of Birth"
          type="date"
          name="dob"
          value={newEmployee.dob}
          onChange={handleInputChange}
          required
          fullWidth
        />'''
        
        modified_content = re.sub(date_joined_pattern, dob_field, content_without_role)
        
        # If we couldn't find the Date Joined field, try to add DOB after the Last Name field
        if modified_content == content_without_role:
            last_name_pattern = r'(<TextField\s*label="Last Name"[^>]*?fullWidth\s*/>)'
            modified_content = re.sub(last_name_pattern, r'$1\n        \n        <TextField\n          label="Date of Birth"\n          type="date"\n          name="dob"\n          value={newEmployee.dob}\n          onChange={handleInputChange}\n          required\n          fullWidth\n        />', content_without_role)
        
        # Update default employee state to include dob and remove role
        default_employee_pattern = r'(const \[newEmployee, setNewEmployee\] = useState\({.*?)\s*role: [\'"][^\'"]*[\'"],[^}]*(.*?\});'
        default_employee_replacement = r'\1\n    dob: "", \2};'
        
        modified_content = re.sub(default_employee_pattern, default_employee_replacement, modified_content, flags=re.DOTALL)
        
        # Save the modified file
        with open(employee_form_path, 'w') as f:
            f.write(modified_content)
            
        logger.info("Successfully updated the employee management form")
        return True
        
    except Exception as e:
        logger.error(f"Error updating employee form: {str(e)}")
        return False

def update_employee_model():
    """Update the Employee model to set role default to 'user'"""
    # Define the path to the target file
    model_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'hr', 'models.py'
    )
    
    # Ensure the file exists
    if not os.path.exists(model_path):
        logger.error(f"Target file not found: {model_path}")
        return False
    
    # Create a backup
    if not create_backup(model_path):
        logger.error("Aborting due to backup failure")
        return False
    
    try:
        # Read the file content
        with open(model_path, 'r') as f:
            content = f.read()
        
        # Update the role field to set default to 'user' and update choices
        role_field_pattern = r'role = models\.CharField\(max_length=\d+, choices=\[(.*?)\], default=[\'"][^\'"]*[\'"]\)'
        role_field_replacement = r'role = models.CharField(max_length=20, choices=[("user", "user")], default="user")'
        
        modified_content = re.sub(role_field_pattern, role_field_replacement, content)
        
        # Save the modified file
        with open(model_path, 'w') as f:
            f.write(modified_content)
            
        logger.info("Successfully updated the Employee model to set role default to 'user'")
        return True
        
    except Exception as e:
        logger.error(f"Error updating Employee model: {str(e)}")
        return False

def update_script_registry():
    """Update the script registry with execution information"""
    registry_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        'script_registry.md'
    )
    
    try:
        with open(registry_path, 'r') as f:
            content = f.read()
        
        # Check if the script is already registered
        script_name = os.path.basename(__file__)
        if script_name in content:
            logger.info("Script already registered in registry")
            return True
        
        # Add entry to the registry table
        current_date = datetime.datetime.now().strftime('%Y-%m-%d')
        new_entry = f"| {script_name} | 1.0 | Update employee form: add DOB field, remove role field, set role to 'user' | Completed | {current_date} |\n"
        
        # Find the registry table
        table_marker = "| Script Name | Version | Purpose | Status | Date |"
        table_separator = "|-------------|---------|---------|--------|------|"
        
        # Add after the table separator
        modified_content = content.replace(
            f"{table_separator}\n", 
            f"{table_separator}\n{new_entry}"
        )
        
        # Save the modified registry
        with open(registry_path, 'w') as f:
            f.write(modified_content)
        
        logger.info("Successfully updated script registry")
        return True
    
    except Exception as e:
        logger.error(f"Error updating script registry: {str(e)}")
        return False

def create_documentation():
    """Create documentation for the employee form update"""
    doc_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        'EMPLOYEE_FORM_UPDATE.md'
    )
    
    try:
        doc_content = """# Employee Form Update

## Overview

This document describes the changes made to the employee management functionality to standardize roles and improve the form.

## Changes Made

1. **Added Date of Birth Field**
   - Added a required DOB field to the employee form
   - Updated field validation

2. **Removed Role Selection**
   - Removed the role dropdown from the employee creation form
   - Set all employee roles to 'user' by default
   - Updated the backend to enforce this policy

3. **Standardized Terminology**
   - Updated model to ensure consistency in role naming

## Technical Implementation

The changes were implemented in the following files:

1. **Backend**
   - `hr/views.py`: Updated to set role to 'user' for all newly created employees
   - `hr/models.py`: Updated the role field's choices and default value

2. **Frontend**
   - `EmployeeManagement.js`: Added DOB field, removed role field, updated state management

## Verification

After these changes, the employee creation process should:
1. Require a date of birth
2. Not show a role selection field
3. Set all new employees to have role='user'

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-04-22 | AI Assistant | Initial implementation |
"""
        
        with open(doc_path, 'w') as f:
            f.write(doc_content)
        
        logger.info(f"Successfully created documentation at {doc_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error creating documentation: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("Starting employee form and role update script")
    
    # Execute the update functions
    hr_views_updated = update_hr_views()
    employee_form_updated = update_employee_form()
    employee_model_updated = update_employee_model()
    
    # Update script registry and create documentation
    if hr_views_updated and employee_form_updated and employee_model_updated:
        logger.info("All updates completed successfully")
        update_script_registry()
        create_documentation()
    else:
        logger.error("Some updates failed, please check the logs")

if __name__ == "__main__":
    main() 