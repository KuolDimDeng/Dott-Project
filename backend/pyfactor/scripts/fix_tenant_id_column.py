#!/usr/bin/env python
"""
Fix for missing tenant_id column in users_userprofile table
"""

import os
import subprocess

def add_tenant_id_column():
    """Add tenant_id column to users_userprofile table using direct SQL"""
    print("Adding tenant_id column to users_userprofile table...")
    
    # Get database credentials from environment or use defaults
    db_host = os.getenv('DB_HOST', 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com')
    db_name = os.getenv('DB_NAME', 'dott_main')
    db_user = os.getenv('DB_USER', 'dott_admin')
    
    # SQL statement to check if column exists
    check_sql = """
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='users_userprofile' AND column_name='tenant_id';
    """
    
    # SQL statement to add the column
    add_sql = """
    ALTER TABLE users_userprofile ADD COLUMN IF NOT EXISTS tenant_id UUID NULL;
    CREATE INDEX IF NOT EXISTS users_userprofile_tenant_id_idx ON users_userprofile(tenant_id);
    """
    
    # Execute check query
    check_cmd = f'psql -h {db_host} -d {db_name} -U {db_user} -c "{check_sql}"'
    print(f"Running: {check_cmd}")
    
    try:
        result = subprocess.run(check_cmd, shell=True, capture_output=True, text=True)
        if '0 rows' in result.stdout:
            # Column doesn't exist, add it
            print("Column does not exist. Adding it...")
            add_cmd = f'psql -h {db_host} -d {db_name} -U {db_user} -c "{add_sql}"'
            add_result = subprocess.run(add_cmd, shell=True, capture_output=True, text=True)
            
            if add_result.returncode == 0:
                print("✅ Successfully added tenant_id column to users_userprofile")
                return True
            else:
                print(f"❌ Error adding column: {add_result.stderr}")
                return False
        else:
            print("✅ Column tenant_id already exists in users_userprofile")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = add_tenant_id_column()
    
    if success:
        print("\n✅ Fixed missing tenant_id column!")
        print("\nNext steps:")
        print("1. Restart your Django server")
        print("2. Test the onboarding process again")
    else:
        print("\n❌ Failed to fix tenant_id column.")
        print("Please check the error messages above.")