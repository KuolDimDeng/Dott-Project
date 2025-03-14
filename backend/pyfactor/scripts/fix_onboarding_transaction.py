#!/usr/bin/env python
"""
Fix script to modify transaction handling in the onboarding view to avoid
the 'set_session cannot be used inside a transaction' error
"""

import os
import sys
import re

# Add the parent directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

def find_onboarding_views():
    """Find all potential onboarding view files"""
    views_files = []
    onboarding_dir = os.path.join(parent_dir, 'onboarding')
    
    # Check if onboarding directory exists
    if not os.path.exists(onboarding_dir):
        print(f"❌ Onboarding directory not found at {onboarding_dir}")
        return []
    
    # Look for views.py or views directory
    views_file = os.path.join(onboarding_dir, 'views.py')
    views_dir = os.path.join(onboarding_dir, 'views')
    
    if os.path.exists(views_file):
        views_files.append(views_file)
        
    if os.path.exists(views_dir) and os.path.isdir(views_dir):
        for file in os.listdir(views_dir):
            if file.endswith('.py'):
                views_files.append(os.path.join(views_dir, file))
    
    return views_files

def fix_transaction_in_file(file_path):
    """Modify file to fix transaction handling"""
    print(f"Examining {file_path}...")
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check if this file has transaction.atomic() calls
    if 'transaction.atomic' not in content:
        print(f"No transaction.atomic calls found in {file_path}")
        return False
    
    # Make a backup of the file
    backup_path = file_path + '.bak'
    with open(backup_path, 'w') as f:
        f.write(content)
    
    print(f"Created backup at {backup_path}")
    
    # Replace all transaction.atomic() blocks
    modified_content = re.sub(
        r'with\s+transaction\.atomic\(\):',
        r'# Using direct connection instead of atomic\n'
        r'        from django.db import connection\n'
        r'        # Store current autocommit state\n'
        r'        old_autocommit = connection.get_autocommit()\n'
        r'        \n'
        r'        # First close any existing connection if it\'s in a transaction\n'
        r'        if connection.in_atomic_block:\n'
        r'            connection.close()\n'
        r'            connection.connect()\n'
        r'        \n'
        r'        # Use try/except/finally for transaction control\n'
        r'        try:\n'
        r'            connection.set_autocommit(False)',
        content
    )
    
    # Check if any replacements were made
    if modified_content == content:
        print(f"Could not find any transaction.atomic() blocks to replace in {file_path}")
        return False
    
    # Add transaction cleanup code
    modified_content = re.sub(
        r'(return\s+[a-zA-Z0-9_.()\'\"{}[\]]+)(\s+)(?=\n\s*except|\n\s*$)',
        r'            # Commit the transaction\n'
        r'            connection.commit()\n'
        r'            \1\2'
        r'        except Exception as e:\n'
        r'            # Rollback on error\n'
        r'            try:\n'
        r'                connection.rollback()\n'
        r'            except Exception as rollback_error:\n'
        r'                logger.error(f"Error during rollback: {rollback_error}")\n'
        r'            # Re-raise the original exception\n'
        r'            raise\n'
        r'        finally:\n'
        r'            # Restore previous autocommit setting\n'
        r'            try:\n'
        r'                connection.set_autocommit(old_autocommit)\n'
        r'            except Exception as autocommit_error:\n'
        r'                logger.error(f"Error restoring autocommit: {autocommit_error}")',
        modified_content
    )
    
    # Write the updated content back to the file
    with open(file_path, 'w') as f:
        f.write(modified_content)
    
    print(f"✅ Successfully modified {file_path} to handle transactions better")
    return True

def fix_onboarding_views():
    """Find and fix all onboarding views"""
    views_files = find_onboarding_views()
    
    if not views_files:
        print("❌ No onboarding view files found")
        return False
    
    success = False
    for file_path in views_files:
        if fix_transaction_in_file(file_path):
            success = True
    
    return success

if __name__ == "__main__":
    print("Fixing transaction handling in onboarding views...")
    success = fix_onboarding_views()
    
    if success:
        print("\n✅ Fixed transaction handling in onboarding views!")
        print("\nNext steps:")
        print("1. Restart your Django server")
        print("2. Test the onboarding process again")
    else:
        print("\n❌ Failed to fix transaction handling.")
        print("Please check the error messages above.")
        print("\nAlternative approach: Try manually modifying your onboarding views to use direct transaction control:")
        print("1. Find where 'transaction.atomic()' is used in business-info save logic")
        print("2. Replace the atomic block with manual transaction management:")
        print("""
        # Before:
        with transaction.atomic():
            # business logic here
            
        # After:
        from django.db import connection
        old_autocommit = connection.get_autocommit()
        try:
            connection.set_autocommit(False)
            # business logic here
            connection.commit()
        except Exception as e:
            connection.rollback()
            raise
        finally:
            connection.set_autocommit(old_autocommit)
        """)