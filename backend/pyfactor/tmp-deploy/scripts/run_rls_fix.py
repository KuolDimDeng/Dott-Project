#!/usr/bin/env python3
"""
Row Level Security (RLS) Fix Runner

This script runs all the RLS fix scripts in the proper order with error handling.
Use this script to automatically fix RLS issues in a PostgreSQL database.

Usage:
    python run_rls_fix.py [--apply] [--verbose] [--help]

Options:
    --apply    Apply fixes (default is dry run)
    --verbose  Show verbose output
    --help     Show this help message

Author: Claude AI Assistant
Date: 2025-04-19
"""

import os
import sys
import argparse
import logging
import subprocess
import time
from pathlib import Path
from datetime import datetime

# Set up logging
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"rls_fix_runner_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('rls_fix_runner')

def print_help():
    """Print detailed help information about the script."""
    help_text = """
PostgreSQL Row Level Security (RLS) Fix Runner
==============================================

This script helps identify and fix common Row Level Security (RLS) issues 
in PostgreSQL databases. It runs multiple diagnostics and fix scripts in 
the correct order.

USAGE:
  python run_rls_fix.py [OPTIONS]

OPTIONS:
  --help                 Show this help message and exit
  --apply                Apply fixes (default is dry run)
  --verbose              Show detailed output during execution

ENVIRONMENT VARIABLES:
  DB_NAME                Database name (default: "dott_main")
  DB_USER                Database user (default: "dott_admin")
  DB_PASSWORD            Database password
  DB_HOST                Database host
  DB_PORT                Database port (default: "5432")

DESCRIPTION:
  This script runs the following operations in sequence:
  1. Check database user permissions
  2. Fix RLS permissions on tables
  3. Apply FORCE RLS to all tables with tenant_id columns
  4. Verify RLS is properly enabled

  By default, this runs in dry-run mode (no changes are made). 
  Use --apply to actually apply the fixes.

EXAMPLES:
  # Run in dry-run mode
  python run_rls_fix.py

  # Apply the fixes
  python run_rls_fix.py --apply

  # Run with verbose output
  python run_rls_fix.py --verbose

  # Apply fixes with verbose output
  python run_rls_fix.py --apply --verbose

LOG FILE:
  All output is logged to a timestamped file in the logs directory.
  The log location is printed at the end of execution.
"""
    print(help_text)
    sys.exit(0)

def print_header(title):
    """Print a formatted header for each step."""
    width = 80
    logger.info("\n" + "=" * width)
    logger.info(f"{title.center(width)}")
    logger.info("=" * width + "\n")

def run_script(script_name, args=None, timeout=300):
    """
    Run a Python script with error handling.
    
    Args:
        script_name: Name of the script to run
        args: List of command-line arguments
        timeout: Maximum execution time in seconds
        
    Returns:
        tuple: (success, output)
    """
    script_path = Path(__file__).parent / script_name
    
    if not script_path.exists():
        logger.error(f"Script {script_name} not found at {script_path}")
        return False, f"Script {script_name} not found"
    
    cmd = [sys.executable, str(script_path)]
    if args:
        cmd.extend(args)
    
    logger.info(f"Running: {' '.join(cmd)}")
    
    try:
        start_time = time.time()
        process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(timeout=timeout)
        
        execution_time = time.time() - start_time
        logger.info(f"Execution completed in {execution_time:.2f} seconds")
        
        if process.returncode != 0:
            logger.error(f"Script failed with exit code {process.returncode}")
            logger.error(f"Error: {stderr.strip()}")
            return False, stderr
        
        if args and '--verbose' in args:
            logger.info(f"Output: {stdout.strip()}")
        
        return True, stdout
    except subprocess.TimeoutExpired:
        process.kill()
        logger.error(f"Script timed out after {timeout} seconds")
        return False, "Timeout"
    except Exception as e:
        logger.error(f"Error running script: {e}")
        return False, str(e)

def run_rls_fixes(apply_fixes=False, verbose=False):
    """
    Run all RLS fix scripts in the correct order.
    
    Args:
        apply_fixes: Whether to apply fixes or just run in dry-run mode
        verbose: Whether to show verbose output
    
    Returns:
        bool: Success status
    """
    print_header("RLS FIX RUNNER")
    logger.info(f"Mode: {'APPLY' if apply_fixes else 'DRY RUN'}")
    
    # Print database connection info
    logger.info(f"Database: {os.environ.get('DB_NAME', 'dott_main')} on {os.environ.get('DB_HOST', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com')}")
    logger.info(f"User: {os.environ.get('DB_USER', 'dott_admin')}")
    
    # Define scripts to run
    scripts = [
        {
            "name": "check_db_user_permissions.py",
            "description": "Check database user permissions",
            "args": ["--verbose"] if verbose else []
        },
        {
            "name": "fix_rls_permissions.py",
            "description": "Fix RLS permissions",
            "args": ["--apply"] if apply_fixes else [],
            "critical": True
        },
        {
            "name": "fix_rls_force.py",
            "description": "Apply FORCE RLS to all tables",
            "args": []
        },
        {
            "name": "check_rls_enabled.py",
            "description": "Verify RLS is properly enabled",
            "args": []
        }
    ]
    
    success_count = 0
    total_scripts = len(scripts)
    
    for i, script in enumerate(scripts, 1):
        print_header(f"STEP {i}/{total_scripts}: {script['description']}")
        
        script_args = script["args"]
        if verbose:
            if "--verbose" not in script_args:
                script_args.append("--verbose")
        
        success, output = run_script(script["name"], script_args)
        
        if success:
            logger.info(f"✅ Successfully ran {script['name']}")
            success_count += 1
        else:
            logger.error(f"❌ Failed to run {script['name']}")
            if script.get("critical", False):
                logger.error("Critical script failed, stopping execution")
                return False
    
    print_header("SUMMARY")
    logger.info(f"Successfully ran {success_count} of {total_scripts} scripts")
    
    if success_count == total_scripts:
        logger.info("✅ All RLS fixes were applied successfully")
    else:
        logger.warning(f"⚠️ {total_scripts - success_count} scripts failed to run")
    
    logger.info(f"Log file available at: {LOG_FILE}")
    return success_count == total_scripts

def main():
    """Main function to parse arguments and run the RLS fixes."""
    parser = argparse.ArgumentParser(
        description='PostgreSQL Row Level Security (RLS) Fix Runner',
        add_help=False  # Disable default help to use our custom help
    )
    parser.add_argument('--apply', action='store_true', help='Apply fixes (default is dry run)')
    parser.add_argument('--verbose', action='store_true', help='Show verbose output')
    parser.add_argument('--help', '-h', action='store_true', help='Show this help message')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Show help if requested
    if args.help:
        print_help()
    
    try:
        success = run_rls_fixes(apply_fixes=args.apply, verbose=args.verbose)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Execution interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()