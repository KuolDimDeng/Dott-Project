#!/usr/bin/env python
"""
Production-ready script to run pending HR migrations
This script can be run as part of the deployment process
"""
import os
import sys
import subprocess

def run_migrations():
    """Run pending migrations for the HR app"""
    print("🚀 Running pending HR migrations...")
    
    try:
        # Change to the project directory
        project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        os.chdir(project_dir)
        
        # Check migration status
        print("\n📋 Checking migration status...")
        result = subprocess.run(
            ["python", "manage.py", "showmigrations", "hr"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"❌ Error checking migrations: {result.stderr}")
            return False
            
        print(result.stdout)
        
        # Run migrations
        print("\n🔄 Applying pending migrations...")
        result = subprocess.run(
            ["python", "manage.py", "migrate", "hr"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"❌ Error applying migrations: {result.stderr}")
            return False
            
        print(result.stdout)
        print("\n✅ Migrations applied successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)