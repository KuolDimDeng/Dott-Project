#!/usr/bin/env python
import os
import sys
import subprocess
import time

def run_command(command):
    """Run a command and return True if successful, False otherwise"""
    print(f"\n=== Running: {command} ===\n")
    result = subprocess.run(command, shell=True)
    return result.returncode == 0

def main():
    print("=== Migration Fix Script ===")
    print("This script will fix circular dependency issues in your migrations by:")
    print("1. Resetting the database schema")
    print("2. Applying migrations in a controlled order")
    print("3. Restoring relationships")
    
    response = input("\nDo you want to continue? (yes/no): ")
    if response.lower() != 'yes':
        print("Operation cancelled.")
        return
    
    # Get the current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(current_dir)
    
    # Change to the base directory
    os.chdir(base_dir)
    print(f"Changed to directory: {base_dir}")
    
    # Step 1: Reset the database schema
    print("\n=== Step 1: Resetting database schema ===")
    if not run_command("python scripts/reset_db.py"):
        print("Failed to reset database schema. Aborting.")
        return
    
    # Step 2: Apply migrations in a controlled order
    print("\n=== Step 2: Applying migrations in a controlled order ===")
    if not run_command("python scripts/migration_order.py"):
        print("Failed to apply migrations. Aborting.")
        return
    
    # Step 3: Restore relationships
    print("\n=== Step 3: Restoring relationships ===")
    # Create a temporary input file to automatically answer 'yes'
    with open('temp_input.txt', 'w') as f:
        f.write('yes\n')
    
    if not run_command("python scripts/restore_relationships.py < temp_input.txt"):
        print("Failed to restore relationships.")
    
    # Clean up the temporary input file
    if os.path.exists('temp_input.txt'):
        os.remove('temp_input.txt')
    
    print("\n=== Migration fix complete! ===")
    print("Your database schema has been reset and migrations have been applied in the correct order.")
    print("The circular dependencies have been resolved.")

if __name__ == "__main__":
    main()