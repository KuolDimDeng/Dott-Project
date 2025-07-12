#!/usr/bin/env python
"""
Script to run all optimization scripts in the correct order.

This script:
1. Runs fix_memory_issue.py
2. Runs optimize_connection_handling.py
3. Runs optimize_schema_creation.py
4. Restarts the server

Usage:
python scripts/run_all_optimizations.py
"""

import os
import sys
import logging
import subprocess
import time

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_script(script_name):
    """Run a Python script and return the result"""
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    
    logger.info(f"Running {script_name}...")
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            check=True,
            capture_output=True,
            text=True
        )
        
        logger.info(f"{script_name} completed successfully")
        logger.info(f"Output: {result.stdout}")
        
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Error running {script_name}: {e}")
        logger.error(f"Output: {e.stdout}")
        logger.error(f"Error: {e.stderr}")
        return False

def restart_server():
    """Restart the server"""
    logger.info("Restarting the server...")
    
    try:
        # Kill any running server processes
        subprocess.run(
            ["pkill", "-f", "python.*manage.py.*runserver"],
            check=False  # Don't check return code as it might fail if no server is running
        )
        
        # Wait for processes to terminate
        time.sleep(2)
        
        # Start the server in the background
        server_process = subprocess.Popen(
            [sys.executable, "manage.py", "runserver"],
            cwd=os.path.dirname(os.path.dirname(__file__)),  # Set working directory to project root
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to start
        time.sleep(5)
        
        # Check if server is running
        if server_process.poll() is None:
            logger.info("Server restarted successfully")
            return True
        else:
            stdout, stderr = server_process.communicate()
            logger.error(f"Server failed to start: {stderr}")
            return False
    except Exception as e:
        logger.error(f"Error restarting server: {str(e)}")
        return False

def main():
    """Main function"""
    logger.info("Starting all optimizations...")
    
    # Step 1: Run fix_memory_issue.py
    logger.info("Step 1: Running fix_memory_issue.py...")
    if not run_script("fix_memory_issue.py"):
        logger.error("Failed to run fix_memory_issue.py, aborting")
        return False
    
    # Step 2: Run optimize_connection_handling.py
    logger.info("Step 2: Running optimize_connection_handling.py...")
    if not run_script("optimize_connection_handling.py"):
        logger.error("Failed to run optimize_connection_handling.py, aborting")
        return False
    
    # Step 3: Run optimize_schema_creation.py
    logger.info("Step 3: Running optimize_schema_creation.py...")
    if not run_script("optimize_schema_creation.py"):
        logger.error("Failed to run optimize_schema_creation.py, aborting")
        return False
    
    # Step 4: Restart the server
    logger.info("Step 4: Restarting the server...")
    if not restart_server():
        logger.error("Failed to restart the server, please restart it manually")
        return False
    
    logger.info("All optimizations completed successfully")
    logger.info("The server has been restarted with the new optimizations")
    
    return True

if __name__ == "__main__":
    main()