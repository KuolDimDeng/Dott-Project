#!/usr/bin/env python
"""
Helper script to modify the hr/models.py file to break or restore the circular dependency.
This script:
1. Creates a backup of the original hr/models.py file
2. Modifies the file to either break or restore the circular dependency
3. Prints instructions for the next steps

Usage:
python scripts/modify_hr_model.py [--restore]

Options:
--restore: Restore the original hr/models.py file from backup

This script is meant to be used in conjunction with reset_db_break_fix.py
to handle circular dependencies between models.
"""

import os
import sys
import re
import shutil
import argparse
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def backup_file(file_path):
    """Create a backup of a file"""
    backup_path = f"{file_path}.bak"
    if os.path.exists(file_path):
        shutil.copy2(file_path, backup_path)
        logger.info(f"Created backup of {file_path} at {backup_path}")
        return True
    else:
        logger.error(f"File not found: {file_path}")
        return False

def restore_file(file_path):
    """Restore a file from its backup"""
    backup_path = f"{file_path}.bak"
    if os.path.exists(backup_path):
        shutil.copy2(backup_path, file_path)
        logger.info(f"Restored {file_path} from backup")
        return True
    else:
        logger.error(f"Backup file not found: {backup_path}")
        return False

def break_circular_dependency(file_path):
    """Modify the hr/models.py file to break the circular dependency"""
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return False
    
    # First, create a backup
    if not backup_file(file_path):
        return False
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Define the pattern to match the ForeignKey field
        pattern = r"business\s*=\s*models\.ForeignKey\(\s*'users\.Business',\s*on_delete=models\.CASCADE,\s*related_name='business_employees',\s*null=True,\s*blank=True\s*\)"
        
        # Check if the pattern exists
        if not re.search(pattern, content):
            # Try a more flexible pattern
            pattern = r"business\s*=\s*models\.ForeignKey\(\s*'users\.Business'.*?\)"
            if not re.search(pattern, content):
                logger.error("Could not find the business ForeignKey field in hr/models.py")
                logger.error("Please modify the file manually as described in the documentation")
                return False
        
        # Replace the ForeignKey with a UUIDField
        replacement = "# Temporarily break circular dependency with UUIDField\n    business_id = models.UUIDField(null=True, blank=True)\n    # business = models.ForeignKey('users.Business', on_delete=models.CASCADE, related_name='business_employees', null=True, blank=True)"
        modified_content = re.sub(pattern, replacement, content)
        
        # Write the modified content back to the file
        with open(file_path, 'w') as f:
            f.write(modified_content)
        
        logger.info("Successfully modified hr/models.py to break the circular dependency")
        logger.info("Next steps:")
        logger.info("1. Run the reset_db_break_fix.py script:")
        logger.info("   python scripts/reset_db_break_fix.py")
        logger.info("2. After the script completes, restore the original hr/models.py:")
        logger.info("   python scripts/modify_hr_model.py --restore")
        logger.info("3. Create and apply the migration for the restored foreign key:")
        logger.info("   python manage.py makemigrations hr")
        logger.info("   python manage.py migrate")
        
        return True
    except Exception as e:
        logger.error(f"Error modifying hr/models.py: {str(e)}")
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Modify hr/models.py to break or restore circular dependency')
    parser.add_argument('--restore', action='store_true', help='Restore the original hr/models.py file from backup')
    args = parser.parse_args()
    
    file_path = 'hr/models.py'
    
    if args.restore:
        if restore_file(file_path):
            logger.info("Successfully restored the original hr/models.py file")
            logger.info("Next steps:")
            logger.info("1. Create and apply the migration for the restored foreign key:")
            logger.info("   python manage.py makemigrations hr")
            logger.info("   python manage.py migrate")
        else:
            logger.error("Failed to restore the original hr/models.py file")
            sys.exit(1)
    else:
        if not break_circular_dependency(file_path):
            logger.error("Failed to modify hr/models.py")
            sys.exit(1)

if __name__ == "__main__":
    main()