#!/usr/bin/env python3
"""
Script to update the script registry with the HRReportManagement implementation.

This script adds an entry to the backend script registry to track the implementation
of the HR Reports functionality in the frontend.
"""

import os
import json
import logging
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f'hr_reports_implementation_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger('hr_reports_script_registry')

# Script registry path
SCRIPT_REGISTRY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'script_registry.json')

def update_script_registry():
    """
    Updates the script registry with information about the HR Reports implementation.
    """
    logger.info("Updating script registry with HR Reports implementation details")
    
    try:
        # Load existing registry or create new one
        registry = {}
        if os.path.exists(SCRIPT_REGISTRY_PATH):
            with open(SCRIPT_REGISTRY_PATH, 'r') as f:
                try:
                    registry = json.load(f)
                except json.JSONDecodeError:
                    logger.warning("Registry file exists but is not valid JSON. Creating new registry.")
        
        # Add entry for the HR Reports implementation script
        script_name = os.path.basename(__file__)
        registry[script_name] = {
            'name': script_name,
            'description': 'Update script registry with HRReportManagement implementation details',
            'related_frontend_script': 'Version0001_Add_HRReportManagement_Component.js',
            'feature': 'HR Reports Management',
            'components_affected': [
                'HRReportManagement.js',
                'RenderMainContent.js',
                'DashboardContent.js',
                'listItems.js'
            ],
            'executed': datetime.now().isoformat(),
            'status': 'completed'
        }
        
        # Save updated registry
        with open(SCRIPT_REGISTRY_PATH, 'w') as f:
            json.dump(registry, f, indent=2)
        
        logger.info("Script registry updated successfully")
        return True
    
    except Exception as e:
        logger.error(f"Error updating script registry: {str(e)}")
        return False

def update_markdown_registry():
    """
    Updates the Markdown version of the script registry.
    """
    logger.info("Updating Markdown script registry")
    
    try:
        registry_md_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'script_registry.md')
        
        # Create or append to the markdown file
        with open(registry_md_path, 'a') as md_file:
            md_file.write(f"\n\n## HR Reports Management Implementation - {datetime.now().strftime('%Y-%m-%d')}\n\n")
            md_file.write("### Script: Version0001_Add_HRReportManagement_Component.js\n\n")
            md_file.write("#### Description\n")
            md_file.write("Implements the HR Reports Management component that displays tabs for different report categories:\n")
            md_file.write("- Employee reports\n")
            md_file.write("- Pay reports\n")
            md_file.write("- Timesheet reports\n")
            md_file.write("- Benefits reports\n\n")
            
            md_file.write("#### Changes Made\n")
            md_file.write("1. Created new HRReportManagement component with tabs for the different report categories\n")
            md_file.write("2. Added documentation in HR_REPORT_MANAGEMENT.md\n")
            md_file.write("3. Updated RenderMainContent.js to handle the new component\n")
            md_file.write("4. Updated DashboardContent.js to add state handling for reports management\n")
            md_file.write("5. Enhanced the Reports menu item in listItems.js to use the standardized onClick pattern\n\n")
            
            md_file.write("#### Status\n")
            md_file.write("- [x] Implemented\n")
            md_file.write("- [ ] Connected to backend API\n\n")
            
            md_file.write("#### Future Work\n")
            md_file.write("- Connect to backend API for real report generation\n")
            md_file.write("- Add report filters and parameters\n")
            md_file.write("- Implement report export functionality (PDF, CSV)\n")
            md_file.write("- Add data visualization for key metrics\n")
        
        logger.info("Markdown registry updated successfully")
        return True
    
    except Exception as e:
        logger.error(f"Error updating markdown registry: {str(e)}")
        return False

def main():
    """
    Main function to run the script.
    """
    logger.info("Starting script to update registry with HR Reports implementation details")
    
    json_updated = update_script_registry()
    md_updated = update_markdown_registry()
    
    if json_updated and md_updated:
        logger.info("Script completed successfully - All registries updated")
    else:
        logger.warning("Script completed with warnings - Check logs for details")

if __name__ == "__main__":
    main() 