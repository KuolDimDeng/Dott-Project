#!/usr/bin/env python
"""
Script to update references to user.Business
 in models
"""
import os
import re
import sys

def update_file(file_path):
    """
    Update references to user.Business
 in a file
    """
    print(f"Updating file: {file_path}")
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Replace all references to 'user.Business
'
    updated_content = content.replace("'user.Business
'", "'users.Business'")
    
    # Write the updated content back to the file
    with open(file_path, 'w') as f:
        f.write(updated_content)
    
    print(f"Successfully updated {file_path}")

def main():
    """
    Main function to update all references to user.Business

    """
    # Get the project root directory
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    # Files to update
    files_to_update = [
        os.path.join(project_root, 'finance', 'models.py'),
        os.path.join(project_root, 'hr', 'models.py'),
    ]
    
    for file_path in files_to_update:
        if os.path.exists(file_path):
            update_file(file_path)
        else:
            print(f"File not found: {file_path}")

if __name__ == "__main__":
    main()