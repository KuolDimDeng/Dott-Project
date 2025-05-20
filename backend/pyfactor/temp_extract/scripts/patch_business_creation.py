#!/usr/bin/env python
"""
Script to patch the SaveStep1View.post method to fix the business creation issue.

This script:
1. Locates the SaveStep1View.post method in onboarding/views/views.py
2. Modifies the business creation code to use the correct tenant schema context
3. Creates a backup of the original file before making changes

Usage:
python scripts/patch_business_creation.py [--dry-run]
"""

import os
import sys
import re
import argparse
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def find_views_file():
    """Find the onboarding/views/views.py file"""
    # Start from the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Try to find the views.py file
    possible_paths = [
        os.path.join(script_dir, '..', 'onboarding', 'views', 'views.py'),
        os.path.join(script_dir, '..', 'pyfactor', 'onboarding', 'views', 'views.py'),
        os.path.join(script_dir, '..', '..', 'onboarding', 'views', 'views.py')
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return os.path.abspath(path)
    
    return None

def backup_file(file_path):
    """Create a backup of the file"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{file_path}.bak_{timestamp}"
    
    try:
        with open(file_path, 'r') as src, open(backup_path, 'w') as dst:
            dst.write(src.read())
        logger.info(f"Created backup at {backup_path}")
        return backup_path
    except Exception as e:
        logger.error(f"Failed to create backup: {str(e)}")
        return None

def patch_save_business_info(file_path, dry_run=False):
    """Patch the SaveStep1View.post method"""
    try:
        # Read the file
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Find the SaveStep1View class
        save_view_match = re.search(r'class SaveStep1View\(APIView\):', content)
        if not save_view_match:
            logger.error("Could not find SaveStep1View class")
            return False
        
        # Find the post method
        post_method_match = re.search(r'def post\(self, request, \*args, \*\*kwargs\):', content[save_view_match.start():])
        if not post_method_match:
            logger.error("Could not find post method in SaveStep1View")
            return False
        
        post_method_start = save_view_match.start() + post_method_match.start()
        
        # Find the business creation part
        business_creation_match = re.search(r'business = Business\.objects\.create\(', content[post_method_start:])
        if not business_creation_match:
            logger.error("Could not find business creation in post method")
            return False
        
        business_creation_start = post_method_start + business_creation_match.start()
        
        # Find the try block that contains the business creation
        try_block_match = re.search(r'try:', content[:business_creation_start])
        if not try_block_match:
            logger.error("Could not find try block for business creation")
            return False
        
        try_block_start = try_block_match.start()
        
        # Determine the indentation level
        lines = content[:try_block_start].split('\n')
        if not lines:
            logger.error("Could not determine indentation")
            return False
        
        last_line = lines[-1]
        indentation = len(last_line) - len(last_line.lstrip())
        indent = ' ' * indentation
        
        # Create the tenant context code to insert
        tenant_context_code = f"""
{indent}# Get tenant ID from headers or use a default tenant
{indent}tenant_id = request.headers.get('X-Tenant-ID')
{indent}
{indent}# Use tenant schema context for database operations
{indent}from custom_auth.utils import tenant_schema_context
{indent}from custom_auth.models import Tenant
{indent}
{indent}# Find the tenant schema to use
{indent}schema_name = None
{indent}if tenant_id:
{indent}    try:
{indent}        tenant = Tenant.objects.get(id=tenant_id)
{indent}        schema_name =  tenant.id
{indent}        logger.info(f"Using tenant schema {{schema_name}} for business creation")
{indent}    except Tenant.DoesNotExist:
{indent}        logger.warning(f"Tenant {{tenant_id}} not found, using public schema")
{indent}
{indent}# Create the business in the correct schema context
{indent}if schema_name:
{indent}    with tenant_schema_context(schema_name):
"""
        
        # Find the business creation block
        business_block_start = content[try_block_start:].find('\n') + try_block_start + 1
        
        # Find the end of the business creation block (next except or finally)
        business_block_end_match = re.search(r'(except|finally):', content[business_block_start:])
        if not business_block_end_match:
            logger.error("Could not find end of business creation block")
            return False
        
        business_block_end = business_block_start + business_block_end_match.start()
        
        # Extract the business creation block
        business_block = content[business_block_start:business_block_end]
        
        # Increase indentation for the business creation block
        business_block_lines = business_block.split('\n')
        indented_business_block = '\n'.join([f"{indent}    {line.lstrip()}" for line in business_block_lines])
        
        # Create the else block for public schema
        else_block = f"""
{indent}else:
{indent}    # Fallback to public schema
{indent}    logger.warning("No tenant schema specified, using public schema for business creation")
"""
        
        # Combine the new code
        new_code = tenant_context_code + indented_business_block + else_block
        
        # Replace the business creation block
        modified_content = content[:business_block_start] + new_code + content[business_block_end:]
        
        if dry_run:
            logger.info("Dry run - not making changes")
            logger.info("Would patch SaveStep1View.post method with:")
            logger.info(new_code)
            return True
        
        # Backup the file
        backup_path = backup_file(file_path)
        if not backup_path:
            logger.error("Failed to create backup, aborting")
            return False
        
        # Write the modified content
        with open(file_path, 'w') as f:
            f.write(modified_content)
        
        logger.info(f"Successfully patched SaveStep1View.post method in {file_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error patching SaveStep1View.post method: {str(e)}")
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Patch SaveStep1View.post method to fix business creation issue')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    args = parser.parse_args()
    
    # Find the views.py file
    views_path = find_views_file()
    if not views_path:
        logger.error("Could not find onboarding/views/views.py file")
        sys.exit(1)
    
    logger.info(f"Found views.py at {views_path}")
    
    # Patch the file
    if patch_save_business_info(views_path, args.dry_run):
        logger.info("Successfully patched SaveStep1View.post method")
    else:
        logger.error("Failed to patch SaveStep1View.post method")
        sys.exit(1)

if __name__ == "__main__":
    main()