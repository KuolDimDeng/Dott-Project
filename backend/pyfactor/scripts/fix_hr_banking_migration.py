#!/usr/bin/env python
"""
Quick fix for HR Employee banking fields migration
Fixes the missing bank_account_name column error
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

def main():
    print("=== HR Banking Fields Migration Fix ===\n")
    
    # Step 1: Check if migration 0020 exists
    print("📋 Checking migration status...")
    stdout, stderr, code = run_command("python manage.py showmigrations hr | grep -A2 -B2 0020")
    
    if stdout:
        print("Current status around migration 0020:")
        print(stdout)
    
    # Step 2: Check if column exists
    print("\n🔍 Checking if bank_account_name column exists...")
    check_cmd = """python manage.py shell -c "
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('SELECT column_name FROM information_schema.columns WHERE table_name=\\'hr_employee\\' AND column_name=\\'bank_account_name\\';')
    result = cursor.fetchone()
    print('Column exists:', bool(result))
" """
    
    stdout, stderr, code = run_command(check_cmd)
    
    if "Column exists: True" in stdout:
        print("✅ Column bank_account_name already exists!")
        print("\n🔍 Checking other banking columns...")
        
        # Check other columns
        for column in ['bank_name', 'account_number_last4', 'routing_number_last4', 'stripe_bank_account_id']:
            check_cmd = f"""python manage.py shell -c "
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('SELECT column_name FROM information_schema.columns WHERE table_name=\\'hr_employee\\' AND column_name=\\'{column}\\';')
    result = cursor.fetchone()
    print('{column} exists:', bool(result))
" """
            stdout, stderr, code = run_command(check_cmd)
            print(stdout.strip())
    else:
        print("❌ Column bank_account_name missing")
        print("\n🔧 Applying migration to add banking fields...")
        
        # Try to apply migration 0020
        stdout, stderr, code = run_command("python manage.py migrate hr 0020")
        
        if code == 0:
            print("✅ Migration applied successfully!")
            print(stdout)
        else:
            # If 0020 doesn't exist or fails, try applying all migrations
            print("⚠️ Migration 0020 might not exist, applying all pending migrations...")
            stdout, stderr, code = run_command("python manage.py migrate hr")
            
            if code == 0:
                print("✅ All HR migrations applied!")
            else:
                print("❌ Migration failed. Attempting manual column creation...")
                
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
            ADD COLUMN IF NOT EXISTS routing_number_last4 VARCHAR(4),
            ADD COLUMN IF NOT EXISTS stripe_bank_account_id VARCHAR(255)
        ''')
        print('✅ Columns added manually')
    except Exception as e:
        print(f'❌ Manual creation failed: {e}')
" """
                stdout, stderr, code = run_command(sql_cmd)
                print(stdout)
    
    print("\n=== Final Status ===")
    # Check final status
    for column in ['bank_account_name', 'bank_name', 'account_number_last4', 'routing_number_last4']:
        check_cmd = f"""python manage.py shell -c "
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('SELECT column_name FROM information_schema.columns WHERE table_name=\\'hr_employee\\' AND column_name=\\'{column}\\';')
    result = cursor.fetchone()
    print('{column}: {"✅ EXISTS" if result else "❌ MISSING"}'')
" """
        stdout, stderr, code = run_command(check_cmd)
        print(stdout.strip())

if __name__ == "__main__":
    main()