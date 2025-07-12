#!/usr/bin/env python
"""
Fix_Frontend_Employee_Form.py

Purpose:
    This script directly modifies the frontend employee form component to:
    1. Add a Date of Birth (DOB) field
    2. Remove the Role selection field
    3. Set default values for date_joined and role in the frontend

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
                                        'frontend_form_fix.log')),
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

def get_frontend_form_path():
    """Find the frontend employee form component"""
    # Try different possible locations
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
                    'frontend', 'pyfactor_next', 'src', 'app', 'dashboard', 'components', 'forms', 'EmployeeManagement.js'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
                    'frontend', 'src', 'components', 'forms', 'EmployeeManagement.js'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
                    'frontend', 'components', 'forms', 'EmployeeManagement.js')
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    # If not found, try to search for it
    try:
        logger.info("Searching for EmployeeManagement.js file...")
        frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
                                   'frontend')
        
        for root, dirs, files in os.walk(frontend_dir):
            if 'EmployeeManagement.js' in files:
                return os.path.join(root, 'EmployeeManagement.js')
    except Exception as e:
        logger.error(f"Error searching for form file: {str(e)}")
    
    return None

def fix_employee_form():
    """Fix the frontend employee form component"""
    # Find the form file
    employee_form_path = get_frontend_form_path()
    
    if not employee_form_path:
        logger.error("Could not find the frontend employee form component")
        return False
    
    logger.info(f"Found frontend form at: {employee_form_path}")
    
    if not create_backup(employee_form_path):
        logger.error("Aborting due to backup failure")
        return False
    
    try:
        # Read the file
        with open(employee_form_path, 'r') as f:
            content = f.read()
        
        # 1. Remove the Role dropdown field
        role_pattern = r'<div>\s*<label[^>]*>Role</label>\s*<select\s*name="role"[^>]*>[\s\S]*?</select>\s*</div>'
        content_without_role = re.sub(role_pattern, '', content)
        
        # 2. Add DOB field after Last Name field
        dob_field = '''
        <TextField
          label="Date of Birth"
          type="date"
          name="dob"
          value={newEmployee.dob}
          onChange={handleInputChange}
          required
          fullWidth
        />'''
        
        # Find a suitable position to add the DOB field
        last_name_pattern = r'(<TextField\s*label="Last Name"[^>]*?fullWidth[^>]*?/>)'
        
        # First try to find the Last Name field
        if re.search(last_name_pattern, content_without_role):
            modified_content = re.sub(last_name_pattern, f'\\1\n        {dob_field}', content_without_role)
        else:
            # If Last Name field pattern doesn't match, try another approach
            # Look for any TextField component and insert after it
            any_field_pattern = r'(<TextField[^>]*?fullWidth[^>]*?/>)'
            match = re.search(any_field_pattern, content_without_role)
            if match:
                insert_pos = match.end()
                modified_content = content_without_role[:insert_pos] + dob_field + content_without_role[insert_pos:]
            else:
                logger.error("Could not find a suitable position to add DOB field")
                return False
        
        # 3. Update the default state for newEmployee
        # First, find the useState initialization for newEmployee
        state_pattern = r'const\s+\[newEmployee,\s+setNewEmployee\]\s*=\s*useState\(\{([^}]*)\}\);'
        state_match = re.search(state_pattern, modified_content)
        
        if state_match:
            state_content = state_match.group(1)
            
            # Check if dob is already in the state
            if 'dob:' not in state_content:
                # Add dob to the state
                new_state = state_content + "    dob: '',\n"
                
                # Remove role if present
                new_state = re.sub(r'\s*role:\s*[\'"][^\'"]*[\'"],?', '', new_state)
                
                # Ensure date_joined is set to today's date by default
                if 'date_joined:' in new_state:
                    # Replace date_joined with today's date
                    new_state = re.sub(
                        r'(\s*date_joined:\s*)[\'"][^\'"]*[\'"]', 
                        r'\1"' + datetime.datetime.now().strftime('%Y-%m-%d') + '"', 
                        new_state
                    )
                else:
                    # Add date_joined with today's date
                    new_state += f"    date_joined: '{datetime.datetime.now().strftime('%Y-%m-%d')}',\n"
                
                # Replace the state content
                modified_content = modified_content.replace(state_match.group(1), new_state)
            
        # 4. Update the submit handler to always set role='user'
        # Look for the form submission handler - typically the onSubmit function or handleSubmit
        submit_pattern = r'(const\s+handleSubmit|function\s+handleSubmit|const\s+onSubmit|function\s+onSubmit)[^{]*\{'
        submit_match = re.search(submit_pattern, modified_content)
        
        if submit_match:
            # Find the closing brace of the function
            start_pos = submit_match.end()
            # Count opening and closing braces to find the end of the function
            brace_count = 1
            end_pos = start_pos
            
            for i in range(start_pos, len(modified_content)):
                if modified_content[i] == '{':
                    brace_count += 1
                elif modified_content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_pos = i
                        break
            
            # Get the function content
            submit_function = modified_content[start_pos:end_pos]
            
            # Add code to set role='user' if not already there
            if 'role = "user"' not in submit_function and "role = 'user'" not in submit_function:
                # Find a good position to insert the code
                # Look for form data construction
                data_construction_pos = submit_function.find('const formData') 
                if data_construction_pos != -1:
                    # Insert before form data construction
                    role_code = "    // Always set role to 'user'\n    const formData = {...newEmployee, role: 'user'};\n"
                    modified_submit = submit_function.replace('const formData', role_code)
                    modified_content = modified_content.replace(submit_function, modified_submit)
                else:
                    # If no form data construction, look for API calls or event.preventDefault
                    api_call_pos = submit_function.find('axios.post') or submit_function.find('fetch') or submit_function.find('preventDefault')
                    if api_call_pos != -1:
                        # Insert before API call
                        # This is a simplistic approach, would need to be more nuanced in a real script
                        role_code = "    // Always set role to 'user'\n    newEmployee.role = 'user';\n\n"
                        modified_submit = submit_function[:api_call_pos] + role_code + submit_function[api_call_pos:]
                        modified_content = modified_content.replace(submit_function, modified_submit)
        
        # Save the modified file
        with open(employee_form_path, 'w') as f:
            f.write(modified_content)
        
        logger.info("Successfully fixed frontend employee form")
        return True
        
    except Exception as e:
        logger.error(f"Error fixing frontend employee form: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info("Starting frontend employee form fix script")
    
    if fix_employee_form():
        logger.info("Successfully fixed the frontend employee form")
    else:
        logger.error("Failed to fix the frontend employee form")

if __name__ == "__main__":
    main() 