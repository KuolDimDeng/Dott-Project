#!/usr/bin/env python
"""
Targeted fix for save-business-info onboarding transaction issues
"""

import os
import re

def fix_save_business_info():
    """Find and fix the save-business-info endpoint"""
    views_file = 'onboarding/views/views.py'
    
    if not os.path.exists(views_file):
        print(f"❌ Views file not found at {views_file}")
        return False
    
    print(f"Analyzing file: {views_file}")
    
    # Read current content line by line
    with open(views_file, 'r') as f:
        lines = f.readlines()
    
    # Create backup if it doesn't exist
    backup_file = f"{views_file}.bak2"  # Use a different extension to avoid overwriting existing backup
    with open(backup_file, 'w') as f:
        f.writelines(lines)
    print(f"Created backup at {backup_file}")
    
    # Find the save-business-info section
    save_business_info_line = None
    for i, line in enumerate(lines):
        if 'save-business-info' in line:
            save_business_info_line = i
            print(f"Found save-business-info at line {i+1}: {line.strip()}")
            break
    
    if save_business_info_line is None:
        print("❌ Could not find save-business-info endpoint")
        return False
    
    # Find the method definition
    method_start = None
    for i in range(save_business_info_line, 0, -1):
        if re.search(r'def post\(', lines[i]):
            method_start = i
            print(f"Found post method at line {i+1}: {lines[i].strip()}")
            break
    
    if method_start is None:
        print("❌ Could not find post method definition")
        return False
    
    # Find if there's still a transaction.atomic line
    transaction_line = None
    for i in range(method_start, min(method_start + 100, len(lines))):
        if 'transaction.atomic' in lines[i]:
            transaction_line = i
            print(f"Found transaction.atomic at line {i+1}: {lines[i].strip()}")
            break
    
    if transaction_line is None:
        print("No transaction.atomic found. Looking for existing manual transaction handling...")
        
        # Look for set_autocommit to see if it's already using manual transactions
        autocommit_line = None
        for i in range(method_start, min(method_start + 100, len(lines))):
            if 'set_autocommit' in lines[i]:
                autocommit_line = i
                print(f"Found set_autocommit at line {i+1}: {lines[i].strip()}")
                break
        
        if autocommit_line is not None:
            # Fix might already be in place, but we need to check if it's correct
            print("Manual transaction handling found. Let's ensure it's properly implemented.")
            # Ensure autocommit is True
            if 'True' not in lines[autocommit_line]:
                lines[autocommit_line] = lines[autocommit_line].replace('False', 'True')
                print(f"Fixed autocommit value to True at line {autocommit_line+1}")
            else:
                print("autocommit is already set to True.")
        else:
            # Insert manual transaction handling
            # First, find the right indentation
            indent = re.match(r'^(\s*)', lines[method_start+1]).group(1)
            
            # Insert code after method definition
            transaction_code = [
                f"{indent}# Manual transaction handling for business info save\n",
                f"{indent}from django.db import connection\n",
                f"{indent}\n",
                f"{indent}# Ensure we're using autocommit\n",
                f"{indent}old_autocommit = connection.get_autocommit()\n",
                f"{indent}connection.set_autocommit(True)  # Important: Set autocommit to True\n",
                f"{indent}\n",
                f"{indent}try:\n"
            ]
            
            # Insert the transaction handling code
            lines = lines[:method_start+1] + transaction_code + lines[method_start+1:]
            print(f"Inserted manual transaction handling after method definition")
            
            # Now we need to find an appropriate place to insert exception handling
            # Look for return statement
            return_line = None
            for i in range(method_start + len(transaction_code) + 1, len(lines)):
                if re.search(r'^\s+return\s+response', lines[i]):
                    return_line = i
                    print(f"Found return statement at line {i+1}: {lines[i].strip()}")
                    break
            
            if return_line is not None:
                # Get the indentation
                return_indent = re.match(r'^(\s*)', lines[return_line]).group(1)
                
                # Define exception handling code
                exception_code = [
                    f"{return_indent}return response\n",
                    f"{indent}except Exception as e:\n",
                    f"{indent}    logger.error(f\"Error saving business info: {{str(e)}}\", exc_info=True)\n",
                    f"{indent}    raise\n",
                    f"{indent}finally:\n",
                    f"{indent}    # Restore previous autocommit setting\n",
                    f"{indent}    try:\n",
                    f"{indent}        if old_autocommit != connection.get_autocommit():\n",
                    f"{indent}            connection.set_autocommit(old_autocommit)\n",
                    f"{indent}    except Exception as ac_error:\n",
                    f"{indent}        logger.error(f\"Error restoring autocommit: {{ac_error}}\")\n"
                ]
                
                # Replace the return line with our exception handling code
                lines = lines[:return_line] + exception_code + lines[return_line+1:]
                print(f"Added exception handling around return statement")
            else:
                print("⚠️ Could not find return statement to add exception handling")
    else:
        # Replace transaction.atomic with manual transaction handling
        # Get indentation
        indent = re.match(r'^(\s*)', lines[transaction_line]).group(1)
        
        # Replacement code
        replacement = [
            f"{indent}# Manual transaction handling for business info save\n",
            f"{indent}from django.db import connection\n",
            f"{indent}\n",
            f"{indent}# Ensure we're using autocommit\n",
            f"{indent}old_autocommit = connection.get_autocommit()\n",
            f"{indent}connection.set_autocommit(True)  # Important: Set autocommit to True\n",
            f"{indent}\n",
            f"{indent}try:\n"
        ]
        
        # Replace the transaction.atomic line
        lines = lines[:transaction_line] + replacement + lines[transaction_line+1:]
        print(f"Replaced transaction.atomic with manual transaction handling")
        
        # Now find a return statement to add exception handling
        return_line = None
        for i in range(transaction_line + len(replacement), len(lines)):
            if re.search(r'^\s+return\s+response', lines[i]):
                return_line = i
                print(f"Found return statement at line {i+1}: {lines[i].strip()}")
                break
        
        if return_line is not None:
            # Get indentation
            return_indent = re.match(r'^(\s*)', lines[return_line]).group(1)
            
            # Define exception handling code
            exception_code = [
                f"{return_indent}return response\n",
                f"{indent}except Exception as e:\n",
                f"{indent}    logger.error(f\"Error saving business info: {{str(e)}}\", exc_info=True)\n",
                f"{indent}    raise\n",
                f"{indent}finally:\n",
                f"{indent}    # Restore previous autocommit setting\n",
                f"{indent}    try:\n",
                f"{indent}        if old_autocommit != connection.get_autocommit():\n",
                f"{indent}            connection.set_autocommit(old_autocommit)\n",
                f"{indent}    except Exception as ac_error:\n",
                f"{indent}        logger.error(f\"Error restoring autocommit: {{ac_error}}\")\n"
            ]
            
            # Replace the return line with our exception handling code
            lines = lines[:return_line] + exception_code + lines[return_line+1:]
            print(f"Added exception handling around return statement")
        else:
            print("⚠️ Could not find return statement to add exception handling")
    
    # Write the modified content back to the file
    with open(views_file, 'w') as f:
        f.writelines(lines)
    
    # Now fix the tenant_id column issue
    print("\nFixing tenant_id column in users_userprofile table...")
    print("Please run this SQL in your database:")
    print("""
    ALTER TABLE users_userprofile ADD COLUMN IF NOT EXISTS tenant_id UUID NULL;
    CREATE INDEX IF NOT EXISTS users_userprofile_tenant_id_idx ON users_userprofile(tenant_id);
    """)
    
    return True

if __name__ == "__main__":
    success = fix_save_business_info()
    
    if success:
        print("\n✅ Applied fixes to save-business-info endpoint!")
        print("\nNext steps:")
        print("1. Run the SQL to add tenant_id column to users_userprofile table")
        print("2. Restart your Django server")
        print("3. Test the onboarding process again")
    else:
        print("\n❌ Could not automatically fix the issues.")
        print("Please review the code manually and apply the needed changes.")