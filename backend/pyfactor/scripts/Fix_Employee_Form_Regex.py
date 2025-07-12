#!/usr/bin/env python
"""
Fix_Employee_Form_Regex.py

Purpose:
    This script fixes the employee form where $1 placeholders were not correctly
    replaced during the previous script execution.

Date: April 22, 2025
Author: AI Assistant
Version: 1.0
"""

import os
import sys
import logging
import shutil
import datetime
import re
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                        'employee_form_regex_fix.log')),
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

def fix_employee_form():
    """Fix the $1 placeholder issue in the employee management form"""
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
        
        # Fix the $1 issue by directly adding the DOB field in the correct location
        # Find TextField components to locate where to add DOB field
        date_joined_field = re.search(r'<TextField\s+label="Date Joined"\s+type="date"\s+name="date_joined".*?/>', content, re.DOTALL)
        
        if date_joined_field:
            # Split content at the end of date_joined field
            date_joined_end_pos = date_joined_field.end()
            before_content = content[:date_joined_end_pos]
            after_content = content[date_joined_end_pos:]
            
            # Insert DOB field after date_joined field
            dob_field = """
        
        <TextField
          label="Date of Birth"
          type="date"
          name="dob"
          value={newEmployee.dob}
          onChange={handleInputChange}
          required
          fullWidth
        />"""
            
            modified_content = before_content + dob_field + after_content
            
            # Add dob to the default employee state if not already there
            if "dob: " not in content:
                default_employee_pattern = r'(const \[newEmployee, setNewEmployee\] = useState\({.*?)(\};)'
                dob_addition = r'\1    dob: "", \2'
                modified_content = re.sub(default_employee_pattern, dob_addition, modified_content, flags=re.DOTALL)
            
            # Save the modified file
            with open(employee_form_path, 'w') as f:
                f.write(modified_content)
                
            logger.info("Successfully fixed the employee management form")
            return True
        else:
            logger.error("Could not find the Date Joined field in the form")
            return False
        
    except Exception as e:
        logger.error(f"Error fixing employee form: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("Starting employee form regex fix script")
    
    # Execute the fix
    if fix_employee_form():
        logger.info("Employee form fix completed successfully")
    else:
        logger.error("Failed to fix employee form, please check the logs")

if __name__ == "__main__":
    main() 