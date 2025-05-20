#!/usr/bin/env python
"""
Comprehensive Fix Script for PyFactor
- Adds business_num column to users_business table
- Adds tenant_id column to users_userprofile if missing
- Fixes owner/owner_id field references in middleware and views
- Addresses transaction handling issues with connection pooling
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

def check_column_exists(table, column):
    """Check if a column exists in a table"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name=%s AND column_name=%s
        """, [table, column])
        return bool(cursor.fetchone())

def add_business_num_column():
    """Add business_num column to users_business table"""
    print("Checking if business_num column exists in users_business table...")
    
    if check_column_exists('users_business', 'business_num'):
        print("✅ Column already exists in users_business. No action needed.")
        return True
        
    print("Column does not exist. Adding business_num column...")
    try:
        with transaction.atomic():
            # Add the column if it doesn't exist
            execute_sql("""
                ALTER TABLE users_business 
                ADD COLUMN IF NOT EXISTS business_num VARCHAR(6) UNIQUE
            """)
            
            # Update existing records with a generated business number
            execute_sql("""
                UPDATE users_business 
                SET business_num = LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0')
                WHERE business_num IS NULL
            """)
            
            # Add index on business_num column
            execute_sql("""
                CREATE INDEX IF NOT EXISTS users_business_business_num_idx 
                ON users_business(business_num)
            """)
            
        print("✅ business_num column added to users_business table")
        return True
    except Exception as e:
        print(f"❌ Error adding business_num column: {e}")
        return False

def add_tenant_id_column():
    """Add tenant_id column to users_userprofile table if missing"""
    print("Checking if tenant_id column exists in users_userprofile table...")
    
    if check_column_exists('users_userprofile', 'tenant_id'):
        print("✅ Column already exists in users_userprofile. No action needed.")
        return True
        
    print("Column does not exist. Adding tenant_id column...")
    try:
        with transaction.atomic():
            # Add the column if it doesn't exist
            execute_sql("""
                ALTER TABLE users_userprofile 
                ADD COLUMN IF NOT EXISTS tenant_id UUID NULL
            """)
            
            # Add index on tenant_id column
            execute_sql("""
                CREATE INDEX IF NOT EXISTS users_userprofile_tenant_id_idx 
                ON users_userprofile(tenant_id)
            """)
            
        print("✅ tenant_id column added to users_userprofile table")
        return True
    except Exception as e:
        print(f"❌ Error adding tenant_id column: {e}")
        return False

def fix_owner_field_references():
    """Fix owner field references in middleware and views"""
    files_to_check = [
        os.path.join(parent_dir, 'custom_auth', 'middleware.py'),
        os.path.join(parent_dir, 'custom_auth', 'tenant_middleware.py'),
        os.path.join(parent_dir, 'custom_auth', 'api', 'views', 'tenant_views.py')
    ]
    
    fixed = 0
    
    for file_path in files_to_check:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
        
        print(f"Checking {file_path}...")
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Fix owner=request.user to owner_id=request.user.id
        new_content = re.sub(r'owner\s*=\s*request\.user\b(?!\s*\.id)', 'owner_id=request.user.id', content)
        
        # Also fix any existing owner_id=request.user to owner_id=request.user.id
        new_content = re.sub(r'owner_id\s*=\s*request\.user\b(?!\s*\.id)', 'owner_id=request.user.id', new_content)
        
        if new_content != content:
            with open(file_path, 'w') as f:
                f.write(new_content)
            print(f"✅ Fixed owner field references in {file_path}")
            fixed += 1
        else:
            print(f"No owner field references to fix in {file_path}")
    
    return fixed > 0

def fix_transaction_handling():
    """Add settings to fix transaction handling issues with connection pooling"""
    settings_path = os.path.join(parent_dir, 'pyfactor', 'settings.py')
    
    if not os.path.exists(settings_path):
        print(f"❌ Settings file not found: {settings_path}")
        return False
    
    print(f"Modifying {settings_path} to fix transaction handling...")
    
    with open(settings_path, 'r') as f:
        content = f.read()
    
    # Check if connection pooling settings exist
    if 'DATABASE_POOL_ARGS' in content:
        # Add autocommit setting if not present
        if 'autocommit' not in content:
            conn_pool_pattern = r'DATABASE_POOL_ARGS\s*=\s*\{([^}]*)\}'
            match = re.search(conn_pool_pattern, content)
            
            if match:
                pool_args = match.group(1)
                if 'autocommit' not in pool_args:
                    updated_pool_args = pool_args.rstrip() + ',\n    "autocommit": True,\n'
                    new_content = content.replace(pool_args, updated_pool_args)
                    
                    with open(settings_path, 'w') as f:
                        f.write(new_content)
                    
                    print(f"✅ Added autocommit setting to DATABASE_POOL_ARGS")
                    return True
                else:
                    print("autocommit setting already exists in DATABASE_POOL_ARGS")
            else:
                print("Could not find DATABASE_POOL_ARGS pattern to update")
        else:
            print("autocommit setting already exists")
    else:
        # Add complete DATABASE_POOL_ARGS setting
        db_settings_pattern = r'DATABASES\s*=\s*\{([^}]*)\}'
        match = re.search(db_settings_pattern, content)
        
        if match:
            db_settings = match.group(0)
            pool_args_setting = '''\n\nDATABASE_POOL_ARGS = {
    "pre_ping": True,
    "echo": False,
    "timeout": 30,
    "recycle": 300,
    "pool_size": 20,
    "max_overflow": 10,
    "autocommit": True,
}\n'''
            
            new_content = content.replace(db_settings, db_settings + pool_args_setting)
            
            with open(settings_path, 'w') as f:
                f.write(new_content)
            
            print(f"✅ Added DATABASE_POOL_ARGS with autocommit setting")
            return True
    
    return False

def main():
    """Main function to run all fixes"""
    print("=== Comprehensive Fix Script for PyFactor Onboarding Issues ===\n")
    
    # Add business_num column
    print("\n1. Adding business_num column to users_business table...")
    business_num_fixed = add_business_num_column()
    
    # Add tenant_id column
    print("\n2. Adding tenant_id column to users_userprofile table...")
    tenant_id_fixed = add_tenant_id_column()
    
    # Fix owner field references
    print("\n3. Fixing owner field references...")
    owner_field_fixed = fix_owner_field_references()
    
    # Fix transaction handling
    print("\n4. Fixing transaction handling with connection pooling...")
    transaction_fixed = fix_transaction_handling()
    
    print("\n=== Fix Summary ===")
    print(f"business_num column: {'✅ Fixed' if business_num_fixed else '❌ Not fixed'}")
    print(f"tenant_id column: {'✅ Fixed' if tenant_id_fixed else '❌ Not fixed'}")
    print(f"owner field references: {'✅ Fixed' if owner_field_fixed else '❌ Not fixed'}")
    print(f"transaction handling: {'✅ Fixed' if transaction_fixed else '❌ Not fixed'}")
    
    if all([business_num_fixed, tenant_id_fixed, owner_field_fixed, transaction_fixed]):
        print("\n✅ All fixes applied successfully!")
        print("\nNext steps:")
        print("1. Restart your Django server for changes to take effect")
        print("2. Test the onboarding process through the frontend")
        print("3. Monitor logs for any additional issues")
    else:
        print("\n❌ Some fixes were not applied. Check the output above for details.")
    
    return 0 if (business_num_fixed and tenant_id_fixed and owner_field_fixed and transaction_fixed) else 1

if __name__ == "__main__":
    sys.exit(main())