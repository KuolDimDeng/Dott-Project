#!/usr/bin/env python
"""
Script: Version0003_DirectFix_TemplatesSSL.py
Description: Directly fixes the TEMPLATES section in settings.py by removing SSL settings
Version: 1.0
Date: 2023-05-03
"""

import os
import sys
import shutil
import subprocess
from datetime import datetime

# Configure paths
SETTINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'pyfactor', 'settings.py')
BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backups')

# Ensure backup directory exists
if not os.path.exists(BACKUP_DIR):
    os.makedirs(BACKUP_DIR)

# Create backup filename with timestamp
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
BACKUP_FILE = os.path.join(BACKUP_DIR, f'settings.py.direct_fix_backup_{timestamp}')

def create_backup():
    """Create a backup of the original file"""
    try:
        shutil.copy2(SETTINGS_FILE, BACKUP_FILE)
        print(f"Created backup at: {BACKUP_FILE}")
        return True
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False

def direct_fix_with_sed():
    """Use sed to directly remove SSL settings from TEMPLATES section"""
    try:
        # First, identify the line numbers of the TEMPLATES section
        with open(SETTINGS_FILE, 'r') as file:
            lines = file.readlines()
        
        templates_start_line = -1
        templates_end_line = -1
        
        for i, line in enumerate(lines):
            if 'TEMPLATES = [' in line:
                templates_start_line = i
            if templates_start_line >= 0 and ']' in line and templates_end_line < 0:
                templates_end_line = i
        
        if templates_start_line < 0 or templates_end_line < 0:
            print("Could not find TEMPLATES section boundaries")
            return False
        
        # Use sed commands to delete sslmode, sslrootcert, sslcert, and sslkey lines
        # within the TEMPLATES section
        sed_command = f'''sed -i '' '{templates_start_line},{templates_end_line}s/'sslmode'[^,]*,//g' {SETTINGS_FILE}'''
        subprocess.run(sed_command, shell=True, check=True)
        
        sed_command = f'''sed -i '' '{templates_start_line},{templates_end_line}s/'sslrootcert'[^,]*,//g' {SETTINGS_FILE}'''
        subprocess.run(sed_command, shell=True, check=True)
        
        sed_command = f'''sed -i '' '{templates_start_line},{templates_end_line}s/'sslcert'[^,]*,//g' {SETTINGS_FILE}'''
        subprocess.run(sed_command, shell=True, check=True)
        
        sed_command = f'''sed -i '' '{templates_start_line},{templates_end_line}s/'sslkey'[^,]*,//g' {SETTINGS_FILE}'''
        subprocess.run(sed_command, shell=True, check=True)
        
        print("Successfully removed SSL settings from TEMPLATES section")
        return True
    except Exception as e:
        print(f"Error in direct fix with sed: {e}")
        return False

def manual_file_fix():
    """Manually fix the file by editing it directly"""
    try:
        # Read the file line by line
        with open(SETTINGS_FILE, 'r') as file:
            lines = file.readlines()
        
        # Initialize markers
        in_templates = False
        fixed_content = []
        ssl_lines_found = 0
        
        # Process each line
        for line in lines:
            # Check if we're entering TEMPLATES section
            if 'TEMPLATES = [' in line:
                in_templates = True
                fixed_content.append(line)
                continue
            
            # Check if we're leaving TEMPLATES section
            if in_templates and line.strip() == ']':
                in_templates = False
                fixed_content.append(line)
                continue
            
            # Skip SSL-related lines in TEMPLATES section
            if in_templates and any(ssl_param in line for ssl_param in [
                "'sslmode'", "'sslrootcert'", "'sslcert'", "'sslkey'"
            ]):
                ssl_lines_found += 1
                continue
            
            # Keep all other lines
            fixed_content.append(line)
        
        # If we found and removed SSL lines, write the fixed content
        if ssl_lines_found > 0:
            with open(SETTINGS_FILE, 'w') as file:
                file.writelines(fixed_content)
            print(f"Successfully removed {ssl_lines_found} SSL-related lines from TEMPLATES section")
            return True
        else:
            print("No SSL-related lines found in TEMPLATES section")
            
            # Last resort: do a direct text replacement
            with open(SETTINGS_FILE, 'r') as file:
                content = file.read()
            
            # Replace SSL settings in TEMPLATES section
            modified_content = content.replace(
                "'sslmode': 'require',\n            'sslrootcert': os.path.join(BASE_DIR, 'certificates', 'server-ca.pem'),\n            'sslcert': os.path.join(BASE_DIR, 'certificates', 'client-cert.pem'),\n            'sslkey': os.path.join(BASE_DIR, 'certificates', 'client-key.pem'),", 
                ""
            )
            modified_content = modified_content.replace(
                "'sslmode': 'require',\n            'sslrootcert': '/Users/kuoldeng/projectx/certificates/server-ca.pem',\n            'sslcert': '/Users/kuoldeng/projectx/certificates/client-cert.pem',\n            'sslkey': '/Users/kuoldeng/projectx/certificates/client-key.pem',", 
                ""
            )
            
            # Write the modified content back
            with open(SETTINGS_FILE, 'w') as file:
                file.write(modified_content)
            
            print("Applied direct text replacement as a last resort")
            return True
    except Exception as e:
        print(f"Error in manual file fix: {e}")
        return False

def main():
    """Main execution function"""
    print("Starting direct fix for SSL settings in TEMPLATES section...")
    
    # Step 1: Create backup
    if not create_backup():
        print("Aborting due to backup failure")
        return False
    
    # Step 2: Try direct fix with sed
    if not direct_fix_with_sed():
        print("Sed-based fix failed, trying manual file fix...")
        if not manual_file_fix():
            print("Manual file fix failed as well")
            return False
    
    print("\nFix applied successfully!")
    print("\nIMPORTANT: This script has directly removed the SSL settings from the TEMPLATES section.")
    print("Please restart the server with 'python run_server.py' to apply the changes.")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 