#!/usr/bin/env python
"""
CORS Headers Update Script for X-Business-ID
Version: 1.0
Issue ID: hr-api-connection-20250423
Description: Updates Django CORS settings to allow the X-Business-ID header

This script fixes the CORS configuration in Django settings to allow
proper business ID header communication between frontend and backend.
"""

import os
import sys
import re
from pathlib import Path
import datetime
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("cors_business_id_fix.log")
    ]
)
logger = logging.getLogger("cors-business-id-fix")

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

# Set up logging with colors
def log_info(msg):
    logger.info(msg)
    print(f"{Colors.BLUE}[INFO]{Colors.RESET} {msg}")

def log_success(msg):
    logger.info(msg)
    print(f"{Colors.GREEN}[SUCCESS]{Colors.RESET} {msg}")

def log_warn(msg):
    logger.warning(msg)
    print(f"{Colors.YELLOW}[WARNING]{Colors.RESET} {msg}")

def log_error(msg):
    logger.error(msg)
    print(f"{Colors.RED}[ERROR]{Colors.RESET} {msg}")

def log_header(msg):
    print(f"\n{Colors.BOLD}{Colors.CYAN}=== {msg} ==={Colors.RESET}\n")
    logger.info(f"=== {msg} ===")

def create_backup(settings_file):
    """Create a backup of the settings file with timestamp."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = settings_file.parent / f"settings.py.business_id_cors_backup_{timestamp}"
    
    try:
        with open(settings_file, 'r') as f:
            settings_content = f.read()
        
        with open(backup_file, 'w') as f:
            f.write(settings_content)
        
        log_success(f"Created backup at {backup_file}")
        return settings_content
    except Exception as e:
        log_error(f"Failed to create backup: {str(e)}")
        sys.exit(1)

def update_cors_headers(settings_content, settings_file):
    """Update the CORS_ALLOW_HEADERS to include X-Business-ID in various formats."""
    # Headers to add (different capitalizations for broader compatibility)
    business_id_headers = [
        'x-business-id',      # lowercase
        'X-Business-ID',      # standard format
        'X-BUSINESS-ID',      # uppercase
    ]
    
    # Check if CORS_ALLOW_HEADERS exists
    headers_pattern = re.compile(r'CORS_ALLOW_HEADERS\s*=\s*\[(.*?)\]', re.DOTALL)
    match = headers_pattern.search(settings_content)
    
    if match:
        # Extract current headers
        headers_block = match.group(0)
        headers_content = match.group(1)
        
        # Check if any business ID header is already included
        existing_headers = set(re.findall(r"['\"](.*?)['\"]", headers_content))
        headers_to_add = [h for h in business_id_headers if h.lower() not in [eh.lower() for eh in existing_headers]]
        
        if not headers_to_add:
            log_info("X-Business-ID header is already allowed in CORS configuration")
            return settings_content
            
        log_info(f"Adding {len(headers_to_add)} business ID headers to CORS_ALLOW_HEADERS")
        
        # Prepare new headers content with proper indentation
        new_headers = []
        for header in headers_to_add:
            if headers_content.strip().endswith(','):
                new_headers.append(f"\n    '{header}',")
            else:
                new_headers.append(f",\n    '{header}'")
        
        # Choose where to add the headers (end of the list)
        if ']' in headers_content:
            insertion_point = headers_content.rindex(']')
            new_headers_content = headers_content[:insertion_point] + ''.join(new_headers) + '\n]'
        else:
            new_headers_content = headers_content + ''.join(new_headers)
        
        # Replace the headers block with updated content
        new_settings_content = settings_content.replace(headers_block, f"CORS_ALLOW_HEADERS = [{new_headers_content}")
        
        try:
            with open(settings_file, 'w') as f:
                f.write(new_settings_content)
            log_success(f"Updated CORS_ALLOW_HEADERS to include X-Business-ID headers")
            return new_settings_content
        except Exception as e:
            log_error(f"Failed to update settings file: {str(e)}")
            sys.exit(1)
    else:
        log_error("CORS_ALLOW_HEADERS not found in settings file")
        log_warn("This is unexpected as the previous CORS header fix should have added it")
        log_warn("Please check your Django settings file manually and add X-Business-ID to CORS_ALLOW_HEADERS")
        sys.exit(1)

def update_script_registry():
    """Update the script registry to record this execution."""
    registry_file = Path(__file__).parent / "script_registry.md"
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d")
    
    if not registry_file.exists():
        log_warn(f"Script registry file not found at {registry_file}")
        return
    
    try:
        with open(registry_file, 'r') as f:
            registry_content = f.read()
        
        script_name = Path(__file__).name
        
        if script_name in registry_content:
            log_info(f"Script {script_name} already registered")
            return
        
        entry = f"| {script_name} | {timestamp} | Completed | Fixed CORS configuration to allow X-Business-ID header |"
        
        if "| Script | Date | Status |" in registry_content:
            # Find the table and add our entry after the header
            lines = registry_content.split('\n')
            table_start = next((i for i, line in enumerate(lines) if "| Script | Date | Status |" in line), -1)
            
            if table_start >= 0:
                lines.insert(table_start + 2, entry)
                new_registry_content = '\n'.join(lines)
                
                with open(registry_file, 'w') as f:
                    f.write(new_registry_content)
                
                log_success(f"Updated script registry at {registry_file}")
            else:
                log_warn("Could not find registry table header")
        else:
            log_warn("Registry file does not contain expected table format")
    except Exception as e:
        log_error(f"Failed to update script registry: {str(e)}")

# Main script execution
def main():
    log_header("Django CORS Headers Update for X-Business-ID")
    
    # Determine the settings file location
    project_dir = Path(__file__).resolve().parent.parent
    settings_file = project_dir / "pyfactor" / "settings.py"
    
    if not settings_file.exists():
        log_error(f"Settings file not found at {settings_file}")
        sys.exit(1)
    
    log_info(f"Found Django settings file at {settings_file}")
    
    # Create backup and get settings content
    settings_content = create_backup(settings_file)
    
    # Update the CORS headers
    update_cors_headers(settings_content, settings_file)
    
    # Update script registry
    update_script_registry()
    
    log_success("CORS headers configuration updated successfully to include X-Business-ID")
    log_info("Please restart the Django server for changes to take effect")
    log_info("Run: python run_server.py")

if __name__ == "__main__":
    main() 