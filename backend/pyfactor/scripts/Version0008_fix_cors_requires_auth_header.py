#!/usr/bin/env python3
"""
Version0008_fix_cors_requires_auth_header.py

This script adds the X-Requires-Auth header to the CORS configuration in both 
Django settings and the CorsMiddleware class.

The script does the following:
1. Creates backups of the modified files
2. Adds 'X-Requires-Auth' header to the CORS_ALLOW_HEADERS in settings.py
3. Adds 'X-Requires-Auth' header to the _add_cors_headers method in cors.py
4. Updates script registry to document the change

Author: System Administrator
Version: 1.0
Date: 2025-04-23
"""

import os
import sys
import re
import shutil
import logging
from datetime import datetime

# Configure logging
log_filename = "cors_requires_auth_fix.log"
logging.basicConfig(
    filename=log_filename,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETTINGS_FILE = os.path.join(BASE_DIR, 'pyfactor', 'settings.py')
CORS_MIDDLEWARE_FILE = os.path.join(BASE_DIR, 'custom_auth', 'cors.py')
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
SETTINGS_BACKUP_FILE = os.path.join(BACKUP_DIR, f'settings.py.requires_auth_cors_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
CORS_BACKUP_FILE = os.path.join(BACKUP_DIR, f'cors.py.requires_auth_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}')

def ensure_directory_exists(directory_path):
    """Ensure the specified directory exists, creating it if necessary."""
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)
        logging.info(f"Created directory: {directory_path}")
    return directory_path

def create_backup(source_file, backup_file):
    """Create a backup of the specified file."""
    try:
        ensure_directory_exists(os.path.dirname(backup_file))
        shutil.copy2(source_file, backup_file)
        logging.info(f"Created backup: {backup_file}")
        print(f"✅ Created backup: {backup_file}")
        return True
    except Exception as e:
        logging.error(f"Failed to create backup: {str(e)}")
        print(f"❌ Failed to create backup: {str(e)}")
        return False

def fix_settings_file(file_path):
    """Fix CORS headers in settings.py to include X-Requires-Auth."""
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Check if X-Requires-Auth is already included
        if "X-Requires-Auth" in content:
            logging.info("X-Requires-Auth is already included in settings.py")
            print("ℹ️ X-Requires-Auth is already included in settings.py")
            return True
        
        # Find the CORS_ALLOW_HEADERS section
        cors_headers_match = re.search(r'CORS_ALLOW_HEADERS\s*=\s*\[(.*?)\]', content, re.DOTALL)
        if not cors_headers_match:
            logging.error("Could not find CORS_ALLOW_HEADERS in settings.py")
            print("❌ Could not find CORS_ALLOW_HEADERS in settings.py")
            return False
        
        # Add X-Requires-Auth headers to the list
        headers_section = cors_headers_match.group(1)
        # Find the last header item
        last_header_match = re.search(r'(\'[^\']*\'|\"[^\"]*\")\s*$', headers_section)
        if not last_header_match:
            logging.error("Could not find the last header in CORS_ALLOW_HEADERS")
            print("❌ Could not find the last header in CORS_ALLOW_HEADERS")
            return False
        
        # Replace the last header with itself followed by the new headers
        new_headers = last_header_match.group(1) + ',\n    \'X-Requires-Auth\',  # Add Requires Auth header\n    \'x-requires-auth\',  # Lowercase version'
        modified_headers_section = headers_section[:last_header_match.start(1)] + new_headers
        
        # Replace the headers section in the content
        modified_content = content[:cors_headers_match.start(1)] + modified_headers_section + content[cors_headers_match.end(1):]
        
        # Write the updated content back to the file
        with open(file_path, 'w') as file:
            file.write(modified_content)
        
        logging.info("Successfully added X-Requires-Auth to CORS_ALLOW_HEADERS in settings.py")
        print("✅ Successfully added X-Requires-Auth to CORS_ALLOW_HEADERS in settings.py")
        return True
    
    except Exception as e:
        logging.error(f"Error fixing settings.py: {str(e)}")
        print(f"❌ Error fixing settings.py: {str(e)}")
        return False

def fix_cors_middleware(file_path):
    """Fix CORS middleware to include X-Requires-Auth header."""
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Check if X-Requires-Auth is already included
        if "X-Requires-Auth" in content:
            logging.info("X-Requires-Auth is already included in cors.py")
            print("ℹ️ X-Requires-Auth is already included in cors.py")
            return True
        
        # Add X-Requires-Auth to the Access-Control-Allow-Headers
        headers_allow_match = re.search(r'response\["Access-Control-Allow-Headers"\]\s*=\s*\((.*?)\)', content, re.DOTALL)
        if not headers_allow_match:
            logging.error("Could not find Access-Control-Allow-Headers in cors.py")
            print("❌ Could not find Access-Control-Allow-Headers in cors.py")
            return False
        
        headers_content = headers_allow_match.group(1)
        last_line_match = re.search(r'([^\n]*)\"\s*$', headers_content)
        if not last_line_match:
            logging.error("Could not find the last line in Access-Control-Allow-Headers")
            print("❌ Could not find the last line in Access-Control-Allow-Headers")
            return False
        
        # Add X-Requires-Auth to the last line
        new_headers_content = headers_content[:last_line_match.start(1)] + last_line_match.group(1) + ", X-Requires-Auth, x-requires-auth\""
        
        # Replace the headers content
        modified_content = content[:headers_allow_match.start(1)] + new_headers_content + content[headers_allow_match.end(1):]
        
        # Write the updated content back to the file
        with open(file_path, 'w') as file:
            file.write(modified_content)
        
        logging.info("Successfully added X-Requires-Auth to Access-Control-Allow-Headers in cors.py")
        print("✅ Successfully added X-Requires-Auth to Access-Control-Allow-Headers in cors.py")
        return True
    
    except Exception as e:
        logging.error(f"Error fixing cors.py: {str(e)}")
        print(f"❌ Error fixing cors.py: {str(e)}")
        return False

def update_script_registry():
    """Update the script registry with the execution of this script."""
    registry_path = os.path.join(BASE_DIR, 'scripts', 'script_registry.md')
    try:
        if os.path.exists(registry_path):
            with open(registry_path, 'r') as file:
                content = file.read()
            
            # Add entry to the script registry
            script_name = os.path.basename(__file__)
            today = datetime.now().strftime('%Y-%m-%d')
            
            if "| " + script_name + " |" not in content:
                table_marker = "| Script Name | Version | Purpose | Status | Date |"
                table_entry = f"| {script_name} | 1.0 | Add X-Requires-Auth to CORS configuration | Completed | {today} |"
                
                # Insert after table header
                if table_marker in content:
                    new_content = content.replace(table_marker, table_marker + "\n" + table_entry)
                else:
                    # If table not found, append to end of file
                    new_content = content + "\n\n## New Scripts\n\n" + table_marker + "\n" + table_entry
                
                with open(registry_path, 'w') as file:
                    file.write(new_content)
                
                logging.info(f"Updated script registry at {registry_path}")
                print(f"✅ Updated script registry at {registry_path}")
            else:
                logging.info(f"Script already registered in {registry_path}")
                print(f"ℹ️ Script already registered in {registry_path}")
        else:
            logging.warning(f"Script registry not found at {registry_path}")
            print(f"⚠️ Script registry not found at {registry_path}")
    
    except Exception as e:
        logging.error(f"Error updating script registry: {str(e)}")
        print(f"❌ Error updating script registry: {str(e)}")

def main():
    """Main function to fix CORS headers for X-Requires-Auth."""
    print("\n" + "="*80)
    print("🔧 CORS Fix for X-Requires-Auth Header")
    print("="*80 + "\n")
    
    # Create backup of settings file
    if not create_backup(SETTINGS_FILE, SETTINGS_BACKUP_FILE):
        print("❌ Aborting script due to settings backup failure")
        return False
    
    # Create backup of CORS middleware file
    if not create_backup(CORS_MIDDLEWARE_FILE, CORS_BACKUP_FILE):
        print("❌ Aborting script due to CORS middleware backup failure")
        return False
    
    # Fix settings.py
    if not fix_settings_file(SETTINGS_FILE):
        print("❌ Failed to fix settings.py")
        # Restore backup
        shutil.copy2(SETTINGS_BACKUP_FILE, SETTINGS_FILE)
        print(f"✅ Restored original settings from backup: {SETTINGS_BACKUP_FILE}")
        return False
    
    # Fix CORS middleware
    if not fix_cors_middleware(CORS_MIDDLEWARE_FILE):
        print("❌ Failed to fix CORS middleware")
        # Restore backup
        shutil.copy2(CORS_BACKUP_FILE, CORS_MIDDLEWARE_FILE)
        print(f"✅ Restored original middleware from backup: {CORS_BACKUP_FILE}")
        return False
    
    # Update script registry
    update_script_registry()
    
    print("\n" + "="*80)
    print("✅ CORS Fix for X-Requires-Auth Header completed successfully!")
    print("✅ To apply the changes, please restart the Django server (Ctrl+C then python run_server.py).")
    print("="*80 + "\n")
    
    return True

if __name__ == "__main__":
    main() 