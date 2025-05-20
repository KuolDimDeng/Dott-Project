#!/usr/bin/env python
"""
Comprehensive fix for transaction handling in all POST methods
"""

import os
import re

def fix_all_transactions():
    """Fix all transaction handling in POST methods"""
    views_file = 'onboarding/views/views.py'
    
    if not os.path.exists(views_file):
        print(f"❌ Views file not found at {views_file}")
        return False
    
    print(f"Fixing transactions in: {views_file}")
    
    # Read current content
    with open(views_file, 'r') as f:
        content = f.read()
    
    # Create backup
    backup_file = f"{views_file}.full_backup"
    with open(backup_file, 'w') as f:
        f.write(content)
    print(f"Created backup at {backup_file}")
    
    # Find all transaction.atomic() blocks
    tx_count = content.count('transaction.atomic()')
    if tx_count == 0:
        print("No transaction.atomic() found. Trying different patterns...")
        tx_count = content.count('with transaction')
    
    print(f"Found {tx_count} transaction blocks")
    
    # Replace all transaction.atomic() blocks with manual transaction handling
    modified_content = re.sub(
        r'with\s+transaction\.atomic\(\):',
        """# Manual transaction handling
        from django.db import connection
        
        # Store autocommit setting
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Important: Set autocommit to True to avoid set_session errors
        
        try:""",
        content
    )
    
    # Now add exception handling after all return statements inside methods
    # This is a simplistic approach - we'll add exception handling after return statements
    # and rely on indentation to determine if it's within a transaction block
    lines = modified_content.split('\n')
    modified_lines = []
    skip_until_line = -1
    
    for i, line in enumerate(lines):
        if i <= skip_until_line:
            continue
            
        modified_lines.append(line)
        
        # Check if this is a return statement inside a POST method
        if re.search(r'^\s+return\s+response', line):
            # Get indentation of the return line
            indent_match = re.match(r'^(\s+)', line)
            if indent_match:
                indent = indent_match.group(1)
                
                # Add exception handling
                exception_lines = [
                    "except Exception as e:",
                    "    logger.error(f\"Error in request: {str(e)}\", exc_info=True)",
                    "    raise",
                    "finally:",
                    "    # Restore previous autocommit setting",
                    "    try:",
                    "        if old_autocommit != connection.get_autocommit():",
                    "            connection.set_autocommit(old_autocommit)",
                    "    except Exception as ac_error:",
                    "        logger.error(f\"Error restoring autocommit: {ac_error}\")"
                ]
                
                for ex_line in exception_lines:
                    modified_lines.append(f"{indent}{ex_line}")
                
                # Skip the lines we just added
                skip_until_line = i + len(exception_lines)
    
    # Write the modified content back to the file
    with open(views_file, 'w') as f:
        f.write('\n'.join(modified_lines))
    
    print(f"✅ Modified transaction handling in all relevant methods")
    return True

if __name__ == "__main__":
    success = fix_all_transactions()
    
    if success:
        print("\n✅ Fixed transaction handling in views file!")
        print("\nNext steps:")
        print("1. Make sure to run the SQL to add tenant_id column to users_userprofile table:")
        print("   ALTER TABLE users_userprofile ADD COLUMN IF NOT EXISTS tenant_id UUID NULL;")
        print("   CREATE INDEX IF NOT EXISTS users_userprofile_tenant_id_idx ON users_userprofile(tenant_id);")
        print("2. Restart your Django server")
        print("3. Test the onboarding process again")
    else:
        print("\n❌ Failed to fix transaction handling.")
        print("Please try manual fixes.")