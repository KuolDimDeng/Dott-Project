#!/usr/bin/env python
"""
Comprehensive Fix Script for PyFactor
- Adds business_num column to users_business
- Fixes owner/owner_id field references
- Fixes User object handling in tenant middleware
"""

import os
import sys
import django
import re
from django.db import connection, transaction

# Add the parent directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

def execute_sql(sql, params=None):
    """Execute raw SQL against the database"""
    with connection.cursor() as cursor:
        cursor.execute(sql, params)

def add_business_num_column():
    """Add business_num column to users_business table"""
    print("Checking if business_num column exists in users_business table...")
    
    try:
        # Check if column exists
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users_business' AND column_name='business_num'
            """)
            if cursor.fetchone():
                print("✅ Column already exists. No action needed.")
                return True
                
        # Add the column
        print("Column does not exist. Adding business_num column...")
        with connection.cursor() as cursor:
            # Add the column if it doesn't exist
            cursor.execute("""
                ALTER TABLE users_business 
                ADD COLUMN IF NOT EXISTS business_num VARCHAR(6) UNIQUE
            """)
            
            # Update existing records with a generated business number
            cursor.execute("""
                UPDATE users_business 
                SET business_num = LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0')
                WHERE business_num IS NULL
            """)
            
            # Add index on business_num column
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS users_business_business_num_idx 
                ON users_business(business_num)
            """)
            
        print("✅ business_num column added to users_business table")
        return True
    except Exception as e:
        print(f"❌ Error adding business_num column: {e}")
        return False

def fix_owner_field_references():
    """Fix owner field references in middleware and views"""
    files_to_check = [
        os.path.join(parent_dir, 'custom_auth', 'middleware.py'),
        os.path.join(parent_dir, 'custom_auth', 'api', 'views', 'tenant_views.py')
    ]
    
    fixed = 0
    
    for file_path in files_to_check:
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            continue
        
        print(f"Checking {file_path}...")
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Fix owner=request.user to owner_id=request.user.id
        new_content = re.sub(r'owner\s*=\s*request\.user', 'owner_id=request.user.id', content)
        
        # Also fix any existing owner_id=request.user to owner_id=request.user.id
        new_content = re.sub(r'owner_id\s*=\s*request\.user(?!\.)(?!\s*\.id)', 'owner_id=request.user.id', new_content)
        
        if new_content != content:
            with open(file_path, 'w') as f:
                f.write(new_content)
            print(f"✅ Fixed owner field references in {file_path}")
            fixed += 1
        else:
            print(f"No owner field references to fix in {file_path}")
    
    return fixed > 0

def main():
    """Main function to run all fixes"""
    print("=== Comprehensive Fix Script ===\n")
    
    # Add business_num column
    print("\n1. Adding business_num column to users_business table...")
    business_num_fixed = add_business_num_column()
    
    # Fix owner field references
    print("\n2. Fixing owner field references...")
    owner_field_fixed = fix_owner_field_references()
    
    print("\n=== Fix Summary ===")
    print(f"business_num column: {'✅ Fixed' if business_num_fixed else '❌ Not fixed'}")
    print(f"owner field references: {'✅ Fixed' if owner_field_fixed else '❌ Not fixed'}")
    
    if business_num_fixed and owner_field_fixed:
        print("\n✅ All fixes applied successfully!")
        print("Please restart your Django server for changes to take effect.")
    else:
        print("\n❌ Some fixes were not applied. Check the output above for details.")
    
    return 0 if (business_num_fixed and owner_field_fixed) else 1

if __name__ == "__main__":
    sys.exit(main())


