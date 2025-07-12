#!/usr/bin/env python
"""
Script to fix the UserProfile model to handle both updated_at and modified_at fields.
"""

import os
import sys
import django
import logging
from django.db import connection, transaction

# Set up Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def fix_user_profile_model():
    """
    Update the UserProfile model to handle both updated_at and modified_at fields.
    """
    try:
        # Import the UserProfile model
        from users.models import UserProfile
        
        # Check if the model has the modified_at field
        has_modified_at = hasattr(UserProfile, 'modified_at')
        logger.info(f"UserProfile model has modified_at field: {has_modified_at}")
        
        # If the model doesn't have the modified_at field, we need to update it
        if not has_modified_at:
            # Get the model file path
            import inspect
            from users import models
            model_file_path = inspect.getfile(models)
            logger.info(f"UserProfile model file path: {model_file_path}")
            
            # Read the model file
            with open(model_file_path, 'r') as f:
                model_content = f.read()
            
            # Check if the model already has the updated_at field
            has_updated_at = 'updated_at' in model_content
            logger.info(f"UserProfile model has updated_at field: {has_updated_at}")
            
            # If the model has updated_at but not modified_at, we need to add compatibility
            if has_updated_at:
                # Add property for modified_at that returns updated_at
                if 'def modified_at(self):' not in model_content:
                    # Find the UserProfile class
                    user_profile_class_index = model_content.find('class UserProfile(')
                    if user_profile_class_index == -1:
                        logger.error("Could not find UserProfile class in model file")
                        return False
                    
                    # Find the end of the class
                    class_end_index = model_content.find('\n\n', user_profile_class_index)
                    if class_end_index == -1:
                        class_end_index = len(model_content)
                    
                    # Add the property
                    property_code = """
    @property
    def modified_at(self):
        return self.updated_at if hasattr(self, 'updated_at') else self.created_at
                    """
                    
                    # Insert the property at the end of the class
                    model_content = model_content[:class_end_index] + property_code + model_content[class_end_index:]
                    
                    # Write the updated model file
                    with open(model_file_path, 'w') as f:
                        f.write(model_content)
                    
                    logger.info("Added modified_at property to UserProfile model")
                    return True
                else:
                    logger.info("UserProfile model already has modified_at property")
                    return True
            else:
                logger.info("UserProfile model doesn't have updated_at field, no changes needed")
                return True
        else:
            logger.info("UserProfile model already has modified_at field, no changes needed")
            return True
    except Exception as e:
        logger.error(f"Error fixing UserProfile model: {str(e)}")
        return False

if __name__ == "__main__":
    success = fix_user_profile_model()
    if success:
        logger.info("Script completed successfully!")
        sys.exit(0)
    else:
        logger.error("Script failed!")
        sys.exit(1)