
#!/usr/bin/env python
"""
Fix script for transaction handling issues in PostgreSQL connection pool
"""

import os
import sys
import django
from django.db import connection

# Add the parent directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def fix_connection_issues():
    """Apply fixes for PostgreSQL connection transaction issues"""
    print("Applying fixes for PostgreSQL connection transaction issues...")
    
    try:
        # Ensure we're using the highest isolation level that supports schema switching
        with connection.cursor() as cursor:
            # Set default transaction isolation level to READ COMMITTED
            cursor.execute("ALTER DATABASE dott_main SET default_transaction_isolation TO 'read committed';")
            
            # Set statement timeout
            cursor.execute("ALTER DATABASE dott_main SET statement_timeout = '30s';")
            
            # Increase work_mem for better query performance
            cursor.execute("ALTER DATABASE dott_main SET work_mem = '8MB';")
            
            print("✅ Database settings updated successfully")
        
        return True
    except Exception as e:
        print(f"❌ Error updating database settings: {e}")
        return False

def modify_tenant_middleware():
    """Add transaction handling method to tenant middleware"""
    try:
        # Path to the middleware file
        middleware_path = os.path.join(parent_dir, 'custom_auth', 'tenant_middleware.py')
        
        if not os.path.exists(middleware_path):
            print(f"❌ Middleware file not found at {middleware_path}")
            return False
            
        print(f"Modifying {middleware_path}...")
        
        # Read the file
        with open(middleware_path, 'r') as f:
            content = f.read()
        
        # Check if the method already exists
        if 'def set_schema_with_transaction_handling' in content:
            print("✅ set_schema_with_transaction_handling method already exists")
            return True
        
        # Find the position to insert the new method (after __init__)
        init_end_idx = content.find('def __init__', 0)
        if init_end_idx == -1:
            print("❌ __init__ method not found in middleware")
            return False
            
        # Find the end of __init__ method
        next_def_idx = content.find('def ', init_end_idx + 1)
        if next_def_idx == -1:
            print("❌ Unable to find position to insert new method")
            return False
        
        # New method to add
        new_method = '''
    def set_schema_with_transaction_handling(tenant_id: uuid.UUID:
        """Set the schema with proper transaction handling"""
        from django.db import connection
        
        # If we're in a transaction, we need to commit it before changing schemas
        if connection.in_atomic_block:
            # Log that we're in a transaction
            logger.warning(f"Attempting to change schema while in transaction. Committing first.")
            connection.commit()
        
        # Now set the schema
        with connection.cursor() as cursor:
            # RLS: Use tenant context instead of schema
        # cursor.execute(f'SET search_path TO {schema_name}')
        set_current_tenant_id(tenant_id)')
'''
        
        # Insert the new method after __init__
        new_content = content[:next_def_idx] + new_method + content[next_def_idx:]
        
        # Find and replace set_current_schema calls with the new method
        import re

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context
        pattern = r'set_current_schema\(([^)]+)\)'
        replacement = r'self.set_schema_with_transaction_handling(\1)'
        new_content = re.sub(pattern, replacement, new_content)
        
        # Write the updated content back to the file
        with open(middleware_path, 'w') as f:
            f.write(new_content)
        
        print("✅ Successfully added set_schema_with_transaction_handling method")
        print("✅ Replaced set_current_schema calls with set_schema_with_transaction_handling")
        
        return True
    except Exception as e:
        print(f"❌ Error modifying tenant middleware: {e}")
        return False

if __name__ == "__main__":
    success1 = fix_connection_issues()
    success2 = modify_tenant_middleware()
    
    if success1 and success2:
        print("\n✅ Database transaction settings fixed successfully!")
        print("\nNext steps:")
        print("1. Restart your Django server")
        print("2. Test the onboarding process again")
    else:
        print("\n❌ Some fixes were not applied successfully.")
        print("Please check the error messages above.")
    
    sys.exit(0 if (success1 and success2) else 1)
