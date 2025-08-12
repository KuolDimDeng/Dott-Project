#!/usr/bin/env python3

import subprocess
import sys
import os

def run_migration_merge():
    """Run migration merge with automatic yes responses"""
    os.chdir('/Users/kuoldeng/projectx/backend/pyfactor')
    
    # Run the merge command with automatic yes responses
    process = subprocess.Popen(
        ['python3', 'manage.py', 'makemigrations', '--merge'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )
    
    # Send "y" responses for each merge prompt
    output, _ = process.communicate(input="y\ny\ny\ny\ny\n")
    print(output)
    
    if process.returncode == 0:
        print("✅ Migrations merged successfully!")
        return True
    else:
        print("❌ Failed to merge migrations")
        return False

if __name__ == "__main__":
    if run_migration_merge():
        print("Running final migration...")
        result = subprocess.run(['python3', 'manage.py', 'migrate'], 
                              capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
    else:
        sys.exit(1)