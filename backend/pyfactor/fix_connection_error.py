#!/usr/bin/env python3
"""
Fix for the 'connection' not defined error in onboarding/tasks.py
This script will patch the file to import the connection object properly.
"""

import os
import re
import sys

def fix_connection_error():
    """Fix the connection error in onboarding/tasks.py"""
    
    # Path to the tasks.py file
    tasks_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'onboarding', 'tasks.py')
    
    if not os.path.exists(tasks_file):
        print(f"Error: Could not find {tasks_file}")
        return False
    
    # Read the file content
    with open(tasks_file, 'r') as f:
        content = f.read()
    
    # Check if the file already imports connection
    if 'from django.db import connections, connection' in content:
        print("File already has the connection import. No changes needed.")
        return True
    
    # Replace the import statement
    if 'from django.db import connections' in content:
        new_content = content.replace(
            'from django.db import connections',
            'from django.db import connections, connection'
        )
    else:
        # Add the import at the top of the file
        import_line = 'from django.db import connections, connection\n'
        new_content = import_line + content
    
    # Create a backup of the original file
    backup_file = tasks_file + '.bak'
    with open(backup_file, 'w') as f:
        f.write(content)
    
    # Write the fixed content
    with open(tasks_file, 'w') as f:
        f.write(new_content)
    
    print(f"Fixed connection import in {tasks_file}")
    print(f"Backup saved to {backup_file}")
    return True

if __name__ == "__main__":
    if fix_connection_error():
        print("Fix applied successfully!")
    else:
        print("Failed to apply fix.")
        sys.exit(1)