#!/usr/bin/env python
"""
Quick migration fix for Service Management and HR Banking fields
Run this on staging/production to fix database column issues
"""

import subprocess
import sys

def run_command(cmd):
    """Run a shell command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout, result.stderr, result.returncode
    except Exception as e:
        return "", str(e), 1

def fix_service_migration():
    print("=== Service Migration Fix ===\n")
    
    # Step 1: Show current migrations
    print("📋 Checking migration status...")
    stdout, stderr, code = run_command("python manage.py showmigrations inventory | grep -A2 -B2 0016")
    
    if stdout:
        print("Current status around migration 0016:")
        print(stdout)
    
    # Step 2: Check if migration is applied
    stdout, stderr, code = run_command("python manage.py showmigrations inventory | grep '\\[X\\] 0016'")
    
    if code == 0:
        print("✅ Migration 0016 is already applied")
        print("\nChecking if column exists in database...")
        
        # Check column existence via Django shell
        check_cmd = """python manage.py shell -c "
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('SELECT column_name FROM information_schema.columns WHERE table_name=\\'inventory_service\\' AND column_name=\\'customer_id\\';')
    result = cursor.fetchone()
    print('Column exists:', bool(result))
" """
        
        stdout, stderr, code = run_command(check_cmd)
        if "Column exists: True" in stdout:
            print("✅ Column customer_id exists - everything is OK!")
        else:
            print("❌ Column missing despite migration being applied")
            print("Running migration again to fix...")
            stdout, stderr, code = run_command("python manage.py migrate inventory 0016 --fake-initial")
            print(stdout if stdout else stderr)
    else:
        print("❌ Migration 0016 not applied")
        print("\n🔧 Applying migration now...")
        
        # Apply the specific migration
        stdout, stderr, code = run_command("python manage.py migrate inventory 0016")
        
        if code == 0:
            print("✅ Migration applied successfully!")
            print(stdout)
        else:
            print("❌ Failed to apply migration:")
            print(stderr)
            
            # Try alternative approach
            print("\n🔧 Trying alternative: applying all pending migrations...")
            stdout, stderr, code = run_command("python manage.py migrate")
            
            if code == 0:
                print("✅ All migrations applied!")
            else:
                print("❌ Migration failed. Manual intervention needed.")
                print("Error:", stderr)
    
    print("\n=== Service Migration Final Status ===")
    stdout, stderr, code = run_command("python manage.py showmigrations inventory | grep 0016")
    print(stdout if stdout else "Could not check final status")

def fix_hr_migration():
    print("\n=== HR Banking Fields Migration Fix ===\n")
    
    # Check if bank_account_name column exists
    print("🔍 Checking if bank_account_name column exists...")
    check_cmd = """python manage.py shell -c "
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('SELECT column_name FROM information_schema.columns WHERE table_name=\\'hr_employee\\' AND column_name=\\'bank_account_name\\';')
    result = cursor.fetchone()
    print('Column exists:', bool(result))
" """
    
    stdout, stderr, code = run_command(check_cmd)
    
    if "Column exists: False" in stdout or "Column exists: None" in stdout:
        print("❌ Column missing, applying fix...")
        
        # Try to apply HR migrations
        stdout, stderr, code = run_command("python manage.py migrate hr")
        
        if code == 0:
            print("✅ HR migrations applied!")
        else:
            print("⚠️ Migration failed, trying manual column creation...")
            
            # Manual SQL fallback
            sql_cmd = """python manage.py shell -c "
from django.db import connection
with connection.cursor() as cursor:
    try:
        cursor.execute('''
            ALTER TABLE hr_employee 
            ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS account_number_last4 VARCHAR(4),
            ADD COLUMN IF NOT EXISTS stripe_bank_account_id VARCHAR(255)
        ''')
        connection.commit()
        print('✅ Columns added manually')
    except Exception as e:
        print(f'Error: {e}')
" """
            stdout, stderr, code = run_command(sql_cmd)
            print(stdout)
    else:
        print("✅ Column bank_account_name already exists!")

def main():
    print("=== Quick Database Migration Fixes ===\n")
    print("This script will fix:")
    print("1. Service Management - missing customer_id column")
    print("2. HR Employee Management - missing banking fields\n")
    
    # Fix Service migration
    fix_service_migration()
    
    # Fix HR migration
    fix_hr_migration()
    
    print("\n=== All Fixes Complete ===")
    print("Please test:")
    print("1. Service Management should load without errors")
    print("2. Employee Management should load without errors")

if __name__ == "__main__":
    main()