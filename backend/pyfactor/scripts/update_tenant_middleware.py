#!/usr/bin/env python
"""
Script to update tenant middleware to use users.Business instead of user.Business

"""
import os
import re
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_middleware_file(file_path):
    """
    Update the tenant middleware file to use users.Business instead of user.Business

    """
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return False
    
    try:
        # Read the file
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Replace business_business references with users_business
        # This is the key change to fix the "relation business_business does not exist" error
        updated_content = content.replace(
            'business_business', 
            'users_business'
        )
        
        # Update essential tables list
        updated_content = re.sub(
            r"essential_tables = \['business_business',",
            "essential_tables = ['users_business',",
            updated_content
        )
        
        # Update foreign key references
        updated_content = updated_content.replace(
            'REFERENCES "business_business"',
            'REFERENCES "users_business"'
        )
        
        # Write the updated content back to the file
        with open(file_path, 'w') as f:
            f.write(updated_content)
        
        logger.info(f"Successfully updated {file_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error updating {file_path}: {str(e)}")
        return False

def update_onboarding_utils(file_path):
    """
    Update the onboarding utils file to use users.Business instead of user.Business

    """
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return False
    
    try:
        # Read the file
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Replace business_business references with users_business
        updated_content = content.replace(
            'business_business', 
            'users_business'
        )
        
        # Write the updated content back to the file
        with open(file_path, 'w') as f:
            f.write(updated_content)
        
        logger.info(f"Successfully updated {file_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error updating {file_path}: {str(e)}")
        return False

def update_views_file(file_path):
    """
    Update the views file to use users.Business instead of user.Business

    """
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return False
    
    try:
        # Read the file
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Replace business.models import with users.models
        updated_content = re.sub(
            r"from business\.models import Business",
            "from users.models import Business",
            content
        )
        
        # Replace business_business references with users_business
        updated_content = updated_content.replace(
            'business_business', 
            'users_business'
        )
        
        # Write the updated content back to the file
        with open(file_path, 'w') as f:
            f.write(updated_content)
        
        logger.info(f"Successfully updated {file_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error updating {file_path}: {str(e)}")
        return False

def main():
    """
    Main function to update all necessary files
    """
    # Get the project root directory
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    # Update tenant middleware
    middleware_path = os.path.join(project_root, 'custom_auth', 'tenant_middleware.py')
    if not update_middleware_file(middleware_path):
        logger.error("Failed to update tenant middleware")
    
    # Update onboarding utils
    utils_path = os.path.join(project_root, 'onboarding', 'utils.py')
    if not update_onboarding_utils(utils_path):
        logger.error("Failed to update onboarding utils")
    
    # Update onboarding views
    views_path = os.path.join(project_root, 'onboarding', 'views', 'views.py')
    if not update_views_file(views_path):
        logger.error("Failed to update onboarding views")
    
    logger.info("Update complete. Please run migrations to apply the changes.")

if __name__ == "__main__":
    main()