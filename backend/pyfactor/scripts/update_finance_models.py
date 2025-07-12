#!/usr/bin/env python
"""
Script to update references to business.Business in finance models
"""
import os
import re
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_finance_models():
    """
    Update references to business.Business in finance models
    """
    # Get the project root directory
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    # Path to finance models.py
    finance_models_path = os.path.join(project_root, 'finance', 'models.py')
    
    if not os.path.exists(finance_models_path):
        logger.error(f"Finance models file not found: {finance_models_path}")
        return False
    
    try:
        # Read the file
        with open(finance_models_path, 'r') as f:
            content = f.read()
        
        # Replace all references to 'business.Business'
        updated_content = content.replace("'business.Business'", "'users.Business'")
        
        # Write the updated content back to the file
        with open(finance_models_path, 'w') as f:
            f.write(updated_content)
        
        logger.info(f"Successfully updated {finance_models_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error updating {finance_models_path}: {str(e)}")
        return False

def update_hr_models():
    """
    Update references to business.Business in hr models
    """
    # Get the project root directory
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    # Path to hr models.py
    hr_models_path = os.path.join(project_root, 'hr', 'models.py')
    
    if not os.path.exists(hr_models_path):
        logger.error(f"HR models file not found: {hr_models_path}")
        return False
    
    try:
        # Read the file
        with open(hr_models_path, 'r') as f:
            content = f.read()
        
        # Replace all references to 'business.Business'
        updated_content = content.replace("'business.Business'", "'users.Business'")
        
        # Write the updated content back to the file
        with open(hr_models_path, 'w') as f:
            f.write(updated_content)
        
        logger.info(f"Successfully updated {hr_models_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error updating {hr_models_path}: {str(e)}")
        return False

def main():
    """
    Main function to update all references to business.Business
    """
    logger.info("Updating references to business.Business in finance and hr models")
    
    # Update finance models
    finance_updated = update_finance_models()
    
    # Update hr models
    hr_updated = update_hr_models()
    
