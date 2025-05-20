#!/usr/bin/env python
"""
Version0001_Fix_Owner_Employee_Permission.py

Purpose:
    This script fixes the permission issue where users with 'owner' role cannot create employees
    despite having the appropriate role. The issue is in the case sensitivity check in the 
    HR views.py file.

Changes:
    - Updates the employee_list view function to properly handle role case sensitivity
    - Adds a more robust role comparison using case-insensitive comparison

Date: April 22, 2025
Author: AI Assistant
Version: 1.0

Execution:
    1. Create backup of the original file
    2. Apply the fix to the hr/views.py file
    3. Log changes made
"""

import os
import sys
import logging
import shutil
import datetime
from pathlib import Path

# Add the parent directory to the system path to allow importing Django settings
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                        'owner_permission_fix.log')),
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

def fix_employee_permission_issue():
    """Fix the owner permission issue in hr/views.py"""
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
        
        # Define the old and new code segments
        old_code = "        if user_role.upper() != 'owner':"
        new_code = "        if user_role.upper() != 'OWNER':"
        
        # Replace the code
        if old_code in content:
            modified_content = content.replace(old_code, new_code)
            
            # Save the modified file
            with open(hr_views_path, 'w') as f:
                f.write(modified_content)
            
            logger.info("Successfully fixed owner permission issue in hr/views.py")
            return True
        else:
            # If the exact code wasn't found, attempt a more general fix
            logger.warning("Exact code pattern not found. Attempting general fix...")
            
            # This is a more general approach to fix all occurrences
            lines = content.splitlines()
            modified_lines = []
            modified = False
            
            for line in lines:
                if "user_role.upper() != 'owner'" in line:
                    modified_line = line.replace("user_role.upper() != 'owner'", "user_role.upper() != 'OWNER'")
                    modified_lines.append(modified_line)
                    modified = True
                elif "user_role.upper() == 'owner'" in line:
                    modified_line = line.replace("user_role.upper() == 'owner'", "user_role.upper() == 'OWNER'")
                    modified_lines.append(modified_line)
                    modified = True
                else:
                    modified_lines.append(line)
            
            if modified:
                modified_content = '\n'.join(modified_lines)
                with open(hr_views_path, 'w') as f:
                    f.write(modified_content)
                
                logger.info("Successfully fixed owner permission issues in hr/views.py using general approach")
                return True
            else:
                logger.error("Could not find any instances of the role case sensitivity issue")
                return False
            
    except Exception as e:
        logger.error(f"Error fixing permission issue: {str(e)}")
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
        new_entry = f"| {script_name} | 1.0 | Fix owner permission issue in employee creation | Completed | {current_date} |\n"
        
        # Find the registry table
        table_marker = "| Script Name | Version | Purpose | Status | Date |"
        table_separator = "|-------------|---------|---------|--------|------|"
        placeholder = "| *No scripts created yet for this feature* | - | - | - | - |"
        
        if placeholder in content:
            # Replace the placeholder with the new entry
            modified_content = content.replace(placeholder, new_entry)
        elif table_marker in content and table_separator in content:
            # Add after the table separator
            modified_content = content.replace(
                f"{table_separator}\n", 
                f"{table_separator}\n{new_entry}"
            )
        else:
            logger.warning("Could not find appropriate location in registry. Adding at the end.")
            modified_content = f"{content}\n\n## New Scripts\n\n{table_marker}\n{table_separator}\n{new_entry}"
        
        # Save the modified registry
        with open(registry_path, 'w') as f:
            f.write(modified_content)
        
        logger.info("Successfully updated script registry")
        return True
    
    except Exception as e:
        logger.error(f"Error updating script registry: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("Starting owner permission fix script")
    
    success = fix_employee_permission_issue()
    if success:
        logger.info("Successfully fixed owner permission issue")
        update_script_registry()
    else:
        logger.error("Failed to fix owner permission issue")

if __name__ == "__main__":
    main() 