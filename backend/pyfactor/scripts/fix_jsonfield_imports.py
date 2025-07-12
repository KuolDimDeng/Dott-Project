#!/usr/bin/env python
"""
Fix deprecated JSONField imports in taxes models
"""
import os
import re

def fix_jsonfield_import(file_path):
    """Fix JSONField import in a single file"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace the old import
    old_import = "from django.contrib.postgres.fields import JSONField"
    new_import = "from django.db import models"
    
    if old_import in content:
        # Check if django.db.models is already imported
        if "from django.db import models" in content:
            # Just remove the old import line
            content = content.replace(old_import + "\n", "")
            content = content.replace(old_import, "")
        else:
            # Replace with new import
            content = content.replace(old_import, new_import)
        
        # Replace JSONField with models.JSONField
        content = re.sub(r'\bJSONField\b', 'models.JSONField', content)
        
        # Write back
        with open(file_path, 'w') as f:
            f.write(content)
        
        print(f"Fixed: {file_path}")
        return True
    return False

def fix_ordering_field(file_path):
    """Fix ordering field references"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix ordering that references 'created_at' to use 'created' (from TenantAwareModel)
    if "'created_at'" in content or '"created_at"' in content:
        content = content.replace("'created_at'", "'created'")
        content = content.replace('"created_at"', '"created"')
        
        with open(file_path, 'w') as f:
            f.write(content)
        
        print(f"Fixed ordering in: {file_path}")
        return True
    return False

def main():
    # Path to taxes app
    taxes_path = "/app/taxes"
    
    # Fix models.py
    models_file = os.path.join(taxes_path, "models.py")
    if os.path.exists(models_file):
        fix_jsonfield_import(models_file)
        fix_ordering_field(models_file)
    
    # Also check other Python files in taxes app
    for root, dirs, files in os.walk(taxes_path):
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                fix_jsonfield_import(file_path)
                fix_ordering_field(file_path)
    
    print("\nDone! Now run 'python manage.py makemigrations' again.")

if __name__ == "__main__":
    main()