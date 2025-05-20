#!/usr/bin/env python
"""
Script: Version0004_FixRedisSSL_Settings.py
Description: Removes SSL settings from Redis cache configuration
Version: 1.0
Date: 2023-05-03
"""

import os
import sys
import shutil
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
BACKUP_FILE = os.path.join(BACKUP_DIR, f'settings.py.redis_ssl_fix_backup_{timestamp}')

def create_backup():
    """Create a backup of the original file"""
    try:
        shutil.copy2(SETTINGS_FILE, BACKUP_FILE)
        print(f"Created backup at: {BACKUP_FILE}")
        return True
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False

def fix_redis_ssl_config():
    """Remove SSL settings from Redis cache configuration"""
    try:
        # Read the file content
        with open(SETTINGS_FILE, 'r') as file:
            content = file.read()
        
        # Find the CACHES section and remove SSL settings
        # Find the Redis cache OPTIONS section
        redis_cache_options_pattern = r"('OPTIONS':\s*\{[^}]*)(,\s*'sslmode':\s*'require'[^}]*'sslmode':\s*'require'[^}]*'sslkey':\s*'[^']*')"
        
        # Replace SSL settings with empty string
        modified_content = content
        
        # First pass - direct pattern match
        modified_content = modified_content.replace(
            "'sslmode': 'require',\n            'sslrootcert': os.path.join(BASE_DIR, 'certificates', 'server-ca.pem'),\n            'sslcert': os.path.join(BASE_DIR, 'certificates', 'client-cert.pem'),\n            'sslkey': os.path.join(BASE_DIR, 'certificates', 'client-key.pem'),",
            ""
        )
        
        # Second pass - direct pattern match with absolute paths
        modified_content = modified_content.replace(
            "'sslmode': 'require',\n            'sslrootcert': '/Users/kuoldeng/projectx/certificates/server-ca.pem',\n            'sslcert': '/Users/kuoldeng/projectx/certificates/client-cert.pem',\n            'sslkey': '/Users/kuoldeng/projectx/certificates/client-key.pem',",
            ""
        )
        
        # Write the modified content back to the file
        with open(SETTINGS_FILE, 'w') as file:
            file.write(modified_content)
        
        print("Successfully removed SSL settings from Redis cache configuration")
        return True
    except Exception as e:
        print(f"Error fixing Redis SSL configuration: {e}")
        return False

def main():
    """Main execution function"""
    print("Starting fix for SSL settings in Redis cache configuration...")
    
    # Step 1: Create backup
    if not create_backup():
        print("Aborting due to backup failure")
        return False
    
    # Step 2: Fix Redis SSL configuration
    if not fix_redis_ssl_config():
        print("Failed to fix Redis SSL configuration")
        return False
    
    print("\nFix applied successfully!")
    print("\nIMPORTANT: This script has removed the SSL settings from the Redis cache configuration.")
    print("Please restart the server with 'python run_server.py' to apply the changes.")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 