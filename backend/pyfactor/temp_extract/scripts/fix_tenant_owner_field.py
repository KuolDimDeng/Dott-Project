#!/usr/bin/env python
"""
Script to fix the tenant model relationship issue where code is trying to use 'owner'
instead of 'owner_id'. This is causing errors during the onboarding process.
"""

import os
import sys
import django
import fileinput
import re
from pathlib import Path

# Add the parent directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def fix_tenant_middleware():
    """Fix the tenant middleware file to use owner_id instead of owner"""
    middleware_path = os.path.join(parent_dir, 'custom_auth', 'middleware.py')
    
    if not os.path.exists(middleware_path):
        print(f"Error: File not found: {middleware_path}")
        return False
    
    print(f"Modifying file: {middleware_path}")
    
    # Keep track of replacements
    replacements = 0
    
    # Read the file content
    with open(middleware_path, 'r') as f:
        content = f.read()
    
    # Replace 'owner=' with 'owner_id='
    new_content = re.sub(r'owner=', 'owner_id=', content)
    replacements = new_content.count('owner_id=') - content.count('owner_id=')
    
    # Write the modified content back to the file
    if replacements > 0:
        with open(middleware_path, 'w') as f:
            f.write(new_content)
        print(f"✅ Made {replacements} replacements in {middleware_path}")
    else:
        print(f"No replacements needed in {middleware_path}")
    
    return True

def fix_tenant_views():
    """Fix the tenant views file to use owner_id instead of owner"""
    views_dir = os.path.join(parent_dir, 'custom_auth', 'api', 'views')
    tenant_views_path = os.path.join(views_dir, 'tenant_views.py')
    
    if not os.path.exists(tenant_views_path):
        print(f"Error: File not found: {tenant_views_path}")
        return False
    
    print(f"Modifying file: {tenant_views_path}")
    
    # Keep track of replacements
    replacements = 0
    
    # Read the file content
    with open(tenant_views_path, 'r') as f:
        content = f.read()
    
    # Replace 'owner=' with 'owner_id='
    new_content = re.sub(r'owner=', 'owner_id=', content)
    replacements = new_content.count('owner_id=') - content.count('owner_id=')
    
    # Write the modified content back to the file
    if replacements > 0:
        with open(tenant_views_path, 'w') as f:
            f.write(new_content)
        print(f"✅ Made {replacements} replacements in {tenant_views_path}")
    else:
        print(f"No replacements needed in {tenant_views_path}")
    
    return True

def main():
    """Main function to fix the tenant owner field issue"""
    print("Fixing tenant owner field issue...")
    
    success1 = fix_tenant_middleware()
    success2 = fix_tenant_views()
    
    if success1 and success2:
        print("\n✅ Successfully fixed tenant owner field issue.")
        print("Restart your server for changes to take effect.")
    else:
        print("\n❌ Failed to fix some files. See errors above.")
    
    return 0 if (success1 and success2) else 1

if __name__ == "__main__":
    sys.exit(main())