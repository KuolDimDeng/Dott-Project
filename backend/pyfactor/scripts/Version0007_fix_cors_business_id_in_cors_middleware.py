#!/usr/bin/env python3
"""
Version0007_fix_cors_business_id_in_cors_middleware.py

This script fixes the CorsMiddleware class to ensure it includes all business ID 
header variations in the Access-Control-Allow-Headers response.

The script does the following:
1. Creates a backup of the custom_auth/cors.py file
2. Updates the _add_cors_headers method to include all business ID headers
3. Ensures all case variations (x-business-id, X-Business-ID, X-BUSINESS-ID) are handled properly
4. Adds business ID headers to the exposed headers list too
5. Updates script registry to document the change

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
log_filename = "cors_middleware_business_id_fix.log"
logging.basicConfig(
    filename=log_filename,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORS_MIDDLEWARE_FILE = os.path.join(BASE_DIR, 'custom_auth', 'cors.py')
BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
BACKUP_FILE = os.path.join(BACKUP_DIR, f'cors.py.business_id_middleware_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}')

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

def fix_cors_middleware(file_path):
    """Fix CORS middleware to include business ID headers."""
    try:
        with open(file_path, 'r') as file:
            content = file.read()
        
        # Check for the _add_cors_headers method
        add_cors_headers_match = re.search(r'def _add_cors_headers\(self, response, request\):(.*?)return response', content, re.DOTALL)
        if not add_cors_headers_match:
            logging.error("Could not find _add_cors_headers method in cors.py")
            print("❌ Could not find _add_cors_headers method in cors.py")
            return False
        
        # Check if business ID headers are already included
        if "x-business-id" in add_cors_headers_match.group(1) and "X-Business-ID" in add_cors_headers_match.group(1):
            logging.info("Business ID headers are already included in _add_cors_headers method")
            print("ℹ️ Business ID headers are already included in _add_cors_headers method")
            return True
        
        # Update the Access-Control-Allow-Headers response
        headers_match = re.search(r'response\["Access-Control-Allow-Headers"\]\s*=\s*\((.*?)\)', content, re.DOTALL)
        if not headers_match:
            logging.error("Could not find Access-Control-Allow-Headers in cors.py")
            print("❌ Could not find Access-Control-Allow-Headers in cors.py")
            return False
        
        headers_content = headers_match.group(1)
        if headers_content.strip().endswith('"'):
            # If the string ends with a quote, add comma and new content
            new_headers_content = headers_content + ',\n            "x-business-id, X-Business-ID, X-BUSINESS-ID'
        else:
            # If the content already has a comma at the end, just add the new content
            new_headers_content = headers_content + ' x-business-id, X-Business-ID, X-BUSINESS-ID'
        
        updated_content = content[:headers_match.start(1)] + new_headers_content + content[headers_match.end(1):]
        
        # Also update the Access-Control-Expose-Headers response
        expose_match = re.search(r'response\["Access-Control-Expose-Headers"\]\s*=\s*\((.*?)\)', updated_content, re.DOTALL)
        if expose_match:
            expose_content = expose_match.group(1)
            if "x-business-id" not in expose_content:
                if expose_content.strip().endswith('"'):
                    # If the string ends with a quote, add comma and new content
                    new_expose_content = expose_content + ',\n            "x-business-id, X-Business-ID, X-BUSINESS-ID'
                else:
                    # If the content already has a comma at the end, just add the new content
                    new_expose_content = expose_content + ' x-business-id, X-Business-ID, X-BUSINESS-ID'
                
                updated_content = updated_content[:expose_match.start(1)] + new_expose_content + updated_content[expose_match.end(1):]
        
        # Write the updated content back to the file
        with open(file_path, 'w') as file:
            file.write(updated_content)
        
        logging.info("Successfully updated CORS middleware to include business ID headers")
        print("✅ Successfully updated CORS middleware to include business ID headers")
        return True
    
    except Exception as e:
        logging.error(f"Error fixing CORS middleware: {str(e)}")
        print(f"❌ Error fixing CORS middleware: {str(e)}")
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
                table_entry = f"| {script_name} | 1.0 | Fix CORS middleware to include business ID headers | Completed | {today} |"
                
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
    """Main function to fix CORS middleware for business ID headers."""
    print("\n" + "="*80)
    print("🔧 CORS Middleware Fix for Business ID Headers")
    print("="*80 + "\n")
    
    # Create backup of middleware file
    if not create_backup(CORS_MIDDLEWARE_FILE, BACKUP_FILE):
        print("❌ Aborting script due to backup failure")
        return False
    
    # Fix CORS middleware
    if not fix_cors_middleware(CORS_MIDDLEWARE_FILE):
        print("❌ Failed to fix CORS middleware")
        # Restore backup
        shutil.copy2(BACKUP_FILE, CORS_MIDDLEWARE_FILE)
        print(f"✅ Restored original middleware from backup: {BACKUP_FILE}")
        return False
    
    # Update script registry
    update_script_registry()
    
    print("\n" + "="*80)
    print("✅ CORS Middleware Fix for Business ID Headers completed successfully!")
    print("✅ To apply the changes, please restart the Django server (Ctrl+C then python run_server.py).")
    print("="*80 + "\n")
    
    return True

if __name__ == "__main__":
    main() 