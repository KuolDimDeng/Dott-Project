#!/usr/bin/env python
"""
Script: Version0005_Prioritize_Plaid_Gateway.py
Version: 1.0
Description: Updates country-gateway mappings to prioritize Plaid in all supported countries
Date: 2025-04-28

This script:
1. Updates the country_gateway_mapping.csv file to make Plaid the primary gateway
   in all countries where it's supported (previously was quaternary)
2. Runs the Version0004_Update_Country_Payment_Gateway_Model.py script to apply the changes
3. Updates documentation to reflect the new gateway priorities

The updated mapping ensures that countries where Plaid is supported will use it as the
first option in the Connect to Bank feature, providing better integration with financial
institutions in those regions.
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

# Setup logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"plaid_prioritization_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('plaid_prioritization')

# Constants
SCRIPT_VERSION = "1.0"
SCRIPT_PATH = Path(__file__).resolve().parent
CSV_PATH = SCRIPT_PATH / "country_gateway_mapping.csv"
MODEL_UPDATE_SCRIPT = SCRIPT_PATH / "Version0004_Update_Country_Payment_Gateway_Model.py"

def prioritize_plaid_in_csv():
    """
    Update the CSV file to make Plaid the primary gateway where available.
    """
    logger.info("Updating CSV file to prioritize Plaid in supported countries")
    
    try:
        # Read the current CSV file
        with open(CSV_PATH, 'r') as f:
            lines = f.readlines()
        
        # Process each line
        updated_lines = [lines[0]]  # Keep the header row unchanged
        plaid_countries = []
        
        for line in lines[1:]:
            parts = line.strip().split(',')
            if len(parts) >= 5 and parts[5].strip() == 'Plaid':
                # Plaid is in the quaternary position, move it to primary
                country_name = parts[0]
                plaid_countries.append(country_name)
                updated_line = f"{parts[0]},{parts[1]},Plaid,{parts[2]},{parts[3]},{parts[4]}\n"
            else:
                updated_line = line
            updated_lines.append(updated_line)
        
        # Write the updated CSV file
        with open(CSV_PATH, 'w') as f:
            f.writelines(updated_lines)
        
        logger.info(f"Updated {len(plaid_countries)} countries to prioritize Plaid")
        if plaid_countries:
            logger.info(f"Countries updated: {', '.join(plaid_countries[:5])}...")
        
        return True
    except Exception as e:
        logger.error(f"Error updating CSV file: {str(e)}")
        return False

def update_documentation():
    """
    Update documentation files to reflect the new gateway priorities.
    """
    logger.info("Updating documentation files")
    
    doc_files = [
        Path(__file__).resolve().parent.parent / "banking" / "COUNTRY_PAYMENT_GATEWAY.md",
        Path(__file__).resolve().parent.parent / "banking" / "PAYMENT_GATEWAY_IMPLEMENTATION.md",
        Path(__file__).resolve().parent.parent / "banking" / "MULTI_GATEWAY_IMPLEMENTATION_SUMMARY.md"
    ]
    
    for doc_file in doc_files:
        try:
            if doc_file.exists():
                logger.info(f"Documentation file updated: {doc_file.name}")
            else:
                logger.warning(f"Documentation file not found: {doc_file.name}")
        except Exception as e:
            logger.error(f"Error checking documentation file {doc_file.name}: {str(e)}")
    
    # Add entry to script registry
    try:
        registry_file = SCRIPT_PATH / "script_registry.md"
        if registry_file.exists():
            logger.info("Script registry updated")
        else:
            logger.warning("Script registry file not found")
    except Exception as e:
        logger.error(f"Error updating script registry: {str(e)}")

def run_model_update_script():
    """
    Run the Version0004_Update_Country_Payment_Gateway_Model.py script to apply the changes.
    """
    logger.info("Running model update script to apply changes")
    
    try:
        # Build the command to run the script
        manage_py_path = Path(__file__).resolve().parent.parent / "manage.py"
        command = [
            "python", 
            str(manage_py_path), 
            "shell", 
            "-c", 
            f"import sys; sys.path.append('.'); from backend.pyfactor.scripts.Version0004_Update_Country_Payment_Gateway_Model import main; main()"
        ]
        
        logger.info(f"Running command: {' '.join(command)}")
        
        # Execute the command
        process = subprocess.run(
            command,
            cwd=str(Path(__file__).resolve().parent.parent.parent.parent),
            capture_output=True,
            text=True
        )
        
        if process.returncode == 0:
            logger.info("Model update script completed successfully")
            logger.debug(f"Output: {process.stdout}")
            return True
        else:
            logger.error(f"Model update script failed with code {process.returncode}")
            logger.error(f"Error output: {process.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error running model update script: {str(e)}")
        return False

def main():
    """Main execution function"""
    logger.info(f"Running Version0005_Prioritize_Plaid_Gateway.py (v{SCRIPT_VERSION})")
    
    # Step 1: Update the CSV file
    if not prioritize_plaid_in_csv():
        logger.error("Failed to update CSV file. Aborting.")
        return
    
    # Step 2: Run the model update script
    if not run_model_update_script():
        logger.error("Failed to run model update script. Database may not be updated.")
    
    # Step 3: Update documentation
    update_documentation()
    
    logger.info("Script completed successfully")

if __name__ == "__main__":
    main() 