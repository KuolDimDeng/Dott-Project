#!/usr/bin/env python
"""
Fix_Form_Issues.py

Purpose:
    This script fixes specific issues in the Employee Management form:
    1. Removes duplicate Date of Birth fields
    2. Removes any $1 placeholders
    3. Ensures the Date Joined field is properly included
    4. Sets Role to 'user' by default

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
                                        'form_issues_fix.log')),
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
        
        # 1. Replace any $1 placeholders
        content = content.replace('$1', '')
        
        # 2. Remove duplicate DOB fields
        # First find all TextField components with DOB/Date of Birth
        dob_fields = re.findall(r'<TextField[^>]*?(?:dob|Date of Birth)[^>]*?/>', content, re.IGNORECASE | re.DOTALL)
        
        # Keep only the first one if there are multiple
        if len(dob_fields) > 1:
            for i in range(1, len(dob_fields)):
                content = content.replace(dob_fields[i], '')
        
        # If there are no DOB fields, add one
        if len(dob_fields) == 0:
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
            
            # Find a suitable position to add the DOB field (after Last Name)
            last_name_pattern = r'(<TextField\s*label="Last Name"[^>]*?fullWidth[^>]*?/>)'
            if re.search(last_name_pattern, content):
                content = re.sub(last_name_pattern, f'\\1\n        {dob_field}', content)
        
        # 3. Ensure Date Joined field exists
        date_joined_field = '''
        <TextField
          label="Date Joined"
          type="date"
          name="date_joined"
          value={newEmployee.date_joined}
          onChange={handleInputChange}
          required
          fullWidth
        />'''
        
        # Check if Date Joined field exists
        date_joined_matches = re.findall(r'<TextField[^>]*?(?:date_joined|Date Joined)[^>]*?/>', content, re.IGNORECASE | re.DOTALL)
        
        if len(date_joined_matches) == 0:
            # Add Date Joined field after the DOB field
            dob_field_pattern = r'(<TextField[^>]*?(?:dob|Date of Birth)[^>]*?/>)'
            dob_match = re.search(dob_field_pattern, content, re.IGNORECASE | re.DOTALL)
            
            if dob_match:
                content = content.replace(dob_match.group(0), f'{dob_match.group(0)}\n        {date_joined_field}')
            else:
                # If DOB field not found, try to add after any TextField
                any_field_pattern = r'(<TextField[^>]*?fullWidth[^>]*?/>)'
                any_field_match = re.search(any_field_pattern, content)
                if any_field_match:
                    content = content.replace(any_field_match.group(0), 
                                             f'{any_field_match.group(0)}\n        {date_joined_field}')
        
        # 4. Remove the Role dropdown field
        role_pattern = r'<div>\s*<label[^>]*>Role</label>\s*<select\s*name="role"[^>]*>[\s\S]*?</select>\s*</div>'
        content = re.sub(role_pattern, '', content)
        
        # 5. Update the default state for newEmployee
        # First, find the useState initialization for newEmployee
        state_pattern = r'const\s+\[newEmployee,\s+setNewEmployee\]\s*=\s*useState\(\{([^}]*)\}\);'
        state_match = re.search(state_pattern, content)
        
        if state_match:
            state_content = state_match.group(1)
            
            # Remove any existing dob fields to avoid duplicates
            state_content = re.sub(r'\s*dob:\s*[\'"][^\'"]*[\'"],?', '', state_content)
            
            # Add dob to the state
            state_content += "    dob: '',\n"
            
            # Remove role if present
            state_content = re.sub(r'\s*role:\s*[\'"][^\'"]*[\'"],?', '', state_content)
            
            # Update or add date_joined
            today_date = datetime.datetime.now().strftime('%Y-%m-%d')
            if 'date_joined:' in state_content:
                # Replace date_joined with today's date
                state_content = re.sub(
                    r'(\s*date_joined:\s*)[\'"][^\'"]*[\'"]', 
                    r'\1"' + today_date + '"', 
                    state_content
                )
            else:
                # Add date_joined with today's date
                state_content += f"    date_joined: '{today_date}',\n"
            
            # Replace the state content
            content = content.replace(state_match.group(1), state_content)
        
        # 6. Update the submit handler to always set role='user'
        # Look for the form submission handler
        submit_pattern = r'(const\s+handleSubmit|function\s+handleSubmit|const\s+onSubmit|function\s+onSubmit)[^{]*\{'
        submit_match = re.search(submit_pattern, content)
        
        if submit_match:
            # Find the closing brace of the function
            start_pos = submit_match.end()
            brace_count = 1
            end_pos = start_pos
            
            for i in range(start_pos, len(content)):
                if content[i] == '{':
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_pos = i
                        break
            
            # Get the function content
            submit_function = content[start_pos:end_pos]
            
            # Add code to set role='user' if not already there
            if 'role = "user"' not in submit_function and "role = 'user'" not in submit_function:
                # Find a good position to insert the code
                # Look for event.preventDefault() call
                prevent_default_pos = submit_function.find('preventDefault()')
                if prevent_default_pos != -1:
                    # Insert after preventDefault()
                    insert_pos = submit_function.find(';', prevent_default_pos) + 1
                    if insert_pos > 0:
                        role_code = "\n    // Always set role to 'user'\n    newEmployee.role = 'user';\n"
                        modified_submit = submit_function[:insert_pos] + role_code + submit_function[insert_pos:]
                        content = content.replace(submit_function, modified_submit)
                else:
                    # If no preventDefault(), try to find API calls
                    api_pattern = r'(axios\.post|fetch|\.then)'
                    api_match = re.search(api_pattern, submit_function)
                    if api_match:
                        # Insert before API call
                        role_code = "    // Always set role to 'user'\n    newEmployee.role = 'user';\n\n"
                        insert_pos = api_match.start()
                        modified_submit = submit_function[:insert_pos] + role_code + submit_function[insert_pos:]
                        content = content.replace(submit_function, modified_submit)
        
        # Save the modified file
        with open(employee_form_path, 'w') as f:
            f.write(content)
        
        logger.info("Successfully fixed frontend employee form issues")
        return True
        
    except Exception as e:
        logger.error(f"Error fixing frontend employee form: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

def main():
    """Main execution function"""
    logger.info("Starting frontend employee form issues fix script")
    
    if fix_employee_form():
        logger.info("Successfully fixed the frontend employee form issues")
    else:
        logger.error("Failed to fix the frontend employee form issues")

if __name__ == "__main__":
    main() 