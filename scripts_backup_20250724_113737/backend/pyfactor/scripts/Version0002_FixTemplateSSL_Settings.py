#!/usr/bin/env python
"""
Script: Version0002_FixTemplateSSL_Settings.py
Description: Fixes erroneously added SSL settings in the TEMPLATES section
Version: 1.1
Date: 2023-05-03
"""

import os
import sys
import shutil
import re
from datetime import datetime

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure paths
SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'pyfactor', 'settings.py')
BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backups')

# Ensure backup directory exists
if not os.path.exists(BACKUP_DIR):
    os.makedirs(BACKUP_DIR)

# Create backup filename with timestamp
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
BACKUP_FILE = os.path.join(BACKUP_DIR, f'settings.py.template_fix_backup_{timestamp}')

def create_backup():
    """Create a backup of the original file"""
    try:
        shutil.copy2(SETTINGS_FILE, BACKUP_FILE)
        print(f"Created backup at: {BACKUP_FILE}")
        return True
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False

def fix_templates_section():
    """Fix the TEMPLATES section by removing the SSL settings using a simpler approach"""
    try:
        # Read the original file line by line
        with open(SETTINGS_FILE, 'r') as file:
            lines = file.readlines()
        
        # Initialize variables
        in_templates_section = False
        in_templates_options = False
        fixed_lines = []
        ssl_lines_removed = 0
        
        # Process each line
        for line in lines:
            # Detect TEMPLATES section start
            if 'TEMPLATES = [' in line:
                in_templates_section = True
                fixed_lines.append(line)
                continue
            
            # Detect if we're entering the OPTIONS section within TEMPLATES
            if in_templates_section and "'OPTIONS': {" in line:
                in_templates_options = True
                fixed_lines.append(line)
                continue
            
            # Check if we're leaving the TEMPLATES section
            if in_templates_section and ']' in line and not in_templates_options:
                in_templates_section = False
                fixed_lines.append(line)
                continue
            
            # Check if we're leaving the OPTIONS section
            if in_templates_options and '},' in line and not any(ssl_keyword in line for ssl_keyword in ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']):
                in_templates_options = False
                fixed_lines.append(line)
                continue
            
            # Skip SSL-related lines in TEMPLATES OPTIONS
            if in_templates_options and any(ssl_keyword in line for ssl_keyword in ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']):
                ssl_lines_removed += 1
                continue
            
            # Add any other line
            fixed_lines.append(line)
        
        # If we didn't remove any lines, check if we need to do a direct replacement
        if ssl_lines_removed == 0:
            # Try a direct pattern replacement as a fallback
            fixed_content = ''.join(fixed_lines)
            templates_options_pattern = r"(TEMPLATES\s*=\s*\[\s*\{.*?'OPTIONS':\s*\{.*?)('sslmode':[^\}]+)([^\]]+\}\s*\])"
            modified_content, replacements = re.subn(templates_options_pattern, r'\1\3', fixed_content, flags=re.DOTALL)
            
            if replacements > 0:
                # This worked, so let's use this content
                with open(SETTINGS_FILE, 'w') as file:
                    file.write(modified_content)
                print(f"Successfully removed SSL settings using pattern replacement")
                return True
            else:
                print("No SSL settings found in TEMPLATES section. No changes made.")
                return True
        
        # Write the fixed content back to the file
        with open(SETTINGS_FILE, 'w') as file:
            file.writelines(fixed_lines)
        
        print(f"Successfully removed {ssl_lines_removed} SSL-related lines from TEMPLATES section in {SETTINGS_FILE}")
        return True
    except Exception as e:
        print(f"Error fixing TEMPLATES section: {e}")
        return False

def direct_file_edit():
    """Direct file edit approach as a last resort"""
    try:
        # Read the file as a single string
        with open(SETTINGS_FILE, 'r') as file:
            content = file.read()
        
        # Define patterns to match and remove SSL settings in TEMPLATES
        ssl_in_templates_pattern = r"TEMPLATES\s*=\s*\[\s*\{.*?'OPTIONS':\s*\{.*?'context_processors':\s*\[.*?\],\s*('sslmode':[^}]*?,\s*'sslrootcert':[^}]*?,\s*'sslcert':[^}]*?,\s*'sslkey':[^}]*?,\s*)*"
        
        # Check if the pattern exists in the content
        if re.search(ssl_in_templates_pattern, content, re.DOTALL):
            # Replace 'sslmode', 'sslrootcert', 'sslcert', 'sslkey' entries in TEMPLATES
            # First isolate the TEMPLATES section with OPTIONS
            templates_section_match = re.search(r"(TEMPLATES\s*=\s*\[\s*\{.*?'OPTIONS':\s*\{.*?)\},", content, re.DOTALL)
            if templates_section_match:
                templates_section = templates_section_match.group(1)
                # Remove SSL-related lines
                cleaned_templates_section = re.sub(r"'sslmode':[^,]*,\s*|'sslrootcert':[^,]*,\s*|'sslcert':[^,]*,\s*|'sslkey':[^,]*,\s*", "", templates_section)
                # Replace in the original content
                modified_content = content.replace(templates_section, cleaned_templates_section)
                
                # Write back to the file
                with open(SETTINGS_FILE, 'w') as file:
                    file.write(modified_content)
                
                print("Successfully removed SSL settings from TEMPLATES using direct edit approach")
                return True
        else:
            # Read file line by line and manually remove SSL settings from TEMPLATES section
            with open(SETTINGS_FILE, 'r') as file:
                lines = file.readlines()
            
            in_templates = False
            in_options = False
            new_lines = []
            
            for line in lines:
                if 'TEMPLATES = [' in line:
                    in_templates = True
                elif in_templates and ']' in line and not any(char in line for char in ['{', '}'] if not ']' in line.split(char)[0]):
                    in_templates = False
                
                if in_templates and "'OPTIONS':" in line:
                    in_options = True
                elif in_templates and in_options and '},' in line:
                    in_options = False
                
                if in_templates and in_options and any(ssl_key in line for ssl_key in ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']):
                    # Skip this line
                    continue
                
                new_lines.append(line)
            
            # Write the cleaned content back to the file
            with open(SETTINGS_FILE, 'w') as file:
                file.writelines(new_lines)
            
            print("Successfully removed SSL settings from TEMPLATES using line-by-line edit")
            return True
    except Exception as e:
        print(f"Error in direct file edit: {e}")
        return False

def main():
    """Main execution function"""
    print("Starting fix for SSL settings in TEMPLATES section...")
    
    # Step 1: Create backup
    if not create_backup():
        print("Aborting due to backup failure")
        return False
    
    # Step 2: Fix TEMPLATES section
    if not fix_templates_section():
        print("Regular fix failed, trying direct file edit approach...")
        if not direct_file_edit():
            print("All fix attempts failed.")
            return False
    
    print("\nFix applied successfully!")
    print("\nIMPORTANT: This script has removed the SSL settings from the TEMPLATES section in settings.py.")
    print("The SSL settings are now only in the DATABASES section where they belong.")
    print("\nPlease restart the server with 'python run_server.py' to apply the changes.")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 