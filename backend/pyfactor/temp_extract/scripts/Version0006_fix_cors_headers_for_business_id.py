#!/usr/bin/env python3
"""
Version0006_fix_cors_headers_for_business_id.py

This script fixes CORS configuration in Django settings.py to ensure all necessary
headers are properly configured, particularly for business_id headers which are 
causing CORS preflight errors.

The script does the following:
1. Creates a backup of the original settings.py file
2. Checks for syntax errors in the CORS_ALLOW_HEADERS list
3. Ensures all required headers are correctly included
4. Formats the header list properly with correct closing bracket
5. Restarts the Django server to apply changes

Author: System Administrator
Version: 1.0
Date: 2025-04-23
"""

import os
import sys
import re
import shutil
import logging
import subprocess
from datetime import datetime

# Configure logging
log_filename = "cors_business_id_fix.log"
logging.basicConfig(
    filename=log_filename,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETTINGS_FILE = os.path.join(BASE_DIR, 'pyfactor', 'settings.py')
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
BACKUP_FILE = os.path.join(BACKUP_DIR, f'settings.py.business_id_cors_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}')

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

def fix_cors_headers(file_path):
    """Fix CORS headers in the Django settings file."""
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Check if CORS_ALLOW_HEADERS is properly closed
        cors_headers_match = re.search(r'CORS_ALLOW_HEADERS\s*=\s*\[(.*?)\]', content, re.DOTALL)
        if not cors_headers_match:
            logging.error("Could not find CORS_ALLOW_HEADERS in settings.py")
            print("❌ Could not find CORS_ALLOW_HEADERS in settings.py")
            return False
        
        # Ensure all business ID headers are included
        required_headers = [
            "'x-business-id'",      # Lowercase business ID header
            "'X-Business-ID'",      # Standard format business ID header
            "'X-BUSINESS-ID'"       # Uppercase business ID header
        ]
        
        # Get existing headers and check if syntax is valid
        header_section = cors_headers_match.group(1)
        header_list = [h.strip() for h in header_section.split(',') if h.strip()]
        
        # Check if header list is properly terminated
        if content.find(']', cors_headers_match.start()) == -1:
            logging.warning("CORS_ALLOW_HEADERS list is not properly terminated with ']'")
            print("⚠️ CORS_ALLOW_HEADERS list is not properly terminated with ']'")
            
            # Find where to add the closing bracket
            header_section_end = cors_headers_match.start() + len(cors_headers_match.group(0))
            fixed_content = content[:header_section_end] + ']' + content[header_section_end:]
            content = fixed_content
        
        # Add any missing headers
        existing_headers_lower = [h.lower() for h in header_list]
        headers_to_add = []
        
        for header in required_headers:
            header_lower = header.lower()
            if header_lower not in existing_headers_lower:
                headers_to_add.append(header)
        
        if headers_to_add:
            # Find the position to insert the missing headers
            pattern = r'CORS_ALLOW_HEADERS\s*=\s*\[(.*?)\]'
            cors_headers_match = re.search(pattern, content, re.DOTALL)
            
            if cors_headers_match:
                header_list = cors_headers_match.group(1).strip()
                if header_list.endswith(','):
                    replacement = f"{header_list}\n    " + ",\n    ".join(headers_to_add) + "\n]"
                else:
                    replacement = f"{header_list},\n    " + ",\n    ".join(headers_to_add) + "\n]"
                
                fixed_content = content[:cors_headers_match.start(1)] + replacement + content[cors_headers_match.end(1) + 1:]
                content = fixed_content
                
                logging.info(f"Added missing headers: {', '.join(headers_to_add)}")
                print(f"✅ Added missing headers: {', '.join(headers_to_add)}")
        
        # Ensure proper formatting for CORS_EXPOSE_HEADERS
        # This is to make sure we're consistent with both header lists
        expose_headers_match = re.search(r'CORS_EXPOSE_HEADERS\s*=\s*\[(.*?)\]', content, re.DOTALL)
        if expose_headers_match:
            expose_headers = expose_headers_match.group(1).strip()
            if 'x-business-id' not in expose_headers.lower():
                if expose_headers.endswith(','):
                    replacement = f"{expose_headers}\n    'x-business-id'  # Add business ID header\n]"
                else:
                    replacement = f"{expose_headers},\n    'x-business-id'  # Add business ID header\n]"
                
                fixed_content = content[:expose_headers_match.start(1)] + replacement + content[expose_headers_match.end(1) + 1:]
                content = fixed_content
                
                logging.info("Added x-business-id to CORS_EXPOSE_HEADERS")
                print("✅ Added x-business-id to CORS_EXPOSE_HEADERS")
        
        # Write the updated content back to the file
        with open(file_path, 'w') as file:
            file.write(content)
        
        logging.info("Successfully updated CORS configuration in settings.py")
        print("✅ Successfully updated CORS configuration in settings.py")
        return True
    
    except Exception as e:
        logging.error(f"Error fixing CORS headers: {str(e)}")
        print(f"❌ Error fixing CORS headers: {str(e)}")
        return False

def restart_django_server():
    """Restart the Django server to apply changes."""
    try:
        # Kill any existing Django processes
        print("🔄 Restarting Django server...")
        logging.info("Attempting to restart Django server")
        
        # We don't want to actually kill and restart here since this could interrupt the user
        # Instead we'll just print instructions
        print("\n📋 To apply the changes, please restart the Django server manually:")
        print("1. Stop the current Django server (Ctrl+C)")
        print("2. Run: python run_server.py\n")
        
        logging.info("Instructed user to restart Django server manually")
        return True
    
    except Exception as e:
        logging.error(f"Error providing restart instructions: {str(e)}")
        print(f"❌ Error providing restart instructions: {str(e)}")
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
                table_entry = f"| {script_name} | 1.0 | Fix CORS headers for business_id in settings.py | Completed | {today} |"
                
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
    """Main function to fix CORS headers for business ID."""
    print("\n" + "="*80)
    print("🔧 CORS Header Fix for Business ID")
    print("="*80 + "\n")
    
    # Create backup of settings file
    if not create_backup(SETTINGS_FILE, BACKUP_FILE):
        print("❌ Aborting script due to backup failure")
        return False
    
    # Fix CORS headers
    if not fix_cors_headers(SETTINGS_FILE):
        print("❌ Failed to fix CORS headers")
        # Restore backup
        shutil.copy2(BACKUP_FILE, SETTINGS_FILE)
        print(f"✅ Restored original settings from backup: {BACKUP_FILE}")
        return False
    
    # Update script registry
    update_script_registry()
    
    # Provide restart instructions
    restart_django_server()
    
    print("\n" + "="*80)
    print("✅ CORS Header Fix for Business ID completed successfully!")
    print("="*80 + "\n")
    
    return True

if __name__ == "__main__":
    main() 