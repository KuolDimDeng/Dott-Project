#!/usr/bin/env python
"""
Fix for transaction handling issues in onboarding flow
"""

import os
import re

def find_views_file():
    """Find the onboarding views.py file"""
    # Common locations for views.py
    possible_paths = [
        os.path.join('onboarding', 'views', 'views.py'),
        os.path.join('onboarding', 'views.py'),
        # Add more possible paths if needed
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None

def fix_transaction_handling():
    """Replace atomic transaction with manual transaction management"""
    views_file = find_views_file()
    
    if not views_file:
        print("❌ Could not find onboarding views.py file")
        print("Please manually edit the file containing 'save-business-info' endpoint")
        return False
    
    print(f"Found views file at: {views_file}")
    
    # Read current content
    with open(views_file, 'r') as f:
        content = f.read()
    
    # Create backup
    with open(f"{views_file}.bak", 'w') as f:
        f.write(content)
    print(f"Created backup at {views_file}.bak")
    
    # Find and replace the problematic section
    if "with transaction.atomic():" not in content:
        print("❌ Could not find 'transaction.atomic()' in views file")
        print("Please manually fix the transaction handling")
        return False
    
    # Replace atomic with manual transaction handling
    modified_content = content.replace(
        "with transaction.atomic():",
        """# Manual transaction handling instead of atomic
        from django.db import connection
        
        # Store autocommit setting
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Set autocommit to True to avoid transaction issues
        
        try:"""
    )
    
    # Find return statements to add exception handling
    # This is a simplified approach - may need manual adjustment
    modified_content = re.sub(
        r'(\s+return response\s*)', 
        """
            return response
        except Exception as e:
            logger.error(f"Error saving business info: {str(e)}", exc_info=True)
            raise
        finally:
            # Restore previous autocommit setting
            if old_autocommit != connection.get_autocommit():
                try:
                    connection.set_autocommit(old_autocommit)
                except Exception as ac_error:
                    logger.error(f"Error restoring autocommit: {ac_error}")
        """, 
        modified_content
    )
    
    # Save modified content
    with open(views_file, 'w') as f:
        f.write(modified_content)
    
    print("✅ Modified transaction handling in views file")
    return True

if __name__ == "__main__":
    success = fix_transaction_handling()
    
    if success:
        print("\n✅ Fixed transaction handling!")
        print("\nNext steps:")
        print("1. Restart your Django server")
        print("2. Test the onboarding process again")
    else:
        print("\n❌ Could not automatically fix transaction handling.")
        print("\nManual fix instructions:")
        print("1. Open the file containing business-info save logic")
        print("2. Replace 'with transaction.atomic():' with this code:")
        print("""
        # Manual transaction handling
        from django.db import connection
        
        # Store autocommit setting
        old_autocommit = connection.get_autocommit()
        connection.set_autocommit(True)  # Important: Set autocommit to True
        
        try:
            # Business logic here...
            
            return response
        except Exception as e:
            logger.error(f"Error: {str(e)}", exc_info=True)
            raise
        finally:
            # Restore previous autocommit setting
            if old_autocommit != connection.get_autocommit():
                try:
                    connection.set_autocommit(old_autocommit)
                except Exception as ac_error:
                    logger.error(f"Error restoring autocommit: {ac_error}")
        """)