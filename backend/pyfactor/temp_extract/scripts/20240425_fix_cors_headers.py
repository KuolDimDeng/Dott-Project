#!/usr/bin/env python
"""
CORS Headers Update Script
Version: 1.0
Issue ID: network-connectivity-20240425
Description: Updates Django CORS settings to allow the X-Tenant-ID header

This script fixes the CORS configuration in Django settings to allow
proper tenant ID header communication between frontend and backend.
"""

import os
import sys
import re
from pathlib import Path
import datetime

# ANSI color codes for formatting console output
class Colors:
    RESET = '\033[0m'
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'

# Set up logging
def log_info(msg):
    print(f"{Colors.BLUE}[INFO]{Colors.RESET} {msg}")

def log_success(msg):
    print(f"{Colors.GREEN}[SUCCESS]{Colors.RESET} {msg}")

def log_warn(msg):
    print(f"{Colors.YELLOW}[WARNING]{Colors.RESET} {msg}")

def log_error(msg):
    print(f"{Colors.RED}[ERROR]{Colors.RESET} {msg}")

def log_header(msg):
    print(f"\n{Colors.BOLD}{Colors.CYAN}=== {msg} ==={Colors.RESET}\n")

# Main script execution
def main():
    log_header("Django CORS Headers Update")
    
    # Determine the settings file location
    project_dir = Path(__file__).resolve().parent.parent
    settings_file = project_dir / "pyfactor" / "settings.py"
    
    if not settings_file.exists():
        log_error(f"Settings file not found at {settings_file}")
        sys.exit(1)
    
    log_info(f"Found Django settings file at {settings_file}")
    
    # Create backup of settings file
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = project_dir / "pyfactor" / f"settings_{timestamp}.py.bak"
    
    try:
        with open(settings_file, 'r') as f:
            settings_content = f.read()
        
        with open(backup_file, 'w') as f:
            f.write(settings_content)
        
        log_success(f"Created backup at {backup_file}")
    except Exception as e:
        log_error(f"Failed to create backup: {str(e)}")
        sys.exit(1)
    
    # Check if CORS_ALLOWED_HEADERS or CORS_ALLOW_HEADERS exists
    headers_pattern = re.compile(r'CORS_ALLOW(?:ED)?_HEADERS\s*=\s*\[(.*?)\]', re.DOTALL)
    match = headers_pattern.search(settings_content)
    
    if match:
        # Extract current headers
        headers_block = match.group(0)
        headers_content = match.group(1)
        
        # Check if X-Tenant-ID is already in the headers
        if re.search(r"['\"](x-tenant-id|X-Tenant-ID)['\"]", headers_content):
            log_info("X-Tenant-ID header is already allowed in CORS configuration")
        else:
            # Add X-Tenant-ID to the headers
            log_info("Adding X-Tenant-ID to allowed CORS headers")
            
            if headers_content.strip().endswith(','):
                # If the last item has a trailing comma, add new item with same formatting
                new_headers_content = headers_content + "\n    'x-tenant-id',"
            else:
                # Add comma to last item and then add new item
                last_item_pattern = r"(['\"][^'\"]+['\"])\s*\]"
                new_headers_content = re.sub(last_item_pattern, r"\1,\n    'x-tenant-id'\n]", headers_content)
            
            # Replace the headers block with updated content
            new_settings_content = settings_content.replace(headers_block, f"CORS_ALLOW_HEADERS = [{new_headers_content}")
            
            try:
                with open(settings_file, 'w') as f:
                    f.write(new_settings_content)
                log_success("Updated CORS_ALLOW_HEADERS to include X-Tenant-ID")
            except Exception as e:
                log_error(f"Failed to update settings file: {str(e)}")
                sys.exit(1)
    else:
        # No existing CORS_ALLOW_HEADERS found, we need to add it
        log_warn("No CORS_ALLOW_HEADERS found in settings file")
        
        # Look for CORS section or other CORS settings
        cors_section_pattern = re.compile(r'#\s*CORS.*?configuration.*?\n', re.IGNORECASE)
        cors_match = cors_section_pattern.search(settings_content)
        
        if cors_match:
            cors_section = cors_match.group(0)
            cors_index = cors_match.end()
            
            # Define the new headers setting
            new_headers_setting = """
# Added by CORS headers update script
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-tenant-id',
]

"""
            # Insert the new headers setting after the CORS section
            new_settings_content = settings_content[:cors_index] + new_headers_setting + settings_content[cors_index:]
            
            try:
                with open(settings_file, 'w') as f:
                    f.write(new_settings_content)
                log_success("Added CORS_ALLOW_HEADERS with X-Tenant-ID to settings")
            except Exception as e:
                log_error(f"Failed to update settings file: {str(e)}")
                sys.exit(1)
        else:
            # Try to find other CORS settings
            cors_allowed_origins = "CORS_ALLOWED_ORIGINS" in settings_content or "CORS_ALLOW_ALL_ORIGINS" in settings_content
            if cors_allowed_origins:
                log_info("Found CORS settings, adding CORS_ALLOW_HEADERS")
                
                # Find where to add the headers setting
                origins_pattern = re.compile(r'(CORS_ALLOWED_ORIGINS\s*=.*?\]|CORS_ALLOW_ALL_ORIGINS\s*=\s*True)', re.DOTALL)
                origins_match = origins_pattern.search(settings_content)
                
                if origins_match:
                    origins_block = origins_match.group(0)
                    origins_end = origins_match.end()
                    
                    # Define the new headers setting
                    new_headers_setting = """

# Added by CORS headers update script
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-tenant-id',
]"""
                    # Insert the new headers setting after the origins setting
                    new_settings_content = settings_content[:origins_end] + new_headers_setting + settings_content[origins_end:]
                    
                    try:
                        with open(settings_file, 'w') as f:
                            f.write(new_settings_content)
                        log_success("Added CORS_ALLOW_HEADERS with X-Tenant-ID to settings")
                    except Exception as e:
                        log_error(f"Failed to update settings file: {str(e)}")
                        sys.exit(1)
                else:
                    log_error("Could not find appropriate location to add CORS_ALLOW_HEADERS")
                    sys.exit(1)
            else:
                log_error("No existing CORS configuration found in settings")
                log_warn("You may need to add CORS configuration manually")
                sys.exit(1)
    
    log_success("CORS headers configuration updated successfully")
    log_info("Please restart the Django server for changes to take effect")
    log_info("Run: python run_server.py")

if __name__ == "__main__":
    main() 