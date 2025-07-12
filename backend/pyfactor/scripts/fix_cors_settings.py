#!/usr/bin/env python3
"""
fix_cors_settings.py

This script fixes CORS configuration in Django settings to ensure proper communication 
between frontend and backend services. It specifically addresses CORS/CSRF settings
for HTTPS connections.

Version: v1.0
Issue Reference: CORS connection issues with localhost HTTPS
"""

import os
import sys
import re
import datetime
import logging
import shutil
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('cors_fix.log')
    ]
)
logger = logging.getLogger('cors-settings-fix')

# Path to the Django settings file
BASE_DIR = Path(__file__).resolve().parent.parent
SETTINGS_FILE = BASE_DIR / 'pyfactor' / 'settings.py'
BACKUP_FILE = BASE_DIR / 'pyfactor' / 'settings.py.cors_backup'

def create_backup():
    """Create a backup of the settings file before making changes."""
    try:
        if not BACKUP_FILE.exists():
            shutil.copy2(SETTINGS_FILE, BACKUP_FILE)
            logger.info(f"Created backup of settings file at {BACKUP_FILE}")
        else:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_with_timestamp = BASE_DIR / 'pyfactor' / f'settings.py.cors_backup_{timestamp}'
            shutil.copy2(SETTINGS_FILE, backup_with_timestamp)
            logger.info(f"Created timestamped backup at {backup_with_timestamp}")
    except Exception as e:
        logger.error(f"Failed to create backup: {e}")
        sys.exit(1)

def fix_cors_settings():
    """Update CORS settings in the Django settings file."""
    try:
        with open(SETTINGS_FILE, 'r') as f:
            content = f.read()
        
        # Updated CORS settings
        cors_settings = """
# CORS and CSRF configuration
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False  # Restrict to specific origins

CORS_ALLOWED_ORIGINS = [
    "https://localhost:3000",
    "https://127.0.0.1:3000",
    "https://localhost",
    "https://127.0.0.1",
    "https://localhost:8000",   # Add HTTPS backend
    "https://127.0.0.1:8000"    # Add HTTPS backend
]

# Disable this to enforce the allowed origins list above
CORS_ORIGIN_ALLOW_ALL = False

APPEND_SLASH = True  # Enable automatic slash appending to fix URL routing issues

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-request-id',
    'cache-control',
    'pragma',
    'x-onboarding-step',
    'x-debug-step',
    'x-current-step',
    'x-request-version',
    'x-id-token',
    'x-user-id',
    'x-tenant-id',  # Lowercase tenant ID header
    'X-Tenant-ID',  # Uppercase tenant ID header
    'X-TENANT-ID',  # All caps tenant ID header
    'x-schema-name',  # Lowercase schema name header
    'X-Schema-Name',  # Uppercase schema name header
    'X-SCHEMA-NAME',  # All caps schema name header
    'access-control-allow-origin',
    'access-control-allow-headers',
    'access-control-allow-methods'
]

CORS_EXPOSE_HEADERS = [
    'access-token',
    'refresh-token',
    'content-type',
    'authorization',
    'cache-control',
    'last-modified',
    'etag',
    'x-debug-step',
    'x-current-step',
    'x-tenant-id',  # Add tenant ID header
    'x-schema-name'  # Add schema name header
]

# Add this new setting for preflight caching
CORS_PREFLIGHT_MAX_AGE = 86400

# Add these security headers
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Update CSRF settings
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_USE_SESSIONS = True
CSRF_TRUSTED_ORIGINS = [
    "https://localhost:3000",
    "https://127.0.0.1:3000",
    "https://localhost:8000",  # Add HTTPS backend
    "https://127.0.0.1:8000"   # Add HTTPS backend
]
"""
        
        # Find the CORS settings section
        cors_section_pattern = r'# CORS and CSRF configuration.*?(?=\n\n# Authentication settings|\Z)'
        cors_section_match = re.search(cors_section_pattern, content, re.DOTALL)
        
        if cors_section_match:
            # Replace existing CORS settings with new settings
            updated_content = content.replace(cors_section_match.group(0), cors_settings.strip())
            
            with open(SETTINGS_FILE, 'w') as f:
                f.write(updated_content)
                
            logger.info("Successfully updated CORS settings in Django settings file")
            return True
        else:
            logger.error("Could not find CORS settings section in settings file")
            return False
            
    except Exception as e:
        logger.error(f"Error updating CORS settings: {e}")
        return False

def main():
    """Main function to execute the script."""
    logger.info("Starting CORS settings fix script")
    
    if not SETTINGS_FILE.exists():
        logger.error(f"Settings file not found at {SETTINGS_FILE}")
        sys.exit(1)
    
    # Create backup of settings file
    create_backup()
    
    # Fix CORS settings
    if fix_cors_settings():
        logger.info("CORS settings fix completed successfully")
    else:
        logger.error("Failed to update CORS settings")
        logger.info(f"Original settings file is backed up at {BACKUP_FILE}")
        sys.exit(1)
    
    logger.info("Script completed. The server needs to be restarted for changes to take effect.")

if __name__ == "__main__":
    main() 