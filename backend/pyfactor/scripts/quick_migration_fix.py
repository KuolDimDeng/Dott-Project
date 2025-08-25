#!/usr/bin/env python
"""
Quick migration fix for Service Management
Run this on staging/production to fix the customer_id column issue
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
    print("=== Quick Service Migration Fix ===\n")
    
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
    
    print("\n=== Final Status ===")
    stdout, stderr, code = run_command("python manage.py showmigrations inventory | grep 0016")
    print(stdout if stdout else "Could not check final status")

if __name__ == "__main__":
    main()