#!/usr/bin/env python3
"""
RLS Manager Script

This script provides a comprehensive approach to manage Row Level Security (RLS) in
PostgreSQL for multi-tenant applications. Designed for production use with AWS RDS.

Key features:
- Fixes RLS configuration issues in the database
- Verifies RLS setup is working correctly
- Creates standard RLS functions for tenant isolation
- Tests isolation between tenants
- Provides detailed logs and reports

Usage:
    python rls_manager.py [--fix-only | --check-only | --help]

Options:
    --fix-only    Only apply RLS fixes without verification
    --check-only  Only check RLS configuration without applying fixes
    --help        Show this help message

For production environments with AWS RDS databases.
"""

import os
import sys
import subprocess
import logging
import argparse
import traceback
from pathlib import Path
from datetime import datetime

# Set up logging with timestamp
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"rls_manager_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

# Configure logging to both console and file
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('rls_manager')

def print_banner(title, log=True):
    """Print a banner with the given title"""
    width = len(title) + 10
    banner = f"\n{'=' * width}\n     {title}\n{'=' * width}\n"
    print(banner)
    if log:
        logger.info(f"Starting: {title}")

def run_script(script_path, args=None):
    """Run a Python script and return success status"""
    script_name = os.path.basename(script_path)
    logger.info(f"Running {script_name}...")
    
    cmd = [sys.executable, script_path]
    if args:
        cmd.extend(args)
    
    try:
        result = subprocess.run(
            cmd,
            check=False,
            capture_output=True,
            text=True
        )
        
        # Print and log the output
        if result.stdout:
            print(result.stdout)
            logger.debug(f"Output from {script_name}:\n{result.stdout}")
            
        if result.stderr:
            print(result.stderr)
            logger.error(f"Error output from {script_name}:\n{result.stderr}")
        
        success = result.returncode == 0
        status = "succeeded" if success else "failed"
        logger.info(f"Script {script_name} {status} with exit code {result.returncode}")
        
        return success
    except Exception as e:
        logger.error(f"Error running {script_path}: {e}")
        logger.error(traceback.format_exc())
        return False

def fix_rls_configuration():
    """Apply RLS fixes to the database"""
    print_banner("FIXING RLS CONFIGURATION")
    scripts_dir = Path(__file__).parent
    parent_dir = scripts_dir.parent
    fix_script = parent_dir / "fix_rls_direct.py"
    
    # Verify script exists
    if not fix_script.exists():
        logger.error(f"Fix script not found at {fix_script}")
        print(f"Error: Fix script not found at {fix_script}")
        return False
    
    # Make script executable
    try:
        os.chmod(fix_script, 0o755)
    except Exception as e:
        logger.warning(f"Could not make script executable: {e}")
    
    # Run the fix script
    return run_script(fix_script)

def check_rls_configuration():
    """Verify RLS configuration in the database"""
    print_banner("VERIFYING RLS CONFIGURATION")
    scripts_dir = Path(__file__).parent
    parent_dir = scripts_dir.parent
    check_script = parent_dir / "check_rls.py"
    
    # Verify script exists
    if not check_script.exists():
        logger.error(f"Check script not found at {check_script}")
        print(f"Error: Check script not found at {check_script}")
        return False
    
    # Make script executable
    try:
        os.chmod(check_script, 0o755)
    except Exception as e:
        logger.warning(f"Could not make script executable: {e}")
    
    # Run the check script
    return run_script(check_script)

def setup_command_line():
    """Setup command line arguments"""
    parser = argparse.ArgumentParser(
        description="RLS Manager - Configure and verify Row Level Security for AWS RDS PostgreSQL"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--fix-only', action='store_true', help='Only apply RLS fixes without verification')
    group.add_argument('--check-only', action='store_true', help='Only check RLS configuration without applying fixes')
    
    return parser.parse_args()

def show_summary(fix_status, check_status):
    """Show a summary of the operations"""
    print_banner("EXECUTION SUMMARY", log=False)
    
    # Determine overall status
    if fix_status is None and check_status:
        # Only check was performed
        overall = check_status
        print("✅ RLS verification completed")
    elif check_status is None and fix_status:
        # Only fix was performed
        overall = fix_status
        print("✅ RLS fixes applied successfully")
    elif fix_status and check_status:
        # Both operations succeeded
        overall = True
        print("✅ RLS has been successfully set up and verified!")
    else:
        # At least one operation failed
        overall = False
        print("⚠️ There were issues with the RLS setup:")
        if fix_status is not None and not fix_status:
            print("- ❌ RLS fix script encountered errors")
        if check_status is not None and not check_status:
            print("- ❌ RLS verification encountered errors")
    
    # Show next steps
    print("\nNext steps:")
    if overall:
        print("1. Restart your Django server to apply the changes")
        print("2. Test the application with different tenant users")
        print("3. Check the logs if you encounter any issues")
    else:
        print("1. Review the error messages above")
        print("2. Verify database connection settings")
        print("3. Check that PostgreSQL version supports RLS (9.5+)")
        print("4. Ensure the database user has sufficient privileges")
    
    logger.info(f"RLS Manager completed with status: {'success' if overall else 'errors'}")
    return overall

def main():
    """Main function to run RLS management tasks"""
    # Process command line arguments
    args = setup_command_line()
    
    logger.info("RLS Manager starting")
    logger.info(f"Log file: {LOG_FILE}")
    
    fix_status = None
    check_status = None
    
    try:
        if args.check_only:
            # Only verify RLS configuration
            check_status = check_rls_configuration()
        elif args.fix_only:
            # Only apply RLS fixes
            fix_status = fix_rls_configuration()
        else:
            # Default: fix and verify
            fix_status = fix_rls_configuration()
            # Run check even if fix failed
            check_status = check_rls_configuration()
        
        # Show summary and determine exit code
        success = show_summary(fix_status, check_status)
        return 0 if success else 1
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        logger.error(traceback.format_exc())
        print(f"\n❌ An unexpected error occurred: {e}")
        print("Please check the log file for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 