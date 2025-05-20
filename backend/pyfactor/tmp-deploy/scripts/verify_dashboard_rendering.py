#!/usr/bin/env python3
"""
verify_dashboard_rendering.py

This script verifies and fixes dashboard rendering issues on the server side.
It checks for the presence of necessary fix scripts and ensures they are properly configured.

Version: 1.0
Date: 2025-05-14
"""

import os
import sys
import json
import logging
import subprocess
from datetime import datetime
from pathlib import Path

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'dashboard_rendering_fix.log')),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('DashboardRenderingFix')

# Constants
FRONTEND_DIR = Path('../../../frontend/pyfactor_next').resolve()
SCRIPTS_DIR = FRONTEND_DIR / 'public' / 'scripts'
LAYOUT_PATH = FRONTEND_DIR / 'src' / 'app' / 'layout.js'
SCRIPT_REGISTRY_PATH = SCRIPTS_DIR / 'script_registry.js'
DASHBOARD_FIX_PATH = SCRIPTS_DIR / 'Version0005_fix_dashboard_multiple_renders.js'

def ensure_directory_exists(directory):
    """Ensure the specified directory exists."""
    try:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Ensured directory exists: {directory}")
    except Exception as e:
        logger.error(f"Error creating directory {directory}: {e}")
        return False
    return True

def check_file_exists(file_path):
    """Check if a file exists."""
    exists = os.path.isfile(file_path)
    if exists:
        logger.info(f"File exists: {file_path}")
    else:
        logger.warning(f"File does not exist: {file_path}")
    return exists

def check_script_inclusion(file_path, script_name):
    """Check if a script is included in a file."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            included = script_name in content
            if included:
                logger.info(f"Script {script_name} is included in {file_path}")
            else:
                logger.warning(f"Script {script_name} is NOT included in {file_path}")
            return included
    except Exception as e:
        logger.error(f"Error checking script inclusion in {file_path}: {e}")
        return False

def verify_script_registry():
    """Verify the script registry exists and contains the dashboard fix entry."""
    if not check_file_exists(SCRIPT_REGISTRY_PATH):
        return False
    
    try:
        # We can't directly import the JS module, so we'll check for the script name in the file
        with open(SCRIPT_REGISTRY_PATH, 'r') as f:
            content = f.read()
            if 'Version0005_fix_dashboard_multiple_renders.js' in content:
                logger.info("Dashboard fix is registered in script registry")
                return True
            else:
                logger.warning("Dashboard fix is NOT registered in script registry")
                return False
    except Exception as e:
        logger.error(f"Error verifying script registry: {e}")
        return False

def run_node_script(script_path):
    """Run a Node.js script and return its output."""
    try:
        result = subprocess.run(
            ['node', script_path],
            capture_output=True,
            text=True,
            check=True
        )
        logger.info(f"Successfully ran Node.js script: {script_path}")
        return result.stdout
    except subprocess.CalledProcessError as e:
        logger.error(f"Error running Node.js script {script_path}: {e}")
        logger.error(f"Script output: {e.stdout}")
        logger.error(f"Script error: {e.stderr}")
        return None

def verify_dashboard_rendering():
    """Verify all components of the dashboard rendering fix."""
    logger.info("Starting dashboard rendering verification")
    
    # Ensure logs directory exists
    ensure_directory_exists('logs')
    
    # Check if frontend directory exists
    if not os.path.isdir(FRONTEND_DIR):
        logger.error(f"Frontend directory not found: {FRONTEND_DIR}")
        return False
    
    # Check if scripts directory exists
    if not os.path.isdir(SCRIPTS_DIR):
        logger.error(f"Scripts directory not found: {SCRIPTS_DIR}")
        return False
    
    # Check if layout.js exists
    if not check_file_exists(LAYOUT_PATH):
        logger.error(f"Layout file not found: {LAYOUT_PATH}")
        return False
    
    # Check if dashboard fix script exists
    dashboard_fix_exists = check_file_exists(DASHBOARD_FIX_PATH)
    
    # Check if script registry exists and contains the dashboard fix
    script_registry_valid = verify_script_registry()
    
    # Check if dashboard fix is included in layout.js
    fix_included_in_layout = check_script_inclusion(LAYOUT_PATH, 'Version0005_fix_dashboard_multiple_renders.js')
    
    # Run the Node.js verification script if it exists
    node_script_path = Path('Version0001_fix_dashboard_multiple_renders.js').resolve()
    if check_file_exists(node_script_path):
        logger.info(f"Running Node.js verification script: {node_script_path}")
        run_node_script(node_script_path)
    
    # Summarize results
    all_checks_passed = dashboard_fix_exists and script_registry_valid and fix_included_in_layout
    
    if all_checks_passed:
        logger.info("All dashboard rendering fix components are properly installed")
    else:
        logger.warning("Some dashboard rendering fix components are missing or improperly configured")
        
        # List specific issues
        if not dashboard_fix_exists:
            logger.warning(f"Dashboard fix script not found: {DASHBOARD_FIX_PATH}")
        if not script_registry_valid:
            logger.warning("Script registry is missing or does not contain the dashboard fix")
        if not fix_included_in_layout:
            logger.warning("Dashboard fix is not included in layout.js")
    
    return all_checks_passed

def main():
    """Main function."""
    try:
        # Print script header
        print("=" * 80)
        print(f"Dashboard Rendering Fix Verification - v1.0 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        # Run verification
        success = verify_dashboard_rendering()
        
        # Print summary
        print("\nVerification Summary:")
        print("-" * 80)
        if success:
            print("✅ All dashboard rendering fix components are properly installed")
        else:
            print("❌ Some dashboard rendering fix components are missing or improperly configured")
            print("   Please check the log file for details")
        print("-" * 80)
        
        return 0 if success else 1
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return 1

if __name__ == "__main__":
    sys.exit(main())
