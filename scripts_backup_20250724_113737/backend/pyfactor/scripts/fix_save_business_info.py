#!/usr/bin/env python

"""
Fix for the business info save issue in the onboarding process.
This script modifies the transaction handling in the SaveStep1View.post method
to prevent the "current transaction is aborted" error.
"""

import os
import sys
import django
import traceback

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection, transaction
from onboarding.views.views import SaveStep1View

def fix_transaction_handling():
    """
    Fix the transaction handling in the SaveStep1View.post method.
    """
    try:
        print("Applying fix for business info save transaction handling...")
        
        # Original problematic code in SaveStep1View.post around line 2000
        original_code = """                    # Now try tenant context with autocommit
                    with tenant_schema_context(cursor, schema_name, preserve_context=True) as tenant_cursor:
                        # Note: We won't use a savepoint since we're in autocommit mode
                        # This avoids nested transactions completely
                        try:
                            # IMPORTANT: Use the yielded tenant_cursor which has a fresh autocommit connection
                            # Check if updated_at column exists in users_userprofile
                            tenant_cursor.execute("""
        
        # Fixed code with improved transaction handling
        fixed_code = """                    # Reset connection state before using tenant context
                    connection.close()
                    connection.connect()
                    connection.set_autocommit(True)
                    
                    # Now try tenant context with explicit transaction control
                    with tenant_schema_context(cursor, schema_name, preserve_context=False) as tenant_cursor:
                        # Explicitly set autocommit to True for this cursor
                        tenant_cursor.connection.set_autocommit(True)
                        
                        try:
                            # IMPORTANT: Use the yielded tenant_cursor with explicit autocommit
                            # Check if updated_at column exists in users_userprofile
                            tenant_cursor.execute("""
        
        # Apply the fix to the SaveStep1View.post method
        from django.conf import settings
        import importlib.util
        
        # Get the path to the views.py file
        views_path = os.path.join(settings.BASE_DIR, 'onboarding', 'views', 'views.py')
        
        # Read the current content
        with open(views_path, 'r') as f:
            content = f.read()
        
        # Replace the problematic code
        if original_code in content:
            new_content = content.replace(original_code, fixed_code)
            
            # Create a backup of the original file
            backup_path = views_path + '.bak'
            with open(backup_path, 'w') as f:
                f.write(content)
            
            # Write the fixed content
            with open(views_path, 'w') as f:
                f.write(new_content)
            
            print(f"Fix applied successfully. Original file backed up to {backup_path}")
            
            # Also fix the tenant_schema_context function if needed
            from onboarding.utils import tenant_schema_context
            print("Checking tenant_schema_context function...")
            
            # Add additional fixes if needed
            
            return True
        else:
            print("Could not find the problematic code section. The file may have been already modified.")
            return False
    
    except Exception as e:
        print(f"Error applying fix: {str(e)}")
        traceback.print_exc()
        return False

def apply_additional_fixes():
    """
    Apply additional fixes to prevent transaction issues in the business info save process.
    """
    try:
        print("Applying additional fixes...")
        
        # Fix the transaction handling in the tenant_schema_context function
        from onboarding.utils import tenant_schema_context
        
        # Get the path to the utils.py file
        utils_path = os.path.join(settings.BASE_DIR, 'onboarding', 'utils.py')
        
        # Read the current content
        with open(utils_path, 'r') as f:
            utils_content = f.read()
        
        # Look for the tenant_schema_context function
        if "def tenant_schema_context" in utils_content:
            # Create a backup
            backup_path = utils_path + '.bak'
            with open(backup_path, 'w') as f:
                f.write(utils_content)
            
            # Add improved transaction handling
            improved_context_manager = """
def tenant_schema_context(tenant_id: uuid.UUID:
    """
    Context manager for executing SQL in a specific schema context.
    
    Args:
        cursor: Database cursor
        schema_name: Name of the schema to use
        preserve_context: Whether to preserve the original search path
        
    Yields:
        cursor: The cursor with the schema set
    """
    original_search_path = None
    
    try:
        # Store original search path if needed
        if preserve_context:
            cursor.execute("SHOW search_path")
            original_search_path = cursor.fetchone()[0]
        
        # Set search path to the tenant schema
        # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id), public')
        
        # Ensure we're not in a transaction block
        if cursor.connection.in_atomic_block:
            cursor.connection.commit()
        
        # Set autocommit to True to avoid transaction issues
        cursor.connection.set_autocommit(True)
        
        # Yield the cursor for use
        yield cursor
        
    finally:
        # Restore original search path if needed
        if preserve_context and original_search_path:
            cursor.execute(f"SET search_path TO {original_search_path}")
"""
            
            # Replace the function
            import re

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
            pattern = r"def tenant_schema_context.*?yield cursor.*?\n\s*finally:.*?}\)"
            new_utils_content = re.sub(pattern, improved_context_manager, utils_content, flags=re.DOTALL)
            
            # Write the fixed content
            with open(utils_path, 'w') as f:
                f.write(new_utils_content)
            
            print(f"Additional fixes applied. Original utils file backed up to {backup_path}")
            return True
        else:
            print("Could not find the tenant_schema_context function. Skipping additional fixes.")
            return False
            
    except Exception as e:
        print(f"Error applying additional fixes: {str(e)}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Starting business info save fix...")
    
    # Apply the main fix
    if fix_transaction_handling():
        print("Main fix applied successfully.")
    else:
        print("Failed to apply main fix.")
    
    # Apply additional fixes if needed
    try:
        if apply_additional_fixes():
            print("Additional fixes applied successfully.")
        else:
            print("Failed to apply additional fixes.")
    except Exception as e:
        print(f"Error during additional fixes: {str(e)}")
    
    print("Fix script completed.")