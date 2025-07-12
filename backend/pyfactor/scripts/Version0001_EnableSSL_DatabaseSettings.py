#!/usr/bin/env python
"""
Script: Version0001_EnableSSL_DatabaseSettings.py
Description: Modifies database settings to properly handle SSL connections
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
CERT_DIR = '/Users/kuoldeng/projectx/certificates'  # Use the existing certificates directory

# Ensure backup directory exists
if not os.path.exists(BACKUP_DIR):
    os.makedirs(BACKUP_DIR)

# Create backup filename with timestamp
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
BACKUP_FILE = os.path.join(BACKUP_DIR, f'settings.py.ssl_config_backup_{timestamp}')

def create_backup():
    """Create a backup of the original file"""
    try:
        shutil.copy2(SETTINGS_FILE, BACKUP_FILE)
        print(f"Created backup at: {BACKUP_FILE}")
        return True
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False

def update_ssl_settings():
    """Update the SSL settings in the database configuration"""
    try:
        # Read the original file
        with open(SETTINGS_FILE, 'r') as file:
            content = file.read()

        # Make sure we only modify database options sections by using more specific regex patterns
        # First, find the DATABASES dictionary section
        databases_section_pattern = r"DATABASES\s*=\s*\{(.*?)\}(?=\s*[^}])"
        databases_section_match = re.search(databases_section_pattern, content, re.DOTALL)
        
        if not databases_section_match:
            print("DATABASES dictionary not found in settings.py. Aborting.")
            return False
            
        databases_section = databases_section_match.group(0)
        
        # Now we'll work on the databases section only
        
        # Find and update the sslmode setting in the default database options
        default_db_options_pattern = r"('OPTIONS':\s*\{[^}]*'sslmode':\s*'prefer'[^}]*\})"
        default_db_options_match = re.search(default_db_options_pattern, databases_section)
        
        if default_db_options_match:
            modified_options = default_db_options_match.group(0).replace("'sslmode': 'prefer'", "'sslmode': 'require'")
            databases_section = databases_section.replace(default_db_options_match.group(0), modified_options)
        
        # Find and update the sslmode setting in the taxes database options
        taxes_db_options_pattern = r"('taxes':[^}]+?'OPTIONS':\s*\{[^}]*'sslmode':\s*'prefer'[^}]*\})"
        taxes_db_options_match = re.search(taxes_db_options_pattern, databases_section)
        
        if taxes_db_options_match:
            modified_taxes_options = taxes_db_options_match.group(0).replace("'sslmode': 'prefer'", "'sslmode': 'require'")
            databases_section = databases_section.replace(taxes_db_options_match.group(0), modified_taxes_options)
        
        # Define the SSL settings
        ssl_settings = f"""
            'sslmode': 'require',
            'sslrootcert': '{CERT_DIR}/server-ca.pem',
            'sslcert': '{CERT_DIR}/client-cert.pem',
            'sslkey': '{CERT_DIR}/client-key.pem',"""
        
        # Add SSL certificate paths to OPTIONS for default database
        default_options_pattern = r"('default':[^}]+?'OPTIONS':\s*\{[^\}]*?)(\s*\},)"
        default_options_match = re.search(default_options_pattern, databases_section, re.DOTALL)
        
        if default_options_match:
            modified_default_options = default_options_match.group(1).rstrip() + ssl_settings + default_options_match.group(2)
            databases_section = databases_section.replace(default_options_match.group(0), modified_default_options)
        
        # Add SSL certificate paths to OPTIONS for taxes database
        taxes_options_pattern = r"('taxes':[^}]+?'OPTIONS':\s*\{[^\}]*?)(\s*\},)"
        taxes_options_match = re.search(taxes_options_pattern, databases_section, re.DOTALL)
        
        if taxes_options_match:
            modified_taxes_options = taxes_options_match.group(1).rstrip() + ssl_settings + taxes_options_match.group(2)
            databases_section = databases_section.replace(taxes_options_match.group(0), modified_taxes_options)
        
        # Replace the databases section in the full content
        content = content.replace(databases_section_match.group(0), databases_section)
        
        # Write the updated content back to the file
        with open(SETTINGS_FILE, 'w') as file:
            file.write(content)
        
        print(f"Successfully updated SSL settings in {SETTINGS_FILE}")
        return True
    except Exception as e:
        print(f"Error updating SSL settings: {e}")
        return False

def check_certificate_files():
    """Check if the required certificate files exist in the specified directory"""
    required_files = ['server-ca.pem', 'client-cert.pem', 'client-key.pem']
    missing_files = []
    
    for file in required_files:
        file_path = os.path.join(CERT_DIR, file)
        if not os.path.isfile(file_path):
            missing_files.append(file)
    
    if missing_files:
        print(f"Warning: The following certificate files are missing in {CERT_DIR}:")
        for file in missing_files:
            print(f"  - {file}")
        print("Please make sure these files exist before restarting the server.")
    else:
        print(f"All required certificate files found in {CERT_DIR}")
    
    return len(missing_files) == 0

def main():
    """Main execution function"""
    print("Starting database SSL configuration update...")
    
    # Step 1: Create backup
    if not create_backup():
        print("Aborting due to backup failure")
        return False

    # Step 2: Check if certificate directory exists
    if not os.path.isdir(CERT_DIR):
        print(f"Error: Certificate directory {CERT_DIR} does not exist.")
        return False

    # Step 3: Check for certificate files
    check_certificate_files()
    
    # Step 4: Update SSL settings
    if not update_ssl_settings():
        print("Aborting due to update failure")
        return False
    
    print("\nSSL configuration updated successfully!")
    print("\nIMPORTANT: This script has updated the database configuration to use SSL.")
    print("Using certificates from the following directory:")
    print(f"  - {CERT_DIR}")
    print("\nRequired certificate files:")
    print(f"  - {os.path.join(CERT_DIR, 'server-ca.pem')}")
    print(f"  - {os.path.join(CERT_DIR, 'client-cert.pem')}")
    print(f"  - {os.path.join(CERT_DIR, 'client-key.pem')}")
    print("\nAfter confirming all files are present, restart the server with 'python run_server.py'")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 