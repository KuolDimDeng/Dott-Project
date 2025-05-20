#!/usr/bin/env python3
"""
Complete RLS Setup Script

This script provides a unified approach to set up and verify Row Level Security (RLS)
in the database. It will:
1. Fix any RLS configuration issues
2. Verify the RLS setup is working correctly
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('rls_setup')

def print_banner(title):
    """Print a banner with the given title"""
    width = len(title) + 10
    print("\n" + "=" * width)
    print(f"     {title}")
    print("=" * width + "\n")

def run_script(script_path):
    """Run a Python script and return success status"""
    logger.info(f"Running {os.path.basename(script_path)}...")
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            check=False,
            capture_output=True,
            text=True
        )
        
        # Print the output
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        
        success = result.returncode == 0
        status = "succeeded" if success else "failed"
        logger.info(f"Script {os.path.basename(script_path)} {status} with exit code {result.returncode}")
        
        return success
    except Exception as e:
        logger.error(f"Error running {script_path}: {e}")
        return False

def setup_rls():
    """Set up RLS by running fix and check scripts"""
    current_dir = Path(__file__).parent
    fix_script = current_dir / "fix_rls_direct.py"
    check_script = current_dir / "check_rls.py"
    
    # Verify scripts exist
    if not fix_script.exists():
        logger.error(f"Fix script not found at {fix_script}")
        return False
        
    if not check_script.exists():
        logger.error(f"Check script not found at {check_script}")
        return False
    
    # Make scripts executable
    try:
        os.chmod(fix_script, 0o755)
        os.chmod(check_script, 0o755)
    except Exception as e:
        logger.warning(f"Could not make scripts executable: {e}")
    
    # Step 1: Run the fix script
    print_banner("STEP 1: Fixing RLS Configuration")
    fix_success = run_script(fix_script)
    
    # Step 2: Run the check script (even if fix failed, to see what's working)
    print_banner("STEP 2: Verifying RLS Configuration")
    check_success = run_script(check_script)
    
    # Summary
    print_banner("SUMMARY")
    if fix_success and check_success:
        print("✅ RLS has been successfully set up and verified!")
        print("\nNext steps:")
        print("1. Restart your Django server to apply the changes")
        print("2. Test the application with different tenant users")
    else:
        print("⚠️ There were issues with the RLS setup:")
        if not fix_success:
            print("- ❌ RLS fix script encountered errors")
        if not check_success:
            print("- ❌ RLS verification encountered errors")
        print("\nTroubleshooting steps:")
        print("1. Check the error messages above")
        print("2. Verify database connection settings")
        print("3. Ensure PostgreSQL version supports RLS (9.5+)")
    
    return fix_success and check_success

if __name__ == "__main__":
    print_banner("RLS SETUP AND VERIFICATION")
    success = setup_rls()
    sys.exit(0 if success else 1) 